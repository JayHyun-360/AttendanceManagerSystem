"use client";

import { useRouter } from "next/navigation";
import { OnboardingPage, type OBForm } from "../../page";
import { supabase } from "@/lib/supabase";

export default function OnboardingRoute() {
  const router = useRouter();

  const handleOnboarding = async (d: OBForm) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id;
      if (!uid) {
        router.push("/login");
        return;
      }

      const payload = {
        id: uid,
        first_name: d.firstName.trim(),
        middle_initial: d.middleInitial.trim(),
        surname: d.surname.trim(),
        student_id: d.studentId.trim(),
        program: d.program.trim(),
        year_level: d.yearLevel.trim(),
        section: d.section.trim(),
        phone: d.phone.trim(),
        contact_email: d.contactEmail.trim(),
        role: "student",
        photo_url: d.idPhotoUrl,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.error(error);
        return;
      }

      router.push("/dashboard?freshLogin=1");
    } catch (caughtError) {
      console.error(caughtError);
    }
  };

  return <OnboardingPage onComplete={handleOnboarding} />;
}
