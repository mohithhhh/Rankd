"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase-browser";
import { stashPendingJoinCode } from "@/lib/auth/pending-join";

export function GoogleLoginButton({ joinCode }: { joinCode?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    // Must happen before the redirect - nothing in this component's state
    // survives the round trip through Google and back.
    if (joinCode) await stashPendingJoinCode(joinCode);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Browser navigates away to Google on success; only reaches here on error.
    setLoading(false);
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="w-full">
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
