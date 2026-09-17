"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logSetAction, type LogSetState } from "@/app/(app)/log/actions";
import type { components } from "@/lib/api/schema";

type ExerciseOut = components["schemas"]["ExerciseOut"];
type MuscleGroup = components["schemas"]["MuscleGroup"];

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full Body" },
];

export function LogLiftForm({ gymId, exercises }: { gymId: string; exercises: ExerciseOut[] }) {
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("push");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  // Reused across retries of the same attempt, regenerated after a success -
  // see app/(app)/log/actions.ts and app/api/logged_sets.py for why this
  // needs to stay stable within one attempt.
  const [clientRequestId, setClientRequestId] = useState(() => crypto.randomUUID());
  // Bumping this remounts the uncontrolled weight/reps inputs below, clearing
  // them after a successful log without needing a form ref.
  const [formKey, setFormKey] = useState(0);

  const [state, action, pending] = useActionState<LogSetState, FormData>(logSetAction, undefined);

  // Resetting local state in response to `state` changing belongs during
  // render (React's documented pattern for this), not in an effect - an
  // effect would commit once with stale state, then re-render again, which
  // is exactly the cascading-render pattern react-hooks/set-state-in-effect
  // flags. Only the actual external-system call (the toast) belongs below.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state && "success" in state) {
      setSelectedExerciseId(null);
      setClientRequestId(crypto.randomUUID());
      setFormKey((k) => k + 1);
    }
  }

  const groupExercises = useMemo(
    () => exercises.filter((e) => e.muscle_group === muscleGroup),
    [exercises, muscleGroup],
  );

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) ?? null;

  useEffect(() => {
    if (!state || !("success" in state)) return;
    const exerciseName =
      exercises.find((e) => e.id === state.logged.exercise_id)?.name ?? "exercise";
    toast.success(`Logged ${state.logged.reps} reps on ${exerciseName}.`);
  }, [state, exercises]);

  function handleMuscleGroupChange(value: string) {
    setMuscleGroup(value as MuscleGroup);
    setSelectedExerciseId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs value={muscleGroup} onValueChange={handleMuscleGroupChange}>
        <TabsList className="h-auto w-full flex-wrap">
          {MUSCLE_GROUPS.map((g) => (
            <TabsTrigger key={g.value} value={g.value} className="flex-1">
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {MUSCLE_GROUPS.map((g) => (
          <TabsContent key={g.value} value={g.value} className="pt-4">
            <div className="flex flex-wrap gap-2">
              {groupExercises.map((exercise) => (
                <Button
                  key={exercise.id}
                  type="button"
                  variant={selectedExerciseId === exercise.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedExerciseId(exercise.id)}
                >
                  {exercise.name}
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {selectedExercise && (
        <form
          key={formKey}
          action={action}
          className="flex flex-col gap-4 border-t border-border pt-5"
        >
          <input type="hidden" name="gym_id" value={gymId} />
          <input type="hidden" name="exercise_id" value={selectedExercise.id} />
          <input type="hidden" name="exercise_type" value={selectedExercise.type} />
          <input type="hidden" name="client_request_id" value={clientRequestId} />

          <p className="text-sm font-medium">{selectedExercise.name}</p>

          {selectedExercise.type === "weighted" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="weight_kg">Weight (kg)</Label>
              <Input id="weight_kg" name="weight_kg" type="number" step="0.1" min="0" required />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="added_weight_kg">Added weight (kg, optional)</Label>
              <Input id="added_weight_kg" name="added_weight_kg" type="number" step="0.1" min="0" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reps">Reps</Label>
            <Input id="reps" name="reps" type="number" min="1" required />
          </div>

          {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Logging…" : "Log set"}
          </Button>
        </form>
      )}
    </div>
  );
}
