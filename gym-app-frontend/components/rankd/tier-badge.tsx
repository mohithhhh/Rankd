import { cn } from "@/lib/utils";
import { bandLabel, TIER_COLOR, type Tier } from "@/lib/tiers";

export function TierBadge({
  tier,
  subLevel,
  className,
}: {
  tier: Tier;
  subLevel: number;
  className?: string;
}) {
  const color = TIER_COLOR[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {bandLabel({ tier, sub_level: subLevel })}
    </span>
  );
}
