"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ProfilePage, type User } from "../../shared-page";

import { supabase } from "@/lib/supabase";

import { deleteImages } from "@/lib/uploadImage";

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
    if (!authUserId || !user) {
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

        photo_url:
          nextUser.photoUrl && !nextUser.photoUrl.startsWith("blob:")
            ? nextUser.photoUrl
            : null,

        cover_photo_url:
          nextUser.coverPhotoUrl && !nextUser.coverPhotoUrl.startsWith("blob:")
            ? nextUser.coverPhotoUrl
            : null,

        id_photo_url:
          nextUser.idPhotoUrl && !nextUser.idPhotoUrl.startsWith("blob:")
            ? nextUser.idPhotoUrl
            : null,
      })

      .eq("id", authUserId);

    setSaving(false);

    if (error) {
      console.error(error);

      return;
    }

    const nextMediaUrls = [
      nextUser.photoUrl,
      nextUser.coverPhotoUrl,
      nextUser.idPhotoUrl,
    ].filter((url): url is string => !!url && !url.startsWith("blob:"));

    const previousMediaUrls = [
      user.photoUrl,
      user.coverPhotoUrl,
      user.idPhotoUrl,
    ].filter((url): url is string => !!url && !url.startsWith("blob:"));

    const cleanupResults = await deleteImages(
      previousMediaUrls.filter((url) => !nextMediaUrls.includes(url)),
    );

    cleanupResults

      .filter((result) => !result.success)

      .forEach((result) =>
        console.error("Failed to delete profile media", result.error),
      );

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
