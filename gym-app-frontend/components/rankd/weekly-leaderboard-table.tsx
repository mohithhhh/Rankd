import { LeaderboardTable } from "@/components/rankd/leaderboard-table";
import type { components } from "@/lib/api/schema";

type WeeklyLeaderboardEntry = components["schemas"]["WeeklyLeaderboardEntry"];

export function WeeklyLeaderboardTable({
  entries,
  highlightUserId,
}: {
  entries: WeeklyLeaderboardEntry[];
  highlightUserId?: string;
}) {
  return (
    <LeaderboardTable
      rows={entries.map((e) => ({
        rank: e.rank,
        userId: e.user_id,
        username: e.username,
        value: `${e.weight_kg.toFixed(1)} kg`,
        secondaryValue: `~${e.estimated_1rm_kg.toFixed(1)} kg 1RM`,
      }))}
      valueLabel="Weight"
      secondaryLabel="Est. 1RM"
      highlightUserId={highlightUserId}
      emptyMessage="No lifts logged for this exercise this week yet."
    />
  );
}
