"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage, type EventData } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function DashboardRoute() {
  const router = useRouter();
  const { user, authUserId } = useProtectedUser();
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
              author: row.posted_by ? "Admin" : "TapIn",
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
            .from("attendance_logs")
            .select("status")
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

        const presentCount = attendanceRows.filter(
          (row: any) => row.status === "present" || row.status === "late",
        ).length;

        const upcomingCount = eventRows.filter((row: any) => {
          const rowDate = new Date(row.event_date);
          rowDate.setHours(0, 0, 0, 0);
          return rowDate >= today;
        }).length;

        const unpaidFineCount = fineRows.filter(
          (row: any) => row.status === "unpaid",
        ).length;

        setEvents(eventRows);
        setFines(fineRows);
        setAttendanceStats({
          present: presentCount,
          absent: unpaidFineCount,
          upcoming: upcomingCount,
          rate:
            presentCount > 0 || unpaidFineCount > 0
              ? Math.min(
                  100,
                  Math.round(
                    (presentCount /
                      Math.max(1, presentCount + unpaidFineCount)) *
                      100,
                  ),
                )
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
    const attendanceChannel = subscribeToTableChanges("attendance_logs", () => {
      if (!cancelled) {
        void loadDashboardFines();
      }
    });
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

        <div className="grid grid-cols-3 gap-3">
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
    const row = events.find((event: any) => {
      const date = new Date(event.event_date);
      return date >= new Date(new Date().setHours(0, 0, 0, 0));
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
      fineAmount: Number(row.fine_amount ?? row.fineAmount ?? 0),
      mediaUrls: Array.isArray(row.mediaUrls)
        ? row.mediaUrls
        : Array.isArray(row.media_urls)
          ? row.media_urls
          : undefined,
      highlightUrl: row.highlightUrl ?? row.highlight_url ?? undefined,
      multiSession: Boolean(row.multiSession ?? row.multi_session),
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
      showFees={false}
      announcements={announcements}
      nextEvent={nextEvent}
      attendanceStats={attendanceStats}
    />
  );
}
