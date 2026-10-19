import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { getExercises, getGymWithId } from "@/lib/api/resources";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { kg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/rankd/gym-leaderboard";
import { BoardTabs } from "@/components/rankd/board-tabs";
import { EmptyState } from "@/components/rankd/empty-state";

export default async function WeeklyBoardPage({
  params,
}: {
  params: Promise<{ gymId: string; exerciseId: string }>;
}) {
  const { user, memberships } = await requireOnboardedUser();
  const { gymId, exerciseId } = await params;

  const [gym, exercises, { data, response }] = await Promise.all([
    getGymWithId(gymId),
    getExercises(),
    api.GET("/gyms/{gym_id}/exercises/{exercise_id}/weekly-leaderboard", {
      params: { path: { gym_id: gymId, exercise_id: exerciseId } },
    }),
  ]);
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (gym === null || !exercise || response.status === 404) notFound();

  const weekly = exercises.filter((e) => e.weekly_eligible);
  const entries = data ?? [];
  const isMember = memberships.some((m) => m.gym_id === gymId);

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{gym.name}, this week</p>
        <h1 className="font-display text-5xl leading-none font-extrabold">Heaviest {exercise.name.toLowerCase()}</h1>
      </header>

      <BoardTabs
        tabs={[
          { href: `/gyms/${gymId}/leaderboard`, label: "Overall", active: false },
          ...weekly.map((e) => ({
            href: `/gyms/${gymId}/exercises/${e.id}/weekly`,
            label: e.name,
            active: e.id === exerciseId,
          })),
        ]}
      />

      {entries.length === 0 ? (
        <EmptyState
          message={`Nobody has claimed ${exercise.name.toLowerCase()} this week. Log a set and it's yours until someone lifts heavier.`}
          action={
            isMember ? (
              <Button asChild>
                <Link href={`/log?gymId=${gymId}`}>Log a lift</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry) => {
            const isYou = entry.user_id === user.id;
            const isFirst = entry.rank === 1;
            return (
              <li
                key={entry.user_id}
                className={cn(
                  "flex items-center gap-3 border-b border-border px-1 py-3 last:border-b-0",
                  isFirst && "py-5",
                  isYou && "-mx-3 rounded-xl border-b-0 bg-ember/10 px-4 ring-1 ring-ember/40",
                )}
              >
                <span className="w-7 shrink-0 text-center font-display text-xl font-bold text-faint tabular-nums">
                  {entry.rank}
                </span>
                <Avatar
                  username={entry.username}
                  color={isFirst ? "var(--tier-gold)" : undefined}
                  size={isFirst ? "lg" : "md"}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {entry.username}
                    {isYou && <span className="ml-1.5 text-sm font-normal text-ember">you</span>}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    Estimated max {kg(Math.round(entry.estimated_1rm_kg * 2) / 2)} kg
                  </span>
                </div>
                <span
                  className={cn(
                    "font-display font-bold tabular-nums",
                    isFirst ? "text-5xl text-tier-gold" : "text-3xl",
                  )}
                >
                  {kg(entry.weight_kg)}
                  <span className="ml-0.5 text-base text-muted-foreground">kg</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-xs text-faint">
        Ranked by the heaviest weight on the bar, no bodyweight adjustment. The board clears every
        Monday.
      </p>
    </div>
  );
}
