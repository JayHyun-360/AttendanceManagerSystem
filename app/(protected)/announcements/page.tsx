"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementsPage } from "../../shared-page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";

function AnnouncementsSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-3 w-12 rounded-md" />
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-56 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <article
            key={item}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
              <Skeleton className="h-full w-full rounded-none" />
              <Skeleton className="absolute left-3 top-3 h-5 w-16 rounded-full" />
              <Skeleton className="absolute right-3 top-3 h-5 w-20 rounded-full" />
            </div>

            <div className="flex min-h-[190px] flex-col justify-between gap-3 p-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-5/6 rounded-md" />
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
              </div>

              <div className="border-t border-slate-50 pt-3">
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

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
              author: row.posted_by ? "Admin" : "Adesse",
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
    return <AnnouncementsSkeleton />;
  }

  return (
    <AnnouncementsPage
      onBack={() => router.push("/dashboard")}
      announcements={announcements}
    />
  );
}
