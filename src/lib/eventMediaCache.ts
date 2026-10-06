import { supabase } from "./supabase";

const STORAGE_KEY = "attendance-event-media-cache:v1";

type EventMediaCacheEntry = {
  mediaUrls: string[];
  cachedAt: number;
};

const cache = new Map<string, EventMediaCacheEntry>();

function isCacheEntry(value: unknown): value is EventMediaCacheEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Record<string, unknown>;
  return Array.isArray(entry.mediaUrls) && typeof entry.cachedAt === "number";
}

function readSessionCache(): Map<string, EventMediaCacheEntry> {
  if (typeof window === "undefined") return cache;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const nextCache = new Map<string, EventMediaCacheEntry>();

    for (const [eventId, entry] of Object.entries(parsed)) {
      if (typeof eventId === "string" && isCacheEntry(entry)) {
        nextCache.set(eventId, entry);
      }
    }

    cache.clear();
    for (const [eventId, entry] of nextCache) cache.set(eventId, entry);
    return cache;
  } catch {
    return cache;
  }
}

function writeSessionCache() {
  if (typeof window === "undefined") return;

  try {
    const entries = Object.fromEntries(cache.entries());
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // session storage may be unavailable; the in-memory cache remains intact.
  }
}

export function getCachedEventMedia(eventId: string): string[] | null {
  const entry = readSessionCache().get(eventId);
  return entry?.mediaUrls ?? null;
}

export async function loadEventMedia(eventId: string): Promise<string[]> {
  const cached = getCachedEventMedia(eventId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("events")
    .select("media_urls")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load event gallery media", error);
    return [];
  }

  const mediaUrls = Array.isArray(data?.media_urls) ? data.media_urls : [];
  cache.set(eventId, { mediaUrls, cachedAt: Date.now() });
  writeSessionCache();
  return mediaUrls;
}
