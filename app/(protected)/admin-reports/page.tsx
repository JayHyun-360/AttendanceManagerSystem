"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminReportsPage, type EventData } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

const EVENT_PAGE_SIZE = 5;

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
  const { user, academicPeriod } = useProtectedUser();
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
      onPeriodChange={(next) => {
        setDateFrom(next.dateFrom);
        setDateTo(next.dateTo);
        setEventPage(1);
      }}
    />
  );
}
