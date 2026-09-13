import { LeaderboardTable } from "@/components/rankd/leaderboard-table";
import type { components } from "@/lib/api/schema";

type GymLeaderboardEntry = components["schemas"]["GymLeaderboardEntry"];

export function GymLeaderboardTable({
  entries,
  highlightUserId,
}: {
  entries: GymLeaderboardEntry[];
  highlightUserId?: string;
}) {
  return (
    <LeaderboardTable
      rows={entries.map((e) => ({
        rank: e.rank,
        userId: e.user_id,
        username: e.username,
        value: e.bar_total.toFixed(1),
        secondaryValue: `${e.percentile.toFixed(0)}th pct`,
      }))}
      valueLabel="Points"
      secondaryLabel="Percentile"
      highlightUserId={highlightUserId}
      emptyMessage="No one at this gym has logged a scored lift yet — be the first."
    />
  );
}
