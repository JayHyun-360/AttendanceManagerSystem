"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function AdminDashboardRoute() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    scannedToday: 0,
    duplicates: 0,
    activeEvents: 0,
    students: 0,
  });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [featuredEventTitle, setFeaturedEventTitle] =
    useState<string>("TapIn overview");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminDashboardRequests() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const [excuseResult, eventsResult, profileResult, scansResult] =
          await Promise.all([
            supabase
              .from("excuse_requests")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("events")
              .select("*")
              .order("event_date", { ascending: true }),
            supabase.from("profiles").select("id").eq("role", "student"),
            supabase
              .from("attendance_logs")
              .select(
                "*, student_profile:profiles!attendance_logs_student_id_fkey(first_name, surname, student_id, section), events(title)",
              )
              .order("scanned_at", { ascending: false })
              .limit(5),
          ]);

        if (excuseResult.error) {
          console.error(excuseResult.error);
        }

        if (eventsResult.error) {
          console.error(eventsResult.error);
        }

        if (profileResult.error) {
          console.error(profileResult.error);
        }

        if (scansResult.error) {
          console.error(scansResult.error);
        }

        if (cancelled) {
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeEvents = (eventsResult.data ?? []).filter((row: any) => {
          const eventDate = new Date(row.event_date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        }).length;

        const scannedToday = (scansResult.data ?? []).filter((row: any) => {
          if (!row.scanned_at) {
            return false;
          }

          const scannedAt = new Date(row.scanned_at);
          return scannedAt >= today;
        }).length;

        const duplicates = (scansResult.data ?? []).filter(
          (row: any) => row.status === "late",
        ).length;

        const recent = (scansResult.data ?? []).map((row: any) => ({
          name:
            `${row.student_profile?.first_name ?? ""} ${row.student_profile?.surname ?? ""}`.trim() ||
            "Student",
          id: row.student_profile?.student_id || row.student_id,
          section: row.student_profile?.section || "",
          time: row.scanned_at
            ? new Date(row.scanned_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          status: row.status === "late" ? "duplicate" : "confirmed",
        }));

        setRequests(excuseResult.data ?? []);
        setStats({
          scannedToday,
          duplicates,
          activeEvents,
          students: profileResult.data?.length ?? 0,
        });
        setRecentScans(recent);
        setFeaturedEventTitle(
          (eventsResult.data ?? [])[0]?.title || "TapIn overview",
        );
      } catch (caughtError) {
        console.error(caughtError);
      }
    }

    void loadAdminDashboardRequests();

    const requestsChannel = subscribeToTableChanges("excuse_requests", () => {
      if (!cancelled) {
        void loadAdminDashboardRequests();
      }
    });
    const eventsChannel = subscribeToTableChanges("events", () => {
      if (!cancelled) {
        void loadAdminDashboardRequests();
      }
    });
    const profilesChannel = subscribeToTableChanges("profiles", () => {
      if (!cancelled) {
        void loadAdminDashboardRequests();
      }
    });
    const attendanceChannel = subscribeToTableChanges("attendance_logs", () => {
      if (!cancelled) {
        void loadAdminDashboardRequests();
      }
    });

    return () => {
      cancelled = true;
      void requestsChannel.unsubscribe();
      void eventsChannel.unsubscribe();
      void profilesChannel.unsubscribe();
      void attendanceChannel.unsubscribe();
    };
  }, [router, user]);

  const onNav = (page: string) => {
    const paths: Record<string, string> = {
      "admin-events": "/admin-events",
      "admin-scanner": "/admin-scanner",
      "admin-attendees": "/admin-attendees",
      "admin-students": "/admin-students",
      "admin-announcements": "/admin-announcements",
      "admin-excuse-requests": "/admin-excuse-requests",
      "admin-reports": "/admin-reports",
      "admin-settings": "/admin-settings",
    };

    const target = paths[page] ?? "/admin-dashboard";
    router.push(target);
  };

  return (
    <AdminDashboard
      onNav={onNav}
      excuseRequests={requests}
      stats={stats}
      recentScans={recentScans}
      featuredEventTitle={featuredEventTitle}
    />
  );
}
