import { supabase } from "@/lib/supabase";

export function subscribeToTableChanges(
  table: string,
  callback: () => void,
  event: "*" | "INSERT" | "UPDATE" | "DELETE" = "*",
) {
  const channel = supabase.channel(`${table}-changes`);

  channel.on(
    "postgres_changes",
    {
      event,
      schema: "public",
      table,
    },
    () => {
      callback();
    },
  );

  void channel.subscribe();

  return channel;
}
