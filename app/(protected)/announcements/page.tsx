"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementsPage } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";

export default function AnnouncementsRoutePage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("target_role", "student")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error);
          return;
        }

        if (!cancelled) {
          setAnnouncements(
            (data ?? []).map((row: any) => ({
              id: String(row.id),
              title: row.title,
              body: row.content,
              date: new Date(row.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              author: row.posted_by ? "Admin" : "TapIn",
              badge: row.target_role === "admin" ? "Admin" : "General",
              photoUrl: row.media_url ?? "",
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

    void loadAnnouncements();

    const announcementsChannel = subscribeToTableChanges(
      "announcements",
      () => {
        if (!cancelled) {
          void loadAnnouncements();
        }
      },
    );

    return () => {
      cancelled = true;
      void announcementsChannel.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-36 rounded-lg" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <AnnouncementsPage
      onBack={() => router.push("/dashboard")}
      announcements={announcements}
    />
  );
}
