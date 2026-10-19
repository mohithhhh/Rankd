"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { describeError } from "@/lib/api/errors";
import { getMyProfile, getUserTier } from "@/lib/api/resources";
import type { components } from "@/lib/api/schema";

type LoggedSetCreate = components["schemas"]["LoggedSetCreate"];
type LoggedSetOut = components["schemas"]["LoggedSetOut"];
type TierOut = components["schemas"]["TierOut"];

export type LogSetsResult =
  | { ok: true; sets: LoggedSetOut[]; before: TierOut | null; after: TierOut | null }
  | { ok: false; error: string };

/**
 * Saves a whole session in one bulk call. client_request_id is minted on the
 * client when each set is added (not here), so retrying after a dropped
 * connection replays the same rows instead of duplicating them.
 */
export async function logSetsAction(items: LoggedSetCreate[]): Promise<LogSetsResult> {
  if (items.length === 0) return { ok: false, error: "Add at least one set first." };

  const user = await getMyProfile();
  if (user === null) return { ok: false, error: "Finish your profile before logging." };

  const before = await getUserTier(user.id);
  const { data, error, response } = await api.POST("/logged-sets/bulk", { body: { items } });
  if (!response.ok || !data) {
    return { ok: false, error: describeError(error, "Couldn't save your sets. Try again.") };
  }
  const after = await getUserTier(user.id);

  revalidatePath("/", "layout");
  return { ok: true, sets: data, before, after };
}
