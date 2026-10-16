"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import { FeedbackState } from "@/components/ui/feedback";

import { MyFinesPage, type FineRecord } from "../../shared-page";

import { supabase } from "@/lib/supabase";

import { getPublicSystemSettings } from "@/lib/systemSettings";

import { useProtectedUser } from "../layout";

import {
  buildAttendanceSessionRecords,
  getSchoolDate,
  type FineEventLike,
  type FineRowLike,
  type FineScanLike,
} from "@/lib/attendance-fines";

const EVENT_PAGE_SIZE = 25;

export default function MyFinesRoutePage() {
  const router = useRouter();

  const { authUserId, showFees } = useProtectedUser();

  const [fines, setFines] = useState<FineRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [eventPage, setEventPage] = useState(1);

  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!showFees) {
      setIsLoading(false);

      return () => {
        cancelled = true;
      };
    }

    async function loadFines() {
      try {
        if (!cancelled) setIsLoading(true);
        if (!cancelled) setLoadError(null);

        if (!authUserId) {
          return;
        }

        const [profileResult, settingsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("program")
            .eq("id", authUserId)
            .single(),
          getPublicSystemSettings(),
        ]);

        let eventsQuery = supabase
          .from("events")
          .select(
            "id, title, event_date, end_time, morning_end, afternoon_end, status, program, multi_session, absent_fine, late_fine, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine",
            { count: "exact" },
          )
          .lte("event_date", getSchoolDate())
          .neq("status", "upcoming")
          .neq("status", "cancelled")
          .order("event_date", { ascending: false })
          .order("id", { ascending: true });

        if (profileResult.data?.program) {
          eventsQuery = eventsQuery.or(
            `program.eq.All Programs,program.is.null,program.eq.${profileResult.data.program}`,
          );
        }

        const eventsResult = await eventsQuery.range(
          (eventPage - 1) * EVENT_PAGE_SIZE,
          eventPage * EVENT_PAGE_SIZE - 1,
        );

        const eventIds = (eventsResult.data ?? []).map((event) => event.id);
        const [
          { data, error },
          { data: scans, error: scansError },
          { data: excuses, error: excusesError },
        ] = await Promise.all([
          eventIds.length
            ? supabase
                .from("fines")
                .select("*, events(title, event_date)")
                .eq("student_id", authUserId)
                .in("event_id", eventIds)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          eventIds.length
            ? supabase
                .from("attendance_scans")
                .select(
                  "id, event_id, session_label, status, scan_in_at, events(title, event_date, absent_fine, late_fine, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine)",
                )
                .eq("student_id", authUserId)
                .in("event_id", eventIds)
            : Promise.resolve({ data: [], error: null }),
          eventIds.length
            ? supabase
                .from("excuse_requests")
                .select("event_id, session_label, status")
                .eq("student_id", authUserId)
                .eq("status", "approved")
                .in("event_id", eventIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        setEventCount(eventsResult.count ?? 0);

        const queryError =
          error ||
          scansError ||
          profileResult.error ||
          eventsResult.error ||
          settingsResult.error ||
          excusesError;

        if (queryError) {
          console.error(queryError);

          if (!cancelled) {
            setLoadError("Attendance charge records could not be loaded.");
          }

          return;
        }

        if (!cancelled) {
          const events = eventsResult.data ?? [];
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
            events as FineEventLike[],

            (scans ?? []) as FineScanLike[],

            (data ?? []) as FineRowLike[],

            profileResult.data?.program,

            getSchoolDate(),

            Boolean(
              (
                settingsResult.data?.settings as {
                  finesEnabled?: boolean;
                } | null
              )?.finesEnabled,
            ),

            new Set(
              (excuses ?? [])

                .filter(
                  (request: any) => request.event_id && request.session_label,
                )

                .map(
                  (request: any) =>
                    `${request.event_id}:${request.session_label}`,
                ),
            ),
          );

          const canonicalFines = records

            .filter((record) => record.fineId && record.fineAmount > 0)

            .map((record) => {
              const event = events.find(
                (item: any) => item.id === record.eventId,
              );

              return {
                id: record.fineId ?? `inferred-${record.key}`,

                eventId: record.eventId,

                attendanceScanId: record.scan?.id,

                sessionLabel: record.sessionLabel,

                reason:
                  record.status === "late"
                    ? "Late attendance"
                    : "Absent attendance",

                eventTitle: event?.title ?? "Event",

                eventDate: event?.event_date ?? "",

                amount: record.fineAmount,

                status: "unpaid" as const,
              };
            });

          const historicalFines = storedFines.filter(
            (fine) => fine.status !== "unpaid",
          );

          setFines([...canonicalFines, ...historicalFines]);
        }
      } catch (caughtError) {
        console.error(caughtError);

        if (!cancelled) {
          setLoadError("Attendance charge records could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFines();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        void loadFines();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authUserId, eventPage, showFees]);

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

  if (loadError) {
    return (
      <FeedbackState
        title="Attendance charges unavailable"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <MyFinesPage
      fines={fines}
      showFees={showFees}
      onBack={() => router.push("/dashboard")}
      page={eventPage}
      pageSize={EVENT_PAGE_SIZE}
      totalCount={eventCount}
      onPageChange={setEventPage}
    />
  );
}
