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
  const { user, authUserId } = useProtectedUser();
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
              multiSession: Boolean(row.multi_session ?? row.multiSession),
              strictMorning: Boolean(row.strict_morning ?? row.strictMorning),
              strictAfternoon: Boolean(
                row.strict_afternoon ?? row.strictAfternoon,
              ),
              morningStart: row.morning_start ?? row.morningStart ?? undefined,
              morningEnd: row.morning_end ?? row.morningEnd ?? undefined,
              morningLateCutoff:
                row.morning_late_cutoff ?? row.morningLateCutoff ?? undefined,
              afternoonStart:
                row.afternoon_start ?? row.afternoonStart ?? undefined,
              afternoonEnd: row.afternoon_end ?? row.afternoonEnd ?? undefined,
              afternoonLateCutoff:
                row.afternoon_late_cutoff ??
                row.afternoonLateCutoff ??
                undefined,
              absentFine: Number(row.absent_fine ?? row.absentFine ?? 0),
              lateFine: Number(row.late_fine ?? row.lateFine ?? 0),
              morningAbsentFine: Number(
                row.morning_absent_fine ?? row.morningAbsentFine ?? 0,
              ),
              morningLateFine: Number(
                row.morning_late_fine ?? row.morningLateFine ?? 0,
              ),
              afternoonAbsentFine: Number(
                row.afternoon_absent_fine ?? row.afternoonAbsentFine ?? 0,
              ),
              afternoonLateFine: Number(
                row.afternoon_late_fine ?? row.afternoonLateFine ?? 0,
              ),
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

  return <AdminScannerPage events={events} scannerId={authUserId} />;
}
