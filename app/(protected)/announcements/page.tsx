"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnnouncementsPage } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";

export default function AnnouncementsRoutePage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
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

  return (
    <AnnouncementsPage
      onBack={() => router.push("/dashboard")}
      announcements={announcements}
    />
  );
}
