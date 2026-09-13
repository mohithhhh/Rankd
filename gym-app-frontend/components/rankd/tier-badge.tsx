import { cn } from "@/lib/utils";
import type { components } from "@/lib/api/schema";

type Tier = components["schemas"]["Tier"];

const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  olympian: "Olympian",
};

const TIER_COLOR_VAR: Record<Tier, string> = {
  bronze: "var(--tier-bronze)",
  silver: "var(--tier-silver)",
  gold: "var(--tier-gold)",
  platinum: "var(--tier-platinum)",
  diamond: "var(--tier-diamond)",
  olympian: "var(--tier-olympian)",
};

export function TierBadge({
  tier,
  subLevel,
  size = "sm",
}: {
  tier: Tier;
  subLevel: number;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium text-white",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-4 py-1.5 text-base",
      )}
      style={{ backgroundColor: TIER_COLOR_VAR[tier] }}
    >
      {TIER_LABEL[tier]} {subLevel}
    </span>
  );
}
