"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "../page";
import { supabase } from "@/lib/supabase";

export default function AdminDashboardRoute() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminDashboard() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const uid = session.user.id;
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error(profileError);
        }

        if (!profile || profile.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const { data: rows, error } = await supabase
          .from("excuse_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error);
        } else if (!cancelled) {
          setRequests(rows ?? []);
        }
      } catch (caughtError) {
        console.error(caughtError);
      }
    }

    void loadAdminDashboard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onNav = (page: string) => {
    const paths: Record<string, string> = {
      "admin-events": "/admin-events",
      "admin-scanner": "/admin-scanner",
      "admin-attendees": "/admin-attendees",
      "admin-students": "/admin-students",
      "admin-announcements": "/admin-announcements",
      "admin-excuse-requests": "/admin-excuse-requests",
      "admin-reports": "/admin-reports",
      "admin-settings": "/admin-settings",
    };

    const target = paths[page] ?? "/admin-dashboard";
    router.push(target);
  };

  return <AdminDashboard onNav={onNav} excuseRequests={requests} />;
}
