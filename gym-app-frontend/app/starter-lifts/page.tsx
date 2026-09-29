import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSession } from "@/lib/auth/session";
import { api } from "@/lib/api/client";
import { getGymWithId, getMyMemberships, getMyProfile } from "@/lib/api/resources";
import { pickStarterExercises } from "@/lib/starter-lifts";
import { StarterLiftsForm } from "@/components/rankd/starter-lifts-form";

// The step right after joining a gym: enter a few recent best sets so the
// first thing a new member sees is a real tier, not an empty dashboard.
//
// Deliberately no "already has lifts here -> redirect" guard. Server actions
// can trigger a re-render of this route (e.g. when a session refresh sets
// cookies), and a redirect would then yank the user off the tier reveal the
// moment their lifts saved. Re-visiting is harmless anyway: only a lift that
// beats a previous best moves the score.
export default async function StarterLiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ gymId?: string }>;
}) {
  if (!(await hasSession())) redirect("/login");
  if ((await getMyProfile()) === null) redirect("/onboarding");

  const memberships = await getMyMemberships();
  if (memberships.length === 0) redirect("/gyms/join");

  const { gymId: requestedGymId } = await searchParams;
  const gymId =
    memberships.find((m) => m.gym_id === requestedGymId)?.gym_id ?? memberships[0].gym_id;

  const [{ data: exercises }, gym] = await Promise.all([
    api.GET("/exercises"),
    getGymWithId(gymId),
  ]);
  const { bigThree, bodyweight } = pickStarterExercises(exercises ?? []);

  // Nothing to enter (e.g. the exercises endpoint failed) - don't strand the user here.
  if (bigThree.length + bodyweight.length === 0) redirect(`/dashboard?gymId=${gymId}`);

  const requestIds = Object.fromEntries(
    [...bigThree, ...bodyweight].map((e) => [e.id, crypto.randomUUID()]),
  );
  const gymName = gym?.name ?? "your gym";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Card className="border-border/80">
        <CardHeader>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            Welcome to {gymName}
          </p>
          <CardTitle className="text-2xl">Set your starting tier</CardTitle>
          <CardDescription>
            Enter your best recent set for any lift below and skip the ones you don&apos;t do. A
            hard set of 3–10 reps works best.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StarterLiftsForm
            gymId={gymId}
            gymName={gymName}
            bigThree={bigThree}
            bodyweight={bodyweight}
            requestIds={requestIds}
          />
        </CardContent>
      </Card>
    </main>
  );
}
