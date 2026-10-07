"use client"

import { useState } from "react"

import { toast } from "sonner"

import { useRouter } from "next/navigation"

import { OnboardingPage, type OBForm } from "../../shared-page"
import { supabase } from "@/lib/supabase"
import { deleteImage } from "@/lib/uploadImage"

function getProfileSaveErrorMessage(error: {
  code?: string

  message?: string
}) {
  const message = error.message ?? "No additional error details were returned."

  if (error.code === "23505" && message.toLowerCase().includes("student_id")) {
    return "That student ID is already linked to another account. Verify it or contact your school administrator."
  }

  if (error.code === "42501") {
    return "The database denied this profile update. Contact your school administrator."
  }

  if (
    ["PGRST204", "42703"].includes(error.code ?? "") &&
    message.toLowerCase().includes("id_photo_url")
  ) {
    return "The server is missing the ID-photo profile field. Contact your school administrator."
  }

  return `${error.code ? `${error.code}: ` : ""}${message}`.slice(0, 240)
}

async function cleanupUploadedIdPhoto(url?: string) {
  if (!url) return

  const result = await deleteImage(url)
  if (!result.success) {
    console.error("Failed to clean up onboarding ID photo", result.error)
  }
}

export default function OnboardingRoute() {
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)

  const handleOnboarding = async (d: OBForm) => {
    if (submitting) return false

    setSubmitting(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const uid = session?.user?.id

      if (!uid) {
        await cleanupUploadedIdPhoto(d.idPhotoUrl)
        toast.error("Your session has expired. Please sign in again.")
        router.push("/login")

        return false
      }

      const { data: existingProfile, error: profileError } = await supabase

        .from("profiles")

        .select("role, photo_url")

        .eq("id", uid)

        .maybeSingle()

      if (profileError) {
        await cleanupUploadedIdPhoto(d.idPhotoUrl)
        console.error(profileError)
        toast.error(
          "Your existing profile could not be checked. Please try again.",
        )

        return false
      }

      if (existingProfile?.role === "admin") {
        await cleanupUploadedIdPhoto(d.idPhotoUrl)
        router.replace("/admin-dashboard")
        return true
      }

      const googleAvatarUrl =
        session.user.user_metadata?.avatar_url as string | undefined ??
        session.user.user_metadata?.picture as string | undefined ??
        session.user.user_metadata?.image_url as string | undefined ??
        null

      const normalizedPhone = d.phone.replace(/[^\d+]/g, "")

      const validPhone = /^(?:09\d{9}|\+639\d{9})$/.test(normalizedPhone)

      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        d.contactEmail.trim(),
      )

      const validStudentId = /^\d{7,}$/.test(d.studentId.trim())

      const validProfile =
        d.firstName.trim() &&
        d.surname.trim() &&
        validPhone &&
        validEmail &&
        validStudentId &&
        d.program.trim() &&
        d.yearLevel.trim() &&
        d.idPhotoUrl &&
        d.agreedToTerms === true

      if (!validProfile) {
        await cleanupUploadedIdPhoto(d.idPhotoUrl)
        toast.error(
          "Please complete all required information before continuing.",
        )

        return false
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

        role: existingProfile?.role ?? "student",

        photo_url: existingProfile?.photo_url ?? googleAvatarUrl ?? null,

        id_photo_url: d.idPhotoUrl ?? null,
      }

      const { error } = await supabase

        .from("profiles")

        .upsert(payload, { onConflict: "id" })

      if (error) {
        await cleanupUploadedIdPhoto(d.idPhotoUrl)
        console.error(error)
        toast.error("Profile could not be saved", {
          description: getProfileSaveErrorMessage(error),

          duration: 10000,
        })

        return false
      }

      toast.success("Profile completed. Welcome to Adesse.")

      window.location.assign("/dashboard?freshLogin=1")

      return true
    } catch (caughtError) {
      await cleanupUploadedIdPhoto(d.idPhotoUrl)
      console.error(caughtError)
      toast.error("We could not complete setup. Please try again.")

      return false
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OnboardingPage onComplete={handleOnboarding} submitting={submitting} />
  )
}
