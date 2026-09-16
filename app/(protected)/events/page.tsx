"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { EventsPage, type EventData, type Page } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function EventsRoutePage() {
  const router = useRouter();
  const { user, showFees } = useProtectedUser();
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const [{ data, error }, { data: scans, error: scansError }] =
          await Promise.all([
            supabase.from("events").select("*").order("event_date", { ascending: false }),
            supabase.from("attendance_scans").select("event_id, student_id, status"),
          ]);

        if (error) {
          console.error(error);
          return;
        }
        if (scansError) console.error(scansError);

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
              fineAmount: row.multi_session
                ? Number(row.morning_absent_fine ?? 0) +
                  Number(row.afternoon_absent_fine ?? 0)
                : Number(row.absent_fine ?? 0),
              status: row.status || "upcoming",
              attendees: new Set(
                (scans ?? [])
                  .filter(
                    (scan: any) =>
                      scan.event_id === row.id &&
                      (scan.status === "present" || scan.status === "late"),
                  )
                  .map((scan: any) => scan.student_id),
              ).size,
              highlightUrl:
                row.image_url && !row.image_url.startsWith("blob:")
                  ? row.image_url
                  : undefined,
              mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
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
    const attendanceChannel = subscribeToTableChanges("attendance_scans", () => {
      if (!cancelled) void loadEvents();
    });

    return () => {
      cancelled = true;
      void eventsChannel.unsubscribe();
      void attendanceChannel.unsubscribe();
    };
  }, []);

  const onNav = (page: Page) => {
    if (page === "event-detail") {
      router.push("/events");
      return;
    }

    router.push(page === "dashboard" ? "/dashboard" : "/events");
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <EventsPage onNav={onNav} user={user} showFees={showFees} events={events} />
  );
}
