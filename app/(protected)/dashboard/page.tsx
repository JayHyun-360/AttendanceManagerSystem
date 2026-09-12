"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function DashboardRoute() {
  const router = useRouter();
  const { user, authUserId } = useProtectedUser();
  const [fines, setFines] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/admin-dashboard");
      return;
    }
  }, [router, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardAnnouncements() {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(2);

        if (error) {
          console.error(error);
          return;
        }

        if (!cancelled) {
          setAnnouncements(
            (data ?? []).map((row: any) => ({
              id: row.id,
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
      }
    }

    void loadDashboardAnnouncements();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardFines() {
      try {
        if (!authUserId) {
          return;
        }

        const { data: fineRows, error: fineError } = await supabase
          .from("fines")
          .select("*")
          .eq("student_id", authUserId)
          .order("created_at", { ascending: false });

        if (fineError) {
          console.error(fineError);
        } else if (!cancelled) {
          setFines(fineRows ?? []);
        }
      } catch (caughtError) {
        console.error(caughtError);
      }
    }

    void loadDashboardFines();
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const onNav = (page: string) => {
    const paths: Record<string, string> = {
      events: "/events",
      "event-detail": "/events",
      "my-qr": "/my-qr",
      announcements: "/announcements",
      "attendance-history": "/attendance-history",
      "my-fines": "/my-fines",
      profile: "/profile",
    };

    const target = paths[page] ?? "/dashboard";
    router.push(target);
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardPage
      user={user}
      onNav={onNav}
      fines={fines}
      showFees={false}
      announcements={announcements}
    />
  );
}
