import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER_COLOR, TIER_LABEL, type LadderPosition, type Tier, type TierThreshold } from "@/lib/tiers";

/**
 * The whole ladder as one row of rungs: cleared rungs solid, the current one
 * filling up, the rest dim. Olympian gets a double-width rung - it's the
 * open-ended top band. `position` null renders the ladder fully lit (login art).
 */
export function TierLadder({
  ladder,
  position,
  className,
}: {
  ladder: TierThreshold[];
  position: LadderPosition | null;
  className?: string;
}) {
  const span = (t: TierThreshold) => (t.tier === "olympian" ? 2 : 1);
  const columns = ladder.reduce((sum, t) => sum + span(t), 0);

  // Consecutive rungs of the same tier share one label underneath.
  const groups: { tier: Tier; columns: number }[] = [];
  for (const rung of ladder) {
    const last = groups.at(-1);
    if (last?.tier === rung.tier) last.columns += span(rung);
    else groups.push({ tier: rung.tier, columns: span(rung) });
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        role="img"
        aria-label={
          position
            ? `Rung ${position.index + 1} of ${ladder.length} on the tier ladder`
            : "The tier ladder, Bronze to Olympian"
        }
      >
        {ladder.map((rung, i) => {
          const color = TIER_COLOR[rung.tier];
          const cleared = position === null || i < position.index;
          const current = position !== null && i === position.index;
          return (
            <div
              key={`${rung.tier}-${rung.sub_level}`}
              className={cn("relative h-3 overflow-hidden rounded-[3px]", current && "h-4 -my-0.5")}
              style={{
                gridColumn: `span ${span(rung)}`,
                backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                boxShadow: current ? `0 0 14px color-mix(in srgb, ${color} 55%, transparent)` : undefined,
              }}
            >
              {(cleared || current) && (
                <div
                  className="absolute inset-0 origin-left animate-rung-fill"
                  style={{
                    backgroundColor: color,
                    transform: current ? `scaleX(${Math.max(position!.fraction, 0.06)})` : undefined,
                    animationDelay: `${i * 35}ms`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div
        className="grid gap-1 text-[11px] leading-none text-faint"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {groups.map((group) => (
          <span
            key={group.tier}
            className={cn(
              "truncate",
              position && ladder[position.index].tier === group.tier && "font-medium",
            )}
            style={{
              gridColumn: `span ${group.columns}`,
              color:
                position && ladder[position.index].tier === group.tier
                  ? TIER_COLOR[group.tier]
                  : undefined,
            }}
          >
            {group.tier === "olympian" ? (
              <Crown className="mx-auto size-3.5" style={{ color: TIER_COLOR.olympian }} />
            ) : (
              TIER_LABEL[group.tier]
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
