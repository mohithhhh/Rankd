import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DevLoginForm } from "./dev-login-form";
import { GoogleLoginButton } from "./google-login-button";

export default function LoginPage() {
  const isDevMode = process.env.NEXT_PUBLIC_AUTH_MODE !== "supabase";
  const defaultUserId = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000000";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm border-border/80">
        <CardHeader className="text-center">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">RankD</p>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            {isDevMode
              ? "Dev mode: sign in as any user id to exercise the app locally."
              : "Sign in with your Google account to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDevMode ? <DevLoginForm defaultUserId={defaultUserId} /> : <GoogleLoginButton />}
        </CardContent>
      </Card>
    </main>
  );
}
