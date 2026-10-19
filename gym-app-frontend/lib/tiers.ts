import type { components } from "@/lib/api/schema";

export type Tier = components["schemas"]["Tier"];
export type TierThreshold = components["schemas"]["TierThresholdOut"];

export const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  olympian: "Olympian",
};

export const TIER_COLOR: Record<Tier, string> = {
  bronze: "var(--tier-bronze)",
  silver: "var(--tier-silver)",
  gold: "var(--tier-gold)",
  platinum: "var(--tier-platinum)",
  diamond: "var(--tier-diamond)",
  olympian: "var(--tier-olympian)",
};

/** "Gold 2". Olympian is a single band, so it never shows a sub-level. */
export function bandLabel(band: { tier: Tier; sub_level: number }): string {
  return band.tier === "olympian" ? TIER_LABEL.olympian : `${TIER_LABEL[band.tier]} ${band.sub_level}`;
}

export type LadderPosition = {
  /** Index into the ladder (ascending by min_points) of the band you're in. */
  index: number;
  current: TierThreshold;
  next: TierThreshold | null;
  /** 0..1 progress through the current band; 1 on the open-ended top band. */
  fraction: number;
  pointsToNext: number | null;
};

/**
 * Where a bar_total sits on the ladder. Mirrors the backend's lookup
 * (highest band whose min_points <= bar_total, app/services/tiers.py) so the
 * band shown always matches /users/{id}/tier. `ladder` must be ascending,
 * which is how GET /tiers/thresholds returns it.
 */
export function ladderPosition(ladder: TierThreshold[], barTotal: number): LadderPosition | null {
  if (ladder.length === 0) return null;

  let index = 0;
  for (let i = 0; i < ladder.length; i++) {
    if (ladder[i].min_points <= barTotal) index = i;
  }

  const current = ladder[index];
  const next = ladder[index + 1] ?? null;
  if (next === null) {
    return { index, current, next, fraction: 1, pointsToNext: null };
  }

  const span = next.min_points - current.min_points;
  const fraction = Math.min(1, Math.max(0, (barTotal - current.min_points) / span));
  return { index, current, next, fraction, pointsToNext: next.min_points - barTotal };
}
