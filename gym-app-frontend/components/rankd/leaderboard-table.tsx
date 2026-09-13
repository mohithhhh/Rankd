import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/rankd/empty-state";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  value: string;
  secondaryValue?: string;
};

export function LeaderboardTable({
  rows,
  valueLabel,
  secondaryLabel,
  highlightUserId,
  emptyMessage,
}: {
  rows: LeaderboardRow[];
  valueLabel: string;
  secondaryLabel?: string;
  highlightUserId?: string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Lifter</TableHead>
          <TableHead className="text-right">{valueLabel}</TableHead>
          {secondaryLabel && <TableHead className="text-right">{secondaryLabel}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.userId}
            className={cn(row.userId === highlightUserId && "bg-accent/10")}
          >
            <TableCell className="tabular-nums font-medium">{row.rank}</TableCell>
            <TableCell>{row.username}</TableCell>
            <TableCell className="text-right tabular-nums">{row.value}</TableCell>
            {secondaryLabel && (
              <TableCell className="text-right tabular-nums text-muted">
                {row.secondaryValue}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
