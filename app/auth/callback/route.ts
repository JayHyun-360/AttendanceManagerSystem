import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.searchParams.get("origin") ?? requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?page=landing`);
  }

  const {
    data: { session },
    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !session?.user) {
    console.error(exchangeError);
    return NextResponse.redirect(`${origin}/?page=landing`);
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
    !profile.student_id ||
    !profile.surname ||
    !profile.program ||
    !profile.year_level ||
    !profile.section;

  if (incomplete) {
    return NextResponse.redirect(`${origin}/?page=onboarding`);
  }

  const targetPage = profile.role === "admin" ? "admin-dashboard" : "dashboard";
  return NextResponse.redirect(`${origin}/?page=${targetPage}`);
}
