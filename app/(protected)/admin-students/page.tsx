"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminStudentsPage, type EventData } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function AdminStudentsRoutePage() {
  const router = useRouter();
  const { user, authUserId } = useProtectedUser();
  const [students, setStudents] = useState<any[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const [studentsResult, eventsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .order("surname", { ascending: true }),
          supabase
            .from("events")
            .select("*")
            .order("event_date", { ascending: false }),
        ]);

        if (studentsResult.error) {
          console.error(studentsResult.error);
        }
        if (eventsResult.error) {
          console.error(eventsResult.error);
        }

        if (studentsResult.error || eventsResult.error) {
          return;
        }

        if (!cancelled) {
          setStudents(
            (studentsResult.data ?? []).map((row: any) => ({
              profileId: row.id,
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
              photoUrl: row.photo_url || undefined,
              idPhotoUrl: row.id_photo_url || undefined,
              joinedDate: new Date(row.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            })),
          );
          setEvents(
            (eventsResult.data ?? []).map((row: any) => ({
              id: String(row.id),
              title: row.title,
              date: row.event_date,
              time:
                row.start_time && row.end_time
                  ? `${row.start_time}–${row.end_time}`
                  : "",
              location: row.location || "",
              description: row.description || "",
              program: row.program || "All Programs",
              fineAmount: Number(row.absent_fine || 0),
              status: row.status || "upcoming",
              attendees: 0,
              multiSession: Boolean(row.multi_session),
              strictMorning: Boolean(row.strict_morning),
              strictAfternoon: Boolean(row.strict_afternoon),
              morningStart: row.morning_start,
              morningEnd: row.morning_end,
              morningLateCutoff: row.morning_late_cutoff,
              afternoonStart: row.afternoon_start,
              afternoonEnd: row.afternoon_end,
              afternoonLateCutoff: row.afternoon_late_cutoff,
            })),
          );
        }
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    const profilesChannel = subscribeToTableChanges("profiles", () => {
      if (!cancelled) {
        void loadStudents();
      }
    });

    return () => {
      cancelled = true;
      void profilesChannel.unsubscribe();
    };
  }, [router, user]);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-36 rounded-lg" />
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <AdminStudentsPage
      students={students}
      events={events}
      authUserId={authUserId}
    />
  );
}
