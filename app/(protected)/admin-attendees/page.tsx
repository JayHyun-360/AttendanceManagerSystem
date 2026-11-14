"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import {
  AdminAttendeesPage,
  type EventData,
  type Page,
} from "../../shared-page";

import { supabase } from "@/lib/supabase";
import { getStudentIdException } from "@/lib/profileCompletion";
import { isAttendanceSessionEligibleForAbsence } from "@/lib/attendance-fines";

import { getPublicSystemSettings } from "@/lib/systemSettings";

import { useProtectedUser } from "../layout";

import { FeedbackState } from "@/components/ui/feedback";

import { toast } from "sonner";

const QUERY_PAGE_SIZE = 100;

async function fetchAllPages(
  buildQuery: (from: number, to: number) => any,
  signal?: AbortSignal,
) {
  const rows: any[] = [];

  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const query = buildQuery(from, from + QUERY_PAGE_SIZE - 1);
    const { data, error } = await (signal
      ? query.abortSignal(signal)
      : query);
    if (error) throw error;

    rows.push(...(data ?? []));
    if (!data || data.length < QUERY_PAGE_SIZE) return rows;
  }
}

function AttendanceLoadingState() {
  return (
    <div className="space-y-3 pt-2">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <div className="flex gap-2">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function AdminAttendeesRoutePage() {
  return (
    <Suspense fallback={<AttendanceLoadingState />}>
      <AdminAttendeesRouteContent />
    </Suspense>
  );
}

function AdminAttendeesRouteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user } = useProtectedUser();

  const [events, setEvents] = useState<EventData[]>([]);

  const [students, setStudents] = useState<any[]>([]);

  const [scanState, setScanState] = useState<Record<string, any[]>>({});

  const [fineRows, setFineRows] = useState<any[]>([]);

  const [approvedExcuseKeys, setApprovedExcuseKeys] = useState<Set<string>>(
    new Set(),
  );

  const [isLoading, setIsLoading] = useState(true);

  const [isAttendanceRefreshing, setIsAttendanceRefreshing] = useState(false);

  const initialTab =
    searchParams.get("tab") === "duplicates" ? "duplicates" : "present";

  const hasLoadedAttendance = useRef(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState("");

  const [studentSearch, setStudentSearch] = useState("");

  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");

  const allEventsId = "__all_events__";

  useEffect(() => {
    const normalizedSearch = studentSearch.trim();

    if (!normalizedSearch) {
      setDebouncedStudentSearch("");
      return;
    }

    const timeoutId = window.setTimeout(
      () => setDebouncedStudentSearch(normalizedSearch),
      300,
    );

    return () => window.clearTimeout(timeoutId);
  }, [studentSearch]);

  const normalizedStudentSearch = debouncedStudentSearch.toLowerCase();
  const matchedStudentId =
    selectedEventId === allEventsId && normalizedStudentSearch
      ? (students.find((candidate) =>
          [
            candidate.name,
            candidate.id,
            candidate.program,
            candidate.section,
          ]
            .filter(Boolean)
            .some((value: string) =>
              value.toLowerCase().includes(normalizedStudentSearch),
            ),
        )?.profileId ?? null)
      : null;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        if (!cancelled) setLoadError(null);

        if (!user || user.role !== "admin") {
          router.push("/dashboard");

          return;
        }

        const [eventRows, studentRows, settingsResult] = await Promise.all([
          fetchAllPages((from, to) =>
            supabase
              .from("events")
              .select(
                "id, title, event_date, start_time, end_time, location, description, program, status, media_urls, image_url, multi_session, sanctions_enabled, morning_start, morning_end, afternoon_start, afternoon_end, absent_fine, late_fine, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine",
              )
              .is("archived_at", null)
              .order("event_date", { ascending: false })
              .order("id", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages((from, to) =>
            supabase
              .from("profiles")
              .select(
                "id, first_name, surname, email, student_id, program, year_level, section, phone, contact_email, photo_url, id_photo_url, created_at,student_id_exception_requests(status,requested_at,approved_by,approved_at,attendance_eligible_from,continued_at)",
              )
              .eq("role", "student")
              .order("surname", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to),
          ),
          getPublicSystemSettings(),
        ]);

        if (settingsResult.error) {
          console.error(settingsResult.error);
        }

        const finesEnabled = Boolean(
          (settingsResult.data?.settings as { finesEnabled?: boolean } | null)
            ?.finesEnabled,
        );

        if (cancelled) {
          return;
        }

        const mappedEvents = eventRows.map((row: any) => ({
          id: String(row.id),

          title: row.title,

          date: row.event_date,

          time:
            row.start_time && row.end_time
              ? `${row.start_time}–${row.end_time}`
              : "",

          endTime: row.end_time ?? undefined,

          startTime: row.start_time ?? undefined,

          location: row.location,

          description: row.description,

          program: row.program || "All Programs",

          fineAmount:
            finesEnabled && row.multi_session
              ? Number(row.morning_absent_fine ?? 0) +
                Number(row.afternoon_absent_fine ?? 0)
              : finesEnabled
                ? Number(row.absent_fine ?? 0)
                : 0,

          status: row.status || "upcoming",

          attendees: 0,

          mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],

          highlightUrl:
            row.image_url && !row.image_url.startsWith("blob:")
              ? row.image_url
              : undefined,

          multiSession: Boolean(row.multi_session),

          morningStart: row.morning_start ?? undefined,

          morningEnd: row.morning_end ?? undefined,

          afternoonStart: row.afternoon_start ?? undefined,

          afternoonEnd: row.afternoon_end ?? undefined,

          sanctionsEnabled: Boolean(row.sanctions_enabled),

          absentFine: finesEnabled ? Number(row.absent_fine ?? 0) : 0,

          lateFine: finesEnabled ? Number(row.late_fine ?? 0) : 0,

          morningAbsentFine: finesEnabled
            ? Number(row.morning_absent_fine ?? row.absent_fine ?? 0)
            : 0,

          morningLateFine: finesEnabled
            ? Number(row.morning_late_fine ?? row.late_fine ?? 0)
            : 0,

          afternoonAbsentFine: finesEnabled
            ? Number(row.afternoon_absent_fine ?? row.absent_fine ?? 0)
            : 0,

          afternoonLateFine: finesEnabled
            ? Number(row.afternoon_late_fine ?? row.late_fine ?? 0)
            : 0,
        }));

        setEvents(mappedEvents);
        setSelectedEventId((current) => current || mappedEvents[0]?.id || "");

        setStudents(
          studentRows.map((row: any) => ({
            profileId: row.id,

            name:
              `${row.first_name ?? ""} ${row.surname ?? ""}`.trim() ||
              row.email ||
              "Student",

            id: row.student_id || row.id,

            program: row.program || "",

            yearLevel: row.year_level || "",

            section: row.section || "",

            phone: row.phone || "",

            email: row.contact_email || row.email || "",

            photoUrl: row.photo_url || undefined,

            idPhotoUrl: row.id_photo_url || undefined,

            idException: getStudentIdException(row),

            joinedDate: new Date(row.created_at).toLocaleDateString("en-US", {
              month: "short",

              day: "numeric",

              year: "numeric",
            }),
          })),
        );
      } catch (caughtError) {
        console.error(caughtError);

        if (!cancelled) setLoadError("Attendance data could not be loaded.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        void loadData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, user]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadSelectedAttendance() {
      if (!selectedEventId || !students.length) return;

      setIsAttendanceRefreshing(true);
      try {
        let scanRows: any[];
        let fineQuery: any;
        let excuseQuery: any;

        if (selectedEventId === allEventsId) {
          const student = students.find(
            (candidate) => candidate.profileId === matchedStudentId,
          );

          if (!student) {
            setScanState({});
            setFineRows([]);
            setApprovedExcuseKeys(new Set());
            return;
          }

          scanRows = await fetchAllPages((from, to) =>
            supabase
              .from("attendance_scans")
              .select(
                "id, event_id, student_id, session_label, scan_in_at, status, student_profile:profiles!attendance_scans_student_id_fkey(student_id, first_name, surname, program, section, photo_url)",
              )
              .eq("student_id", student.profileId)
              .order("scan_in_at", { ascending: false })
              .range(from, to),
            controller.signal,
          );
          fineQuery = () =>
            fetchAllPages((from, to) =>
              supabase
                .from("fines")
                .select(
                  "id, attendance_scan_id, event_id, session_label, amount, status",
                )
                .eq("student_id", student.profileId)
                .range(from, to),
              controller.signal,
            );
          excuseQuery = () =>
            fetchAllPages((from, to) =>
              supabase
                .from("excuse_requests")
                .select("event_id, student_id, session_label")
                .eq("student_id", student.profileId)
                .eq("status", "approved")
                .range(from, to),
              controller.signal,
            );
        } else {
          scanRows = await fetchAllPages((from, to) =>
            supabase
              .from("attendance_scans")
              .select(
                "id, event_id, student_id, session_label, scan_in_at, status, student_profile:profiles!attendance_scans_student_id_fkey(student_id, first_name, surname, program, section, photo_url)",
              )
              .eq("event_id", selectedEventId)
              .order("scan_in_at", { ascending: false })
              .range(from, to),
            controller.signal,
          );
          fineQuery = () =>
            fetchAllPages((from, to) =>
              supabase
                .from("fines")
                .select(
                  "id, attendance_scan_id, event_id, session_label, amount, status",
                )
                .eq("event_id", selectedEventId)
                .in("status", ["unpaid", "paid", "excused"])
                .range(from, to),
              controller.signal,
            );
          excuseQuery = () =>
            fetchAllPages((from, to) =>
              supabase
                .from("excuse_requests")
                .select("event_id, student_id, session_label")
                .eq("event_id", selectedEventId)
                .eq("status", "approved")
                .range(from, to),
              controller.signal,
            );
        }

        const [fines, excuses] = await Promise.all([
          fineQuery(),
          excuseQuery(),
        ]);
        if (cancelled || controller.signal.aborted) return;

        const nextApprovedExcuseKeys = new Set<string>(
          excuses.map(
            (request: any) =>
              `${request.event_id}:${request.student_id}:${request.session_label}`,
          ),
        );
        const byEvent: Record<string, any[]> = {};
        const seenStudents = new Set<string>();

        for (const row of scanRows) {
          const eventId = String(row.event_id);
          const studentKey = `${eventId}:${row.student_id}:${row.session_label ?? "morning"}`;
          if (seenStudents.has(studentKey)) continue;
          seenStudents.add(studentKey);

          const profile = Array.isArray(row.student_profile)
            ? row.student_profile[0]
            : row.student_profile;
          const studentName =
            `${profile?.first_name ?? ""} ${profile?.surname ?? ""}`.trim();
          const studentId = profile?.student_id || row.student_id;
          const scanSessionLabel =
            row.session_label === "afternoon" ? "afternoon" : "morning";
          const scanEvent = events.find((event) => event.id === eventId);
          const scanStudent = students.find(
            (student) => student.profileId === row.student_id,
          );
          const attendanceEligible =
            scanEvent && scanStudent
              ? isAttendanceSessionEligibleForAbsence(
                  {
                    event_date: scanEvent.date,
                    multi_session: scanEvent.multiSession,
                    start_time: scanEvent.startTime,
                    morning_start: scanEvent.morningStart,
                    afternoon_start: scanEvent.afternoonStart,
                  },
                  scanSessionLabel,
                  scanStudent.idException,
                )
              : true;
          if (!byEvent[eventId]) byEvent[eventId] = [];

          byEvent[eventId].push({
            profileId: String(row.student_id),
            name: studentName || "Student",
            id: studentId || row.student_id,
            program: profile?.program || "",
            section: profile?.section || "",
            photoUrl: profile?.photo_url || undefined,
            time: row.scan_in_at
              ? new Date(row.scan_in_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            status:
              row.status === "late"
                ? "late"
                : row.status === "absent"
                  ? "absent"
                  : row.status === "duplicate"
                    ? "duplicate"
                    : "present",
            excused: nextApprovedExcuseKeys.has(
              `${eventId}:${row.student_id}:${row.session_label ?? "morning"}`,
            ),
            sanctioned:
              Boolean(
                events.find((event) => event.id === eventId)?.sanctionsEnabled,
              ) &&
              attendanceEligible &&
              (row.status === "late" || row.status === "absent") &&
              !nextApprovedExcuseKeys.has(
                `${eventId}:${row.student_id}:${row.session_label ?? "morning"}`,
              ),
            sessionLabel: scanSessionLabel,
            dbId: String(row.id),
            fineStatus: undefined,
          });
        }

        const fineByScan = new Map(
          fines.map((fine: any) => [String(fine.attendance_scan_id), fine]),
        );
        for (const records of Object.values(byEvent)) {
          for (const record of records) {
            const fine = fineByScan.get(String(record.dbId)) as any;
            if (fine) {
              record.fineStatus = fine.status;
              record.fineAmount = Number(fine.amount ?? 0);
            }
          }
        }

        setApprovedExcuseKeys(nextApprovedExcuseKeys);
        setFineRows(fines);
        setScanState(byEvent);
      } catch (caughtError) {
        if (cancelled || controller.signal.aborted) return;
        console.error(caughtError);
        if (hasLoadedAttendance.current) {
          toast.error("Attendance data could not be refreshed.");
        } else {
          setLoadError("Attendance data could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          hasLoadedAttendance.current = true;
          setIsAttendanceRefreshing(false);
          setIsLoading(false);
        }
      }
    }

    void loadSelectedAttendance();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [allEventsId, events, matchedStudentId, selectedEventId, students]);

  const onNav = (page: Page) => {
    const paths: Record<Page, string> = {
      landing: "/",

      login: "/login",

      onboarding: "/onboarding",

      dashboard: "/dashboard",

      "my-qr": "/my-qr",

      events: "/events",

      "event-detail": "/events",

      announcements: "/announcements",

      "attendance-history": "/attendance-history",

      "my-fines": "/my-fines",

      profile: "/profile",

      "admin-dashboard": "/admin-dashboard",

      "admin-events": "/admin-events",

      "admin-scanner": "/admin-scanner",

      "admin-attendees": "/admin-attendees",

      "admin-students": "/admin-students",

      "admin-announcements": "/admin-announcements",

      "admin-reports": "/admin-reports",

      "admin-excuse-requests": "/admin-excuse-requests",

      "admin-settings": "/admin-settings",
    };

    router.push(paths[page] ?? "/admin-dashboard");
  };

  const deleteAttendance = async (dbId: string | number) => {
    const { error } = await supabase

      .from("attendance_scans")

      .delete()

      .eq("id", String(dbId));

    if (error) {
      console.error("Failed to delete attendance record", error);

      toast.error("Attendance record could not be deleted. Please try again.");

      return false;
    }

    toast.success("Attendance record deleted.");

    return true;
  };

  if (isLoading || (isAttendanceRefreshing && !hasLoadedAttendance.current)) {
    return <AttendanceLoadingState />;
  }

  if (loadError) {
    return (
      <FeedbackState
        title="Attendance data unavailable"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <AdminAttendeesPage
      onNav={onNav}
      events={events}
      students={students}
      initialTab={initialTab}
      scanState={scanState}
      fineRows={fineRows}
      approvedExcuseKeys={approvedExcuseKeys}
      onDeleteAttendance={deleteAttendance}
      isAttendanceLoading={isAttendanceRefreshing}
      onSelectionChange={(eventId, search) => {
        setSelectedEventId(eventId);
        setStudentSearch(search);
      }}
    />
  );
}
