"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { EventsPage, type EventData, type Page } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

function EventsSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32 rounded-md" />
        <Skeleton className="h-3.5 w-56 rounded-md" />
      </div>

      <div className="flex gap-2 overflow-hidden pb-1">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-8 w-20 shrink-0 rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <article
            key={item}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
              <Skeleton className="h-full w-full rounded-none" />
              <Skeleton className="absolute left-3 top-3 h-5 w-16 rounded-full" />
              <div className="absolute right-3 top-3 flex gap-1.5">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>

            <div className="flex min-h-[190px] flex-1 flex-col justify-between gap-3 p-4 md:p-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-5/6 rounded-md" />
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

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
            supabase
              .from("attendance_scans")
              .select("event_id, student_id, status, scan_in_at"),
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
                      (scan.status === "present" || scan.status === "late") &&
                      !!scan.scan_in_at,
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
    return <EventsSkeleton />;
  }

  return (
    <EventsPage onNav={onNav} user={user} showFees={showFees} events={events} />
  );
}
