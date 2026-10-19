import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { getExercises, getGymWithId, getMyLoggedSets } from "@/lib/api/resources";
import { cn } from "@/lib/utils";
import { describeSet, MUSCLE_GROUPS, points } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rankd/empty-state";
import type { components } from "@/lib/api/schema";

type MuscleGroup = components["schemas"]["MuscleGroup"];
type LoggedSetOut = components["schemas"]["LoggedSetOut"];

// ponytail: days are bucketed in the server's timezone (UTC on Render), so a
// late-evening set can land on the next day; pass the viewer's tz if that bites.
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function dayLabel(key: string): string {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { memberships } = await requireOnboardedUser();
  const { group } = await searchParams;
  const activeGroup = MUSCLE_GROUPS.find((g) => g.id === group)?.id as MuscleGroup | undefined;

  const [sets, exercises, gyms] = await Promise.all([
    getMyLoggedSets(),
    getExercises(),
    // Gym names only matter when you train at more than one.
    memberships.length > 1
      ? Promise.all(
          memberships.map(async (m) => [m.gym_id, (await getGymWithId(m.gym_id))?.name] as const),
        )
      : [],
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const gymNames = new Map(gyms);

  // Walk oldest to newest so "new best" means best at the time it was lifted.
  const marks = new Map<string, "first" | "best">();
  const running = new Map<string, number>();
  for (const set of [...sets].reverse()) {
    if (set.points === null) continue;
    const prev = running.get(set.exercise_id);
    if (prev === undefined) marks.set(set.id, "first");
    else if (set.points > prev) marks.set(set.id, "best");
    if (prev === undefined || set.points > prev) running.set(set.exercise_id, set.points);
  }

  const visible = activeGroup
    ? sets.filter((s) => byId.get(s.exercise_id)?.muscle_group === activeGroup)
    : sets;
  const days = new Map<string, LoggedSetOut[]>();
  for (const set of visible) {
    const key = dayKey(set.logged_at);
    days.set(key, [...(days.get(key) ?? []), set]);
  }
  const bestCount = [...marks.values()].filter((m) => m === "best").length;

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-5xl leading-none font-extrabold">History</h1>
        {sets.length > 0 && (
          <p className="text-muted-foreground">
            {sets.length} sets, {running.size} exercises, {bestCount} new bests along the way
          </p>
        )}
      </header>

      {sets.length === 0 ? (
        <EmptyState
          message="Nothing logged yet. Your first set on each exercise becomes your starting best."
          action={
            <Button asChild>
              <Link href="/log">Log a lift</Link>
            </Button>
          }
        />
      ) : (
        <>
          <nav aria-label="Filter by muscle group" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[{ id: undefined, label: "All" }, ...MUSCLE_GROUPS].map((g) => (
              <Link
                key={g.label}
                href={g.id ? `/history?group=${g.id}` : "/history"}
                aria-current={activeGroup === g.id ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm ring-1 transition-colors",
                  activeGroup === g.id
                    ? "bg-tint font-medium text-background ring-tint"
                    : "text-muted-foreground ring-border hover:text-tint",
                )}
              >
                {g.label}
              </Link>
            ))}
          </nav>

          {days.size === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No sets in this group yet.</p>
          )}

          {[...days].map(([key, daySets]) => (
            <section key={key} className="flex flex-col gap-2" aria-label={dayLabel(key)}>
              <h2 className="font-display text-xl font-bold text-muted-foreground">{dayLabel(key)}</h2>
              <ol className="flex flex-col rounded-2xl bg-surface ring-1 ring-border">
                {daySets.map((set) => {
                  const exercise = byId.get(set.exercise_id);
                  const mark = marks.get(set.id);
                  return (
                    <li
                      key={set.id}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="truncate">{exercise?.name ?? "Exercise"}</span>
                          {mark === "best" && (
                            <span className="shrink-0 rounded-full bg-ember/15 px-2 py-0.5 text-xs font-semibold text-ember">
                              New best
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {describeSet(set, exercise)}
                          {gymNames.get(set.gym_id) && ` at ${gymNames.get(set.gym_id)}`}
                        </span>
                      </div>
                      {set.points !== null && (
                        <span className="font-display text-xl font-bold tabular-nums">{points(set.points)}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
