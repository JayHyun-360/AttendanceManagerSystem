"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminReportsPage, type EventData } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";
import {
  buildAttendanceSessionRecords,
  type FineEventLike,
  type FineRowLike,
  type FineScanLike,
} from "@/lib/attendance-fines";

type ReportPayload = {
  events: EventData[];
  programStats: Array<{
    label: string;
    present: number;
    total: number;
    rate: number;
    absent: number;
    late: number;
    fineTotal: number;
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

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      if (!user || user.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const [eventsResult, profilesResult, attendanceResult, finesResult] =
        await Promise.all([
          supabase
            .from("events")
            .select("*")
            .order("event_date", { ascending: false }),
          supabase.from("profiles").select("id, role, program"),
          supabase
            .from("attendance_scans")
            .select("id, event_id, student_id, session_label, status, scan_in_at"),
          supabase
            .from("fines")
            .select("id, student_id, event_id, attendance_scan_id, session_label, amount, status"),
        ]);

      if (eventsResult.error) {
        console.error(eventsResult.error);
      }

      if (profilesResult.error) {
        console.error(profilesResult.error);
      }

      if (attendanceResult.error) {
        console.error(attendanceResult.error);
      }

      if (finesResult.error) {
        console.error(finesResult.error);
      }

      if (cancelled) {
        return;
      }

      const eventRows = eventsResult.data ?? [];
      const profileRows = profilesResult.data ?? [];
      const attendanceRows = attendanceResult.data ?? [];
      const fineRows = finesResult.data ?? [];

      const studentRows = profileRows.filter((row: any) => row.role === "student");
      const recordsByStudent = new Map<string, ReturnType<typeof buildAttendanceSessionRecords>>();
      for (const student of studentRows) {
        recordsByStudent.set(
          student.id,
          buildAttendanceSessionRecords(
            eventRows as FineEventLike[],
            attendanceRows.filter((scan: any) => scan.student_id === student.id) as FineScanLike[],
            fineRows.filter((fine: any) => fine.student_id === student.id) as FineRowLike[],
            student.program,
          ),
        );
      }

      const programTotals = new Map<string, { total: number; present: number; absent: number; late: number; fineTotal: number }>();
      for (const student of studentRows) {
        const program = student.program || "Unassigned";
        const stats = programTotals.get(program) ?? { total: 0, present: 0, absent: 0, late: 0, fineTotal: 0 };
        for (const record of recordsByStudent.get(student.id) ?? []) {
          stats.total += 1;
          if (record.status === "present" && !!record.scan?.scan_in_at) stats.present += 1;
          if (record.status === "late" && !!record.scan?.scan_in_at) {
            stats.present += 1;
            stats.late += 1;
          }
          if (record.status === "absent" || record.status === "no_record") stats.absent += 1;
          stats.fineTotal += record.fineAmount;
        }
        programTotals.set(program, stats);
      }

      const programStats = Array.from(programTotals.entries())
        .map(([label, stats]) => ({
          label,
          present: stats.present,
          total: stats.total,
          rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
          absent: stats.absent,
          late: stats.late,
          fineTotal: stats.fineTotal,
        }))
        .sort((a, b) => b.total - a.total);

      const eventData: EventData[] = eventRows.map((row: any) => {
        const eventId = String(row.id);
        const eventRecords = studentRows.flatMap((student: any) =>
          (recordsByStudent.get(student.id) ?? []).filter((record) => record.eventId === eventId),
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
                : row.absent_fine ?? 0),
          ),
          absentFine: Number(row.absent_fine ?? 0),
          lateFine: Number(row.late_fine ?? 0),
          morningAbsentFine: Number(row.morning_absent_fine ?? row.absent_fine ?? 0),
          morningLateFine: Number(row.morning_late_fine ?? row.late_fine ?? 0),
          afternoonAbsentFine: Number(row.afternoon_absent_fine ?? row.absent_fine ?? 0),
          afternoonLateFine: Number(row.afternoon_late_fine ?? row.late_fine ?? 0),
          status: row.status ?? "upcoming",
          attendees: attendeeIds.size,
          reportAttendedSessions: eventRecords.filter((record) =>
            (record.status === "present" || record.status === "late") && !!record.scan?.scan_in_at,
          ).length,
          reportAbsentSessions: eventRecords.filter((record) =>
            record.status === "absent" || record.status === "no_record",
          ).length,
          reportLateSessions: eventRecords.filter((record) => record.status === "late").length,
          reportFineTotal: eventRecords.reduce((total, record) => total + record.fineAmount, 0),
          mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
          highlightUrl:
            row.image_url && !row.image_url.startsWith("blob:")
              ? row.image_url
              : undefined,
        };
      });

      const totalFeesIssued = fineRows.reduce(
        (sum, row: any) => sum + Number(row.amount ?? 0),
        0,
      );
      const collectedFees = fineRows
        .filter((row: any) => row.status === "paid")
        .reduce((sum, row: any) => sum + Number(row.amount ?? 0), 0);
      const pendingFees = fineRows
        .filter((row: any) => row.status === "unpaid")
        .reduce((sum, row: any) => sum + Number(row.amount ?? 0), 0);

      if (!cancelled) {
        setReportData({
          events: eventData,
          programStats,
          feeSummary: [
            {
              label: "Total fees issued",
              value: `₱${totalFeesIssued.toLocaleString()}`,
              color: "text-red-600",
            },
            {
              label: "Collected",
              value: `₱${collectedFees.toLocaleString()}`,
              color: "text-emerald-500",
            },
            {
              label: "Pending",
              value: `₱${pendingFees.toLocaleString()}`,
              color: "text-amber-600",
            },
          ],
        });
      }
    }

    void loadReports();

    const eventsChannel = subscribeToTableChanges("events", () => {
      if (!cancelled) {
        void loadReports();
      }
    });
    const profilesChannel = subscribeToTableChanges("profiles", () => {
      if (!cancelled) {
        void loadReports();
      }
    });
    const attendanceChannel = subscribeToTableChanges(
      "attendance_scans",
      () => {
        if (!cancelled) {
          void loadReports();
        }
      },
    );
    const finesChannel = subscribeToTableChanges("fines", () => {
      if (!cancelled) {
        void loadReports();
      }
    });

    return () => {
      cancelled = true;
      void eventsChannel.unsubscribe();
      void profilesChannel.unsubscribe();
      void attendanceChannel.unsubscribe();
      void finesChannel.unsubscribe();
    };
  }, [router, user]);

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
    <AdminReportsPage events={reportData.events} reportData={reportData} />
  );
}
