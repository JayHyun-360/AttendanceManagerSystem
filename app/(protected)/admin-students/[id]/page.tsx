"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  ProfileIcon,
  StudentQR,
  type FineRecord,
} from "../../../shared-page";
import { supabase } from "@/lib/supabase";
import { recordAttendance, type AttendanceStatus } from "@/lib/attendance";
import { useProtectedUser } from "../../layout";
import {
  buildAttendanceSessionRecords,
  totalUnpaidFine,
} from "@/lib/attendance-fines";

interface StudentDetail {
  id: string;
  profileId: string;
  name: string;
  studentId: string;
  program: string;
  yearLevel: string;
  section: string;
  phone: string;
  email: string;
  photoUrl?: string;
  coverPhotoUrl?: string;
  idPhotoUrl?: string;
  joinedDate: string;
}

interface AttendanceEvent {
  id: string;
  title: string;
  date: string;
  multiSession: boolean;
  sanctionsEnabled: boolean;
  morningStart?: string | null;
  morningEnd?: string | null;
  afternoonStart?: string | null;
  afternoonEnd?: string | null;
}

interface ExistingAttendance {
  id: string;
  status: AttendanceStatus;
  session_label: "morning" | "afternoon";
  scan_in_at: string | null;
  scan_out_at: string | null;
  method: "qr_scan" | "manual";
  scanned_by: string | null;
}

interface StudentMetrics {
  attendanceRate: number | null;
  recordedSessions: number;
  fineBalance: number;
}

function toMinutes(value?: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (hour > 23 || minute > 59) return null;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  return hour * 60 + minute;
}

function suggestedSession(event: AttendanceEvent) {
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const morningStart = toMinutes(event.morningStart);
  const morningEnd = toMinutes(event.morningEnd);
  const afternoonStart = toMinutes(event.afternoonStart);
  const afternoonEnd = toMinutes(event.afternoonEnd);

  if (
    morningStart !== null &&
    morningEnd !== null &&
    nowMinutes >= morningStart &&
    nowMinutes <= morningEnd
  ) {
    return "morning" as const;
  }

  if (
    afternoonStart !== null &&
    afternoonEnd !== null &&
    nowMinutes >= afternoonStart &&
    nowMinutes <= afternoonEnd
  ) {
    return "afternoon" as const;
  }

  return null;
}

