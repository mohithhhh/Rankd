import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TierSummary } from "@/components/rankd/tier-summary";
import { GymLeaderboardTable } from "@/components/rankd/gym-leaderboard-table";
import { WeeklyChampionCard } from "@/components/rankd/weekly-champion-card";
import { GymSwitcher } from "@/components/rankd/gym-switcher";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gymId?: string }>;
}) {
  const { user, memberships } = await requireOnboardedUser();
  const { gymId } = await searchParams;
  const activeGymId = gymId ?? memberships[0].gym_id;

  const [tierResult, leaderboardResult, exercisesResult] = await Promise.all([
    api.GET("/users/{user_id}/tier", { params: { path: { user_id: user.id } } }),
    api.GET("/gyms/{gym_id}/leaderboard", { params: { path: { gym_id: activeGymId } } }),
    api.GET("/exercises"),
  ]);

  const tier = tierResult.data;
  const leaderboard = leaderboardResult.data ?? [];
  const exercises = exercisesResult.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Welcome back, {user.username}</h1>
        <div className="flex items-center gap-3">
          <GymSwitcher
            memberships={memberships}
            activeGymId={activeGymId}
            hrefTemplate="/dashboard?gymId=GYM_ID"
          />
          <Button asChild>
            <Link href="/log">Log a lift</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {tier && <TierSummary tier={tier} />}
        <WeeklyChampionCard gymId={activeGymId} exercises={exercises} currentUserId={user.id} />
      </div>

      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted uppercase tracking-wide">
            Gym leaderboard
          </CardTitle>
          <Link
            href={`/gyms/${activeGymId}/leaderboard`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View full board
          </Link>
        </CardHeader>
        <CardContent>
          <GymLeaderboardTable entries={leaderboard.slice(0, 5)} highlightUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
