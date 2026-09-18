import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Only used for the "Continue with Google"
 * button in supabase auth mode - the OAuth redirect flow itself needs to run
 * client-side.
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
