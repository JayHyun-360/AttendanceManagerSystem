"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { MyFinesPage, type FineRecord } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";
import {
  buildAttendanceSessionRecords,
  type FineEventLike,
  type FineRowLike,
  type FineScanLike,
} from "@/lib/attendance-fines";

export default function MyFinesRoutePage() {
  const router = useRouter();
  const { authUserId, showFees } = useProtectedUser();
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFines() {
      try {
        if (!authUserId) {
          return;
        }

        const [
          { data, error },
          { data: scans, error: scansError },
          { data: profile, error: profileError },
          { data: events, error: eventsError },
        ] =
          await Promise.all([
            supabase
              .from("fines")
              .select("*, events(title, event_date)")
              .eq("student_id", authUserId)
              .order("created_at", { ascending: false }),
            supabase
              .from("attendance_scans")
              .select(
                "id, event_id, session_label, status, scan_in_at, events(title, event_date, absent_fine, late_fine, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine)",
              )
              .eq("student_id", authUserId),
            supabase.from("profiles").select("program").eq("id", authUserId).single(),
            supabase
              .from("events")
              .select(
                "id, title, event_date, status, program, multi_session, absent_fine, late_fine, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine",
              ),
          ]);

        if (error) {
          console.error(error);
          return;
        }
        if (scansError) {
          console.error(scansError);
          return;
        }
        if (profileError) {
          console.error(profileError);
          return;
        }
        if (eventsError) {
          console.error(eventsError);
          return;
        }

        if (!cancelled) {
          const storedFines = (data ?? []).map((row: any) => ({
            id: String(row.id),
            eventId: row.event_id,
            attendanceScanId: row.attendance_scan_id ?? undefined,
            sessionLabel: row.session_label ?? undefined,
            reason: row.reason ?? undefined,
            eventTitle: row.events?.title ?? "Event",
            eventDate: row.events?.event_date ?? "",
            amount: Number(row.amount || 0),
            status: row.status || "unpaid",
          }));
          const records = buildAttendanceSessionRecords(
            (events ?? []) as FineEventLike[],
            (scans ?? []) as FineScanLike[],
            (data ?? []) as FineRowLike[],
            profile?.program,
          );
          const canonicalFines = records
            .filter((record) => record.fineAmount > 0)
            .map((record) => {
              const event = (events ?? []).find((item: any) => item.id === record.eventId);
              return {
                id: record.fineId ?? `inferred-${record.key}`,
                eventId: record.eventId,
                attendanceScanId: record.scan?.id,
                sessionLabel: record.sessionLabel,
                reason: record.status === "late" ? "Late attendance" : "Absent attendance",
                eventTitle: event?.title ?? "Event",
                eventDate: event?.event_date ?? "",
                amount: record.fineAmount,
                status: "unpaid" as const,
              };
            });
          const historicalFines = storedFines.filter((fine) => fine.status !== "unpaid");
          setFines([...canonicalFines, ...historicalFines]);
        }
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFines();

    const finesChannel = subscribeToTableChanges("fines", () => {
      if (!cancelled) {
        void loadFines();
      }
    });

    return () => {
      cancelled = true;
      void finesChannel.unsubscribe();
    };
  }, [authUserId]);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <MyFinesPage
      fines={fines}
      showFees={showFees}
      onBack={() => router.push("/dashboard")}
    />
  );
}
