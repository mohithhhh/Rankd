import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { getExercises, getGymWithId, getTierThresholds } from "@/lib/api/resources";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { LeaderboardRows, Podium } from "@/components/rankd/gym-leaderboard";
import { GymSwitcher } from "@/components/rankd/gym-switcher";
import { BoardTabs } from "@/components/rankd/board-tabs";
import { EmptyState } from "@/components/rankd/empty-state";

export default async function GymLeaderboardPage({
  params,
}: {
  params: Promise<{ gymId: string }>;
}) {
  const { user, memberships } = await requireOnboardedUser();
  const { gymId } = await params;

  const [gym, ladder, exercises, { data }] = await Promise.all([
    getGymWithId(gymId),
    getTierThresholds(),
    getExercises(),
    api.GET("/gyms/{gym_id}/leaderboard", { params: { path: { gym_id: gymId } } }),
  ]);
  if (gym === null) notFound();

  const entries = data ?? [];
  const showPodium = entries.length >= 3;
  const isMember = memberships.some((m) => m.gym_id === gymId);
  const firstWeekly = exercises.find((e) => e.weekly_eligible);

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{gym.city}</p>
          <h1 className="truncate font-display text-5xl leading-none font-extrabold">{gym.name}</h1>
        </div>
        <GymSwitcher memberships={memberships} activeGymId={gymId} hrefTemplate="/gyms/GYM_ID/leaderboard" />
      </header>

      <BoardTabs
        tabs={[
          { href: `/gyms/${gymId}/leaderboard`, label: "Overall", active: true },
          ...(firstWeekly
            ? [{ href: `/gyms/${gymId}/exercises/${firstWeekly.id}/weekly`, label: "This week", active: false }]
            : []),
        ]}
      />

      {entries.length === 0 ? (
        <EmptyState
          message="Nobody here has logged a lift yet. The first one on the board sets the bar."
          action={
            isMember ? (
              <Button asChild>
                <Link href={`/log?gymId=${gymId}`}>Log a lift</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-8 md:grid-cols-[1fr_1.3fr] md:items-start">
          {showPodium && (
            <section aria-label="Podium" className="rounded-3xl bg-surface px-4 pt-6 ring-1 ring-border">
              <Podium entries={entries} ladder={ladder} highlightUserId={user.id} />
            </section>
          )}
          <section aria-label="Rankings" className={showPodium ? "" : "md:col-span-2"}>
            <LeaderboardRows
              entries={showPodium ? entries.slice(3) : entries}
              ladder={ladder}
              highlightUserId={user.id}
            />
            {!entries.some((e) => e.user_id === user.id) && (
              <p className="mt-4 text-sm text-muted-foreground">
                {entries.length >= 20
                  ? "You're outside the top 20. A new best on any lift can move you up."
                  : "You're not ranked here yet. Log a lift at this gym to join the board."}
              </p>
            )}
            <p className="mt-6 text-xs text-faint">
              Points are adjusted for bodyweight, so lifters of every size compete on the same board.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
