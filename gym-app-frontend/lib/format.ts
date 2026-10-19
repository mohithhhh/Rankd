import type { components } from "@/lib/api/schema";

type MuscleGroup = components["schemas"]["MuscleGroup"];
type ExerciseOut = components["schemas"]["ExerciseOut"];
type LoggedSetOut = components["schemas"]["LoggedSetOut"];

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string; examples: string }[] = [
  { id: "push", label: "Push", examples: "Bench, overhead press, dips" },
  { id: "pull", label: "Pull", examples: "Deadlift, rows, pull-ups" },
  { id: "legs", label: "Legs", examples: "Squat, leg press, hip thrust" },
  { id: "core", label: "Core", examples: "Leg raises, cable crunch" },
  { id: "full_body", label: "Full body", examples: "Power clean, thruster" },
];

export const MUSCLE_GROUP_LABEL = Object.fromEntries(
  MUSCLE_GROUPS.map((g) => [g.id, g.label]),
) as Record<MuscleGroup, string>;

/** 82.5 -> "82.5", 80 -> "80" */
export function kg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function points(value: number): string {
  return value.toFixed(1);
}

/** "80 kg × 5", or "Bodyweight + 10 kg × 8" for bodyweight exercises. */
export function describeSet(
  set: Pick<LoggedSetOut, "weight_kg" | "reps" | "added_weight_kg">,
  exercise: Pick<ExerciseOut, "type"> | undefined,
): string {
  if (exercise?.type === "bodyweight") {
    const added = set.added_weight_kg ?? 0;
    return added > 0 ? `Bodyweight + ${kg(added)} kg × ${set.reps}` : `Bodyweight × ${set.reps}`;
  }
  return `${kg(set.weight_kg)} kg × ${set.reps}`;
}

export function initials(username: string): string {
  const parts = username.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : username.slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Best-ever points per exercise from a user's history. Feeds the "new best"
 * markers and the per-muscle-group bars; the API returns points per set but
 * no PR flag.
 */
export function bestPointsByExercise(sets: LoggedSetOut[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const set of sets) {
    if (set.points === null) continue;
    const prev = best.get(set.exercise_id);
    if (prev === undefined || set.points > prev) best.set(set.exercise_id, set.points);
  }
  return best;
}

/**
 * Per-muscle-group contribution to bar_total: the average of each exercise's
 * best points in that group. Mirrors compute_bar_total in
 * gym-app-backend/app/services/scoring.py so the bars sum to the score shown;
 * if that formula changes, change this too. Groups never trained are absent.
 */
export function groupContributions(
  best: Map<string, number>,
  exercises: ExerciseOut[],
): Map<MuscleGroup, number> {
  const byGroup = new Map<MuscleGroup, number[]>();
  for (const exercise of exercises) {
    const value = best.get(exercise.id);
    if (value === undefined) continue;
    byGroup.set(exercise.muscle_group, [...(byGroup.get(exercise.muscle_group) ?? []), value]);
  }
  return new Map(
    [...byGroup].map(([group, values]) => [group, values.reduce((a, b) => a + b, 0) / values.length]),
  );
}
