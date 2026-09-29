import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/rankd/tier-badge";
import type { components } from "@/lib/api/schema";

type LoggedSetOut = components["schemas"]["LoggedSetOut"];
type TierOut = components["schemas"]["TierOut"];

function describeSet(set: LoggedSetOut, isBodyweight: boolean): string {
  if (!isBodyweight) return `${set.weight_kg} kg × ${set.reps}`;
  return set.added_weight_kg
    ? `${set.reps} reps, +${set.added_weight_kg} kg`
    : `${set.reps} reps`;
}

export function TierReveal({
  gymId,
  gymName,
  logged,
  tier,
  gymRank,
  exerciseNames,
  bodyweightExerciseIds,
}: {
  gymId: string;
  gymName: string;
  logged: LoggedSetOut[];
  tier: TierOut | null;
  gymRank: number | null;
  exerciseNames: Record<string, string>;
  bodyweightExerciseIds: Set<string>;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          Your starting tier at {gymName}
        </p>
        {tier ? (
          <>
            <TierBadge tier={tier.tier} subLevel={tier.sub_level} size="lg" />
            <p className="tabular-nums text-4xl font-semibold">
              {tier.bar_total.toFixed(1)}
              <span className="ml-1 text-base font-medium text-muted">points</span>
            </p>
          </>
        ) : (
          <p className="text-lg font-semibold">Your lifts are saved.</p>
        )}
        {gymRank !== null && (
          <p className="text-sm font-medium text-accent">
            #{gymRank} on the {gymName} leaderboard
          </p>
        )}
      </div>

      <ul className="w-full divide-y divide-border rounded-lg border border-border text-left">
        {logged.map((set) => (
          <li key={set.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{exerciseNames[set.exercise_id] ?? "Exercise"}</p>
              <p className="text-xs text-muted">
                {describeSet(set, bodyweightExerciseIds.has(set.exercise_id))}
              </p>
            </div>
            {set.points !== null && (
              <p className="tabular-nums text-sm font-medium">{set.points.toFixed(1)} pts</p>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Your score counts your best lift in each muscle group, adjusted for bodyweight. Beat these
        numbers and your tier goes up.
      </p>

      <Button asChild className="w-full">
        <Link href={`/dashboard?gymId=${gymId}`}>Go to dashboard</Link>
      </Button>
    </div>
  );
}
