"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "../../page";
import { supabase } from "@/lib/supabase";

export default function DashboardRoute() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [fines, setFines] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
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

        if (!profile) {
          router.push("/onboarding");
          return;
        }

        const hydratedUser = {
          firstName: profile.first_name ?? "",
          middleInitial: profile.middle_initial ?? "",
          surname: profile.surname ?? "",
          studentId: profile.student_id ?? "",
          program: profile.program ?? "",
          yearLevel: profile.year_level ?? "",
          section: profile.section ?? "",
          phone: profile.phone ?? "",
          contactEmail: profile.contact_email ?? profile.email ?? "",
          role: profile.role ?? "student",
          photoUrl: profile.photo_url ?? undefined,
          idPhotoUrl: profile.photo_url ?? undefined,
        };

        const { data: fineRows, error: fineError } = await supabase
          .from("fines")
          .select("*")
          .eq("student_id", uid)
          .order("created_at", { ascending: false });

        if (fineError) {
          console.error(fineError);
        } else {
          setFines(fineRows ?? []);
        }

        if (!cancelled) {
          setUser(hydratedUser);
        }
      } catch (caughtError) {
        console.error(caughtError);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
    <DashboardPage user={user} onNav={onNav} fines={fines} showFees={false} />
  );
}
