import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/rankd/empty-state";
import type { components } from "@/lib/api/schema";

type LoggedSetOut = components["schemas"]["LoggedSetOut"];
type ExerciseOut = components["schemas"]["ExerciseOut"];

function formatLoad(loggedSet: LoggedSetOut, exercise: ExerciseOut | undefined) {
  if (exercise?.type === "bodyweight") {
    return loggedSet.added_weight_kg
      ? `BW + ${loggedSet.added_weight_kg.toFixed(1)} kg`
      : "Bodyweight";
  }
  return `${loggedSet.weight_kg.toFixed(1)} kg`;
}

export function LoggedSetsHistoryTable({
  loggedSets,
  exercises,
  gyms,
}: {
  loggedSets: LoggedSetOut[];
  exercises: ExerciseOut[];
  gyms: { id: string; name: string }[];
}) {
  if (loggedSets.length === 0) {
    return <EmptyState message="You haven't logged a set yet — head to the Log tab to start." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Exercise</TableHead>
          <TableHead>Gym</TableHead>
          <TableHead className="text-right">Load</TableHead>
          <TableHead className="text-right">Reps</TableHead>
          <TableHead className="text-right">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loggedSets.map((loggedSet) => {
          const exercise = exercises.find((e) => e.id === loggedSet.exercise_id);
          const gym = gyms.find((g) => g.id === loggedSet.gym_id);
          return (
            <TableRow key={loggedSet.id}>
              <TableCell className="text-muted">
                {new Date(loggedSet.logged_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell className="font-medium">{exercise?.name ?? "Unknown exercise"}</TableCell>
              <TableCell className="text-muted">{gym?.name ?? "Unknown gym"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatLoad(loggedSet, exercise)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{loggedSet.reps}</TableCell>
              <TableCell className="text-right tabular-nums text-muted">
                {loggedSet.points !== null ? loggedSet.points.toFixed(1) : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
