"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function AdminDashboardRoute() {
  const router = useRouter();
  const { user } = useProtectedUser();
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminDashboardRequests() {
      try {
        if (!user || user.role !== "admin") {
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

    void loadAdminDashboardRequests();
    return () => {
      cancelled = true;
    };
  }, [router, user]);

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
