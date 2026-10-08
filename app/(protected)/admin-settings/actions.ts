"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath, updateTag } from "next/cache"
import { cookies } from "next/headers"

import type { SystemSettings } from "../../shared-page"

type SettingsPayload = SystemSettings

async function getAdminSupabase() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("Unauthorized")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || profile?.role !== "admin") {
    throw new Error("Forbidden")
  }

  return supabase
}

export async function refreshLandingSettings() {
  await getAdminSupabase()

  updateTag("landing-settings")
  revalidatePath("/", "page")
}

export async function saveLandingSettings(settings: SettingsPayload) {
  const supabase = await getAdminSupabase()

  const { error } = await supabase
    .from("system_settings")
    .update({
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)

  if (error) {
    throw new Error(error.message)
  }

  updateTag("landing-settings")
  revalidatePath("/", "page")
}
