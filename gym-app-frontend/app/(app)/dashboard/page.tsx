import Link from "next/link";
import { Plus } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { api } from "@/lib/api/client";
import {
  getExercises,
  getGymWithId,
  getMyLoggedSets,
  getTierThresholds,
  getUserTier,
} from "@/lib/api/resources";
import { bestPointsByExercise, groupContributions } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TierHero } from "@/components/rankd/tier-hero";
import { LeaderboardRows } from "@/components/rankd/gym-leaderboard";
import { WeeklyChampions } from "@/components/rankd/weekly-champion-card";
import { MuscleGroupBars } from "@/components/rankd/muscle-group-bars";
import { GymSwitcher } from "@/components/rankd/gym-switcher";
import { EmptyState } from "@/components/rankd/empty-state";

function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-sky hover:text-tint hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gymId?: string }>;
}) {
  const { user, memberships } = await requireOnboardedUser();
  const { gymId } = await searchParams;
  const activeGymId =
    memberships.find((m) => m.gym_id === gymId)?.gym_id ?? memberships[0].gym_id;

  const [tier, ladder, exercises, sets, gym, leaderboardResult] = await Promise.all([
    getUserTier(user.id),
    getTierThresholds(),
    getExercises(),
    getMyLoggedSets(),
    getGymWithId(activeGymId),
    api.GET("/gyms/{gym_id}/leaderboard", { params: { path: { gym_id: activeGymId } } }),
  ]);

  const leaderboard = leaderboardResult.data ?? [];
  const you = leaderboard.find((e) => e.user_id === user.id);
  const contributions = groupContributions(bestPointsByExercise(sets), exercises);
  const olympian = ladder.at(-1)?.min_points ?? 80;
  const logHref = `/log?gymId=${activeGymId}`;

  return (
    <div className="flex flex-col gap-10 animate-rise">
      {tier && (
        <TierHero tier={tier} ladder={ladder}>
          {sets.length === 0 ? (
            <p className="relative text-sm text-muted-foreground">
              Log your current lifts and you&apos;ll land on your real tier straight away. There&apos;s
              no grind from zero.
            </p>
          ) : null}
          <Button asChild size="xl" className="relative self-start md:hidden">
            <Link href={logHref}>
              <Plus strokeWidth={2.5} />
              Log a lift
            </Link>
          </Button>
        </TierHero>
      )}

      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-12">
        <section className="flex flex-col gap-4" aria-label="Gym rank">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate font-display text-2xl font-bold">{gym?.name ?? "Your gym"}</h2>
              {gym && <p className="text-sm text-muted-foreground">{gym.city}</p>}
            </div>
            <GymSwitcher
              memberships={memberships}
              activeGymId={activeGymId}
              hrefTemplate="/dashboard?gymId=GYM_ID"
            />
          </div>

          {you ? (
            <div className="flex items-end justify-between gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
              <p>
                <span className="font-display text-5xl leading-none font-extrabold tabular-nums">
                  #{you.rank}
                </span>
                <span className="ml-2 text-muted-foreground">of {leaderboard.length}</span>
              </p>
              <p className="text-right text-sm text-muted-foreground">
                {leaderboard.length > 1 ? (
                  <>
                    Ahead of{" "}
                    <span className="font-medium text-tint tabular-nums">
                      {Math.round(you.percentile)}%
                    </span>{" "}
                    of the gym
                  </>
                ) : (
                  "Only one on the board so far"
                )}
              </p>
            </div>
          ) : (
            <EmptyState
              message={
                leaderboard.length >= 20
                  ? "You're outside the top 20 here. A new best on any lift can move you up."
                  : "You're not on this gym's board yet. Log a lift here to get ranked."
              }
              action={
                <Button asChild>
                  <Link href={logHref}>Log a lift</Link>
                </Button>
              }
            />
          )}

          {leaderboard.length > 0 && (
            <>
              <LeaderboardRows entries={leaderboard.slice(0, 5)} ladder={ladder} highlightUserId={user.id} />
              <Link
                href={`/gyms/${activeGymId}/leaderboard`}
                className="self-start text-sm text-sky hover:text-tint hover:underline"
              >
                See all {leaderboard.length}
              </Link>
            </>
          )}
        </section>

        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-4" aria-label="Weekly champions">
            <SectionHeading title="This week's heaviest" />
            <WeeklyChampions gymId={activeGymId} exercises={exercises} currentUserId={user.id} />
            <p className="text-xs text-faint">Raw weight, no bodyweight adjustment. Resets every Monday.</p>
          </section>

          <section className="flex flex-col gap-4" aria-label="Strength by muscle group">
            <SectionHeading title="Where your points come from" />
            <MuscleGroupBars contributions={contributions} fullScale={olympian / 5} />
            <p className="text-xs text-faint">
              Each group counts the average of your best lifts in it. Train a new group to add to
              your score.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
