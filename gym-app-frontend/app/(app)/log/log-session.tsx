"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Search, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describeSet, kg, MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, points } from "@/lib/format";
import { bandLabel, ladderPosition, TIER_COLOR, type TierThreshold } from "@/lib/tiers";
import type { components } from "@/lib/api/schema";
import { logSetsAction, type LogSetsResult } from "./actions";

type ExerciseOut = components["schemas"]["ExerciseOut"];
type MuscleGroup = components["schemas"]["MuscleGroup"];

export type LastSet = { weightKg: number; reps: number; addedWeightKg: number | null };

type QueuedSet = {
  clientRequestId: string;
  exercise: ExerciseOut;
  weightKg: number;
  reps: number;
};

const EPLEY_REP_CAP = 12; // mirrors scoring.py - reps above this score the same

export function LogSession({
  gyms,
  initialGymId,
  exercises,
  bestPoints,
  lastSets,
  ladder,
  bodyweightKg,
}: {
  gyms: { id: string; name: string }[];
  initialGymId: string;
  exercises: ExerciseOut[];
  bestPoints: Record<string, number>;
  lastSets: Record<string, LastSet>;
  ladder: TierThreshold[];
  bodyweightKg: number;
}) {
  const router = useRouter();
  const [gymId, setGymId] = useState(initialGymId);
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [exercise, setExercise] = useState<ExerciseOut | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("5");
  const [queue, setQueue] = useState<QueuedSet[]>([]);
  // priorBest is captured at save time: the action revalidates the page, so
  // by the time the result renders the bestPoints prop already includes it.
  const [result, setResult] = useState<
    (Extract<LogSetsResult, { ok: true }> & { priorBest: Record<string, number> }) | null
  >(null);
  const [pending, startTransition] = useTransition();

  function pickExercise(next: ExerciseOut) {
    const last = lastSets[next.id];
    setExercise(next);
    setWeight(
      last
        ? kg(next.type === "bodyweight" ? (last.addedWeightKg ?? 0) : last.weightKg)
        : next.type === "bodyweight"
          ? "0"
          : "",
    );
    setReps(last ? String(last.reps) : "5");
  }

  const isBodyweight = exercise?.type === "bodyweight";
  const weightNum = Number(weight);
  const repsNum = Number(reps);
  const weightValid =
    weight.trim() !== "" && Number.isFinite(weightNum) && (isBodyweight ? weightNum >= 0 : weightNum > 0);
  const repsValid = Number.isInteger(repsNum) && repsNum >= 1 && repsNum <= 100;

  function addSet() {
    if (!exercise || !weightValid || !repsValid) return;
    setQueue((q) => [
      ...q,
      { clientRequestId: crypto.randomUUID(), exercise, weightKg: weightNum, reps: repsNum },
    ]);
  }

  function save() {
    const priorBest = bestPoints;
    startTransition(async () => {
      const res = await logSetsAction(
        queue.map((s) => ({
          gym_id: gymId,
          exercise_id: s.exercise.id,
          // The API ignores weight_kg for bodyweight lifts and scores
          // bodyweight + added_weight_kg instead.
          weight_kg: s.exercise.type === "bodyweight" ? 0 : s.weightKg,
          added_weight_kg: s.exercise.type === "bodyweight" ? s.weightKg : null,
          reps: s.reps,
          client_request_id: s.clientRequestId,
        })),
      );
      if (!res.ok) {
        // Queue (and its request ids) is kept, so "Save" again is a safe retry.
        toast.error(res.error);
        return;
      }
      setQueue([]);
      setResult({ ...res, priorBest });
      window.scrollTo({ top: 0 });
    });
  }

  if (result) {
    return (
      <SessionResult
        result={result}
        exercises={exercises}
        bestPoints={result.priorBest}
        ladder={ladder}
        onLogMore={() => {
          setResult(null);
          setExercise(null);
          setGroup(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl leading-none font-extrabold">Log a lift</h1>
        {gyms.length > 1 && (
          <select
            value={gymId}
            onChange={(e) => setGymId(e.target.value)}
            aria-label="Gym you're lifting at"
            className="h-9 rounded-full border border-input bg-surface px-3 text-sm"
          >
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </header>

      {exercise ? (
        <SetEntry
          exercise={exercise}
          bodyweightKg={bodyweightKg}
          lastSet={lastSets[exercise.id]}
          best={bestPoints[exercise.id]}
          weight={weight}
          reps={reps}
          onWeight={setWeight}
          onReps={setReps}
          canAdd={weightValid && repsValid}
          onAdd={addSet}
          onBack={() => setExercise(null)}
        />
      ) : group ? (
        <ExercisePicker
          group={group}
          exercises={exercises.filter((e) => e.muscle_group === group)}
          lastSets={lastSets}
          onPick={pickExercise}
          onBack={() => setGroup(null)}
        />
      ) : (
        <GroupPicker onPick={setGroup} />
      )}

      {queue.length > 0 && (
        <section aria-label="This session" className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">This session</h2>
          <ol className="flex flex-col rounded-2xl bg-surface ring-1 ring-border">
            {queue.map((set, i) => (
              <li
                key={set.clientRequestId}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 animate-rise"
              >
                <span className="w-5 text-sm text-faint tabular-nums">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{set.exercise.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {describeSet(
                      {
                        weight_kg: set.weightKg,
                        reps: set.reps,
                        added_weight_kg: set.exercise.type === "bodyweight" ? set.weightKg : null,
                      },
                      set.exercise,
                    )}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove set ${i + 1}`}
                  onClick={() => setQueue((q) => q.filter((s) => s.clientRequestId !== set.clientRequestId))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {queue.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 px-4 md:bottom-6">
          <div className="mx-auto max-w-5xl">
            <Button size="xl" className="w-full shadow-lg shadow-black/40" onClick={save} disabled={pending}>
              {pending ? "Saving…" : `Save ${queue.length} ${queue.length === 1 ? "set" : "sets"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupPicker({ onPick }: { onPick: (group: MuscleGroup) => void }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="group-heading">
      <h2 id="group-heading" className="text-muted-foreground">
        What are you training?
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {MUSCLE_GROUPS.map((g, i) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g.id)}
            className={cn(
              "flex min-h-28 flex-col justify-between gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-border transition hover:ring-sky/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98]",
              i === MUSCLE_GROUPS.length - 1 && "col-span-2 min-h-20",
            )}
          >
            <span className="font-display text-3xl leading-none font-bold">{g.label}</span>
            <span className="text-sm text-muted-foreground">{g.examples}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ExercisePicker({
  group,
  exercises,
  lastSets,
  onPick,
  onBack,
}: {
  group: MuscleGroup;
  exercises: ExerciseOut[];
  lastSets: Record<string, LastSet>;
  onPick: (exercise: ExerciseOut) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;
    // Weekly lifts and ones you've done before float to the top.
    return [...list].sort(
      (a, b) =>
        Number(b.weekly_eligible) - Number(a.weekly_eligible) ||
        Number(b.id in lastSets) - Number(a.id in lastSets) ||
        a.name.localeCompare(b.name),
    );
  }, [exercises, lastSets, query]);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="exercise-heading">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to muscle groups">
          <ArrowLeft />
        </Button>
        <h2 id="exercise-heading" className="font-display text-3xl font-bold">
          {MUSCLE_GROUP_LABEL[group]}
        </h2>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="h-11 rounded-xl pl-9"
        />
      </div>
      <ul className="flex flex-col rounded-2xl bg-surface ring-1 ring-border">
        {shown.map((e) => {
          const last = lastSets[e.id];
          return (
            <li key={e.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onPick(e)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-raised/60 focus-visible:bg-raised focus-visible:outline-none"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                  <span className="truncate">{e.name}</span>
                  {e.weekly_eligible && (
                    <Trophy className="size-3.5 shrink-0 text-tier-gold" aria-label="Counts for the weekly board" />
                  )}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {last
                    ? describeSet(
                        { weight_kg: last.weightKg, reps: last.reps, added_weight_kg: last.addedWeightKg },
                        e,
                      )
                    : "New"}
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No {MUSCLE_GROUP_LABEL[group].toLowerCase()} exercise matches “{query}”.
          </li>
        )}
      </ul>
    </section>
  );
}

function Stepper({
  id,
  label,
  value,
  onChange,
  step,
  min,
  inputMode,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min: number;
  inputMode: "decimal" | "numeric";
  suffix?: string;
}) {
  const nudge = (delta: number) => {
    const current = Number(value) || 0;
    const next = Math.max(min, Math.round((current + delta) * 100) / 100);
    onChange(String(next));
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-2xl bg-surface p-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-ring">
        <Button variant="secondary" size="icon-lg" className="size-12 rounded-xl" onClick={() => nudge(-step)} aria-label={`${label} minus ${step}`}>
          <Minus />
        </Button>
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <input
            id={id}
            type="number"
            inputMode={inputMode}
            step={step}
            min={min}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-w-0 bg-transparent text-center font-display text-5xl font-bold tabular-nums outline-none"
          />
          {suffix && <span className="text-muted-foreground">{suffix}</span>}
        </div>
        <Button variant="secondary" size="icon-lg" className="size-12 rounded-xl" onClick={() => nudge(step)} aria-label={`${label} plus ${step}`}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function SetEntry({
  exercise,
  bodyweightKg,
  lastSet,
  best,
  weight,
  reps,
  onWeight,
  onReps,
  canAdd,
  onAdd,
  onBack,
}: {
  exercise: ExerciseOut;
  bodyweightKg: number;
  lastSet: LastSet | undefined;
  best: number | undefined;
  weight: string;
  reps: string;
  onWeight: (v: string) => void;
  onReps: (v: string) => void;
  canAdd: boolean;
  onAdd: () => void;
  onBack: () => void;
}) {
  const isBodyweight = exercise.type === "bodyweight";

  return (
    <section className="flex flex-col gap-5" aria-labelledby="set-heading">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Pick a different exercise">
          <ArrowLeft />
        </Button>
        <div className="flex flex-col gap-1">
          <h2 id="set-heading" className="font-display text-3xl leading-none font-bold">
            {exercise.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {lastSet
              ? `Last time ${describeSet(
                  { weight_kg: lastSet.weightKg, reps: lastSet.reps, added_weight_kg: lastSet.addedWeightKg },
                  exercise,
                )}${best !== undefined ? `, best ${points(best)} points` : ""}`
              : "First time logging this one. It counts as your starting best."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stepper
          id="weight"
          label={isBodyweight ? "Added weight" : "Weight"}
          value={weight}
          onChange={onWeight}
          step={2.5}
          min={0}
          inputMode="decimal"
          suffix="kg"
        />
        <Stepper id="reps" label="Reps" value={reps} onChange={onReps} step={1} min={1} inputMode="numeric" />
      </div>

      <p className="text-sm text-faint">
        {isBodyweight
          ? `Your bodyweight (${kg(bodyweightKg)} kg) counts automatically. Add a belt or vest weight if you used one.`
          : Number(reps) > EPLEY_REP_CAP
            ? `Sets over ${EPLEY_REP_CAP} reps score the same as ${EPLEY_REP_CAP}. Heavier sets will move you further.`
            : "Your best set per exercise is what counts. Lighter sets are kept in your history."}
      </p>

      <Button size="xl" variant="secondary" onClick={onAdd} disabled={!canAdd}>
        <Plus />
        Add set
      </Button>
    </section>
  );
}

function SessionResult({
  result,
  exercises,
  bestPoints,
  ladder,
  onLogMore,
}: {
  result: Extract<LogSetsResult, { ok: true }>;
  exercises: ExerciseOut[];
  bestPoints: Record<string, number>;
  ladder: TierThreshold[];
  onLogMore: () => void;
}) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const { before, after, sets } = result;

  // A set is a new best if it beats everything before it, including earlier
  // sets in this same session. A first-ever log is its own case.
  const running = new Map(Object.entries(bestPoints));
  const marked = sets.map((set) => {
    const prev = running.get(set.exercise_id);
    const p = set.points ?? 0;
    const mark = prev === undefined ? "first" : p > prev ? "best" : null;
    if (prev === undefined || p > prev) running.set(set.exercise_id, p);
    return { set, mark };
  });

  const beforePos = before ? ladderPosition(ladder, before.bar_total) : null;
  const afterPos = after ? ladderPosition(ladder, after.bar_total) : null;
  const movedUp = beforePos && afterPos && afterPos.index > beforePos.index;
  const delta = before && after ? after.bar_total - before.bar_total : 0;
  const color = after ? TIER_COLOR[after.tier] : "var(--sky)";
  const newBests = marked.filter((m) => m.mark === "best").length;

  return (
    <div className="flex flex-col gap-8">
      <section className="relative flex flex-col items-center gap-4 overflow-hidden py-6 text-center" aria-live="polite">
        {movedUp && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -mt-28 -ml-28 size-56 animate-halo rounded-full"
            style={{ boxShadow: `0 0 0 6px ${color}, 0 0 60px 10px ${color}` }}
          />
        )}
        <p className="text-muted-foreground">
          {movedUp
            ? "You moved up"
            : newBests > 0
              ? `${newBests} new ${newBests === 1 ? "best" : "bests"}`
              : `Saved ${sets.length} ${sets.length === 1 ? "set" : "sets"}`}
        </p>
        {after && (
          <h1
            className={cn("font-display text-7xl leading-none font-extrabold", movedUp && "animate-emblem")}
            style={{ color }}
          >
            {bandLabel(after)}
          </h1>
        )}
        {before && after && (
          <p className="flex items-baseline gap-2 tabular-nums">
            <span className="text-muted-foreground">{points(before.bar_total)}</span>
            <span className="text-faint" aria-label="to">
              to
            </span>
            <span className="font-display text-3xl font-bold">{points(after.bar_total)}</span>
            {delta > 0.05 && <span className="font-medium text-tier-platinum">+{points(delta)}</span>}
          </p>
        )}
        {!movedUp && newBests === 0 && (
          <p className="max-w-xs text-sm text-muted-foreground">
            Your score moves when you beat a best. These are saved to your history.
          </p>
        )}
      </section>

      <ol className="flex flex-col rounded-2xl bg-surface ring-1 ring-border">
        {marked.map(({ set, mark }) => {
          const exercise = byId.get(set.exercise_id);
          return (
            <li key={set.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 font-medium">
                  <span className="truncate">{exercise?.name ?? "Exercise"}</span>
                  {mark === "best" && (
                    <span className="rounded-full bg-ember/15 px-2 py-0.5 text-xs font-semibold text-ember">
                      New best
                    </span>
                  )}
                  {mark === "first" && (
                    <span className="rounded-full bg-sky/15 px-2 py-0.5 text-xs font-medium text-sky">First log</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{describeSet(set, exercise)}</span>
              </div>
              {set.points !== null && (
                <span className="text-right tabular-nums">
                  <span className="block font-display text-2xl leading-none font-bold">{points(set.points)}</span>
                  <span className="text-xs text-faint">points</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="xl" onClick={onLogMore} className="sm:flex-1">
          Log more
        </Button>
        <Button size="xl" variant="secondary" asChild className="sm:flex-1">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
