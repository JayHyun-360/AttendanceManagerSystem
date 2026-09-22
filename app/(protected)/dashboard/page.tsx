"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage, type EventData } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function DashboardRoute() {
  const router = useRouter();
  const { user, authUserId, showFees } = useProtectedUser();
  const [fines, setFines] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcementsReady, setAnnouncementsReady] = useState(false);
  const [finesReady, setFinesReady] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    upcoming: 0,
    rate: 0,
  });

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/admin-dashboard");
      return;
    }
  }, [router, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardAnnouncements() {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("target_role", "student")
          .order("created_at", { ascending: false })
          .limit(2);

        if (error) {
          console.error(error);
          return;
        }

        if (!cancelled) {
          setAnnouncements(
            (data ?? []).map((row: any) => ({
              id: row.id,
              title: row.title,
              body: row.content,
              date: new Date(row.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              author: row.posted_by ? "Admin" : "Adesse",
              badge: row.target_role === "admin" ? "Admin" : "General",
              photoUrl: row.media_url ?? "",
            })),
          );
        }
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setAnnouncementsReady(true);
        }
      }
    }

    void loadDashboardAnnouncements();

    const announcementsChannel = subscribeToTableChanges(
      "announcements",
      () => {
        if (!cancelled) {
          void loadDashboardAnnouncements();
        }
      },
    );

    return () => {
      cancelled = true;
      void announcementsChannel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardFines() {
      try {
        if (!authUserId) {
          return;
        }

        const [eventsResult, attendanceResult, fineResult] = await Promise.all([
          supabase
            .from("events")
            .select("*")
            .order("event_date", { ascending: true }),
          supabase
            .from("attendance_scans")
            .select("event_id, session_label, status, scan_in_at")
            .eq("student_id", authUserId),
          supabase
            .from("fines")
            .select("*")
            .eq("student_id", authUserId)
            .order("created_at", { ascending: false }),
        ]);

        if (eventsResult.error) {
          console.error(eventsResult.error);
        }

        if (attendanceResult.error) {
          console.error(attendanceResult.error);
        }

        if (fineResult.error) {
          console.error(fineResult.error);
        }

        if (cancelled) {
          return;
        }

        const eventRows = eventsResult.data ?? [];
        const attendanceRows = attendanceResult.data ?? [];
        const fineRows = fineResult.data ?? [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0"),
        ].join("-");

        const completedEventIds = new Set(
          eventRows
            .filter(
              (row: any) =>
                row.event_date <= todayKey && row.status !== "upcoming",
            )
            .map((row: any) => row.id),
        );
        const completedEventRows = eventRows.filter((row: any) =>
          completedEventIds.has(row.id),
        );
        const totalSessions = completedEventRows.reduce(
          (total: number, row: any) => total + (row.multi_session ? 2 : 1),
          0,
        );
        const presentCount = attendanceRows.filter(
          (row: any) =>
            completedEventIds.has(row.event_id) &&
            (row.status === "present" || row.status === "late") &&
            !!row.scan_in_at,
        ).length;
        const absentCount = attendanceRows.filter(
          (row: any) =>
            completedEventIds.has(row.event_id) && row.status === "absent",
        ).length;

        const upcomingCount = eventRows.filter((row: any) => {
          return row.event_date >= todayKey && row.status !== "closed";
        }).length;

        setEvents(eventRows);
        setFines(fineRows);
        setAttendanceStats({
          present: presentCount,
          absent: Math.max(absentCount, totalSessions - presentCount),
          upcoming: upcomingCount,
          rate: totalSessions > 0
            ? Math.round((presentCount / totalSessions) * 100)
            : 0,
        });
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setFinesReady(true);
        }
      }
    }

    void loadDashboardFines();

    const finesChannel = subscribeToTableChanges("fines", () => {
      if (!cancelled) {
        void loadDashboardFines();
      }
    });
    const attendanceChannel = subscribeToTableChanges(
      "attendance_scans",
      () => {
        if (!cancelled) {
          void loadDashboardFines();
        }
      },
    );
    const eventsChannel = subscribeToTableChanges("events", () => {
      if (!cancelled) {
        void loadDashboardFines();
      }
    });

    return () => {
      cancelled = true;
      void finesChannel.unsubscribe();
      void attendanceChannel.unsubscribe();
      void eventsChannel.unsubscribe();
    };
  }, [authUserId]);

  const isLoading = !announcementsReady || !finesReady;

  function DashboardPageSkeleton() {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-20 rounded-xl" />
          ))}
        </div>

        <Skeleton className="h-32 w-full rounded-xl" />

        <div className="space-y-2">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const onNav = (page: string) => {
    const paths: Record<string, string> = {
      events: "/events",
      "event-detail": "/events",
      "my-qr": "/my-qr",
      announcements: "/announcements",
      "attendance-history": "/attendance-history",
      "my-fines": "/my-fines",
      profile: "/profile",
    };

    const target = paths[page] ?? "/dashboard";
    router.push(target);
  };

  if (!user || isLoading) {
    return <DashboardPageSkeleton />;
  }

  const nextEvent: EventData | undefined = (() => {
      const today = new Date();
      const todayKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      const row = events.find((event: any) => {
        return event.event_date >= todayKey &&
        event.status !== "closed" &&
        event.status !== "cancelled";
      });

    if (!row) {
      return undefined;
    }

    const eventDate = new Date(row.event_date);
    const formattedDate = Number.isNaN(eventDate.getTime())
      ? (row.date ?? "")
      : eventDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

    return {
      id: row.id,
      title: row.title,
      date: formattedDate,
      time: row.time ?? row.event_time ?? "",
      location: row.location ?? "",
      status: row.status ?? "upcoming",
      attendees: Number(row.attendees ?? 0),
      description: row.description ?? "",
      program: row.program ?? "",
      fineAmount: Number(
        row.fine_amount ??
          row.fineAmount ??
          (row.multi_session
            ? Number(row.morning_absent_fine ?? 0) +
              Number(row.afternoon_absent_fine ?? 0)
            : row.absent_fine ?? 0),
      ),
      mediaUrls: Array.isArray(row.mediaUrls)
        ? row.mediaUrls
        : Array.isArray(row.media_urls)
          ? row.media_urls
          : [],
      highlightUrl:
        row.image_url && !row.image_url.startsWith("blob:")
          ? row.image_url
          : undefined,
      multiSession: Boolean(row.multiSession ?? row.multi_session),
      sanctionsEnabled: Boolean(row.sanctionsEnabled ?? row.sanctions_enabled),
      strictMorning: Boolean(row.strictMorning ?? row.strict_morning),
      strictAfternoon: Boolean(row.strictAfternoon ?? row.strict_afternoon),
      morningStart: row.morningStart ?? row.morning_start ?? undefined,
      morningEnd: row.morningEnd ?? row.morning_end ?? undefined,
      morningLateCutoff:
        row.morningLateCutoff ?? row.morning_late_cutoff ?? undefined,
      afternoonStart: row.afternoonStart ?? row.afternoon_start ?? undefined,
      afternoonEnd: row.afternoonEnd ?? row.afternoon_end ?? undefined,
      afternoonLateCutoff:
        row.afternoonLateCutoff ?? row.afternoon_late_cutoff ?? undefined,
      absentFine: Number(row.absentFine ?? row.absent_fine ?? 0),
      lateFine: Number(row.lateFine ?? row.late_fine ?? 0),
      morningAbsentFine: Number(
        row.morningAbsentFine ?? row.morning_absent_fine ?? 0,
      ),
      morningLateFine: Number(
        row.morningLateFine ?? row.morning_late_fine ?? 0,
      ),
      afternoonAbsentFine: Number(
        row.afternoonAbsentFine ?? row.afternoon_absent_fine ?? 0,
      ),
      afternoonLateFine: Number(
        row.afternoonLateFine ?? row.afternoon_late_fine ?? 0,
      ),
      version: Number(row.version ?? 0),
    };
  })();

  return (
    <DashboardPage
      user={user}
      onNav={onNav}
      fines={fines}
      showFees={showFees}
      announcements={announcements}
      nextEvent={nextEvent}
      attendanceStats={attendanceStats}
    />
  );
}
