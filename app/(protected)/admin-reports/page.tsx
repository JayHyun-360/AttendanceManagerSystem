"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminReportsPage,
  type AdminReportPrintData,
  type EventData,
  type EventStatus,
} from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useProtectedUser } from "../layout";

const EVENT_PAGE_SIZE = 5;
const REPORT_EVENT_BATCH_SIZE = 50;
const REPORT_EVENT_FETCH_SIZE = 500;
const MAX_REPORT_EVENTS = 500;
const REPORT_EVENT_COLUMNS =
  "id, title, event_date, start_time, end_time, location, description, program, status, image_url, media_urls, multi_session, sanctions_enabled, absent_fine, late_fine, morning_end, afternoon_end, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine";

type ReportEventRow = {
  id: number | string;
  title: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  program: string | null;
  status: string | null;
  image_url: string | null;
  media_urls: string[] | null;
  multi_session: boolean | null;
  sanctions_enabled: boolean | null;
  absent_fine: number | null;
  late_fine: number | null;
  morning_end: string | null;
  afternoon_end: string | null;
  morning_absent_fine: number | null;
  morning_late_fine: number | null;
  afternoon_absent_fine: number | null;
  afternoon_late_fine: number | null;
};

function isEventStatus(value: string | null): value is EventStatus {
  return (
    value === "active" ||
    value === "upcoming" ||
    value === "closed" ||
    value === "cancelled"
  );
}

type ReportAggregates = {
  program_stats: Array<{
    label: string;
    present: number;
    total: number;
    rate: number;
    absent: number;
    excused: number;
    late: number;
    fine_total: number;
    sanctioned: number;
    sanctioned_late: number;
    sanctioned_absent: number;
  }>;
  fee_summary: {
    fine_count: number;
    assessed: number;
    collected: number;
    outstanding: number;
    waived: number;
  };
  event_stats: Array<{
    event_id: string;
    attendees: number;
    report_attended_sessions: number;
    report_absent_sessions: number;
    report_excused_sessions: number;
    report_late_sessions: number;
    report_sanctioned_sessions: number;
    report_fine_total: number;
  }>;
};

function mapReportEvents(
  rows: ReportEventRow[],
  statsByEvent: Map<string, ReportAggregates["event_stats"][number]>,
): EventData[] {
  return rows.map((row) => {
    const stats = statsByEvent.get(String(row.id));
    const eventDate = row.event_date ? new Date(row.event_date) : null;

    return {
      id: String(row.id),
      title: row.title,
      date: eventDate
        ? eventDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "",
      time:
        row.start_time && row.end_time
          ? `${row.start_time}–${row.end_time}`
          : "",
      location: row.location ?? "",
      description: row.description ?? "",
      program: row.program ?? "All Programs",
      fineAmount: Number(
        row.multi_session
          ? Number(row.morning_absent_fine ?? 0) +
              Number(row.afternoon_absent_fine ?? 0)
          : (row.absent_fine ?? 0),
      ),
      absentFine: Number(row.absent_fine ?? 0),
      lateFine: Number(row.late_fine ?? 0),
      morningAbsentFine: Number(
        row.morning_absent_fine ?? row.absent_fine ?? 0,
      ),
      morningLateFine: Number(row.morning_late_fine ?? row.late_fine ?? 0),
      afternoonAbsentFine: Number(
        row.afternoon_absent_fine ?? row.absent_fine ?? 0,
      ),
      afternoonLateFine: Number(
        row.afternoon_late_fine ?? row.late_fine ?? 0,
      ),
      status: isEventStatus(row.status) ? row.status : "upcoming",
      attendees: Number(stats?.attendees ?? 0),
      reportAttendedSessions: Number(stats?.report_attended_sessions ?? 0),
      reportAbsentSessions: Number(stats?.report_absent_sessions ?? 0),
      reportExcusedSessions: Number(stats?.report_excused_sessions ?? 0),
      reportLateSessions: Number(stats?.report_late_sessions ?? 0),
      reportFineTotal: Number(stats?.report_fine_total ?? 0),
      reportSanctionedSessions: Number(
        stats?.report_sanctioned_sessions ?? 0,
      ),
      mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
      highlightUrl:
        row.image_url && !row.image_url.startsWith("blob:")
          ? row.image_url
          : undefined,
    };
  });
}

