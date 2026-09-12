"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfilePage, type User } from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function ProfileRoutePage() {
  const router = useRouter();
  const { user, authUserId, setUser } = useProtectedUser();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setUser((current) => current ?? user);
  }, [user, setUser]);

  const handleSave = async (nextUser: User) => {
    if (!authUserId) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: nextUser.firstName,
        middle_initial: nextUser.middleInitial,
        surname: nextUser.surname,
        student_id: nextUser.studentId,
        program: nextUser.program,
        year_level: nextUser.yearLevel,
        section: nextUser.section,
        phone: nextUser.phone,
        contact_email: nextUser.contactEmail,
        photo_url: nextUser.photoUrl ?? null,
      })
      .eq("id", authUserId);

    setSaving(false);

    if (error) {
      console.error(error);
      return;
    }

    setUser(nextUser);
  };

  if (!user) {
    return null;
  }

  return (
    <ProfilePage
      user={user}
      onSave={handleSave}
      onBack={() =>
        router.push(user.role === "admin" ? "/admin-dashboard" : "/dashboard")
      }
      saving={saving}
    />
  );
}
