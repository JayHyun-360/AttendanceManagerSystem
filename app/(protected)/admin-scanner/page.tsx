"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminScannerPage, type EventData } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function AdminScannerRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("event_date", { ascending: false });

        if (error) {
          console.error(error);
          return;
        }

        if (!cancelled) {
          setEvents(
            (data ?? []).map((row: any) => ({
              id: String(row.id),
              title: row.title,
              date: row.event_date,
              time:
                row.start_time && row.end_time
                  ? `${row.start_time}–${row.end_time}`
                  : "",
              location: row.location,
              description: row.description,
              program: row.program || "All Programs",
              fineAmount: row.absent_fine || 0,
              status: row.status || "upcoming",
              attendees: 0,
              highlightUrl:
                row.image_url && !row.image_url.startsWith("blob:")
                  ? row.image_url
                  : undefined,
            })),
          );
        }
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();

    const eventsChannel = subscribeToTableChanges("events", () => {
      if (!cancelled) {
        void loadEvents();
      }
    });

    return () => {
      cancelled = true;
      void eventsChannel.unsubscribe();
    };
  }, [router, user]);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-36 rounded-lg" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return <AdminScannerPage events={events} />;
}
