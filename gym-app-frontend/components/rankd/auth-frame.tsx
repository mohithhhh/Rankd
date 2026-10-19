import { TierLadder } from "@/components/rankd/tier-ladder";
import type { Tier, TierThreshold } from "@/lib/tiers";

// Decorative only: the real bands come from /tiers/thresholds, which needs a
// session. Shape matches seed.py (three sub-levels per tier, one Olympian).
const ART_LADDER: TierThreshold[] = (
  ["bronze", "silver", "gold", "platinum", "diamond"] as Tier[]
)
  .flatMap((tier) => [3, 2, 1].map((sub_level) => ({ tier, sub_level, min_points: 0 })))
  .concat({ tier: "olympian", sub_level: 1, min_points: 0 });

/** Shared frame for the signed-out and setup screens. */
export function AuthFrame({
  title,
  description,
  showLadder = false,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  showLadder?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-8 animate-rise">
        <div className="flex flex-col gap-3">
          <p className="font-display text-6xl leading-none font-extrabold">RankD</p>
          {showLadder && (
            <>
              <p className="text-lg text-muted-foreground">
                Log your lifts. Climb from Bronze to Olympian. See where you stand at your gym.
              </p>
              <TierLadder ladder={ART_LADDER} position={null} className="mt-2" />
            </>
          )}
        </div>
        <section className="flex flex-col gap-5 rounded-3xl bg-surface p-6 ring-1 ring-border">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-3xl font-bold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
