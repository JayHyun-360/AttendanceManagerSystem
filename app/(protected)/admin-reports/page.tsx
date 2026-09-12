"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminReportsPage, type EventData } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

type ReportPayload = {
  events: EventData[];
  programStats: Array<{
    label: string;
    present: number;
    total: number;
    rate: number;
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
            .from("attendance_logs")
            .select("event_id, student_id, status"),
          supabase.from("fines").select("amount, status"),
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

      const profileMap = new Map<string, string>();
      for (const row of profileRows) {
        if (row.role === "student") {
          profileMap.set(row.id, row.program || "Unassigned");
        }
      }

      const totalByProgram = new Map<string, number>();
      const presentByProgram = new Map<string, Set<string>>();

      for (const row of profileRows) {
        if (row.role !== "student") {
          continue;
        }

        const program = row.program || "Unassigned";
        totalByProgram.set(program, (totalByProgram.get(program) ?? 0) + 1);
        presentByProgram.set(program, new Set<string>());
      }

      for (const row of attendanceRows) {
        const studentId = row.student_id;
        if (!studentId) {
          continue;
        }

        const program = profileMap.get(studentId);
        if (!program) {
          continue;
        }

        const presentSet = presentByProgram.get(program) ?? new Set<string>();
        if (row.status === "present" || row.status === "late") {
          presentSet.add(studentId);
        }
        presentByProgram.set(program, presentSet);
      }

      const programStats = Array.from(totalByProgram.entries())
        .map(([label, total]) => {
          const presentSet = presentByProgram.get(label) ?? new Set<string>();
          return {
            label,
            present: presentSet.size,
            total,
            rate: total > 0 ? Math.round((presentSet.size / total) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total);

      const eventData: EventData[] = eventRows.map((row: any) => {
        const eventId = String(row.id);
        const attendeeIds = new Set<string>();

        for (const scan of attendanceRows) {
          if (scan.event_id === eventId && scan.student_id) {
            attendeeIds.add(scan.student_id);
          }
        }

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
            row.absent_fine ?? row.fine_amount ?? row.fineAmount ?? 0,
          ),
          status: row.status ?? "upcoming",
          attendees: attendeeIds.size,
          mediaUrls: row.image_url ? [row.image_url] : undefined,
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
        .filter((row: any) => row.status === "paid" || row.status === "excused")
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
              color: "text-green-600",
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
    const attendanceChannel = subscribeToTableChanges("attendance_logs", () => {
      if (!cancelled) {
        void loadReports();
      }
    });
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
