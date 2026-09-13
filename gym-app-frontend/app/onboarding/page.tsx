import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/api/resources";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  if (!(await hasSession())) redirect("/login");
  if ((await getMyProfile()) !== null) redirect("/gyms/join");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm border-border/80">
        <CardHeader>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">RankD</p>
          <CardTitle className="text-2xl">Set up your profile</CardTitle>
          <CardDescription>
            Your bodyweight and sex feed the scoring formula (Section 6 of the plan) — someone
            with real lifting experience lands at their actual tier immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
