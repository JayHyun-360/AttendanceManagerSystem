"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { MyFinesPage, type FineRecord } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { useProtectedUser } from "../layout";

export default function MyFinesRoutePage() {
  const router = useRouter();
  const { authUserId, showFees } = useProtectedUser();
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFines() {
      try {
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
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFines();

    const finesChannel = subscribeToTableChanges("fines", () => {
      if (!cancelled) {
        void loadFines();
      }
    });

    return () => {
      cancelled = true;
      void finesChannel.unsubscribe();
    };
  }, [authUserId]);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <MyFinesPage
      fines={fines}
      showFees={showFees}
      onBack={() => router.push("/dashboard")}
    />
  );
}
