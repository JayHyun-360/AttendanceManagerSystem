"use client";

import { useEffect, useState } from "react";
import { MyQRPage, type User } from "../../page";
import { supabase } from "@/lib/supabase";

export default function MyQRRoutePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          return;
        }

        const uid = session.user.id;
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error(error);
        }

        if (!profile || cancelled) {
          return;
        }

        const hydratedUser: User = {
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

        setUser(hydratedUser);
      } catch (caught) {
        console.error(caught);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return null;
  }

  return <MyQRPage user={user} qrVersion={1} onBack={() => undefined} />;
}
