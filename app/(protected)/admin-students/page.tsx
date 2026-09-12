"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminStudentsPage } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function AdminStudentsRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      try {
        if (!user || user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("surname", { ascending: true });

        if (error) {
          console.error(error);
          return;
        }

        if (!cancelled) {
          setStudents(
            (data ?? []).map((row: any) => ({
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

  return <AdminStudentsPage students={students} />;
}
