"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TierReveal } from "@/components/rankd/tier-reveal";
import { submitStarterLiftsAction, type StarterLiftsState } from "@/app/starter-lifts/actions";
import { MAX_REPS, MAX_WEIGHT_KG } from "@/lib/starter-lifts";
import type { components } from "@/lib/api/schema";

type ExerciseOut = components["schemas"]["ExerciseOut"];

function LiftRow({ exercise, requestId }: { exercise: ExerciseOut; requestId: string }) {
  const isBodyweight = exercise.type === "bodyweight";
  const repsField = (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`reps_${exercise.id}`}>Reps</Label>
      <Input
        id={`reps_${exercise.id}`}
        name={`reps_${exercise.id}`}
        type="number"
        inputMode="numeric"
        min="1"
        max={MAX_REPS}
        step="1"
      />
    </div>
  );

  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">{exercise.name}</legend>
      <input type="hidden" name="exercise_id" value={exercise.id} />
      <input type="hidden" name={`rid_${exercise.id}`} value={requestId} />
      <div className="grid grid-cols-2 gap-3">
        {isBodyweight ? (
          <>
            {repsField}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`added_${exercise.id}`}>Added kg (optional)</Label>
              <Input
                id={`added_${exercise.id}`}
                name={`added_${exercise.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                max={MAX_WEIGHT_KG}
                step="0.5"
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`weight_${exercise.id}`}>Weight (kg)</Label>
              <Input
                id={`weight_${exercise.id}`}
                name={`weight_${exercise.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                max={MAX_WEIGHT_KG}
                step="0.5"
              />
            </div>
            {repsField}
          </>
        )}
      </div>
    </fieldset>
  );
}

export function StarterLiftsForm({
  gymId,
  gymName,
  bigThree,
  bodyweight,
  requestIds,
}: {
  gymId: string;
  gymName: string;
  bigThree: ExerciseOut[];
  bodyweight: ExerciseOut[];
  /** One idempotency key per exercise, minted server-side so SSR and hydration agree. */
  requestIds: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<StarterLiftsState, FormData>(
    submitStarterLiftsAction,
    undefined,
  );

  if (state && "success" in state) {
    const all = [...bigThree, ...bodyweight];
    return (
      <TierReveal
        gymId={gymId}
        gymName={gymName}
        logged={state.logged}
        tier={state.tier}
        gymRank={state.gymRank}
        exerciseNames={Object.fromEntries(all.map((e) => [e.id, e.name]))}
        bodyweightExerciseIds={new Set(bodyweight.map((e) => e.id))}
      />
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="gym_id" value={gymId} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide">The big three</h2>
        {bigThree.map((exercise) => (
          <LiftRow key={exercise.id} exercise={exercise} requestId={requestIds[exercise.id]} />
        ))}
      </section>

      {bodyweight.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide">
            Bodyweight — great if you&apos;re just starting
          </h2>
          {bodyweight.map((exercise) => (
            <LiftRow key={exercise.id} exercise={exercise} requestId={requestIds[exercise.id]} />
          ))}
        </section>
      )}

      {state && "error" in state && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Working out your tier…" : "Reveal my tier"}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/dashboard?gymId=${gymId}`}>Skip for now</Link>
        </Button>
      </div>
    </form>
  );
}
