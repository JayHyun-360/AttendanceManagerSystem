"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminStudentsPage } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function AdminStudentsRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
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

  return <AdminStudentsPage students={students} />;
}