type ReportPayload = {
  events: EventData[];
  eventCount: number;
  periodLabel: string;
  programStats: Array<{
    label: string;
    present: number;
    total: number;
    rate: number;
    absent: number;
    excused: number;
    late: number;
    fineTotal: number;
    sanctioned: number;
    sanctionedLate: number;
    sanctionedAbsent: number;
  }>;
  feeSummary: Array<{
    label: string;
    value: string;
    color: string;
  }>;
};

type FullReportData = {
  events: EventData[];
  eventDatesById: Map<string, string>;
  periodLabel: string;
  programStats: NonNullable<AdminReportPrintData["programStats"]>;
  feeSummary: ReportAggregates["fee_summary"];
};

type ReportExportFormat = "csv" | "excel";

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  const safeText =
    typeof value === "string" && /^[\s]*[=+\-@]/.test(value)
      ? `'${text}`
      : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

async function fetchFullReport(
  dateFrom: string,
  dateTo: string,
): Promise<FullReportData> {
  const rows: ReportEventRow[] = [];
  let eventCount = 0;

  for (let offset = 0; ; offset += REPORT_EVENT_FETCH_SIZE) {
    let eventsQuery = supabase
      .from("events")
      .select(REPORT_EVENT_COLUMNS, { count: "exact" })
      .order("event_date", { ascending: false })
      .order("id", { ascending: true })
      .neq("status", "upcoming");

    if (dateFrom) eventsQuery = eventsQuery.gte("event_date", dateFrom);
    if (dateTo) eventsQuery = eventsQuery.lte("event_date", dateTo);

    const { data, count, error } = await eventsQuery.range(
      offset,
      offset + REPORT_EVENT_FETCH_SIZE - 1,
    );

    if (error) throw error;
    if (offset === 0) {
      eventCount = count ?? 0;
      if (eventCount > MAX_REPORT_EVENTS) {
        throw new Error(
          `This report contains ${eventCount.toLocaleString()} events. Narrow the date range to export or print up to ${MAX_REPORT_EVENTS} events at a time.`,
        );
      }
    }

    const batch = (data ?? []) as ReportEventRow[];
    rows.push(...batch);
    if (rows.length >= eventCount || batch.length < REPORT_EVENT_FETCH_SIZE) {
      break;
    }
  }

  const eventStats: ReportAggregates["event_stats"] = [];
  let aggregates: ReportAggregates | null = null;
  const batchOffsets =
    eventCount === 0
      ? [0]
      : Array.from(
          { length: Math.ceil(eventCount / REPORT_EVENT_BATCH_SIZE) },
          (_, index) => index * REPORT_EVENT_BATCH_SIZE,
        );

  for (const offset of batchOffsets) {
    const limit =
      eventCount === 0
        ? 1
        : Math.min(REPORT_EVENT_BATCH_SIZE, eventCount - offset);
    const { data, error } = await supabase.rpc("get_admin_report_aggregates", {
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_event_offset: offset,
      p_event_limit: limit,
    });

    if (error) throw error;
    const batch = data as ReportAggregates;
    if (!aggregates) aggregates = batch;
    eventStats.push(...batch.event_stats);
  }

  if (!aggregates) {
    throw new Error("The report data could not be prepared.");
  }

  const statsByEvent = new Map(
    eventStats.map((stats) => [stats.event_id, stats]),
  );
  const periodLabel =
    dateFrom || dateTo
      ? `${dateFrom || "Beginning"} – ${dateTo || "Today"}`
      : "All recorded events";

  return {
    events: mapReportEvents(rows, statsByEvent),
    eventDatesById: new Map(
      rows.map((row) => [String(row.id), row.event_date ?? ""]),
    ),
    periodLabel,
    programStats: aggregates.program_stats.map((stats) => ({
      label: stats.label,
      present: Number(stats.present),
      total: Number(stats.total),
      rate: Number(stats.rate),
      absent: Number(stats.absent),
      excused: Number(stats.excused),
      late: Number(stats.late),
      fineTotal: Number(stats.fine_total),
      sanctioned: Number(stats.sanctioned),
      sanctionedLate: Number(stats.sanctioned_late),
      sanctionedAbsent: Number(stats.sanctioned_absent),
    })),
    feeSummary: aggregates.fee_summary,
  };
}

