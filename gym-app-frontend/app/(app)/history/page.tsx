import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { api } from "@/lib/api/client";
import { getGymWithId } from "@/lib/api/resources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoggedSetsHistoryTable } from "@/components/rankd/logged-sets-history-table";

export default async function HistoryPage() {
  const { memberships } = await requireOnboardedUser();

  const [{ data: loggedSets }, { data: exercises }, gyms] = await Promise.all([
    api.GET("/logged-sets/me"),
    api.GET("/exercises"),
    Promise.all(
      memberships.map(async (m) => ({
        id: m.gym_id,
        name: (await getGymWithId(m.gym_id))?.name ?? "Unknown gym",
      })),
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your history</h1>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted uppercase tracking-wide">
            Logged sets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoggedSetsHistoryTable
            loggedSets={loggedSets ?? []}
            exercises={exercises ?? []}
            gyms={gyms}
          />
        </CardContent>
      </Card>
    </div>
  );
}
