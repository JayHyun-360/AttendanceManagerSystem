import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const cleanupSecret = Deno.env.get("CLEANUP_FUNCTION_SECRET");

if (!supabaseUrl || !serviceRoleKey || !cleanupSecret) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CLEANUP_FUNCTION_SECRET must be configured.",
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const bucketId = "public-images";
const defaultLimit = 25;
const maxLimit = 100;
const defaultMinimumAgeHours = 24;
const maxAttempts = 5;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function getPositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getNonNegativeNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function publicUrlCandidates(objectPath: string): Set<string> {
  const decodedPath = decodeURIComponent(objectPath);
  const encodedPath = decodedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const base = `${supabaseUrl}/storage/v1/object/public/${bucketId}`;
  return new Set([
    `${base}/${objectPath}`,
    `${base}/${decodedPath}`,
    `${base}/${encodedPath}`,
    objectPath,
    decodedPath,
  ]);
}

function containsCandidate(value: string | null | undefined, candidates: Set<string>) {
  return typeof value === "string" && candidates.has(value);
}

function arrayContainsCandidate(
  value: unknown,
  candidates: Set<string>,
): boolean {
  return (
    Array.isArray(value) &&
    value.some(
      (item) => typeof item === "string" && candidates.has(item),
    )
  );
}

async function isObjectReferenced(objectPath: string): Promise<boolean> {
  const candidates = publicUrlCandidates(objectPath);

  const [profiles, events, announcements, settings, excuses] =
    await Promise.all([
      admin
        .from("profiles")
        .select("photo_url,cover_photo_url,id_photo_url"),
      admin.from("events").select("image_url,media_urls"),
      admin.from("announcements").select("media_url"),
      admin.from("system_settings").select("settings"),
      admin.from("excuse_requests").select("document_url"),
    ]);

  for (const result of [profiles, events, announcements, settings, excuses]) {
    if (result.error) {
      throw new Error(`Reference check failed: ${result.error.message}`);
    }
  }

  if (
    profiles.data?.some(
      (row) =>
        containsCandidate(row.photo_url, candidates) ||
        containsCandidate(row.cover_photo_url, candidates) ||
        containsCandidate(row.id_photo_url, candidates),
    )
  ) {
    return true;
  }

  if (
    events.data?.some(
      (row) =>
        containsCandidate(row.image_url, candidates) ||
        arrayContainsCandidate(row.media_urls, candidates),
    )
  ) {
    return true;
  }

  if (
    announcements.data?.some((row) =>
      containsCandidate(row.media_url, candidates),
    )
  ) {
    return true;
  }

  if (
    excuses.data?.some((row) =>
      containsCandidate(row.document_url, candidates),
    )
  ) {
    return true;
  }

  if (
    settings.data?.some((row) => {
      const value = row.settings as Record<string, unknown> | null;
      const heroUrls = value?.heroImageUrls;
      const carouselSlides = value?.carouselSlides;

      return (
        arrayContainsCandidate(heroUrls, candidates) ||
        (Array.isArray(carouselSlides) &&
          carouselSlides.some(
            (slide) =>
              slide &&
              typeof slide === "object" &&
              containsCandidate(
                (slide as Record<string, unknown>).imageUrl as string,
                candidates,
              ),
          ))
      );
    })
  ) {
    return true;
  }

  return false;
}

async function markFailed(
  id: number,
  attempts: number,
  message: string,
): Promise<void> {
  const nextStatus = attempts >= maxAttempts ? "quarantined" : "failed";
  const retryAt = new Date(Date.now() + Math.min(attempts, 6) * 5 * 60 * 1000);

  const { error } = await admin
    .from("storage_cleanup_queue")
    .update({
      status: nextStatus,
      available_at: retryAt.toISOString(),
      last_error: message.slice(0, 1000),
    })
    .eq("id", id);

  if (error) {
    console.error("Could not mark queue row failed", { id, error });
  }
}

async function processQueue(limit: number, minimumAgeHours: number) {
  const cutoff = new Date(
    Date.now() - minimumAgeHours * 60 * 60 * 1000,
  ).toISOString();

  const { data: rows, error: listError } = await admin
    .from("storage_cleanup_queue")
    .select("id,bucket_id,object_path,status,attempts,created_at")
    .in("status", ["pending", "failed"])
    .eq("bucket_id", bucketId)
    .lte("available_at", new Date().toISOString())
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (listError) {
    throw new Error(`Could not read cleanup queue: ${listError.message}`);
  }

  const summary = {
    selected: rows?.length ?? 0,
    deleted: 0,
    stillReferenced: 0,
    failed: 0,
    quarantined: 0,
    skippedByAnotherWorker: 0,
  };

  for (const row of rows ?? []) {
    const attempts = Number(row.attempts ?? 0) + 1;

    if (attempts > maxAttempts) {
      await markFailed(
        row.id,
        maxAttempts,
        "Maximum cleanup attempts reached.",
      );
      summary.quarantined += 1;
      continue;
    }

    const { data: claimed, error: claimError } = await admin
      .from("storage_cleanup_queue")
      .update({
        status: "processing",
        attempts,
        last_error: null,
      })
      .eq("id", row.id)
      .in("status", ["pending", "failed"])
      .select("id,bucket_id,object_path,attempts")
      .maybeSingle();

    if (claimError) {
      await markFailed(row.id, attempts, claimError.message);
      summary.failed += 1;
      continue;
    }

    if (!claimed) {
      summary.skippedByAnotherWorker += 1;
      continue;
    }

    try {
      if (await isObjectReferenced(claimed.object_path)) {
        const { error } = await admin
          .from("storage_cleanup_queue")
          .update({
            status: "quarantined",
            last_error:
              "Object is still referenced by at least one database record.",
            processed_at: new Date().toISOString(),
          })
          .eq("id", claimed.id);

        if (error) throw error;

        summary.stillReferenced += 1;
        summary.quarantined += 1;
        continue;
      }

      const { error: removeError } = await admin.storage
        .from(claimed.bucket_id)
        .remove([claimed.object_path]);

      if (removeError) {
        throw removeError;
      }

      const { error: completeError } = await admin
        .from("storage_cleanup_queue")
        .update({
          status: "completed",
          last_error: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", claimed.id);

      if (completeError) throw completeError;

      summary.deleted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markFailed(claimed.id, attempts, message);
      summary.failed += 1;
    }
  }

  return summary;
}

serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "POST required" }, 405);
  }

  if (request.headers.get("x-cleanup-secret") !== cleanupSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const url = new URL(request.url);
    let body: Record<string, unknown> = {};

    try {
      body = await request.json();
    } catch {
      // Empty request bodies are allowed.
    }

    const requestedLimit = Number(body.limit ?? url.searchParams.get("limit"));
    const limit = Math.min(
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : defaultLimit,
      maxLimit,
    );

    const requestedAge = Number(
      body.minimumAgeHours ??
        url.searchParams.get("minimumAgeHours"),
    );
    const minimumAgeHours = getNonNegativeNumber(
      Number.isFinite(requestedAge) ? String(requestedAge) : null,
      defaultMinimumAgeHours,
    );

    const result = await processQueue(limit, minimumAgeHours);
    return json({ ok: true, bucket: bucketId, minimumAgeHours, ...result });
  } catch (error) {
    console.error(error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

void getPositiveInteger;
