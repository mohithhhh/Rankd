import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/rankd/empty-state";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type ExerciseOut = components["schemas"]["ExerciseOut"];

export async function WeeklyChampionCard({
  gymId,
  exercises,
  currentUserId,
}: {
  gymId: string;
  exercises: ExerciseOut[];
  currentUserId: string;
}) {
  const weeklyEligible = exercises.filter((e) => e.weekly_eligible);

  const leaders = await Promise.all(
    weeklyEligible.map(async (exercise) => {
      const { data } = await api.GET("/gyms/{gym_id}/exercises/{exercise_id}/weekly-leaderboard", {
        params: { path: { gym_id: gymId, exercise_id: exercise.id } },
      });
      return { exercise, leader: data?.[0] ?? null };
    }),
  );

  const anyLeader = leaders.some((l) => l.leader !== null);

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted uppercase tracking-wide">
          Weekly champion
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!anyLeader ? (
          <EmptyState message="No SBD lifts logged at this gym yet this week." />
        ) : (
          <ul className="flex flex-col gap-3">
            {leaders
              .filter((l) => l.leader !== null)
              .map(({ exercise, leader }) => (
                <li key={exercise.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{exercise.name}</p>
                    <p
                      className={
                        leader!.user_id === currentUserId
                          ? "text-sm font-semibold text-accent"
                          : "text-sm text-muted"
                      }
                    >
                      {leader!.username}
                      {leader!.user_id === currentUserId && " (you)"}
                    </p>
                  </div>
                  <Link
                    href={`/gyms/${gymId}/exercises/${exercise.id}/weekly`}
                    className="tabular-nums text-sm font-medium text-primary hover:underline"
                  >
                    {leader!.weight_kg.toFixed(1)} kg
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
