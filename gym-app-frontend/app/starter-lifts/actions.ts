"use server";

import { api } from "@/lib/api/client";
import { getMyProfile } from "@/lib/api/resources";
import { parseStarterLifts } from "@/lib/starter-lifts";
import type { components } from "@/lib/api/schema";

type LoggedSetOut = components["schemas"]["LoggedSetOut"];
type TierOut = components["schemas"]["TierOut"];

function describeError(error: unknown, fallback: string): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg).filter(Boolean).join(", ") || fallback;
  }
  return fallback;
}

export type StarterLiftsState =
  | { error: string }
  | {
      success: true;
      logged: LoggedSetOut[];
      /** null only if the tier lookup failed after the lifts were saved. */
      tier: TierOut | null;
      /** null if the user isn't among the leaderboard's top entries. */
      gymRank: number | null;
    }
  | undefined;

export async function submitStarterLiftsAction(
  _prevState: StarterLiftsState,
  formData: FormData,
): Promise<StarterLiftsState> {
  const gymId = String(formData.get("gym_id") ?? "");
  if (!gymId) return { error: "Missing gym. Go back and try again." };

  const { data: exercises } = await api.GET("/exercises");
  if (!exercises) return { error: "Couldn't load exercises. Try again." };

  const parsed = parseStarterLifts(formData, gymId, exercises);
  if (!parsed.ok) return { error: parsed.error };

  // Not atomic on the backend (each item commits on its own), but every item
  // carries an idempotency key, so retrying the same form replays what already
  // saved instead of duplicating it.
  const { data: logged, error, response } = await api.POST("/logged-sets/bulk", {
    body: { items: parsed.items },
  });
  if (!response.ok || !logged) {
    return { error: describeError(error, "Something went wrong saving your lifts.") };
  }

  // Lifts are saved at this point, so a failed lookup below must not turn into
  // an error the user would "fix" by resubmitting - degrade the reveal instead.
  const user = await getMyProfile();
  const [tierResult, boardResult] = user
    ? await Promise.all([
        api.GET("/users/{user_id}/tier", { params: { path: { user_id: user.id } } }),
        api.GET("/gyms/{gym_id}/leaderboard", { params: { path: { gym_id: gymId } } }),
      ])
    : [undefined, undefined];

  const gymRank = boardResult?.data?.find((entry) => entry.user_id === user?.id)?.rank ?? null;

  return { success: true, logged, tier: tierResult?.data ?? null, gymRank };
}
