import { TierLadder } from "@/components/rankd/tier-ladder";
import { points } from "@/lib/format";
import { bandLabel, ladderPosition, TIER_COLOR, type TierThreshold } from "@/lib/tiers";
import type { components } from "@/lib/api/schema";

type TierOut = components["schemas"]["TierOut"];

export function TierHero({
  tier,
  ladder,
  children,
}: {
  tier: TierOut;
  ladder: TierThreshold[];
  /** Rendered under the ladder, e.g. the log CTA. */
  children?: React.ReactNode;
}) {
  const position = ladderPosition(ladder, tier.bar_total);
  const color = TIER_COLOR[tier.tier];

  return (
    <section className="relative flex flex-col gap-5" aria-labelledby="tier-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Your tier</p>
          <h1
            id="tier-heading"
            className="font-display text-7xl leading-[0.85] font-extrabold sm:text-8xl"
            style={{ color }}
          >
            {bandLabel(tier)}
          </h1>
        </div>
        <p className="pb-1 text-right">
          <span className="block font-display text-4xl leading-none font-bold tabular-nums">
            {points(tier.bar_total)}
          </span>
          <span className="text-sm text-muted-foreground">points</span>
        </p>
      </div>

      {position && <TierLadder ladder={ladder} position={position} className="relative" />}

      {position && (
        <p className="relative text-sm text-muted-foreground">
          {position.next === null ? (
            "Top of the ladder. Every new best still moves your gym rank."
          ) : (
            <>
              <span className="font-medium text-foreground tabular-nums">
                {/* Round up so "0.04 to go" never reads as "0.0" */}
                {points(Math.ceil(position.pointsToNext! * 10) / 10)} points
              </span>{" "}
              to {bandLabel(position.next)}
            </>
          )}
        </p>
      )}
      {children}
    </section>
  );
}
