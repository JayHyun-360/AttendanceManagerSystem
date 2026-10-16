import { supabase } from "@/lib/supabase"

export function subscribeToAdminTableChanges(
  isAdmin: boolean,
  table: string,
  callback: () => void,
  event: "*" | "INSERT" | "UPDATE" | "DELETE" = "*",
) {
  if (!isAdmin) return null

  const channel = supabase.channel(`${table}-changes`)

  channel.on(
    "postgres_changes",

    {
      event,

      schema: "public",

      table,
    },

    () => {
      callback()
    },
  )

  void channel.subscribe()

  return channel
}
