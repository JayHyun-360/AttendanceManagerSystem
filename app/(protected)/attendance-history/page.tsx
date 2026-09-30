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
import { getPublicSystemSettings } from "@/lib/systemSettings";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";
import { toast } from "sonner";
import { uploadExcuseAttachment } from "@/lib/uploadImage";
import {
  buildAttendanceSessionRecords,
  type FineEventLike,
  type FineRowLike,
  type FineScanLike,
} from "@/lib/attendance-fines";

type ManilaClock = {
  date: string;
  minutes: number;
};

function getManilaClock(now: Date): ManilaClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour"));

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: hour * 60 + Number(value("minute")),
  };
}

function hasSessionEnded(
  eventDate: string | null | undefined,
  sessionEnd: string | null | undefined,
  manilaNow: ManilaClock,
) {
  if (!eventDate) return false;
  if (eventDate < manilaNow.date) return true;
  if (eventDate > manilaNow.date || !sessionEnd) return false;

  const match = sessionEnd.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return false;

  return Number(match[1]) * 60 + Number(match[2]) <= manilaNow.minutes;
}

export default function AttendanceHistoryRoutePage() {
  const router = useRouter();
  const { authUserId, showFees } = useProtectedUser();
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allowExcuseRequests, setAllowExcuseRequests] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoadError(null);
        if (!authUserId) {
          setLoadError("Your account session is not ready. Please try again.");
          return;
        }

        const [
          finesResult,
          excuseResult,
          attendanceResult,
          profileResult,
          eventsResult,
          settingsResult,
        ] = await Promise.all([
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
          supabase
            .from("profiles")
            .select("program")
            .eq("id", authUserId)
            .single(),
          supabase
            .from("events")
            .select(
              "id, title, event_date, status, program, multi_session, sanctions_enabled, start_time, end_time, morning_end, afternoon_end, absent_fine, late_fine, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine",
            ),
          getPublicSystemSettings(),
        ]);

        if (finesResult.error) {
          console.error(finesResult.error);
        }

        if (excuseResult.error) {
          console.error(excuseResult.error);
        }

        if (attendanceResult.error) {
          console.error(attendanceResult.error);
        }
        if (profileResult.error) console.error(profileResult.error);
        if (eventsResult.error) console.error(eventsResult.error);
        if (settingsResult.error) console.error(settingsResult.error);

        const queryError =
          finesResult.error ||
          excuseResult.error ||
          attendanceResult.error ||
          profileResult.error ||
          eventsResult.error ||
          settingsResult.error;
        if (queryError) {
          setLoadError("Your attendance records could not be loaded.");
          return;
        }

        if (cancelled) {
          return;
        }

        const settings = settingsResult.data?.settings as {
          allowExcuseRequests?: boolean;
        } | null;
        setAllowExcuseRequests(settings?.allowExcuseRequests ?? true);

        const storedFines = (finesResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          eventId: row.event_id,
          attendanceScanId: row.attendance_scan_id ?? undefined,
          sessionLabel: row.session_label ?? undefined,
          eventTitle: row.events?.title ?? "Event",
          eventDate: row.events?.event_date ?? "",
          amount: Number(row.amount || 0),
          reason: row.reason ?? undefined,
          status: row.status || "unpaid",
        }));

        setExcuseRequests(
          (excuseResult.data ?? []).map((row: any) => ({
            id: String(row.id),
            studentName: "You",
            studentId: authUserId,
            event: row.events?.title ?? "Attendance event",
            eventId: row.event_id ?? undefined,
            fineId: row.fine_id ?? undefined,
            sessionLabel: row.session_label ?? undefined,
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

        const storedAttendance = (attendanceResult.data ?? []).map(
          (row: any, index: number) => ({
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
          }),
        );
        const scannedSessionKeys = new Set(
          (attendanceResult.data ?? []).map(
            (row: any) => `${row.event_id}:${row.session_label}`,
          ),
        );
        const manilaNow = getManilaClock(new Date());
        const todayKey = manilaNow.date;
        const inferredAttendance = (eventsResult.data ?? []).flatMap(
          (event: any) => {
            if (
              event.event_date > todayKey ||
              event.status === "upcoming" ||
              (event.program &&
                event.program !== "All Programs" &&
                event.program !== profileResult.data?.program)
            ) {
              return [];
            }
            const sessions: ("morning" | "afternoon")[] = event.multi_session
              ? ["morning", "afternoon"]
              : ["morning"];
            return sessions
              .filter((sessionLabel) => {
                const sessionEnd = event.multi_session
                  ? sessionLabel === "morning"
                    ? event.morning_end
                    : event.afternoon_end
                  : (event.morning_end ?? event.end_time);

                return (
                  !scannedSessionKeys.has(`${event.id}:${sessionLabel}`) &&
                  hasSessionEnded(event.event_date, sessionEnd, manilaNow)
                );
              })
              .map((sessionLabel) => ({
                id: `inferred-${event.id}-${sessionLabel}`,
                eventId: event.id,
                event: event.title ?? "Event",
                sessionLabel,
                date: event.event_date ?? "",
                time: "—",
                status: "absent" as const,
              }));
          },
        );
        const records = buildAttendanceSessionRecords(
          (eventsResult.data ?? []) as FineEventLike[],
          (attendanceResult.data ?? []) as FineScanLike[],
          (finesResult.data ?? []) as FineRowLike[],
          profileResult.data?.program,
          new Date().toISOString().slice(0, 10),
          Boolean(
            (settingsResult.data?.settings as { finesEnabled?: boolean } | null)
              ?.finesEnabled,
          ),
          new Set(
            (excuseResult.data ?? [])
              .filter(
                (row: any) =>
                  row.status === "approved" &&
                  row.event_id &&
                  row.session_label,
              )
              .map((row: any) => `${row.event_id}:${row.session_label}`),
          ),
        );
        const canonicalFines = records
          .filter((record) => record.fineId && record.fineAmount > 0)
          .map((record) => {
            const event = (eventsResult.data ?? []).find(
              (item: any) => item.id === record.eventId,
            );
            return {
              id: record.fineId ?? `inferred-fine-${record.key}`,
              eventId: record.eventId,
              attendanceScanId: record.scan?.id,
              sessionLabel: record.sessionLabel,
              eventTitle: event?.title ?? "Event",
              eventDate: event?.event_date ?? "",
              amount: record.fineAmount,
              reason:
                record.status === "late"
                  ? "Late attendance"
                  : "Absent attendance",
              status: "unpaid" as const,
            };
          });
        const historicalFines = storedFines.filter(
          (fine) => fine.status !== "unpaid",
        );
        const sanctionedBySession = new Map(
          records.map((record) => [record.key, record.sanctioned]),
        );
        const attendanceWithSanctions = [
          ...storedAttendance,
          ...inferredAttendance,
        ].map((record) => ({
          ...record,
          sanctioned:
            sanctionedBySession.get(
              `${record.eventId}:${record.sessionLabel ?? "morning"}`,
            ) ?? false,
        }));
        setFines([...canonicalFines, ...historicalFines]);
        setAttendanceRecords(attendanceWithSanctions);
      } catch (caughtError) {
        console.error(caughtError);
        if (!cancelled)
          setLoadError("Your attendance records could not be loaded.");
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

  const handleSubmitExcuse = async (
    record: ExcuseRequest,
  ): Promise<boolean> => {
    if (!authUserId) {
      toast.error("Your session is not ready. Please try again.");
      return false;
    }

    if (!record.eventId || !record.sessionLabel) {
      toast.error(
        "The event session could not be identified. Please refresh and try again.",
      );
      return false;
    }

    let documentPath: string | null = null;
    if (record.attachmentFile) {
      const uploaded = await uploadExcuseAttachment(
        record.attachmentFile,
        authUserId,
      );

      if ("error" in uploaded) {
        toast.error(uploaded.error);
        return false;
      }

      documentPath = uploaded.path;
    }

    const { error } = await supabase.rpc("submit_excuse_request", {
      p_event_id: record.eventId,
      p_session_label: record.sessionLabel,
      p_reason: record.reason,
      p_document_path: documentPath,
    });

    if (error) {
      console.error(error);
      toast.error(
        "Your excuse request could not be submitted. Please try again.",
      );
      return false;
    }

    toast.success("Excuse request submitted for review.");
    router.refresh();
    return true;
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
      allowExcuseRequests={allowExcuseRequests}
      onSubmitExcuse={handleSubmitExcuse}
      onBack={() => router.push("/dashboard")}
      attendanceRecords={attendanceRecords}
    />
  );
}
