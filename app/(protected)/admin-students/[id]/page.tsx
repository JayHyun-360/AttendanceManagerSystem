"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StudentQR } from "../../../shared-page";
import { supabase } from "@/lib/supabase";
import { recordAttendance, type AttendanceStatus } from "@/lib/attendance";
import { useProtectedUser } from "../../layout";

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
  idPhotoUrl?: string;
  joinedDate: string;
}

interface AttendanceEvent {
  id: string;
  title: string;
  date: string;
  multiSession: boolean;
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
    let cancelled = false;

    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, event_date, multi_session, morning_start, morning_end, afternoon_start, afternoon_end",
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
        .select("id, status, session_label, scan_in_at, scan_out_at, method")
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

  const markAttendance = async (overwrite = false) => {
    if (!routeId || !authUserId || !selectedEventId || !selectedEvent) {
      toast.error("Select an event before marking attendance.");
      return;
    }

    if (existingAttendance && !overwrite) {
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
      overwrite,
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
      .select("id, status, session_label, scan_in_at, scan_out_at, method")
      .eq("event_id", selectedEventId)
      .eq("student_id", routeId)
      .eq("session_label", sessionLabel)
      .maybeSingle();
    setExistingAttendance(data as ExistingAttendance | null);
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
      <div className="mx-auto w-full max-w-5xl space-y-5 md:space-y-6">
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            onClick={() => router.push("/admin-students")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to students</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-700 px-4 py-5 md:px-8 md:py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4 md:gap-5">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg md:h-28 md:w-28"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 text-xl font-bold text-white shadow-lg md:h-28 md:w-28 md:text-2xl">
                    {student.name
                      .split(" ")
                      .filter(Boolean)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "S"}
                  </div>
                )}

                <div className="min-w-0 text-white">
                  <p className="text-xl font-bold tracking-tight md:text-3xl">
                    {student.name}
                  </p>
                  <p className="mt-1 text-sm text-emerald-50 md:text-base">
                    {student.studentId}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white md:text-[11px]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 md:p-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-4 flex w-full gap-1.5 bg-slate-100 p-1 md:mb-5 md:w-fit md:justify-start">
                <TabsTrigger
                  value="profile"
                  className="flex-1 rounded-lg px-2 py-2 text-[11px] font-semibold whitespace-nowrap md:flex-none md:px-4 md:text-sm"
                >
                  Profile Info
                </TabsTrigger>
                <TabsTrigger
                  value="id-photo"
                  className="flex-1 rounded-lg px-2 py-2 text-[11px] font-semibold whitespace-nowrap md:flex-none md:px-4 md:text-sm"
                >
                  ID Photo & QR
                </TabsTrigger>
                <TabsTrigger
                  value="attendance"
                  className="flex-1 rounded-lg px-2 py-2 text-[11px] font-semibold whitespace-nowrap md:flex-none md:px-4 md:text-sm"
                >
                  Attendance History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        label: "Phone",
                        value: student.phone || "Not provided",
                      },
                      {
                        label: "Email",
                        value: student.email || "Not provided",
                      },
                      {
                        label: "Joined TapIn",
                        value: student.joinedDate,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 break-words">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="id-photo" className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_260px]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:p-3">
                      {student.idPhotoUrl ? (
                        <div className="overflow-hidden rounded-xl bg-slate-100">
                          <img
                            src={student.idPhotoUrl}
                            alt="Student ID"
                            className="h-[260px] w-full rounded-xl object-cover md:h-[360px] xl:h-[420px]"
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50 p-6 text-center md:min-h-[360px] xl:min-h-[420px]">
                          <div>
                            <p className="text-sm font-semibold text-amber-800">
                              No ID photo uploaded
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                              This student has not uploaded a school ID photo
                              yet.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Student QR
                      </p>
                      <div className="mt-3 flex justify-center rounded-xl bg-slate-50 p-3">
                        <StudentQR studentId={student.studentId} size={150} />
                      </div>
                      <p className="mt-3 text-center text-xs font-medium text-slate-500">
                        {student.studentId}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-slate-800">
                      Mark Attendance
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Record attendance for this student and one event session.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Event
                      </span>
                      <select
                        value={selectedEventId}
                        onChange={(event) =>
                          setSelectedEventId(event.target.value)
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                      </select>
                    </label>
                  </div>

                  {selectedEvent?.multiSession && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
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
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-800">
                        The selected session does not match the event session
                        suggested by the current time. You can continue
                        manually.
                      </p>
                    </div>
                  )}

                  {isCheckingAttendance ? (
                    <p className="mt-4 text-sm text-slate-500">
                      Checking existing attendance...
                    </p>
                  ) : existingAttendance ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">
                        Attendance already exists for this event and session.
                      </p>
                      <p className="mt-2 text-xs text-amber-800">
                        Status: {existingAttendance.status} · Recorded:{" "}
                        {existingAttendance.scan_in_at
                          ? new Date(
                              existingAttendance.scan_in_at,
                            ).toLocaleString()
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
                      className="mt-4 h-10 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingAttendance ? "Saving..." : "Mark Attendance"}
                    </button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
