"use server";

import { cookies } from "next/headers";

// Carries a scanned join code across the sign-in redirect (Google OAuth is a
// full-page round trip through Supabase, so nothing in JS memory survives it;
// a query param on the OAuth redirectTo would also work but is fragile -
// Supabase's redirect allow-list is matched against that exact URL, so a code
// baked into it means every possible code would need to be pre-allowed).
// Short TTL: this is a handoff, not session state - if it expires mid-flow,
// the user just lands on /gyms/join and can type the code instead.
const PENDING_JOIN_COOKIE = "rankd-pending-join";
const PENDING_JOIN_TTL_SECONDS = 600;

export async function stashPendingJoinCode(code: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_JOIN_COOKIE, code, {
    path: "/",
    maxAge: PENDING_JOIN_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getPendingJoinCode(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(PENDING_JOIN_COOKIE)?.value ?? null;
}

export async function clearPendingJoinCode(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_JOIN_COOKIE);
}
