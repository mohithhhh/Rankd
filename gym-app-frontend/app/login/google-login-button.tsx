"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
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
