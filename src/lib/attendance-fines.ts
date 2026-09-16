export type SessionLabel = "morning" | "afternoon";
export type AttendanceStatus = "present" | "late" | "absent" | "confirmed" | "duplicate";

export interface FineEventLike {
  id: string;
  event_date: string;
  program?: string | null;
  status?: string | null;
  multi_session?: boolean | null;
  absent_fine?: number | null;
  late_fine?: number | null;
  morning_absent_fine?: number | null;
  morning_late_fine?: number | null;
  afternoon_absent_fine?: number | null;
  afternoon_late_fine?: number | null;
}

export interface FineScanLike {
  id: string;
  event_id: string;
  session_label?: SessionLabel | null;
  status?: AttendanceStatus | null;
  scan_in_at?: string | null;
}

export interface FineRowLike {
  id: string;
  event_id?: string | null;
  attendance_scan_id?: string | null;
  session_label?: SessionLabel | null;
  amount?: number | null;
  status?: "unpaid" | "paid" | "excused" | null;
}

export interface AttendanceSessionRecord {
  key: string;
  eventId: string;
  sessionLabel: SessionLabel;
  status: AttendanceStatus | "no_record";
  scan?: FineScanLike;
  fineId?: string;
  fineAmount: number;
  fineStatus?: FineRowLike["status"];
}

export function eventSessions(event: FineEventLike): SessionLabel[] {
  return event.multi_session ? ["morning", "afternoon"] : ["morning"];
}

export function sessionFineAmount(
  event: FineEventLike,
  session: SessionLabel,
  status: AttendanceStatus | "no_record",
): number {
  if (status !== "absent" && status !== "late" && status !== "no_record") return 0;
  const value =
    status === "late"
      ? session === "afternoon"
        ? event.afternoon_late_fine ?? event.late_fine
        : event.morning_late_fine ?? event.late_fine
      : session === "afternoon"
        ? event.afternoon_absent_fine ?? event.absent_fine
        : event.morning_absent_fine ?? event.absent_fine;
  return Number(value ?? 0);
}

export function buildAttendanceSessionRecords(
  events: FineEventLike[],
  scans: FineScanLike[],
  fines: FineRowLike[],
  studentProgram?: string | null,
  today = new Date().toISOString().slice(0, 10),
): AttendanceSessionRecord[] {
  const applicableEvents = events.filter(
    (event) =>
      event.event_date <= today &&
      event.status !== "upcoming" &&
      (!event.program || event.program === "All Programs" || event.program === studentProgram),
  );
  const scanByKey = new Map(
    scans.map((scan) => [`${scan.event_id}:${scan.session_label ?? "morning"}`, scan]),
  );
  const fineByScan = new Map(
    fines.filter((fine) => fine.attendance_scan_id).map((fine) => [fine.attendance_scan_id as string, fine]),
  );
  const fineByKey = new Map(
    fines.filter((fine) => fine.event_id && fine.session_label).map((fine) => [`${fine.event_id}:${fine.session_label}`, fine]),
  );

  return applicableEvents.flatMap((event) =>
    eventSessions(event).map((sessionLabel) => {
      const key = `${event.id}:${sessionLabel}`;
      const scan = scanByKey.get(key);
      const linkedFine = (scan && fineByScan.get(scan.id)) ?? fineByKey.get(key);
      const status = scan?.status ?? "no_record";
      const countedFine = linkedFine
        ? linkedFine.status === "unpaid"
          ? Number(linkedFine.amount ?? 0)
          : 0
        : sessionFineAmount(event, sessionLabel, status);
      return {
        key,
        eventId: event.id,
        sessionLabel,
        status,
        scan,
        fineId: linkedFine?.id,
        fineAmount: countedFine,
        fineStatus: linkedFine?.status,
      };
    }),
  );
}

export function totalUnpaidFine(records: AttendanceSessionRecord[]): number {
  return records.reduce((total, record) => total + record.fineAmount, 0);
}
