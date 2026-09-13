import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/auth/supabase-server";

// Only reachable in supabase auth mode (see app/login/google-login-button.tsx).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
