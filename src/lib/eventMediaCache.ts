import { supabase } from "./supabase"

const STORAGE_KEY = "attendance-event-media-cache:v1"
const CACHE_TTL_MS = 5 * 60 * 1000

type EventMediaCacheEntry = {
  mediaUrls: string[]

  cachedAt: number
}

const cache = new Map<string, EventMediaCacheEntry>()

function isCacheEntry(value: unknown): value is EventMediaCacheEntry {
  if (!value || typeof value !== "object") return false

  const entry = value as Record<string, unknown>
  return (
    Array.isArray(entry.mediaUrls) &&
    entry.mediaUrls.every((url) => typeof url === "string") &&
    Number.isFinite(entry.cachedAt)
  )
}

function isFresh(entry: EventMediaCacheEntry, now = Date.now()): boolean {
  return entry.cachedAt > now - CACHE_TTL_MS
}

function readSessionCache(): Map<string, EventMediaCacheEntry> {
  if (typeof window === "undefined") return cache

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)

    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {}

    const nextCache = new Map<string, EventMediaCacheEntry>()

    const now = Date.now()
    let removedExpiredEntries = false

    for (const [eventId, entry] of Object.entries(parsed)) {
      if (
        typeof eventId === "string" &&
        isCacheEntry(entry) &&
        isFresh(entry, now)
      ) {
        nextCache.set(eventId, entry)
      } else {
        removedExpiredEntries = true
      }
    }

    cache.clear()
    for (const [eventId, entry] of nextCache) cache.set(eventId, entry)

    if (removedExpiredEntries) writeSessionCache()

    return cache
  } catch {
    return cache
  }
}

function writeSessionCache() {
  if (typeof window === "undefined") return

  try {
    const entries = Object.fromEntries(cache.entries())

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // session storage may be unavailable; the in-memory cache remains intact.
  }
}

export function getCachedEventMedia(eventId: string): string[] | null {
  const entry = readSessionCache().get(eventId)
  return entry?.mediaUrls ?? null
}

export function invalidateEventMedia(eventId: string): void {
  readSessionCache().delete(eventId)
  writeSessionCache()
}

export async function loadEventMedia(eventId: string): Promise<string[]> {
  const cached = getCachedEventMedia(eventId)

  if (cached) return cached

  const { data, error } = await supabase

    .from("events")

    .select("media_urls")

    .eq("id", eventId)

    .maybeSingle()

  if (error) {
    console.error("Failed to load event gallery media", error)

    return []
  }

  const mediaUrls = Array.isArray(data?.media_urls) ? data.media_urls : []

  cache.set(eventId, { mediaUrls, cachedAt: Date.now() })

  writeSessionCache()

  return mediaUrls
}
