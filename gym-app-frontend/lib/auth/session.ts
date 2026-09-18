import "server-only";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/auth/supabase-server";

const DEV_USER_ID_COOKIE = "rankd-dev-user-id";
// Presence of this cookie is what "logged in" means in dev mode - kept
// separate from the user id cookie so a fresh visitor still lands on
// /login (matching the real flow) instead of skipping straight past it.
const DEV_SESSION_COOKIE = "rankd-dev-session";

function isDevMode() {
  return process.env.NEXT_PUBLIC_AUTH_MODE !== "supabase";
}

/** Reads the impersonated dev user id (cookie, falling back to the env default). */
export async function getDevUserId(): Promise<string> {
  const cookieStore = await cookies();
  return (
    cookieStore.get(DEV_USER_ID_COOKIE)?.value ??
    process.env.NEXT_PUBLIC_DEV_USER_ID ??
    "00000000-0000-0000-0000-000000000000"
  );
}

/** Logs in as the given dev user id. Only callable from a Server Action/Route Handler. */
export async function devLogin(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEV_USER_ID_COOKIE, userId, { path: "/", httpOnly: false });
  cookieStore.set(DEV_SESSION_COOKIE, "1", { path: "/", httpOnly: false });
}

export async function clearDevUserId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_USER_ID_COOKIE);
  cookieStore.delete(DEV_SESSION_COOKIE);
}

/**
 * The single branch point between the backend's two auth modes (see
 * app/api/dependencies.py). Called identically from Server Components,
 * Server Actions, and Route Handlers via lib/api/client.ts.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (isDevMode()) {
    return { "X-Dev-User-Id": await getDevUserId() };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

/** Whether the viewer has a usable session at all, for the root redirect waterfall. */
export async function hasSession(): Promise<boolean> {
  if (isDevMode()) {
    const cookieStore = await cookies();
    return cookieStore.get(DEV_SESSION_COOKIE)?.value === "1";
  }
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session !== null;
}

export async function signOut(): Promise<void> {
  if (isDevMode()) {
    await clearDevUserId();
    return;
  }
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
}
