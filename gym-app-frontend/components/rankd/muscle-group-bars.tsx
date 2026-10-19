import { MUSCLE_GROUPS, points } from "@/lib/format";
import type { components } from "@/lib/api/schema";

type MuscleGroup = components["schemas"]["MuscleGroup"];

/**
 * Each group's share of bar_total. Bars are scaled against `fullScale` - the
 * Olympian line split evenly over the five groups - so a full bar means that
 * group alone is pulling its weight at the top of the ladder.
 */
export function MuscleGroupBars({
  contributions,
  fullScale,
}: {
  contributions: Map<MuscleGroup, number>;
  fullScale: number;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {MUSCLE_GROUPS.map((group) => {
        const value = contributions.get(group.id);
        return (
          <li key={group.id} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{group.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              {value !== undefined && (
                <div
                  className="h-full origin-left animate-rung-fill rounded-full bg-sky"
                  style={{ width: `${Math.min(100, (value / fullScale) * 100)}%` }}
                />
              )}
            </div>
            <span className="text-right tabular-nums">
              {value !== undefined ? points(value) : <span className="text-faint">None</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
