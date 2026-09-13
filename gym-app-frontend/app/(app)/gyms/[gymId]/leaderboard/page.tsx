import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { getGymWithId } from "@/lib/api/resources";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GymLeaderboardTable } from "@/components/rankd/gym-leaderboard-table";
import { GymSwitcher } from "@/components/rankd/gym-switcher";

export default async function GymLeaderboardPage({
  params,
}: {
  params: Promise<{ gymId: string }>;
}) {
  const { user, memberships } = await requireOnboardedUser();
  const { gymId } = await params;

  const gym = await getGymWithId(gymId);
  if (gym === null) notFound();

  const { data } = await api.GET("/gyms/{gym_id}/leaderboard", {
    params: { path: { gym_id: gymId } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{gym.city}</p>
          <h1 className="text-2xl font-semibold">{gym.name} leaderboard</h1>
        </div>
        <GymSwitcher
          memberships={memberships}
          activeGymId={gymId}
          hrefTemplate="/gyms/GYM_ID/leaderboard"
        />
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted uppercase tracking-wide">
            Top {Math.min(20, data?.length ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GymLeaderboardTable entries={data ?? []} highlightUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
