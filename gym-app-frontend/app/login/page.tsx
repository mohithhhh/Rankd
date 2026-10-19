import { AuthFrame } from "@/components/rankd/auth-frame";
import { DevLoginForm } from "./dev-login-form";
import { GoogleLoginButton } from "./google-login-button";

export default function LoginPage() {
  const isDevMode = process.env.NEXT_PUBLIC_AUTH_MODE !== "supabase";
  const defaultUserId = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000000";

  return (
    <AuthFrame
      title="Sign in"
      showLadder
      description={
        isDevMode
          ? "Dev mode: sign in as any user id. Each id is a separate lifter."
          : "Use your Google account. New here? Signing in creates your account."
      }
    >
      {isDevMode ? <DevLoginForm defaultUserId={defaultUserId} /> : <GoogleLoginButton />}
    </AuthFrame>
  );
}