function createReportCsv(
  report: FullReportData,
  academicYear: string,
  semester: string,
): string {
  const headers = [
    "academic_year",
    "semester",
    "report_period",
    "section",
    "label",
    "event_id",
    "date",
    "program",
    "students_attended",
    "present_late_sessions",
    "total_eligible_sessions",
    "attendance_rate_percent",
    "absent_sessions",
    "excused_sessions",
    "late_sessions",
    "fees_assessed_php",
    "sanctioned_sessions",
    "sanctioned_late_sessions",
    "sanctioned_absent_sessions",
    "amount_php",
  ];
  const rows: (string | number)[][] = [headers];
  const metadata = [academicYear, semester, report.periodLabel];

  report.programStats.forEach((row) => {
    rows.push([
      ...metadata,
      "program_attendance",
      row.label,
      "",
      "",
      "",
      "",
      Number(row.present),
      Number(row.total),
      Number(row.rate),
      Number(row.absent ?? 0),
      Number(row.excused ?? 0),
      Number(row.late ?? 0),
      Number(row.fineTotal ?? 0),
      Number(row.sanctioned ?? 0),
      Number(row.sanctionedLate ?? 0),
      Number(row.sanctionedAbsent ?? 0),
      "",
    ]);
  });

  [
    ["Total assessed", Number(report.feeSummary.assessed)],
    ["Collected", Number(report.feeSummary.collected)],
    ["Outstanding", Number(report.feeSummary.outstanding)],
    ["Waived / excused", Number(report.feeSummary.waived)],
  ].forEach(([label, amount]) => {
    rows.push([
      ...metadata,
      "fees_summary",
      String(label),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      Number(amount),
    ]);
  });

  report.events.forEach((event) => {
    rows.push([
      ...metadata,
      "event_details",
      event.title,
      event.id,
      report.eventDatesById.get(event.id) ?? event.date,
      event.program,
      Number(event.attendees),
      Number(event.reportAttendedSessions ?? event.attendees),
      "",
      "",
      Number(event.reportAbsentSessions ?? 0),
      Number(event.reportExcusedSessions ?? 0),
      Number(event.reportLateSessions ?? 0),
      Number(event.reportFineTotal ?? 0),
      Number(event.reportSanctionedSessions ?? 0),
      "",
      "",
      "",
    ]);
  });

  return `\uFEFF${rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n")}`;
}

async function downloadExcelReport(
  report: FullReportData,
  academicYear: string,
  semester: string,
  filename: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const reportInfo = XLSX.utils.aoa_to_sheet([
    ["Report period", report.periodLabel],
    ["Academic year", academicYear],
    ["Semester", semester],
    ["Generated at", new Date().toISOString()],
  ]);
  const programAttendance = XLSX.utils.aoa_to_sheet([
    [
      "Program",
      "Present / late sessions",
      "Total eligible sessions",
      "Attendance rate (%)",
      "Absent sessions",
      "Excused sessions",
      "Late sessions",
      "Fees assessed (PHP)",
      "Sanctioned sessions",
      "Sanctioned late sessions",
      "Sanctioned absent sessions",
    ],
    ...report.programStats.map((row) => [
      row.label,
      Number(row.present),
      Number(row.total),
      Number(row.rate),
      Number(row.absent ?? 0),
      Number(row.excused ?? 0),
      Number(row.late ?? 0),
      Number(row.fineTotal ?? 0),
      Number(row.sanctioned ?? 0),
      Number(row.sanctionedLate ?? 0),
      Number(row.sanctionedAbsent ?? 0),
    ]),
  ]);
  const feeSummary = XLSX.utils.aoa_to_sheet([
    ["Category", "Amount (PHP)"],
    ["Total assessed", Number(report.feeSummary.assessed)],
    ["Collected", Number(report.feeSummary.collected)],
    ["Outstanding", Number(report.feeSummary.outstanding)],
    ["Waived / excused", Number(report.feeSummary.waived)],
  ]);
  const eventDetails = XLSX.utils.aoa_to_sheet([
    [
      "Event ID",
      "Event",
      "Date",
      "Program",
      "Students attended",
      "Present / late sessions",
      "Absent sessions",
      "Excused sessions",
      "Late sessions",
      "Fees assessed (PHP)",
      "Sanctioned sessions",
    ],
    ...report.events.map((event) => [
      event.id,
      event.title,
      report.eventDatesById.get(event.id) ?? event.date,
      event.program,
      Number(event.attendees),
      Number(event.reportAttendedSessions ?? event.attendees),
      Number(event.reportAbsentSessions ?? 0),
      Number(event.reportExcusedSessions ?? 0),
      Number(event.reportLateSessions ?? 0),
      Number(event.reportFineTotal ?? 0),
      Number(event.reportSanctionedSessions ?? 0),
    ]),
  ]);

  reportInfo["!cols"] = [{ wch: 20 }, { wch: 30 }];
  programAttendance["!cols"] = [
    { wch: 28 },
    ...Array.from({ length: 10 }, () => ({ wch: 22 })),
  ];
  feeSummary["!cols"] = [{ wch: 24 }, { wch: 18 }];
  eventDetails["!cols"] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 18 },
    ...Array.from({ length: 8 }, () => ({ wch: 22 })),
  ];

  XLSX.utils.book_append_sheet(workbook, reportInfo, "Report info");
  XLSX.utils.book_append_sheet(
    workbook,
    programAttendance,
    "Program attendance",
  );
  XLSX.utils.book_append_sheet(workbook, feeSummary, "Fees summary");
  XLSX.utils.book_append_sheet(workbook, eventDetails, "Event details");
  XLSX.writeFile(workbook, filename);
}

