"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MyFinesPage, type FineRecord } from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function MyFinesRoutePage() {
  const router = useRouter();
  const { authUserId } = useProtectedUser();
  const [fines, setFines] = useState<FineRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFines() {
      if (!authUserId) {
        return;
      }

      const { data, error } = await supabase
        .from("fines")
        .select("*, events(title, event_date)")
        .eq("student_id", authUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (!cancelled) {
        setFines(
          (data ?? []).map((row: any) => ({
            id: String(row.id),
            eventId: row.event_id,
            eventTitle: row.events?.title ?? "Event",
            eventDate: row.events?.event_date ?? "",
            amount: Number(row.amount || 0),
            status: row.status || "unpaid",
          })),
        );
      }
    }

    void loadFines();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  return (
    <MyFinesPage
      fines={fines}
      showFees={true}
      onBack={() => router.push("/dashboard")}
    />
  );
}
