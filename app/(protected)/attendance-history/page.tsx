"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AttendanceHistoryPage,
  type ExcuseRequest,
  type FineRecord,
} from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function AttendanceHistoryRoutePage() {
  const router = useRouter();
  const { authUserId, showFees } = useProtectedUser();
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoadError(null);
        if (!authUserId) {
          return;
        }

        const [finesResult, excuseResult, attendanceResult] = await Promise.all(
          [
            supabase
              .from("fines")
              .select("*")
              .eq("student_id", authUserId)
              .order("created_at", { ascending: false }),
            supabase
              .from("excuse_requests")
              .select("*, events(title)")
              .eq("student_id", authUserId)
              .order("created_at", { ascending: false }),
            supabase
              .from("attendance_scans")
              .select("*, events(title, event_date, start_time, end_time)")
              .eq("student_id", authUserId)
              .order("scan_in_at", { ascending: false }),
          ],
        );

        if (finesResult.error) {
          console.error(finesResult.error);
        }

        if (excuseResult.error) {
          console.error(excuseResult.error);
        }

        if (attendanceResult.error) {
          console.error(attendanceResult.error);
        }

        const queryError =
          finesResult.error || excuseResult.error || attendanceResult.error;
        if (queryError) {
          setLoadError("Your attendance records could not be loaded.");
          return;
        }

        if (cancelled) {
          return;
        }

        setFines(
          (finesResult.data ?? []).map((row: any) => ({
            id: String(row.id),
            eventId: row.event_id,
            attendanceScanId: row.attendance_scan_id ?? undefined,
            eventTitle: row.events?.title ?? "Event",
            eventDate: row.events?.event_date ?? "",
            amount: Number(row.amount || 0),
            status: row.status || "unpaid",
          })),
        );

        setExcuseRequests(
          (excuseResult.data ?? []).map((row: any) => ({
            id: String(row.id),
            studentName: "You",
            studentId: authUserId,
            event: row.events?.title ?? "Attendance event",
            eventId: row.event_id ?? undefined,
            fineId: row.fine_id ?? undefined,
            date: row.created_at,
            reason: row.reason,
            proofName: row.document_url ? "Supporting document" : null,
            status: row.status,
            submittedDate: new Date(row.created_at).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            ),
          })),
        );

        setAttendanceRecords(
          (attendanceResult.data ?? []).map((row: any, index: number) => ({
            id: String(row.id ?? index),
            eventId: row.event_id,
            event: row.events?.title ?? "Event",
            sessionLabel: row.session_label,
            date: row.events?.event_date ?? "",
            time: row.scan_in_at
              ? new Date(row.scan_in_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—",
            status: row.status || "present",
          })),
        );
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    const finesChannel = subscribeToTableChanges("fines", () => {
      if (!cancelled) {
        void loadData();
      }
    });
    const excusesChannel = subscribeToTableChanges("excuse_requests", () => {
      if (!cancelled) {
        void loadData();
      }
    });
    const attendanceChannel = subscribeToTableChanges(
      "attendance_scans",
      () => {
        if (!cancelled) {
          void loadData();
        }
      },
    );

    return () => {
      cancelled = true;
      void finesChannel.unsubscribe();
      void excusesChannel.unsubscribe();
      void attendanceChannel.unsubscribe();
    };
  }, [authUserId]);

  const handleSubmitExcuse = async (record: ExcuseRequest) => {
    if (!authUserId) {
      return;
    }

    const { error } = await supabase.from("excuse_requests").insert({
      student_id: authUserId,
      event_id: record.eventId,
      attendance_scan_id: record.id,
      fine_id:
        fines.find(
          (fine) =>
            (fine.attendanceScanId === record.id ||
              fine.eventId === record.eventId) &&
            fine.status === "unpaid",
        )?.id ?? null,
      reason: record.reason,
      status: "pending",
      document_url: record.proofName,
    });

    if (error) {
      console.error(error);
      return;
    }

    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-16 w-full rounded-xl" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-red-800">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <AttendanceHistoryPage
      excuseRequests={excuseRequests}
      fines={fines}
      showFees={showFees}
      onSubmitExcuse={handleSubmitExcuse}
      onBack={() => router.push("/dashboard")}
      attendanceRecords={attendanceRecords}
    />
  );
}
