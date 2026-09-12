import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// NOTE: The active workspace currently contains one client route machine in app/page.tsx,
// not separate App Router files at /login, /onboarding, /dashboard, or /admin-dashboard.
// To use the clean route paths below safely, the following route files must exist:
//   app/login/page.tsx
//   app/onboarding/page.tsx
//   app/dashboard/page.tsx
//   app/admin-dashboard/page.tsx
// Without those files, redirecting to those URLs will produce a 404 instead of a page.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.searchParams.get("origin") ?? requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const redirectResponse = NextResponse.redirect(`${origin}/login`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { session },
    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !session?.user) {
    console.error(exchangeError);
    return NextResponse.redirect(`${origin}/login`);
  }

  const uid = session.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    console.error(profileError);
  }

  const incomplete =
    !profile ||
    !profile.first_name ||
    !profile.surname ||
    (profile.role !== "admin" &&
      (!profile.student_id ||
        !profile.program ||
        !profile.year_level ||
        !profile.section));

  if (incomplete) {
    redirectResponse.headers.set(
      "location",
      `${origin}/onboarding?freshLogin=1`,
    );
    return redirectResponse;
  }

  const targetPage = profile.role === "admin" ? "admin-dashboard" : "dashboard";
  redirectResponse.headers.set(
    "location",
    `${origin}/${targetPage}?freshLogin=1`,
  );
  return redirectResponse;
}
