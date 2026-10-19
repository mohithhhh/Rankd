import { cn } from "@/lib/utils";
import { TierBadge } from "@/components/rankd/tier-badge";
import { initials, points } from "@/lib/format";
import { ladderPosition, TIER_COLOR, type TierThreshold } from "@/lib/tiers";
import type { components } from "@/lib/api/schema";

type Entry = components["schemas"]["GymLeaderboardEntry"];

// Badges are derived from each lifter's gym-scoped bar_total (that's all the
// leaderboard returns), so a lifter who also trains at another gym can show a
// lower band here than on their own profile.
function bandFor(ladder: TierThreshold[], barTotal: number) {
  return ladderPosition(ladder, barTotal)?.current ?? null;
}

export function Avatar({
  username,
  color,
  size = "md",
}: {
  username: string;
  color?: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-raised font-semibold text-tint",
        size === "md" ? "size-9 text-xs" : "size-14 text-base",
      )}
      style={color ? { boxShadow: `0 0 0 2px var(--bg), 0 0 0 4px ${color}` } : undefined}
    >
      {initials(username)}
    </span>
  );
}

export function LeaderboardRows({
  entries,
  ladder,
  highlightUserId,
}: {
  entries: Entry[];
  ladder: TierThreshold[];
  highlightUserId: string;
}) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry) => {
        const band = bandFor(ladder, entry.bar_total);
        const isYou = entry.user_id === highlightUserId;
        return (
          <li
            key={entry.user_id}
            className={cn(
              "flex items-center gap-3 border-b border-border px-1 py-3 last:border-b-0",
              isYou && "-mx-3 rounded-xl border-b-0 bg-ember/10 px-4 ring-1 ring-ember/40",
            )}
          >
            <span className="w-7 shrink-0 text-center font-display text-xl font-bold text-faint tabular-nums">
              {entry.rank}
            </span>
            <Avatar username={entry.username} color={band ? TIER_COLOR[band.tier] : undefined} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-medium">
                {entry.username}
                {isYou && <span className="ml-1.5 text-sm font-normal text-ember">you</span>}
              </span>
              {band && <TierBadge tier={band.tier} subLevel={band.sub_level} className="self-start" />}
            </div>
            <span className="font-display text-2xl font-bold tabular-nums">
              {points(entry.bar_total)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Top three as a podium: second, first, third, left to right. */
export function Podium({
  entries,
  ladder,
  highlightUserId,
}: {
  entries: Entry[];
  ladder: TierThreshold[];
  highlightUserId: string;
}) {
  const [first, second, third] = entries;
  const steps = [
    { entry: second, height: "h-16", place: "2nd" },
    { entry: first, height: "h-24", place: "1st" },
    { entry: third, height: "h-12", place: "3rd" },
  ];

  return (
    <ol className="grid grid-cols-3 items-end gap-2" aria-label="Top three">
      {steps.map(({ entry, height, place }) => {
        const band = bandFor(ladder, entry.bar_total);
        const color = band ? TIER_COLOR[band.tier] : "var(--sky)";
        const isYou = entry.user_id === highlightUserId;
        return (
          <li key={entry.user_id} className="flex min-w-0 flex-col items-center gap-2">
            <Avatar username={entry.username} color={color} size="lg" />
            <span className={cn("max-w-full truncate text-sm font-medium", isYou && "text-ember")}>
              {entry.username}
            </span>
            <span className="font-display text-xl leading-none font-bold tabular-nums">
              {points(entry.bar_total)}
            </span>
            <div
              className={cn("flex w-full items-start justify-center rounded-t-lg pt-2", height)}
              style={{
                background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 35%, transparent), transparent)`,
              }}
            >
              <span className="font-display text-lg font-bold" style={{ color }}>
                {place}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
