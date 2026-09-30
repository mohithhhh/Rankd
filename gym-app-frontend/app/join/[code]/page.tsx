import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasSession } from "@/lib/auth/session";
import { getGymByCode, getMyMemberships, getMyProfile } from "@/lib/api/resources";
import { stashPendingJoinCode } from "@/lib/auth/pending-join";
import { ConfirmJoinForm } from "@/components/rankd/confirm-join-form";
import { DevLoginForm } from "@/app/login/dev-login-form";
import { GoogleLoginButton } from "@/app/login/google-login-button";
import { confirmJoinAction } from "./actions";
import { redirect } from "next/navigation";

// The QR/poster destination: scan -> (sign in if needed) -> join -> starter
// lifts. Public gym lookup (no auth) so the preview renders even logged out;
// everything past that branches on session state. See
// lib/auth/pending-join.ts for how a code survives the Google OAuth round trip.
export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const gym = await getGymByCode(code);

  if (gym === null) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm border-border/80">
          <CardHeader>
            <p className="text-sm font-medium tracking-wide text-primary uppercase">RankD</p>
            <CardTitle className="text-2xl">Code not recognized</CardTitle>
            <CardDescription>
              &quot;{code}&quot; isn&apos;t a valid gym code. Double-check the poster, or enter a
              code manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/gyms/join" className="text-sm font-medium text-primary hover:underline">
              Enter a code manually →
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!(await hasSession())) {
    const isDevMode = process.env.NEXT_PUBLIC_AUTH_MODE !== "supabase";
    const defaultUserId =
      process.env.NEXT_PUBLIC_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000000";

    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm border-border/80">
          <CardHeader className="text-center">
            <p className="text-sm font-medium tracking-wide text-primary uppercase">RankD</p>
            <CardTitle className="text-2xl">You&apos;re joining {gym.name}</CardTitle>
            <CardDescription>
              {gym.city} · Sign in to join and see your starting tier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDevMode ? (
              <DevLoginForm defaultUserId={defaultUserId} joinCode={code} />
            ) : (
              <GoogleLoginButton joinCode={code} />
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  const user = await getMyProfile();
  if (user === null) {
    // Defensive re-stash: covers landing here directly (bookmark, back
    // button) with a session that predates the cookie or after it expired.
    await stashPendingJoinCode(code);
    redirect("/onboarding");
  }

  const memberships = await getMyMemberships();
  const alreadyMember = memberships.some((m) => m.gym_id === gym.id);
  if (alreadyMember) {
    // Returning member re-scanning the poster - straight to logging, not the
    // dashboard, per the "scan -> log" goal this route exists for.
    redirect(`/log?gymId=${gym.id}`);
  }

  const boundConfirmJoin = confirmJoinAction.bind(null, code, gym.id);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm border-border/80">
        <CardHeader className="text-center">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">RankD</p>
          <CardTitle className="text-2xl">You&apos;re joining {gym.name}</CardTitle>
          <CardDescription>{gym.city}</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmJoinForm gymName={gym.name} action={boundConfirmJoin} />
        </CardContent>
      </Card>
    </main>
  );
}
