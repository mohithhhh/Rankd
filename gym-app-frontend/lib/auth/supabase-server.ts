import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client, cookie-backed per request (never shared across
 * requests — see @supabase/ssr's own warning on this). Inert until
 * NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set; only used when
 * NEXT_PUBLIC_AUTH_MODE=supabase (see lib/auth/session.ts).
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies() is read-only.
            // proxy.ts refreshes the session on navigation instead - see its
            // comment for why that's sufficient here.
          }
        },
      },
    },
  );
}
