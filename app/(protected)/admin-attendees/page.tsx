"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAttendeesPage, type EventData, type Page } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function AdminAttendeesRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [events, setEvents] = useState<EventData[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [scanState, setScanState] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const [eventsResult, studentsResult] = await Promise.all([
          supabase
            .from("events")
            .select("*")
            .order("event_date", { ascending: false }),
          supabase
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .order("surname", { ascending: true }),
        ]);

        if (eventsResult.error) {
          console.error(eventsResult.error);
        }

        if (studentsResult.error) {
          console.error(studentsResult.error);
        }

        if (cancelled) {
          return;
        }

        const mappedEvents = (eventsResult.data ?? []).map((row: any) => ({
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
          fineAmount: row.absent_fine || 0,
          status: row.status || "upcoming",
          attendees: 0,
          highlightUrl:
            row.image_url && !row.image_url.startsWith("blob:")
              ? row.image_url
              : undefined,
        }));

        setEvents(mappedEvents);

        setStudents(
          (studentsResult.data ?? []).map((row: any) => ({
            name:
              `${row.first_name ?? ""} ${row.surname ?? ""}`.trim() ||
              row.email ||
              "Student",
            id: row.student_id || row.id,
            program: row.program || "",
            yearLevel: row.year_level || "",
            section: row.section || "",
            phone: row.phone || "",
            email: row.contact_email || row.email || "",
            joinedDate: new Date(row.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          })),
        );

        const attendanceResult = await supabase
          .from("attendance_logs")
          .select(
            "*, student_profile:profiles!attendance_logs_student_id_fkey(student_id, first_name, surname, program, section)",
          )
          .order("scanned_at", { ascending: false });

        if (!attendanceResult.error && attendanceResult.data) {
          const byEvent: Record<string, any[]> = {};

          for (const row of attendanceResult.data) {
            const eventId = String(row.event_id);
            const studentName =
              `${row.student_profile?.first_name ?? ""} ${row.student_profile?.surname ?? ""}`.trim();
            const studentId = row.student_profile?.student_id || row.student_id;

            if (!byEvent[eventId]) {
              byEvent[eventId] = [];
            }

            byEvent[eventId].push({
              name: studentName || "Student",
              id: studentId || row.student_id,
              program: row.student_profile?.program || "",
              section: row.student_profile?.section || "",
              time: new Date(row.scanned_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              status: "confirmed",
              dbId: String(row.id),
            });
          }

          setScanState(byEvent);
        }
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    const eventsChannel = subscribeToTableChanges("events", () => {
      if (!cancelled) {
        void loadData();
      }
    });
    const profilesChannel = subscribeToTableChanges("profiles", () => {
      if (!cancelled) {
        void loadData();
      }
    });
    const attendanceChannel = subscribeToTableChanges("attendance_logs", () => {
      if (!cancelled) {
        void loadData();
      }
    });

    return () => {
      cancelled = true;
      void eventsChannel.unsubscribe();
      void profilesChannel.unsubscribe();
      void attendanceChannel.unsubscribe();
    };
  }, [router, user]);

  const onNav = (page: Page) => {
    const paths: Record<Page, string> = {
      landing: "/",
      login: "/login",
      onboarding: "/onboarding",
      dashboard: "/dashboard",
      "my-qr": "/my-qr",
      events: "/events",
      "event-detail": "/events",
      announcements: "/announcements",
      "attendance-history": "/attendance-history",
      "my-fines": "/my-fines",
      profile: "/profile",
      "admin-dashboard": "/admin-dashboard",
      "admin-events": "/admin-events",
      "admin-scanner": "/admin-scanner",
      "admin-attendees": "/admin-attendees",
      "admin-students": "/admin-students",
      "admin-announcements": "/admin-announcements",
      "admin-reports": "/admin-reports",
      "admin-excuse-requests": "/admin-excuse-requests",
      "admin-settings": "/admin-settings",
    };

    router.push(paths[page] ?? "/admin-dashboard");
  };

  const deleteAttendance = async (dbId: string | number) => {
    const { error } = await supabase
      .from("attendance_logs")
      .delete()
      .eq("id", String(dbId));

    if (error) {
      console.error("Failed to delete attendance record", error);
      return false;
    }

    return true;
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="flex gap-2">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <AdminAttendeesPage
      onNav={onNav}
      events={events}
      students={students}
      scanState={scanState}
      onDeleteAttendance={deleteAttendance}
    />
  );
}
