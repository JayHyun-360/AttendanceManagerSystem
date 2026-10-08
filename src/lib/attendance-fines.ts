export type SessionLabel = "morning" | "afternoon"

export type AttendanceStatus = "present" | "late" | "absent" | "confirmed" | "duplicate"

export interface FineEventLike {
  id: string

  event_date: string

  program?: string | null

  status?: string | null

  multi_session?: boolean | null

  end_time?: string | null

  morning_end?: string | null

  afternoon_end?: string | null

  sanctions_enabled?: boolean | null

  absent_fine?: number | null

  late_fine?: number | null

  morning_absent_fine?: number | null

  morning_late_fine?: number | null

  afternoon_absent_fine?: number | null

  afternoon_late_fine?: number | null
}

export interface FineScanLike {
  id: string

  event_id: string

  session_label?: SessionLabel | null

  status?: AttendanceStatus | null

  scan_in_at?: string | null
}

export interface FineRowLike {
  id: string

  event_id?: string | null

  attendance_scan_id?: string | null

  session_label?: SessionLabel | null

  amount?: number | null

  status?: "unpaid" | "paid" | "excused" | null
}

export interface AttendanceSessionRecord {
  key: string

  eventId: string

  sessionLabel: SessionLabel

  status: AttendanceStatus | "no_record"

  excused: boolean

  scan?: FineScanLike

  fineId?: string

  fineAmount: number

  fineStatus?: FineRowLike["status"]

  sanctioned: boolean

  displayLabel: string
}

export function getAttendanceDisplayState(
  status: AttendanceStatus | "no_record",

  sanctionsEnabled = false,

  excused = false,
): { sanctioned: boolean; label: string } {
  const sanctioned =
    !excused && sanctionsEnabled && (status === "late" || status === "absent")

  const label = excused
    ? "Excused"
    : status === "no_record"
      ? "No record"
      : status === "confirmed"
        ? "Present"
        : status.charAt(0).toUpperCase() + status.slice(1)

  return { sanctioned, label: sanctioned ? `Sanctioned — ${label}` : label }
}

export function eventSessions(event: FineEventLike): SessionLabel[] {
  return event.multi_session ? ["morning", "afternoon"] : ["morning"]
}

function getManilaClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",

    hour: "2-digit",

    minute: "2-digit",

    second: "2-digit",

    hourCycle: "h23",
  }).formatToParts(now)

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ""

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,

    seconds:
      Number(value("hour")) * 3600 +
      Number(value("minute")) * 60 +
      Number(value("second")),
  }
}

export function getSchoolDate(now = new Date()) {
  return getManilaClock(now).date
}

export function isAttendanceSessionComplete(
  event: FineEventLike,

  session: SessionLabel,

  now = new Date(),
) {
  const clock = getManilaClock(now)

  if (event.event_date < clock.date) return true

  if (event.event_date > clock.date) return false

  const sessionEnd =
    session === "afternoon"
      ? event.afternoon_end
      : event.multi_session
        ? event.morning_end
        : (event.morning_end ?? event.end_time)

  if (!sessionEnd) return false

  const match = sessionEnd.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)

  if (!match) return false

  const hour = Number(match[1])

  const minute = Number(match[2])

  const second = Number(match[3] ?? 0)

  if (hour > 23 || minute > 59 || second > 59) return false

  return hour * 3600 + minute * 60 + second <= clock.seconds
}

export function sessionFineAmount(
  event: FineEventLike,

  session: SessionLabel,

  status: AttendanceStatus | "no_record",
): number {
  if (status !== "absent" && status !== "late" && status !== "no_record")
    return 0

  const value =
    status === "late"
      ? session === "afternoon"
        ? (event.afternoon_late_fine ?? event.late_fine)
        : (event.morning_late_fine ?? event.late_fine)
      : session === "afternoon"
        ? (event.afternoon_absent_fine ?? event.absent_fine)
        : (event.morning_absent_fine ?? event.absent_fine)

  return Number(value ?? 0)
}

export function buildAttendanceSessionRecords(
  events: FineEventLike[],

  scans: FineScanLike[],

  fines: FineRowLike[],

  studentProgram?: string | null,

  today = getSchoolDate(),

  finesEnabled = false,

  approvedExcuseKeys: ReadonlySet<string> = new Set(),
): AttendanceSessionRecord[] {
  const applicableEvents = events.filter(
    (event) =>
      event.event_date <= today &&
      event.status !== "upcoming" &&
      event.status !== "cancelled" &&
      (!event.program ||
        event.program === "All Programs" ||
        event.program === studentProgram),
  )

  const scanByKey = new Map(
    scans.map((scan) => [
      `${scan.event_id}:${scan.session_label ?? "morning"}`,

      scan,
    ]),
  )

  const fineByScan = new Map(
    fines

      .filter((fine) => fine.attendance_scan_id)

      .map((fine) => [fine.attendance_scan_id as string, fine]),
  )

  const fineByKey = new Map(
    fines

      .filter((fine) => fine.event_id && fine.session_label)

      .map((fine) => [`${fine.event_id}:${fine.session_label}`, fine]),
  )

  return applicableEvents.flatMap((event) =>
    eventSessions(event)

      .filter((sessionLabel) =>
        isAttendanceSessionComplete(event, sessionLabel),
      )

      .map((sessionLabel) => {
        const key = `${event.id}:${sessionLabel}`

        const scan = scanByKey.get(key)

        const linkedFine =
          (scan && fineByScan.get(scan.id)) ?? fineByKey.get(key)

        const status = scan?.status ?? "no_record"

        const excused = approvedExcuseKeys.has(key)

        const display = getAttendanceDisplayState(
          status,

          !!event.sanctions_enabled,

          excused,
        )

        const countedFine = excused
          ? 0
          : linkedFine
            ? linkedFine.status === "unpaid"
              ? Number(linkedFine.amount ?? 0)
              : 0
            : finesEnabled
              ? sessionFineAmount(event, sessionLabel, status)
              : 0

        return {
          key,

          eventId: event.id,

          sessionLabel,

          status,

          excused,

          scan,

          fineId: linkedFine?.id,

          fineAmount: countedFine,

          fineStatus: linkedFine?.status,

          sanctioned: display.sanctioned,

          displayLabel: display.label,
        }
      }),
  )
}

export function totalUnpaidFine(records: AttendanceSessionRecord[]): number {
  return records.reduce((total, record) => total + record.fineAmount, 0)
}
