import { supabase } from "@/lib/supabase"

export type Program = {
  id: string

  name: string

  active: boolean

  sort_order: number

  legacy_aliases: string[]
}

type ProgramQueryResult = Awaited<ReturnType<typeof queryProgramCatalog>>

async function queryProgramCatalog() {
  return supabase

    .from("programs")

    .select("id, name, active, sort_order, legacy_aliases")

    .order("sort_order", { ascending: true })

    .order("name", { ascending: true })
}

const CACHE_DURATION_MS = 60_000

let cachedRequest: {
  promise: Promise<ProgramQueryResult>

  expiresAt: number

  pending: boolean
} | null = null

export function getProgramCatalog(): Promise<ProgramQueryResult> {
  if (
    cachedRequest &&
    (cachedRequest.pending || Date.now() < cachedRequest.expiresAt)
  ) {
    return cachedRequest.promise
  }

  const promise = queryProgramCatalog()

  const entry = {
    promise,

    expiresAt: 0,

    pending: true,
  }

  cachedRequest = entry

  void promise.then(
    (result) => {
      if (cachedRequest !== entry) return

      if (result.error) {
        cachedRequest = null

        return
      }

      entry.pending = false

      entry.expiresAt = Date.now() + CACHE_DURATION_MS
    },

    () => {
      if (cachedRequest === entry) cachedRequest = null
    },
  )

  return promise
}

export function invalidateProgramCatalogCache() {
  cachedRequest = null
}
