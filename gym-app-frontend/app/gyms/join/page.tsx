import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile, getMyMemberships } from "@/lib/api/resources";
import { JoinGymForm } from "@/components/rankd/join-gym-form";

// Fallback for anyone who didn't arrive via their gym's QR code. Gyms are
// created by the RankD team (POST /gyms is platform-admin only), so joining
// with a code is the only self-serve path.
export default async function JoinGymPage() {
  if (!(await hasSession())) redirect("/login");
  if ((await getMyProfile()) === null) redirect("/onboarding");
  if ((await getMyMemberships()).length > 0) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm border-border/80">
        <CardHeader>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">RankD</p>
          <CardTitle className="text-2xl">Join your gym</CardTitle>
          <CardDescription>
            Enter the 8-character code from your gym&apos;s RankD poster, or ask a member for it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <JoinGymForm />
          <p className="text-center text-xs text-muted">
            Don&apos;t see your gym on RankD yet? We&apos;re adding gyms one at a time.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
