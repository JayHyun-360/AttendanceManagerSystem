import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const requiresAuth = protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
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
};
