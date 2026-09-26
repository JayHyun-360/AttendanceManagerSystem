"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { OnboardingPage, type OBForm } from "../../shared-page"
import { supabase } from "@/lib/supabase"

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
        console.error(profileError)
        toast.error("Your existing profile could not be checked. Please try again.")
        return false
      }

      if (existingProfile?.role === "admin") {
        router.replace("/admin-dashboard")
        return true
      }

      const googleAvatarUrl =
        (session.user.user_metadata?.avatar_url as string | undefined) ??
        (session.user.user_metadata?.picture as string | undefined) ??
        (session.user.user_metadata?.image_url as string | undefined) ??
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
        toast.error("Please complete all required information before continuing.")
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
        console.error(error)
        toast.error("Your profile could not be saved. Please try again.")
        return false
      }

      toast.success("Profile completed. Welcome to Adesse.")
      window.location.assign("/dashboard?freshLogin=1")
      return true
    } catch (caughtError) {
      console.error(caughtError)
      toast.error("We could not complete setup. Please try again.")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return <OnboardingPage onComplete={handleOnboarding} submitting={submitting} />
}
