import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { getExercises, getGymWithId, getMyLoggedSets, getTierThresholds } from "@/lib/api/resources";
import { bestPointsByExercise } from "@/lib/format";
import { LogSession, type LastSet } from "./log-session";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ gymId?: string }>;
}) {
  const { user, memberships } = await requireOnboardedUser();
  const { gymId } = await searchParams;

  const [exercises, sets, ladder, gyms] = await Promise.all([
    getExercises(),
    getMyLoggedSets(),
    getTierThresholds(),
    Promise.all(
      memberships.map(async (m) => ({
        id: m.gym_id,
        name: (await getGymWithId(m.gym_id))?.name ?? "Unknown gym",
      })),
    ),
  ]);

  // /logged-sets/me is newest first, so the first hit per exercise is the last set.
  const lastSets: Record<string, LastSet> = {};
  for (const set of sets) {
    lastSets[set.exercise_id] ??= {
      weightKg: set.weight_kg,
      reps: set.reps,
      addedWeightKg: set.added_weight_kg,
    };
  }

  return (
    <LogSession
      gyms={gyms}
      initialGymId={gyms.find((g) => g.id === gymId)?.id ?? gyms[0].id}
      exercises={exercises}
      bestPoints={Object.fromEntries(bestPointsByExercise(sets))}
      lastSets={lastSets}
      ladder={ladder}
      bodyweightKg={user.bodyweight_kg}
    />
  );
}
