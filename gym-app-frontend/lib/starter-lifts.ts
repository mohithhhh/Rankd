import type { components } from "@/lib/api/schema";

type ExerciseOut = components["schemas"]["ExerciseOut"];

/**
 * Bodyweight movements offered on the starter screen, looked up by seeded name
 * (scripts/seed.py) - there's no "starter" flag on exercises. A name that's
 * missing from the DB is silently skipped rather than breaking the screen.
 */
export const STARTER_BODYWEIGHT_NAMES = ["Push-up", "Pull-up", "Dip"];

// Sanity ceilings, not scoring rules: a logged set can't be edited or deleted
// yet and rank is driven by best-ever points, so one fat-fingered "1000" would
// permanently inflate someone's tier. Above the heaviest lifts ever recorded.
export const MAX_WEIGHT_KG = 500;
export const MAX_REPS = 50;

export type StarterExercises = {
  /** Squat / bench / deadlift - the exercises flagged weekly_eligible. */
  bigThree: ExerciseOut[];
  bodyweight: ExerciseOut[];
};

export function pickStarterExercises(exercises: ExerciseOut[]): StarterExercises {
  return {
    bigThree: exercises.filter((e) => e.weekly_eligible),
    bodyweight: STARTER_BODYWEIGHT_NAMES.flatMap((name) => {
      const match = exercises.find((e) => e.name === name && e.type === "bodyweight");
      return match ? [match] : [];
    }),
  };
}

export type StarterLiftItem = {
  gym_id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  added_weight_kg?: number;
  client_request_id: string;
};

export type ParsedStarterLifts = { ok: true; items: StarterLiftItem[] } | { ok: false; error: string };

type FormLike = {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
};

const NON_NEGATIVE_NUMBER = /^\d+(\.\d+)?$/;
const WHOLE_NUMBER = /^\d+$/;

function field(form: FormLike, name: string): string {
  return String(form.get(name) ?? "").trim();
}

/**
 * Turns the starter-lifts form into bulk-create items. Rows the user left
 * completely blank are skipped; a half-filled row is an error (never silently
 * dropped), and at least one row must be filled in.
 *
 * Field names per exercise id: reps_<id>, weight_<id> (weighted),
 * added_<id> (bodyweight, optional), rid_<id> (idempotency key).
 */
export function parseStarterLifts(
  form: FormLike,
  gymId: string,
  exercises: ExerciseOut[],
): ParsedStarterLifts {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const ids = [...new Set(form.getAll("exercise_id").map(String))];
  const items: StarterLiftItem[] = [];

  for (const id of ids) {
    const exercise = byId.get(id);
    if (!exercise) continue;

    const isBodyweight = exercise.type === "bodyweight";
    const reps = field(form, `reps_${id}`);
    const weight = field(form, `weight_${id}`);
    const added = field(form, `added_${id}`);

    if (!reps && !weight && !added) continue;

    if (!WHOLE_NUMBER.test(reps) || Number(reps) < 1 || Number(reps) > MAX_REPS) {
      return { ok: false, error: `${exercise.name}: enter reps as a whole number from 1 to ${MAX_REPS}.` };
    }

    let weightKg = 0;
    let addedWeightKg: number | undefined;

    if (isBodyweight) {
      // Bodyweight exercises score bodyweight + added load and ignore weight_kg
      // (scoring.py), so it's sent as 0 and only the optional extra load matters.
      if (added) {
        if (!NON_NEGATIVE_NUMBER.test(added) || Number(added) > MAX_WEIGHT_KG) {
          return { ok: false, error: `${exercise.name}: added weight must be 0-${MAX_WEIGHT_KG} kg.` };
        }
        addedWeightKg = Number(added);
      }
    } else {
      if (!NON_NEGATIVE_NUMBER.test(weight) || Number(weight) <= 0 || Number(weight) > MAX_WEIGHT_KG) {
        return { ok: false, error: `${exercise.name}: enter the weight (kg) you lifted, up to ${MAX_WEIGHT_KG}.` };
      }
      weightKg = Number(weight);
    }

    items.push({
      gym_id: gymId,
      exercise_id: id,
      weight_kg: weightKg,
      reps: Number(reps),
      ...(addedWeightKg !== undefined && { added_weight_kg: addedWeightKg }),
      // Stable per page render, so a double-click or retry replays instead of
      // duplicating (see logged_sets.client_request_id / _create_one).
      client_request_id: field(form, `rid_${id}`) || crypto.randomUUID(),
    });
  }

  if (items.length === 0) {
    return { ok: false, error: "Enter at least one lift, or skip for now." };
  }
  return { ok: true, items };
}
