import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { kg } from "@/lib/format";
import type { components } from "@/lib/api/schema";

type ExerciseOut = components["schemas"]["ExerciseOut"];

/** One tile per weekly-eligible lift (the SBD three), showing who holds it. */
export async function WeeklyChampions({
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

  return (
    <ul className="grid grid-cols-3 gap-2">
      {leaders.map(({ exercise, leader }) => {
        const isYou = leader?.user_id === currentUserId;
        return (
          <li key={exercise.id}>
            <Link
              href={`/gyms/${gymId}/exercises/${exercise.id}/weekly`}
              className={cn(
                "flex h-full flex-col gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border transition-colors hover:ring-sky/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isYou && "ring-ember/50",
              )}
            >
              <span className="text-xs text-muted-foreground">{exercise.name}</span>
              {leader ? (
                <>
                  <span className="font-display text-3xl leading-none font-bold tabular-nums">
                    {kg(leader.weight_kg)}
                    <span className="ml-0.5 text-base font-semibold text-muted-foreground">kg</span>
                  </span>
                  <span className={cn("truncate text-sm", isYou ? "font-medium text-ember" : "text-tint")}>
                    {isYou ? "You" : leader.username}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-display text-3xl leading-none font-bold text-faint">Open</span>
                  <span className="text-sm text-muted-foreground">Nobody yet</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
