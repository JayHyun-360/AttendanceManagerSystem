"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { ProfilePage, type User } from "../../shared-page"
import { supabase } from "@/lib/supabase"
import { deleteImages } from "@/lib/uploadImage"
import { useProtectedUser } from "../layout"

export default function ProfileRoutePage() {
  const router = useRouter()
  const { user, authUserId, setUser } = useProtectedUser()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setUser((current) => current ?? user)
  }, [user, setUser])

  const handleSave = async (nextUser: User) => {
    if (!authUserId || !user) {
      toast.error("Your session is not ready. Please try again.")
      return false
    }

    setSaving(true)
    let error: { message?: string } | null = null

    try {
      const result = await supabase
        .from("profiles")
        .update({
          first_name: nextUser.firstName,
          middle_initial: nextUser.middleInitial,
          surname: nextUser.surname,
          student_id: nextUser.studentId.trim(),
          qr_version:
            nextUser.studentId.trim() !== user.studentId.trim()
              ? (user.qrVersion ?? 1) + 1
              : (user.qrVersion ?? 1),
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
        .eq("id", authUserId)
      error = result.error
    } catch (caughtError) {
      error = {
        message:
          caughtError instanceof Error ? caughtError.message : "Profile save failed.",
      }
    } finally {
      setSaving(false)
    }

    if (error) {
      console.error(error)
      toast.error(error.message || "Could not save your profile.")
      return false
    }

    const nextMediaUrls = [
      nextUser.photoUrl,
      nextUser.coverPhotoUrl,
      nextUser.idPhotoUrl,
    ].filter((url): url is string => !!url && !url.startsWith("blob:"))
    const previousMediaUrls = [
      user.photoUrl,
      user.coverPhotoUrl,
      user.idPhotoUrl,
    ].filter((url): url is string => !!url && !url.startsWith("blob:"))

    const cleanupResults = await deleteImages(
      previousMediaUrls.filter((url) => !nextMediaUrls.includes(url)),
    )
    const failedCleanup = cleanupResults.filter((result) => !result.success)
    failedCleanup.forEach((result) =>
      console.error("Failed to delete profile media", result.error),
    )

    setUser(nextUser)
    if (failedCleanup.length > 0) {
      toast.warning(
        `Profile saved, but ${failedCleanup.length} old media file${failedCleanup.length === 1 ? "" : "s"} could not be removed.`,
      )
    } else {
      toast.success("Profile saved successfully.")
    }
    return true
  }

  if (!user) return null

  return (
    <ProfilePage
      user={user}
      onSave={handleSave}
      onBack={() =>
        router.push(user.role === "admin" ? "/admin-dashboard" : "/dashboard")
      }
      saving={saving}
    />
  )
}