export default function StudentDetailRoutePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const routeId = params?.id ?? null;
  const { authUserId, user } = useProtectedUser();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sessionLabel, setSessionLabel] = useState<"morning" | "afternoon">(
    "morning",
  );
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>("present");
  const [existingAttendance, setExistingAttendance] =
    useState<ExistingAttendance | null>(null);
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [metrics, setMetrics] = useState<StudentMetrics>({
    attendanceRate: null,
    recordedSessions: 0,
    fineBalance: 0,
  });
  const [metricsRefreshKey, setMetricsRefreshKey] = useState(0);
  const [studentFines, setStudentFines] = useState<FineRecord[]>([]);
  const [selectedFineIds, setSelectedFineIds] = useState<string[]>([]);
  const [isClearingFines, setIsClearingFines] = useState(false);

  useEffect(() => {
    if (!routeId) return;

    let cancelled = false;

    async function loadStudent() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", routeId)
          .maybeSingle();

        if (error) {
          console.error(error);
          return;
        }

        if (!data || cancelled) {
          return;
        }

        setStudent({
          id: data.id,
          profileId: data.id,
          name:
            `${data.first_name ?? ""} ${data.surname ?? ""}`.trim() ||
            data.email ||
            "Student",
          studentId: data.student_id || data.id,
          program: data.program || "",
          yearLevel: data.year_level || "",
          section: data.section || "",
          phone: data.phone || "",
          email: data.contact_email || data.email || "",
          photoUrl: data.photo_url || undefined,
          coverPhotoUrl: data.cover_photo_url || undefined,
          idPhotoUrl: data.id_photo_url || undefined,
          joinedDate: new Date(data.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        });
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudent();

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  useEffect(() => {
    if (!routeId || user?.role !== "admin") return;

    let cancelled = false;

    async function loadStudentMetrics() {
      const [eventsResult, scansResult, finesResult, settingsResult] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id, title, event_date, program, status, multi_session, sanctions_enabled, absent_fine, late_fine, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine",
          ),
        supabase
          .from("attendance_scans")
          .select("id, event_id, session_label, status, scan_in_at")
          .eq("student_id", routeId),
        supabase
          .from("fines")
          .select(
            "id, attendance_scan_id, event_id, session_label, amount, status",
          )
          .eq("student_id", routeId),
        supabase
          .from("system_settings")
          .select("settings")
          .eq("id", 1)
          .maybeSingle(),
      ]);

      if (eventsResult.error) console.error(eventsResult.error);
      if (scansResult.error) console.error(scansResult.error);
      if (finesResult.error) console.error(finesResult.error);
      if (settingsResult.error) console.error(settingsResult.error);

      if (cancelled) return;

      const records = buildAttendanceSessionRecords(
        eventsResult.data ?? [],
        scansResult.data ?? [],
        finesResult.data ?? [],
        student?.program,
        new Date().toISOString().slice(0, 10),
        Boolean((settingsResult.data?.settings as { finesEnabled?: boolean } | null)?.finesEnabled),
      );
      const totalSessions = records.length;
      const attendedSessions = records.filter(
        (record) =>
          (record.status === "present" || record.status === "late") &&
          !!record.scan?.scan_in_at,
      ).length;
      const fineBalance = totalUnpaidFine(
        records.filter((record) => record.fineId),
      );
      const fineRows = finesResult.data ?? [];
      const fineById = new Map(
        fineRows.map((fine: any) => [String(fine.id), fine]),
      );
      setStudentFines(
        records
          .filter((record) => record.fineId)
          .map((record) => {
            const fine = fineById.get(String(record.fineId));
            const event = (eventsResult.data ?? []).find(
              (item: any) => item.id === record.eventId,
            );
            return {
              id: String(record.fineId),
              eventId: record.eventId,
              attendanceScanId: record.scan?.id,
              sessionLabel: record.sessionLabel,
              eventTitle: event?.title ?? "Event",
              eventDate: event?.event_date ?? "",
              amount: Number(fine?.amount ?? record.fineAmount ?? 0),
              status: fine?.status ?? record.fineStatus ?? "unpaid",
            };
          }),
      );
      setSelectedFineIds([]);

      setMetrics({
        attendanceRate:
          totalSessions > 0
            ? Math.round((attendedSessions / totalSessions) * 100)
            : null,
        recordedSessions: records.filter((record) => record.scan).length,
        fineBalance,
      });
    }

    void loadStudentMetrics();

    return () => {
      cancelled = true;
    };
  }, [metricsRefreshKey, routeId, student?.program, user?.role]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, event_date, multi_session, sanctions_enabled, morning_start, morning_end, afternoon_start, afternoon_end",
        )
        .order("event_date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (!cancelled) {
        const nextEvents = (data ?? []).map((event) => ({
          id: event.id,
          title: event.title,
          date: event.event_date,
          multiSession: Boolean(event.multi_session),
          sanctionsEnabled: Boolean(event.sanctions_enabled),
          morningStart: event.morning_start,
          morningEnd: event.morning_end,
          afternoonStart: event.afternoon_start,
          afternoonEnd: event.afternoon_end,
        }));
        setEvents(nextEvents);
        setSelectedEventId((current) => current || nextEvents[0]?.id || "");
      }
    }

    if (user?.role === "admin") {
      void loadEvents();
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedEvent = events.find((event) => event.id === selectedEventId);

  useEffect(() => {
    if (!selectedEvent) {
      setExistingAttendance(null);
      return;
    }

    if (!selectedEvent.multiSession) {
      setSessionLabel("morning");
    } else {
      setSessionLabel(suggestedSession(selectedEvent) ?? "morning");
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (!routeId || !selectedEventId || !sessionLabel) return;

    let cancelled = false;
    setIsCheckingAttendance(true);

    async function loadExistingAttendance() {
      const { data, error } = await supabase
        .from("attendance_scans")
        .select(
          "id, status, session_label, scan_in_at, scan_out_at, method, scanned_by",
        )
        .eq("event_id", selectedEventId)
        .eq("student_id", routeId)
        .eq("session_label", sessionLabel)
        .maybeSingle();

      if (error) {
        console.error(error);
        if (!cancelled) toast.error("Could not check existing attendance.");
      } else if (!cancelled) {
        setExistingAttendance(data as ExistingAttendance | null);
      }

      if (!cancelled) setIsCheckingAttendance(false);
    }

    void loadExistingAttendance();

    return () => {
      cancelled = true;
    };
  }, [routeId, selectedEventId, sessionLabel]);

  const sessionMismatch =
    selectedEvent?.multiSession &&
    suggestedSession(selectedEvent) !== null &&
    suggestedSession(selectedEvent) !== sessionLabel;

  const isInferredAbsence =
    existingAttendance?.status === "absent" &&
    !existingAttendance.scan_in_at &&
    !existingAttendance.scan_out_at &&
    !existingAttendance.scanned_by;

  const markAttendance = async (overwrite = false) => {
    if (!routeId || !authUserId || !selectedEventId || !selectedEvent) {
      toast.error("Select an event before marking attendance.");
      return;
    }

    if (existingAttendance && !isInferredAbsence && !overwrite) {
      toast.error("Choose Overwrite or Cancel for the existing record.");
      return;
    }

    setIsSavingAttendance(true);
    const result = await recordAttendance({
      eventId: selectedEventId,
      studentId: routeId,
      sessionLabel,
      status: attendanceStatus,
      scannedBy: authUserId,
      strictSession: false,
      canTimeOut: false,
      method: "manual",
      overwrite: overwrite || isInferredAbsence,
    });

    setIsSavingAttendance(false);

    if (result.outcome === "error") {
      console.error(result.error);
      toast.error("Attendance could not be saved.");
      return;
    }

    if (result.outcome !== "success") {
      toast.error("Attendance already exists. Review it before overwriting.");
      return;
    }

    toast.success(
      `${overwrite ? "Attendance overwritten" : "Attendance marked"} for ${selectedEvent.title}.`,
    );
    setExistingAttendance(null);
    const { data } = await supabase
      .from("attendance_scans")
      .select(
        "id, status, session_label, scan_in_at, scan_out_at, method, scanned_by",
      )
      .eq("event_id", selectedEventId)
      .eq("student_id", routeId)
      .eq("session_label", sessionLabel)
      .maybeSingle();
    setExistingAttendance(data as ExistingAttendance | null);
    setMetricsRefreshKey((current) => current + 1);
  };

  const clearFineIds = async (fineIds: string[]) => {
    const ids = Array.from(new Set(fineIds)).filter(Boolean);
    if (!ids.length) {
      toast.error("Select at least one pending fine.");
      return;
    }
    setIsClearingFines(true);
    const { error } = await supabase
      .from("fines")
      .update({ status: "paid" })
      .in("id", ids)
      .eq("student_id", routeId)
      .eq("status", "unpaid");
    setIsClearingFines(false);
    if (error) {
      console.error(error);
      toast.error("Could not clear the selected fines.");
      return;
    }
    toast.success(`${ids.length} fine${ids.length === 1 ? "" : "s"} cleared.`);
    setMetricsRefreshKey((current) => current + 1);
  };

  const pendingFines = studentFines.filter((fine) => fine.status === "unpaid");
  const toggleFine = (fineId: string) => {
    setSelectedFineIds((current) =>
      current.includes(fineId)
        ? current.filter((id) => id !== fineId)
        : [...current, fineId],
    );
  };

  const badges = useMemo(
    () =>
      [student?.program, student?.yearLevel, student?.section].filter(Boolean),
    [student],
  );

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
            </div>
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  if (!student) {
    return (
      <>
        <PageHeader title="Student Profile" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-800">
            Student profile not found.
          </p>
          <button
            onClick={() => router.push("/admin-students")}
            className="mt-4 h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Back to students
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 w-full max-w-7xl mx-auto lg:grid-cols-2">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="relative h-36 w-full overflow-hidden rounded-t-2xl md:h-40">
              {student.coverPhotoUrl ? (
                <img
                  src={student.coverPhotoUrl}
                  alt="Profile cover"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200" />
                  <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/50 blur-3xl" />
                  <div className="absolute bottom-0 left-1/3 h-24 w-56 rounded-full bg-emerald-100/40 blur-3xl" />
                </>
              )}
            </div>
            <div className="relative px-5 pb-5 md:px-6">
              <div className="relative z-10 -mt-10 ml-6">
                <ProfileIcon photoUrl={student.photoUrl} size="lg" />
              </div>
              <div className="mt-4">
                <p className="text-xl font-bold text-slate-900">
                  {student.name}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {student.studentId}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      {badge}
                    </span>
                  ))}
                  <span className="rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700">
                    Active
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>{student.email || "Email not provided"}</span>
                  <span>{student.phone || "Phone not provided"}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50/50 p-4 text-center">
              {[
                [
                  metrics.attendanceRate === null
                    ? "—"
                    : `${metrics.attendanceRate}%`,
                  "Attendance Rate",
                ],
                [String(metrics.recordedSessions), "Recorded Sessions"],
                [
                  `₱${metrics.fineBalance.toLocaleString("en-PH", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}`,
                  "Fine Balance",
                ],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Fine clearance
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Clear selected fines when this student completes clearance
                  payment.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isClearingFines || selectedFineIds.length === 0}
                  onClick={() => void clearFineIds(selectedFineIds)}
                  className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear selected
                </button>
                <button
                  type="button"
                  disabled={isClearingFines || pendingFines.length === 0}
                  onClick={() =>
                    void clearFineIds(pendingFines.map((fine) => fine.id))
                  }
                  className="h-9 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {studentFines.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  No persistent fine records for this student.
                </p>
              ) : (
                studentFines.map((fine) => {
                  const cleared = fine.status !== "unpaid";
                  return (
                    <div
                      key={fine.id}
                      className={`flex items-center gap-3 px-4 py-3 ${cleared ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFineIds.includes(fine.id)}
                        disabled={cleared || isClearingFines}
                        onChange={() => toggleFine(fine.id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold text-slate-900 ${cleared ? "line-through" : ""}`}
                        >
                          {fine.eventTitle}
                        </p>
                        <p className="text-xs text-slate-500">
                          {fine.eventDate} ·{" "}
                          {fine.sessionLabel === "afternoon"
                            ? "Afternoon"
                            : "Morning"}{" "}
                          · ₱{fine.amount}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cleared ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                      >
                        {cleared ? "Cleared" : "Pending"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5">
              <p className="text-base font-semibold text-slate-900">
                Attendance Management
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Record attendance for this student and one event session.
              </p>
            </div>
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Event
                  </span>
                  <select
                    value={selectedEventId}
                    onChange={(event) => setSelectedEventId(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select an event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} · {event.date}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Status
                  </span>
                  <select
                    value={attendanceStatus}
                    onChange={(event) =>
                      setAttendanceStatus(
                        event.target.value as AttendanceStatus,
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                  </select>
                </label>
              </div>

              {selectedEvent?.multiSession && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Session
                  </p>
                  <div className="mt-2 flex gap-2">
                    {(["morning", "afternoon"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSessionLabel(option)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${sessionLabel === option ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                      >
                        {option === "morning" ? "Morning" : "Afternoon"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sessionMismatch && (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800">
                  <p className="text-xs font-semibold text-amber-800">
                    The selected session does not match the event session
                    suggested by the current time. You can continue manually.
                  </p>
                </div>
              )}

              {isCheckingAttendance ? (
                <p className="mt-4 text-sm text-slate-500">
                  Checking existing attendance...
                </p>
              ) : existingAttendance && !isInferredAbsence ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800">
                  <p className="text-sm font-semibold text-amber-900">
                    Attendance already exists for this event and session.
                  </p>
                  <p className="mt-2 text-xs text-amber-800">
                    Status: {existingAttendance.status} · Recorded:{" "}
                    {existingAttendance.scan_in_at
                      ? new Date(existingAttendance.scan_in_at).toLocaleString()
                      : "No timestamp"}{" "}
                    · Method: {existingAttendance.method}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSavingAttendance}
                      onClick={() => void markAttendance(true)}
                      className="h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Overwrite
                    </button>
                    <button
                      type="button"
                      disabled={isSavingAttendance}
                      onClick={() => {
                        setExistingAttendance(null);
                        setSelectedEventId("");
                      }}
                      className="h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSavingAttendance || !selectedEventId}
                  onClick={() => void markAttendance()}
                  className="mt-4 h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingAttendance ? "Saving..." : "Mark Attendance"}
                </button>
              )}
            </div>
            <details className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                View Attendance History
              </summary>
              <div className="mt-3 max-h-48 overflow-y-auto border-t border-slate-200 pt-3 text-xs text-slate-500">
                {existingAttendance && !isInferredAbsence ? (
                  <div className="grid grid-cols-2 gap-3">
                    <span>Status: {existingAttendance.status}</span>
                    <span>Method: {existingAttendance.method}</span>
                    <span>
                      Time in:{" "}
                      {existingAttendance.scan_in_at
                        ? new Date(
                            existingAttendance.scan_in_at,
                          ).toLocaleString()
                        : "Not recorded"}
                    </span>
                    <span>
                      Time out:{" "}
                      {existingAttendance.scan_out_at
                        ? new Date(
                            existingAttendance.scan_out_at,
                          ).toLocaleString()
                        : "Not recorded"}
                    </span>
                  </div>
                ) : (
                  "No attendance record for the selected event and session."
                )}
              </div>
            </details>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 shadow-sm">
            <div className="text-center">
              <p className="text-base font-semibold text-slate-900">
                Student Pass QR
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Scan to identify this student.
              </p>
              <div className="mx-auto mt-5 w-max rounded-2xl border border-slate-100 bg-white p-5">
                <StudentQR studentId={student.studentId} size={170} />
              </div>
              <span className="mt-4 inline-flex rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700">
                Active
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <p className="text-base font-semibold text-slate-900">
              School ID Photo
            </p>
            <div className="relative mt-3 flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80">
              {student.idPhotoUrl ? (
                <img
                  src={student.idPhotoUrl}
                  alt="Student ID"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-center text-sm text-slate-500">
                  No ID photo uploaded
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <p className="text-base font-semibold text-slate-900">
              Contact Details
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {[
                ["Email", student.email || "Not provided"],
                ["Phone", student.phone || "Not provided"],
                ["Joined Adesse", student.joinedDate],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="break-words text-right text-sm font-semibold text-slate-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
