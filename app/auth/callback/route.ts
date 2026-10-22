import { NextRequest, NextResponse } from "next/server"

import { createServerClient } from "@supabase/ssr"

import { isProfileComplete } from "@/lib/profileCompletion"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get("code")

  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin))
  }

  const redirectResponse = NextResponse.redirect(new URL("/login", origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,

    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { session },

    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !session?.user) {
    if (exchangeError) {
      console.error("Failed to exchange OAuth code for a session", exchangeError)
    }

    return redirectResponse
  }

  const uid = session.user.id

  const { data: profile, error: profileError } = await supabase

    .from("profiles")

    .select("*")

    .eq("id", uid)

    .maybeSingle()

  if (profileError) {
    console.error(profileError)

    redirectResponse.headers.set("location", new URL("/", origin).toString())

    return redirectResponse
  }

  if (!profile || !isProfileComplete(profile)) {
    redirectResponse.headers.set(
      "location",
      new URL("/onboarding?freshLogin=1", origin).toString(),
    )

    return redirectResponse
  }

  const targetPage = profile.role === "admin" ? "admin-dashboard" : "dashboard"

  redirectResponse.headers.set(
    "location",
    new URL(`/${targetPage}?freshLogin=1`, origin).toString(),
  )

  return redirectResponse
}
