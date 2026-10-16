"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminReportsPage, type EventData } from "../../shared-page";
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

const EVENT_PAGE_SIZE = 5;
const QUERY_PAGE_SIZE = 100;

async function fetchAllPages(buildQuery: (from: number, to: number) => any) {
  const rows: any[] = [];

  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + QUERY_PAGE_SIZE - 1);
    if (error) throw error;

    rows.push(...(data ?? []));
    if (!data || data.length < QUERY_PAGE_SIZE) return rows;
  }
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

export default function AdminReportsRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [reportData, setReportData] = useState<ReportPayload | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventPage, setEventPage] = useState(1);

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

        const eventsResult = await eventsQuery.range(
          (eventPage - 1) * EVENT_PAGE_SIZE,
          eventPage * EVENT_PAGE_SIZE - 1,
        );
        const eventRows = eventsResult.data ?? [];
        const scopedEventIds = new Set(
          eventRows.map((row: any) => String(row.id)),
        );
        const eventIds = Array.from(scopedEventIds);
        const [
          profileRows,
          attendanceRows,
          fineRows,
          settingsResult,
          approvedExcuseRows,
        ] = await Promise.all([
          fetchAllPages((from, to) =>
            supabase
              .from("profiles")
              .select("id, program")
              .eq("role", "student")
              .order("id", { ascending: true })
              .range(from, to),
          ),
          eventIds.length
            ? fetchAllPages((from, to) =>
                supabase
                  .from("attendance_scans")
                  .select(
                    "id, event_id, student_id, session_label, status, scan_in_at",
                  )
                  .in("event_id", eventIds)
                  .order("event_id", { ascending: true })
                  .order("id", { ascending: true })
                  .range(from, to),
              )
            : Promise.resolve([]),
          eventIds.length
            ? fetchAllPages((from, to) =>
                supabase
                  .from("fines")
                  .select(
                    "id, student_id, event_id, attendance_scan_id, session_label, amount, status",
                  )
                  .in("event_id", eventIds)
                  .order("event_id", { ascending: true })
                  .order("id", { ascending: true })
                  .range(from, to),
              )
            : Promise.resolve([]),
          getPublicSystemSettings(),
          eventIds.length
            ? fetchAllPages((from, to) =>
                supabase
                  .from("excuse_requests")
                  .select("student_id, event_id, session_label")
                  .eq("status", "approved")
                  .in("event_id", eventIds)
                  .order("event_id", { ascending: true })
                  .order("id", { ascending: true })
                  .range(from, to),
              )
            : Promise.resolve([]),
        ]);

        if (eventsResult.error) throw eventsResult.error;
        if (settingsResult.error) console.error(settingsResult.error);

        if (cancelled) return;

        const finesEnabled = Boolean(
          (settingsResult.data?.settings as { finesEnabled?: boolean } | null)
            ?.finesEnabled,
        );

        const studentRows = profileRows;
        const recordsByStudent = new Map<
          string,
          ReturnType<typeof buildAttendanceSessionRecords>
        >();
        for (const student of studentRows) {
          const approvedExcuseKeys = new Set(
            approvedExcuseRows
              .filter(
                (request: any) =>
                  request.student_id === student.id &&
                  request.event_id &&
                  request.session_label,
              )
              .map(
                (request: any) =>
                  `${request.event_id}:${request.session_label}`,
              ),
          );
          recordsByStudent.set(
            student.id,
            buildAttendanceSessionRecords(
              eventRows as FineEventLike[],
              attendanceRows.filter(
                (scan: any) => scan.student_id === student.id,
              ) as FineScanLike[],
              fineRows.filter(
                (fine: any) => fine.student_id === student.id,
              ) as FineRowLike[],
              student.program,
              getSchoolDate(),
              finesEnabled,
              approvedExcuseKeys,
            ),
          );
        }

        const programTotals = new Map<
          string,
          {
            total: number;
            present: number;
            absent: number;
            excused: number;
            late: number;
            fineTotal: number;
            sanctioned: number;
            sanctionedLate: number;
            sanctionedAbsent: number;
          }
        >();
        for (const student of studentRows) {
          const program = student.program || "Unassigned";
          const stats = programTotals.get(program) ?? {
            total: 0,
            present: 0,
            absent: 0,
            excused: 0,
            late: 0,
            fineTotal: 0,
            sanctioned: 0,
            sanctionedLate: 0,
            sanctionedAbsent: 0,
          };
          for (const record of recordsByStudent.get(student.id) ?? []) {
            if (!record.excused) stats.total += 1;
            if (record.status === "present" && !!record.scan?.scan_in_at)
              stats.present += 1;
            if (record.status === "late" && !!record.scan?.scan_in_at) {
              stats.present += 1;
              stats.late += 1;
            }
            if (record.excused) {
              stats.excused += 1;
            } else if (
              record.status === "absent" ||
              record.status === "no_record"
            ) {
              stats.absent += 1;
            }
            if (record.sanctioned) {
              stats.sanctioned += 1;
              if (record.status === "late") stats.sanctionedLate += 1;
              if (record.status === "absent") stats.sanctionedAbsent += 1;
            }
          }
          stats.fineTotal += fineRows
            .filter(
              (fine: any) =>
                fine.student_id === student.id &&
                scopedEventIds.has(String(fine.event_id)),
            )
            .reduce(
              (sum: number, fine: any) => sum + Number(fine.amount ?? 0),
              0,
            );
          programTotals.set(program, stats);
        }

        const programStats = Array.from(programTotals.entries())
          .map(([label, stats]) => ({
            label,
            present: stats.present,
            total: stats.total,
            rate:
              stats.total > 0
                ? Math.round((stats.present / stats.total) * 100)
                : 0,
            absent: stats.absent,
            excused: stats.excused,
            late: stats.late,
            fineTotal: stats.fineTotal,
            sanctioned: stats.sanctioned,
            sanctionedLate: stats.sanctionedLate,
            sanctionedAbsent: stats.sanctionedAbsent,
          }))
          .sort((a, b) => b.total - a.total);

        const eventData: EventData[] = eventRows.map((row: any) => {
          const eventId = String(row.id);
          const eventRecords = studentRows.flatMap((student: any) =>
            (recordsByStudent.get(student.id) ?? []).filter(
              (record) => record.eventId === eventId,
            ),
          );
          const attendeeIds = new Set(
            attendanceRows
              .filter(
                (scan: any) =>
                  scan.event_id === eventId &&
                  (scan.status === "present" || scan.status === "late") &&
                  !!scan.scan_in_at,
              )
              .map((scan: any) => scan.student_id),
          );
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
            attendees: attendeeIds.size,
            reportAttendedSessions: eventRecords.filter(
              (record) =>
                (record.status === "present" || record.status === "late") &&
                !!record.scan?.scan_in_at,
            ).length,
            reportAbsentSessions: eventRecords.filter(
              (record) =>
                !record.excused &&
                (record.status === "absent" || record.status === "no_record"),
            ).length,
            reportExcusedSessions: eventRecords.filter(
              (record) => record.excused,
            ).length,
            reportLateSessions: eventRecords.filter(
              (record) => record.status === "late",
            ).length,
            reportFineTotal: fineRows
              .filter((fine: any) => String(fine.event_id) === eventId)
              .reduce(
                (total: number, fine: any) => total + Number(fine.amount ?? 0),
                0,
              ),
            reportSanctionedSessions: eventRecords.filter(
              (record) => record.sanctioned,
            ).length,
            mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
            highlightUrl:
              row.image_url && !row.image_url.startsWith("blob:")
                ? row.image_url
                : undefined,
          };
        });

        const scopedFineRows = fineRows.filter((row: any) =>
          scopedEventIds.has(String(row.event_id)),
        );
        const totalFeesIssued = scopedFineRows.reduce(
          (sum, row: any) => sum + Number(row.amount ?? 0),
          0,
        );
        const collectedFees = scopedFineRows
          .filter((row: any) => row.status === "paid")
          .reduce((sum, row: any) => sum + Number(row.amount ?? 0), 0);
        const pendingFees = scopedFineRows
          .filter((row: any) => row.status === "unpaid")
          .reduce((sum, row: any) => sum + Number(row.amount ?? 0), 0);
        const excusedFees = scopedFineRows
          .filter((row: any) => row.status === "excused")
          .reduce((sum, row: any) => sum + Number(row.amount ?? 0), 0);

        if (!cancelled) {
          setReportData({
            events: eventData,
            periodLabel: `Events ${(eventPage - 1) * EVENT_PAGE_SIZE + 1}-${Math.min(eventPage * EVENT_PAGE_SIZE, eventsResult.count ?? 0)} of ${eventsResult.count ?? 0} · ${dateFrom || dateTo ? `${dateFrom || "Beginning"} – ${dateTo || "Today"}` : "All recorded events"}`,
            eventCount: eventsResult.count ?? 0,
            programStats,
            feeSummary:
              scopedFineRows.length === 0
                ? []
                : [
                    {
                      label: "Total assessed",
                      value: `₱${totalFeesIssued.toLocaleString()}`,
                      color: "text-red-600",
                    },
                    {
                      label: "Collected",
                      value: `₱${collectedFees.toLocaleString()}`,
                      color: "text-emerald-500",
                    },
                    {
                      label: "Outstanding",
                      value: `₱${pendingFees.toLocaleString()}`,
                      color: "text-amber-600",
                    },
                    {
                      label: "Waived / excused",
                      value: `₱${excusedFees.toLocaleString()}`,
                      color: "text-violet-600",
                    },
                  ],
          });
        }
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
      period={{ dateFrom, dateTo }}
      page={eventPage}
      pageSize={EVENT_PAGE_SIZE}
      totalCount={reportData.eventCount}
      onPageChange={setEventPage}
      onPeriodChange={(next) => {
        setDateFrom(next.dateFrom);
        setDateTo(next.dateTo);
        setEventPage(1);
      }}
    />
  );
}
