import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const protectedRoutePrefixes = [
  "/dashboard",
  "/admin-dashboard",
  "/onboarding",
  "/events",
  "/announcements",
  "/profile",
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

  const accessToken = request.cookies.get("sb-access-token")?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
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
    "/announcements/:path*",
    "/profile/:path*",
  ],
};
