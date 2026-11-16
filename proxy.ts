import { NextResponse } from "next/server"

import type { NextRequest } from "next/server"

import { createServerClient } from "@supabase/ssr"
import {
  hasUnacknowledgedIdException,
  isProfileComplete,
  parseStudentIdExceptionAccessState,
} from "@/lib/profileCompletion"

const protectedRoutePrefixes = [
  "/dashboard",

  "/admin-dashboard",

  "/onboarding",

  "/events",

  "/my-qr",

  "/announcements",

  "/attendance-history",

  "/my-fines",

  "/profile",

  "/admin-events",

  "/admin-scanner",

  "/admin-attendees",

  "/admin-students",

  "/admin-announcements",

  "/admin-excuse-requests",

  "/admin-reports",

  "/admin-settings",
]

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isPublicEventsRoute =
    pathname === "/events" || pathname.startsWith("/events/")

  const requiresAuth =
    !isPublicEventsRoute &&
    protectedRoutePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )

  if (!requiresAuth) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const response = NextResponse.next()
  const redirectToOnboarding = () => {
    const redirectResponse = NextResponse.redirect(
      new URL("/onboarding", request.url),
    )
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  try {
    const {
      data: { user },

      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    if (pathname !== "/onboarding" && !pathname.startsWith("/onboarding/")) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "first_name,surname,role,student_id,program,year_level,id_photo_url,student_id_exception_requests(request_id,status,requested_at,continued_at)",
        )
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error(
          "Could not verify profile completion before serving a protected route",
          profileError,
        )
        return redirectToOnboarding()
      }

      const { data: accessRows, error: accessError } =
        profile?.role === "student"
          ? await supabase.rpc("get_my_student_id_exception_access_state")
          : { data: null, error: null }
      const accessState = parseStudentIdExceptionAccessState(accessRows)

      if (accessError || (profile?.role === "student" && !accessState)) {
        console.error(
          "Could not verify ID exception access before serving a protected route",
          accessError ?? new Error("The access-state RPC returned no valid result."),
        )
        return redirectToOnboarding()
      }

      if (
        !profile ||
        !isProfileComplete(profile, accessState) ||
        hasUnacknowledgedIdException(profile, accessState)
      ) {
        return redirectToOnboarding()
      }
    }

    return response
  } catch (caughtError) {
    console.error(
      "Could not verify access before serving a protected route",
      caughtError,
    )
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",

    "/admin-dashboard/:path*",

    "/onboarding/:path*",

    "/events/:path*",

    "/my-qr/:path*",

    "/announcements/:path*",

    "/attendance-history/:path*",

    "/my-fines/:path*",

    "/profile/:path*",

    "/admin-events/:path*",

    "/admin-scanner/:path*",

    "/admin-attendees/:path*",

    "/admin-students/:path*",

    "/admin-announcements/:path*",

    "/admin-excuse-requests/:path*",

    "/admin-reports/:path*",

    "/admin-settings/:path*",
  ],
}