export default function AdminReportsRoutePage() {
  const router = useRouter();
  const { user, academicPeriod } = useProtectedUser();
  const [reportData, setReportData] = useState<ReportPayload | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventPage, setEventPage] = useState(1);
  const [printReportData, setPrintReportData] =
    useState<AdminReportPrintData | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const [exportingFormat, setExportingFormat] =
    useState<ReportExportFormat | null>(null);
  const reportActionInFlight = useRef(false);

  useEffect(() => {
    if (!printRequested || !printReportData) return;

    const finishPrint = () => {
      setPrintRequested(false);
      setPrintReportData(null);
      setIsPreparingPrint(false);
      reportActionInFlight.current = false;
    };
    const frame = window.requestAnimationFrame(() => window.print());
    window.addEventListener("afterprint", finishPrint);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finishPrint);
    };
  }, [printRequested, printReportData]);

  const preparePrintReport = async () => {
    if (reportActionInFlight.current) return;

    reportActionInFlight.current = true;
    setIsPreparingPrint(true);

    try {
      const report = await fetchFullReport(dateFrom, dateTo);
      const fees = report.feeSummary;

      setPrintReportData({
        events: report.events,
        periodLabel: report.periodLabel,
        programStats: report.programStats,
        feeSummary:
          fees.fine_count === 0
            ? []
            : [
                {
                  label: "Total assessed",
                  value: `₱${Number(fees.assessed).toLocaleString()}`,
                  color: "text-red-600",
                },
                {
                  label: "Collected",
                  value: `₱${Number(fees.collected).toLocaleString()}`,
                  color: "text-emerald-500",
                },
                {
                  label: "Outstanding",
                  value: `₱${Number(fees.outstanding).toLocaleString()}`,
                  color: "text-amber-600",
                },
                {
                  label: "Waived / excused",
                  value: `₱${Number(fees.waived).toLocaleString()}`,
                  color: "text-violet-600",
                },
              ],
      });
      setPrintRequested(true);
    } catch (caughtError) {
      console.error("Could not prepare report for printing", caughtError);
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not prepare the report for printing.",
      );
      setIsPreparingPrint(false);
      reportActionInFlight.current = false;
    }
  };

  const exportReport = async (format: ReportExportFormat) => {
    if (reportActionInFlight.current) return;

    reportActionInFlight.current = true;
    setExportingFormat(format);

    try {
      const report = await fetchFullReport(dateFrom, dateTo);
      const filename = `adesse-report-${new Date().toISOString().slice(0, 10)}`;

      if (format === "csv") {
        const blob = new Blob(
          [createReportCsv(report, academicPeriod.academicYear, academicPeriod.semester)],
          { type: "text/csv;charset=utf-8" },
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await downloadExcelReport(
          report,
          academicPeriod.academicYear,
          academicPeriod.semester,
          `${filename}.xlsx`,
        );
      }

      toast.success(
        `${format === "csv" ? "CSV" : "Excel"} report ready; your download has started.`,
      );
    } catch (caughtError) {
      console.error(`Could not create ${format.toUpperCase()} report`, caughtError);
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : `Could not create the ${format.toUpperCase()} report.`,
      );
    } finally {
      setExportingFormat(null);
      reportActionInFlight.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let loadInFlight = false;
    let refreshQueued = false;

    const scheduleRefresh = (delay = 350) => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void loadReports();
      }, delay);
    };

    async function loadReports() {
      if (loadInFlight) {
        refreshQueued = true;
        return;
      }

      loadInFlight = true;

      if (!user || user.role !== "admin") {
        router.push("/dashboard");
        loadInFlight = false;
        return;
      }

      try {
        let eventsQuery = supabase
          .from("events")
          .select(
            "id, title, event_date, start_time, end_time, location, description, program, status, image_url, media_urls, multi_session, sanctions_enabled, absent_fine, late_fine, morning_end, afternoon_end, morning_absent_fine, morning_late_fine, afternoon_absent_fine, afternoon_late_fine",
            { count: "exact" },
          )
          .order("event_date", { ascending: false })
          .order("id", { ascending: true })
          .neq("status", "upcoming");

        if (dateFrom) eventsQuery = eventsQuery.gte("event_date", dateFrom);
        if (dateTo) eventsQuery = eventsQuery.lte("event_date", dateTo);

        const [eventsResult, aggregatesResult] = await Promise.all([
          eventsQuery.range(
            (eventPage - 1) * EVENT_PAGE_SIZE,
            eventPage * EVENT_PAGE_SIZE - 1,
          ),
          supabase.rpc("get_admin_report_aggregates", {
            p_date_from: dateFrom || null,
            p_date_to: dateTo || null,
            p_event_offset: (eventPage - 1) * EVENT_PAGE_SIZE,
            p_event_limit: EVENT_PAGE_SIZE,
          }),
        ]);

        if (eventsResult.error) throw eventsResult.error;
        if (aggregatesResult.error) throw aggregatesResult.error;
        if (cancelled) return;

        const eventRows = eventsResult.data ?? [];
        const reportAggregates = aggregatesResult.data as {
          program_stats: Array<{
            label: string;
            present: number;
            total: number;
            rate: number;
            absent: number;
            excused: number;
            late: number;
            fine_total: number;
            sanctioned: number;
            sanctioned_late: number;
            sanctioned_absent: number;
          }>;
          fee_summary: {
            fine_count: number;
            assessed: number;
            collected: number;
            outstanding: number;
            waived: number;
          };
          event_stats: Array<{
            event_id: string;
            attendees: number;
            report_attended_sessions: number;
            report_absent_sessions: number;
            report_excused_sessions: number;
            report_late_sessions: number;
            report_sanctioned_sessions: number;
            report_fine_total: number;
          }>;
        };
        const statsByEvent = new Map(
          reportAggregates.event_stats.map((stats) => [stats.event_id, stats]),
        );

        const eventData: EventData[] = eventRows.map((row: any) => {
          const stats = statsByEvent.get(String(row.id));
          const eventDate = row.event_date ? new Date(row.event_date) : null;

          return {
            id: String(row.id),
            title: row.title,
            date: eventDate
              ? eventDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "",
            time:
              row.start_time && row.end_time
                ? `${row.start_time}–${row.end_time}`
                : "",
            location: row.location ?? "",
            description: row.description ?? "",
            program: row.program ?? "All Programs",
            fineAmount: Number(
              row.fine_amount ??
                row.fineAmount ??
                (row.multi_session
                  ? Number(row.morning_absent_fine ?? 0) +
                    Number(row.afternoon_absent_fine ?? 0)
                  : (row.absent_fine ?? 0)),
            ),
            absentFine: Number(row.absent_fine ?? 0),
            lateFine: Number(row.late_fine ?? 0),
            morningAbsentFine: Number(
              row.morning_absent_fine ?? row.absent_fine ?? 0,
            ),
            morningLateFine: Number(
              row.morning_late_fine ?? row.late_fine ?? 0,
            ),
            afternoonAbsentFine: Number(
              row.afternoon_absent_fine ?? row.absent_fine ?? 0,
            ),
            afternoonLateFine: Number(
              row.afternoon_late_fine ?? row.late_fine ?? 0,
            ),
            status: row.status ?? "upcoming",
            attendees: Number(stats?.attendees ?? 0),
            reportAttendedSessions: Number(
              stats?.report_attended_sessions ?? 0,
            ),
            reportAbsentSessions: Number(stats?.report_absent_sessions ?? 0),
            reportExcusedSessions: Number(stats?.report_excused_sessions ?? 0),
            reportLateSessions: Number(stats?.report_late_sessions ?? 0),
            reportFineTotal: Number(stats?.report_fine_total ?? 0),
            reportSanctionedSessions: Number(
              stats?.report_sanctioned_sessions ?? 0,
            ),
            mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
            highlightUrl:
              row.image_url && !row.image_url.startsWith("blob:")
                ? row.image_url
                : undefined,
          };
        });

        const feeSummary = reportAggregates.fee_summary;
        const eventCount = eventsResult.count ?? 0;
        const firstEvent =
          eventCount === 0 ? 0 : (eventPage - 1) * EVENT_PAGE_SIZE + 1;
        const lastEvent = Math.min(eventPage * EVENT_PAGE_SIZE, eventCount);
        const dateLabel =
          dateFrom || dateTo
            ? `${dateFrom || "Beginning"} – ${dateTo || "Today"}`
            : "All recorded events";
        const programStats: ReportPayload["programStats"] =
          reportAggregates.program_stats.map((stats) => ({
            label: stats.label,
            present: Number(stats.present),
            total: Number(stats.total),
            rate: Number(stats.rate),
            absent: Number(stats.absent),
            excused: Number(stats.excused),
            late: Number(stats.late),
            fineTotal: Number(stats.fine_total),
            sanctioned: Number(stats.sanctioned),
            sanctionedLate: Number(stats.sanctioned_late),
            sanctionedAbsent: Number(stats.sanctioned_absent),
          }));

        setReportData({
          events: eventData,
          periodLabel: `Events ${firstEvent}-${lastEvent} of ${eventCount} · ${dateLabel}`,
          eventCount,
          programStats,
          feeSummary:
            feeSummary.fine_count === 0
              ? []
              : [
                  {
                    label: "Total assessed",
                    value: `₱${Number(feeSummary.assessed).toLocaleString()}`,
                    color: "text-red-600",
                  },
                  {
                    label: "Collected",
                    value: `₱${Number(feeSummary.collected).toLocaleString()}`,
                    color: "text-emerald-500",
                  },
                  {
                    label: "Outstanding",
                    value: `₱${Number(feeSummary.outstanding).toLocaleString()}`,
                    color: "text-amber-600",
                  },
                  {
                    label: "Waived / excused",
                    value: `₱${Number(feeSummary.waived).toLocaleString()}`,
                    color: "text-violet-600",
                  },
                ],
        });
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        loadInFlight = false;
        if (!cancelled && refreshQueued) {
          refreshQueued = false;
          scheduleRefresh(0);
        }
      }
    }

    void loadReports();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        scheduleRefresh(0);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dateFrom, dateTo, eventPage, router, user]);

  if (!reportData) {
    return (
      <div className="space-y-5 pt-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <AdminReportsPage
      events={reportData.events}
      reportData={reportData}
      academicYear={academicPeriod.academicYear}
      semester={academicPeriod.semester}
      period={{ dateFrom, dateTo }}
      page={eventPage}
      pageSize={EVENT_PAGE_SIZE}
      totalCount={reportData.eventCount}
      onPageChange={setEventPage}
      onPrintReport={preparePrintReport}
      onExportReport={exportReport}
      isPreparingPrint={isPreparingPrint}
      exportingFormat={exportingFormat}
      printReportData={printReportData}
      onPeriodChange={(next) => {
        setDateFrom(next.dateFrom);
        setDateTo(next.dateTo);
        setEventPage(1);
      }}
    />
  );
}
