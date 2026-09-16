"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { MyFinesPage, type FineRecord } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

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

        const [{ data, error }, { data: scans, error: scansError }] =
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
          ]);

        if (error) {
          console.error(error);
          return;
        }
        if (scansError) {
          console.error(scansError);
          return;
        }

        if (!cancelled) {
          const storedFines = (data ?? []).map((row: any) => ({
              id: String(row.id),
              eventId: row.event_id,
              attendanceScanId: row.attendance_scan_id ?? undefined,
              eventTitle: row.events?.title ?? "Event",
              eventDate: row.events?.event_date ?? "",
              amount: Number(row.amount || 0),
              status: row.status || "unpaid",
            }));
          const linkedScanIds = new Set(
            storedFines.map((fine) => fine.attendanceScanId).filter(Boolean),
          );
          const recoveredFines = (scans ?? [])
            .filter(
              (scan: any) =>
                !linkedScanIds.has(scan.id) &&
                (scan.status === "absent" || scan.status === "late"),
            )
            .map((scan: any) => {
              const event = scan.events;
              const amount =
                scan.status === "absent"
                  ? scan.session_label === "afternoon"
                    ? Number(event?.afternoon_absent_fine ?? event?.absent_fine ?? 0)
                    : Number(event?.morning_absent_fine ?? event?.absent_fine ?? 0)
                  : scan.session_label === "afternoon"
                    ? Number(event?.afternoon_late_fine ?? event?.late_fine ?? 0)
                    : Number(event?.morning_late_fine ?? event?.late_fine ?? 0);
              return {
                id: `recovered-${scan.id}`,
                eventId: scan.event_id,
                attendanceScanId: scan.id,
                eventTitle: event?.title ?? "Event",
                eventDate: event?.event_date ?? "",
                amount,
                status: "unpaid" as const,
              };
            })
            .filter((fine) => fine.amount > 0);
          setFines([...storedFines, ...recoveredFines]);
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
