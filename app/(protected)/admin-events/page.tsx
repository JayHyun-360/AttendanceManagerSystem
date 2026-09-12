"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminEventsPage, type EventData, type Page } from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function AdminEventsRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminEvents() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const { data: rows, error } = await supabase
          .from("events")
          .select("*")
          .order("event_date", { ascending: false });

        if (error) {
          console.error(error);
        } else if (!cancelled) {
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
            fineAmount: row.absent_fine || 0,
            status: (row.status as any) || "upcoming",
            attendees: 0,
            version: row.version || 1,
            mediaUrls:
              row.image_url && !row.image_url.startsWith("blob:")
                ? [row.image_url]
                : [],
            highlightUrl:
              row.image_url && !row.image_url.startsWith("blob:")
                ? row.image_url
                : undefined,
            multiSession: row.multi_session || false,
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
      }
    }

    void loadAdminEvents();
    return () => {
      cancelled = true;
    };
  }, [router, user]);

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

  return (
    <AdminEventsPage onNav={onNav} events={events} setEvents={setEvents} />
  );
}
