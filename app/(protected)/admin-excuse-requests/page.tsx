"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminExcuseRequestsPage, type ExcuseRequest } from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function AdminExcuseRequestsRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      if (!user || user.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("excuse_requests")
        .select("*, profiles(first_name, surname, student_id)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (!cancelled) {
        setRequests(
          (data ?? []).map((row: any) => ({
            id: String(row.id),
            studentName:
              `${row.profiles?.first_name ?? ""} ${row.profiles?.surname ?? ""}`.trim() ||
              "Student",
            studentId: row.profiles?.student_id || "",
            event: row.fine_id ? "Attendance exception" : "Excuse request",
            date: new Date(row.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            reason: row.reason,
            proofName: row.document_url ? "Supporting document" : null,
            status: row.status,
            submittedDate: new Date(row.created_at).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            ),
          })),
        );
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, [router, user]);

  const handleAction = async (id: string, action: "approved" | "denied") => {
    const { error } = await supabase
      .from("excuse_requests")
      .update({ status: action })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status: action } : request,
      ),
    );
  };

  return (
    <AdminExcuseRequestsPage
      requests={requests}
      onAction={handleAction}
      onBack={() => router.push("/admin-dashboard")}
    />
  );
}
