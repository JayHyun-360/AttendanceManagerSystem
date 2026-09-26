"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminEventsPage, type EventData, type Page } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

function mapArchivedEvent(row: any): EventData {
  return {
    id: String(row.id),
    title: row.title,
    date: row.event_date,
    time:
      row.start_time && row.end_time
        ? `${row.start_time}–${row.end_time}`
        : "",
    location: row.location,
    description: row.description,
    program: row.program || "All Programs",
    fineAmount: row.multi_session
      ? Number(row.morning_absent_fine ?? 0) +
        Number(row.afternoon_absent_fine ?? 0)
      : Number(row.absent_fine ?? 0),
    status: row.status || "upcoming",
    attendees: 0,
    version: row.version || 1,
    archivedAt: row.archived_at ?? undefined,
    mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
    highlightUrl:
      row.image_url && !row.image_url.startsWith("blob:")
        ? row.image_url
        : undefined,
    multiSession: Boolean(row.multi_session),
    sanctionsEnabled: Boolean(row.sanctions_enabled),
    strictMorning: Boolean(row.strict_morning),
    strictAfternoon: Boolean(row.strict_afternoon),
    morningStart: row.morning_start,
    morningEnd: row.morning_end,
    morningLateCutoff: row.morning_late_cutoff,
    afternoonStart: row.afternoon_start,
    afternoonEnd: row.afternoon_end,
    afternoonLateCutoff: row.afternoon_late_cutoff,
    absentFine: Number(row.absent_fine ?? 0),
    lateFine: Number(row.late_fine ?? 0),
    morningAbsentFine: Number(row.morning_absent_fine ?? 0),
    morningLateFine: Number(row.morning_late_fine ?? 0),
    afternoonAbsentFine: Number(row.afternoon_absent_fine ?? 0),
    afternoonLateFine: Number(row.afternoon_late_fine ?? 0),
  };
}

export default function AdminEventsRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [events, setEvents] = useState<EventData[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<EventData[]>([]);
  const [isArchivedLoading, setIsArchivedLoading] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [finesEnabled, setFinesEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function loadArchivedEvents() {
    if (!user || user.role !== "admin" || isArchivedLoading) return;

    setIsArchivedLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setArchivedEvents((data ?? []).map(mapArchivedEvent));
      setArchivedLoaded(true);
    }

    setIsArchivedLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAdminEvents() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const [
          { data: rows, error },
          { data: scans, error: scansError },
          { data: settingsRow, error: settingsError },
        ] =
          await Promise.all([
            supabase
              .from("events")
              .select("*")
              .is("archived_at", null)
              .order("event_date", { ascending: false }),
            supabase
              .from("attendance_scans")
              .select("event_id, student_id, status, scan_in_at"),
            supabase
              .from("system_settings")
              .select("settings")
              .eq("id", 1)
              .maybeSingle(),
          ]);

        if (error) {
          console.error(error);
        }
        if (scansError) console.error(scansError);
        if (settingsError) console.error(settingsError);
        if (!settingsError && !cancelled) {
          setFinesEnabled(
            Boolean((settingsRow?.settings as { finesEnabled?: boolean } | null)?.finesEnabled),
          );
        }
        if (!error && !cancelled) {
          const mapped: EventData[] = (rows ?? []).map((row: any) => ({
            id: row.id,
            title: row.title,
            date: row.event_date,
            time:
              row.start_time && row.end_time
                ? `${row.start_time}–${row.end_time}`
                : "",
            location: row.location,
            description: row.description,
            program: row.program || "All Programs",
            fineAmount: row.multi_session
              ? Number(row.morning_absent_fine ?? 0) +
                Number(row.afternoon_absent_fine ?? 0)
              : Number(row.absent_fine ?? 0),
            status: (row.status as any) || "upcoming",
            attendees: new Set(
              (scans ?? [])
                .filter(
                  (scan: any) =>
                    scan.event_id === row.id &&
                    (scan.status === "present" || scan.status === "late") &&
                    !!scan.scan_in_at,
                )
                .map((scan: any) => scan.student_id),
            ).size,
            version: row.version || 1,
            mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
            highlightUrl:
              row.image_url && !row.image_url.startsWith("blob:")
                ? row.image_url
                : undefined,
            multiSession: row.multi_session || false,
            sanctionsEnabled: row.sanctions_enabled || false,
            strictMorning: row.strict_morning || false,
            strictAfternoon: row.strict_afternoon || false,
            morningStart: row.morning_start,
            morningEnd: row.morning_end,
            morningLateCutoff: row.morning_late_cutoff,
            afternoonStart: row.afternoon_start,
            afternoonEnd: row.afternoon_end,
            afternoonLateCutoff: row.afternoon_late_cutoff,
            absentFine: row.absent_fine || 0,
            lateFine: row.late_fine || 0,
            morningAbsentFine: row.morning_absent_fine,
            morningLateFine: row.morning_late_fine,
            afternoonAbsentFine: row.afternoon_absent_fine,
            afternoonLateFine: row.afternoon_late_fine,
          }));
          setEvents(mapped);
        }
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAdminEvents();

    const eventsChannel = subscribeToTableChanges("events", () => {
      if (!cancelled) {
        void loadAdminEvents();
        if (archivedLoaded) void loadArchivedEvents();
      }
    });
    const attendanceChannel = subscribeToTableChanges("attendance_scans", () => {
      if (!cancelled) void loadAdminEvents();
    });

    return () => {
      cancelled = true;
      void eventsChannel.unsubscribe();
      void attendanceChannel.unsubscribe();
    };
  }, [router, user, archivedLoaded]);

  const onNav = (page: Page) => {
    const paths: Record<Page, string> = {
      "admin-events": "/admin-events",
      "admin-scanner": "/admin-scanner",
      "admin-attendees": "/admin-attendees",
      "admin-students": "/admin-students",
      "admin-announcements": "/admin-announcements",
      "admin-excuse-requests": "/admin-excuse-requests",
      "admin-reports": "/admin-reports",
      "admin-settings": "/admin-settings",
      "admin-dashboard": "/admin-dashboard",
      dashboard: "/dashboard",
      login: "/login",
      landing: "/",
      onboarding: "/onboarding",
      "my-qr": "/my-qr",
      events: "/events",
      "event-detail": "/events",
      announcements: "/announcements",
      "attendance-history": "/attendance-history",
      "my-fines": "/my-fines",
      profile: "/profile",
    };

    const target = paths[page] ?? "/admin-events";
    router.push(target);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <div className="flex gap-2">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <AdminEventsPage
      onNav={onNav}
      events={events}
      setEvents={setEvents}
      archivedEvents={archivedEvents}
      setArchivedEvents={setArchivedEvents}
      onLoadArchived={loadArchivedEvents}
      isArchivedLoading={isArchivedLoading}
      finesEnabled={finesEnabled}
    />
  );
}
