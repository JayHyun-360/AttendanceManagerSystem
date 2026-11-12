import { createClient } from "npm:@supabase/supabase-js@2"

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")

const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const cleanupSecret = Deno.env.get("CLEANUP_FUNCTION_SECRET")

if (!supabaseUrl || !serviceRoleKey || !cleanupSecret) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CLEANUP_FUNCTION_SECRET must be configured.",
  )
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,

    persistSession: false,
  },
})

const bucketIds = [
  "public-images",
  "student-private-media",
  "excuse-documents",
] as const

type BucketId = typeof bucketIds[number]

const defaultLimit = 25

const maxLimit = 100

const defaultMinimumAgeHours = 24

const maxAttempts = 5

const processingLeaseMinutes = 30

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,

    headers: {
      "content-type": "application/json",
    },
  })
}

function getPositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function getNonNegativeNumber(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function normalizeReference(bucketId: BucketId, value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.startsWith("blob:")) {
    return null
  }

  if (bucketId === "public-images" && /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const prefix = "/storage/v1/object/public/public-images/"
      if (!url.pathname.includes(prefix)) return null
      return decodeURIComponent(
        url.pathname.slice(url.pathname.indexOf(prefix) + prefix.length),
      )
    } catch {
      return null
    }
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null

  const path = value.replace(/^\/+/, "").split(/[?#]/, 1)[0]
  return path && !path.includes("..") && !path.includes("//") ? path : null
}

async function loadAllReferenceRows(
  table: "profiles" | "events" | "announcements" | "system_settings" | "excuse_requests",
  columns: string,
): Promise<Record<string, unknown>[]> {
  const pageSize = 1000
  const rows: Record<string, unknown>[] = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Reference check failed for ${table}: ${error.message}`)
    }

    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

async function loadReferenceIndex(): Promise<Set<string>> {
  const [profiles, events, announcements, settings, excuses] =
    await Promise.all([
      loadAllReferenceRows(
        "profiles",
        "id,photo_url,cover_photo_url,id_photo_url",
      ),
      loadAllReferenceRows("events", "id,image_url,media_urls"),
      loadAllReferenceRows("announcements", "id,media_url"),
      loadAllReferenceRows("system_settings", "id,settings"),
      loadAllReferenceRows("excuse_requests", "id,document_url"),
    ])

  const references = new Set<string>()
  const add = (bucketId: BucketId, value: unknown) => {
    const path = normalizeReference(bucketId, value)
    if (path) references.add(`${bucketId}:${path}`)
  }
  const addArray = (bucketId: BucketId, value: unknown) => {
    if (Array.isArray(value)) value.forEach((item) => add(bucketId, item))
  }

  for (const row of profiles) {
    add("student-private-media", row.photo_url)
    add("student-private-media", row.cover_photo_url)
    add("student-private-media", row.id_photo_url)
  }
  for (const row of events) {
    add("public-images", row.image_url)
    addArray("public-images", row.media_urls)
  }
  for (const row of announcements) {
    add("public-images", row.media_url)
  }
  for (const row of excuses) {
    add("excuse-documents", row.document_url)
  }
  for (const row of settings) {
    const value = row.settings as Record<string, unknown> | null
    if (Array.isArray(value?.carouselSlides)) {
      for (const slide of value.carouselSlides) {
        if (!slide || typeof slide !== "object") continue
        const item = slide as Record<string, unknown>
        add("public-images", item.imageUrl)
        add("public-images", item.posterUrl)
      }
    }
  }

  return references
}

function isObjectReferenced(
  bucketId: BucketId,
  objectPath: string,
  references: Set<string>,
): boolean {
  return references.has(`${bucketId}:${objectPath}`)
}

async function storageObjectExists(
  bucketId: BucketId,
  objectPath: string,
): Promise<boolean> {
  const separator = objectPath.lastIndexOf("/")
  const folder = separator < 0 ? "" : objectPath.slice(0, separator)
  const fileName = separator < 0 ? objectPath : objectPath.slice(separator + 1)

  const { data, error } = await admin.storage.from(bucketId).list(folder, {
    limit: 100,
    search: fileName,
  })

  if (error) {
    throw new Error(
      `Could not inspect ${bucketId}/${objectPath}: ${error.message}`,
    )
  }

  return Boolean(data?.some((item) => item.name === fileName && item.id))
}

async function markFailed(
  id: number,

  attempts: number,

  message: string,
): Promise<void> {
  const nextStatus = attempts >= maxAttempts ? "quarantined" : "failed"

  const retryAt = new Date(Date.now() + Math.min(attempts, 6) * 5 * 60 * 1000)

  const { error } = await admin

    .from("storage_cleanup_queue")

    .update({
      status: nextStatus,

      available_at: retryAt.toISOString(),

      last_error: message.slice(0, 1000),
    })

    .eq("id", id)

  if (error) {
    console.error("Could not mark queue row failed", { id, error })
  }
}

async function processQueue(limit: number, minimumAgeHours: number) {
  const now = new Date()
  const cutoff = new Date(
    now.getTime() - minimumAgeHours * 60 * 60 * 1000,
  ).toISOString()
  const staleProcessingCutoff = new Date(
    now.getTime() - processingLeaseMinutes * 60 * 1000,
  ).toISOString()

  const { error: recoveryError } = await admin
    .from("storage_cleanup_queue")
    .update({
      status: "failed",
      available_at: now.toISOString(),
      last_error: "Recovered stale processing lease.",
    })
    .in("bucket_id", [...bucketIds])
    .eq("status", "processing")
    .lte("available_at", staleProcessingCutoff)

  if (recoveryError) {
    throw new Error(
      `Could not recover stale cleanup rows: ${recoveryError.message}`,
    )
  }

  const { data: rows, error: listError } = await admin

    .from("storage_cleanup_queue")

    .select("id,bucket_id,object_path,status,attempts,created_at")

    .in("status", ["pending", "failed"])

    .in("bucket_id", [...bucketIds])

    .lte("available_at", now.toISOString())

    .lte("created_at", cutoff)

    .order("created_at", { ascending: true })

    .limit(limit)

  if (listError) {
    throw new Error(`Could not read cleanup queue: ${listError.message}`)
  }

  const summary = {
    selected: rows?.length ?? 0,

    deleted: 0,

    stillReferenced: 0,

    failed: 0,

    quarantined: 0,

    skippedByAnotherWorker: 0,

    missingObjects: 0,

    cancelled: 0,
  }
  for (const row of rows ?? []) {
    const bucketId = bucketIds.find((value) => value === row.bucket_id)
    if (!bucketId) {
      await markFailed(
        row.id,
        Number(row.attempts ?? 0) + 1,
        `Unsupported cleanup bucket: ${row.bucket_id}`,
      )
      summary.failed += 1
      continue
    }

    const attempts = Number(row.attempts ?? 0) + 1

    if (attempts > maxAttempts) {
      await markFailed(
        row.id,

        maxAttempts,

        "Maximum cleanup attempts reached.",
      )

      summary.quarantined += 1

      continue
    }

    const { data: claimed, error: claimError } = await admin

      .from("storage_cleanup_queue")

      .update({
        status: "processing",

        attempts,

        available_at: new Date(
          Date.now() + processingLeaseMinutes * 60 * 1000,
        ).toISOString(),

        last_error: null,
      })

      .eq("id", row.id)

      .in("status", ["pending", "failed"])

      .select("id,bucket_id,object_path,attempts")

      .maybeSingle()

    if (claimError) {
      await markFailed(row.id, attempts, claimError.message)

      summary.failed += 1

      continue
    }

    if (!claimed) {
      summary.skippedByAnotherWorker += 1

      continue
    }

    try {
      const claimedBucket = bucketIds.find(
        (value) => value === claimed.bucket_id,
      )
      if (!claimedBucket) {
        throw new Error(`Unsupported cleanup bucket: ${claimed.bucket_id}`)
      }

      const objectExists = await storageObjectExists(
        claimedBucket,
        claimed.object_path,
      )
      if (!objectExists) {
        const { error } = await admin
          .from("storage_cleanup_queue")
          .update({
            status: "completed",
            last_error: "Object was already absent from Storage.",
            processed_at: new Date().toISOString(),
          })
          .eq("id", claimed.id)

        if (error) throw error
        summary.missingObjects += 1
        continue
      }

      const references = await loadReferenceIndex()
      if (isObjectReferenced(claimedBucket, claimed.object_path, references)) {
        const { error } = await admin

          .from("storage_cleanup_queue")

          .update({
            status: "cancelled",

            last_error:
              "Object is linked to an application record; future removal will enqueue it again.",

            processed_at: new Date().toISOString(),
          })

          .eq("id", claimed.id)

        if (error) throw error

        summary.stillReferenced += 1

        summary.cancelled += 1

        continue
      }

      const { error: removeError } = await admin.storage

        .from(claimedBucket)

        .remove([claimed.object_path])

      if (removeError) {
        throw removeError
      }

      const { error: completeError } = await admin

        .from("storage_cleanup_queue")

        .update({
          status: "completed",

          last_error: null,

          processed_at: new Date().toISOString(),
        })

        .eq("id", claimed.id)

      if (completeError) throw completeError

      summary.deleted += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      await markFailed(claimed.id, attempts, message)

      summary.failed += 1
    }
  }

  return summary
}

serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "POST required" }, 405)
  }

  if (request.headers.get("x-cleanup-secret") !== cleanupSecret) {
    return json({ error: "Unauthorized" }, 401)
  }

  try {
    const url = new URL(request.url)

    let body: Record<string, unknown> = {}

    try {
      body = await request.json()
    } catch {
      // Empty request bodies are allowed.
    }

    const requestedLimit = Number(body.limit ?? url.searchParams.get("limit"))

    const limit = Math.min(
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : defaultLimit,

      maxLimit,
    )

    const requestedAge = Number(
      body.minimumAgeHours ?? url.searchParams.get("minimumAgeHours"),
    )

    const minimumAgeHours = getNonNegativeNumber(
      Number.isFinite(requestedAge) ? String(requestedAge) : null,

      defaultMinimumAgeHours,
    )

    const result = await processQueue(limit, minimumAgeHours)

    return json({
      ok: true,
      buckets: bucketIds,
      minimumAgeHours,
      ...result,
    })
  } catch (error) {
    console.error(error)

    return json(
      {
        ok: false,

        error: error instanceof Error ? error.message : String(error),
      },

      500,
    )
  }
})

void getPositiveInteger
