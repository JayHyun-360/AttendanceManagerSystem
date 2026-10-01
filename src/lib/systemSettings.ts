import { supabase } from "@/lib/supabase";

export function isGoogleFormsResponderUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    if (url.hostname === "forms.gle") {
      return /^\/[\w-]+\/?$/.test(url.pathname);
    }
    if (url.hostname !== "docs.google.com") return false;
    return /^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?[^/]+\/viewform\/?$/.test(
      url.pathname,
    );
  } catch {
    return false;
  }
}

async function querySystemSettings() {
  return supabase
    .from("system_settings")
    .select("settings")
    .eq("id", 1)
    .maybeSingle();
}

type SettingsResult = Awaited<ReturnType<typeof querySystemSettings>>;

const CACHE_DURATION_MS = 30_000;

let cachedRequest: {
  promise: Promise<SettingsResult>;
  expiresAt: number;
  pending: boolean;
} | null = null;

export function getPublicSystemSettings(): Promise<SettingsResult> {
  if (
    cachedRequest &&
    (cachedRequest.pending || Date.now() < cachedRequest.expiresAt)
  ) {
    return cachedRequest.promise;
  }

  const promise = querySystemSettings();
  const entry = {
    promise,
    expiresAt: 0,
    pending: true,
  };
  cachedRequest = entry;

  void entry.promise.then(
    (result) => {
      if (cachedRequest !== entry) return;
      if (result.error) {
        cachedRequest = null;
        return;
      }

      entry.pending = false;
      entry.expiresAt = Date.now() + CACHE_DURATION_MS;
    },
    () => {
      if (cachedRequest === entry) cachedRequest = null;
    },
  );

  return entry.promise;
}

export function invalidatePublicSystemSettingsCache() {
  cachedRequest = null;
}
