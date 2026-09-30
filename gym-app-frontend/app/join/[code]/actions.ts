"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { clearPendingJoinCode } from "@/lib/auth/pending-join";

function describeError(error: unknown, fallback: string): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg).filter(Boolean).join(", ") || fallback;
  }
  return fallback;
}

export type ConfirmJoinState = { error: string } | undefined;

/**
 * Bound with (code, gymId) from the page - both already known from the
 * public gym-by-code lookup that rendered the confirm button, so neither
 * needs to round-trip through the join response.
 */
export async function confirmJoinAction(
  code: string,
  gymId: string,
  _prevState: ConfirmJoinState,
  _formData: FormData,
): Promise<ConfirmJoinState> {
  const { response, error } = await api.POST("/memberships/join", {
    body: { join_code: code },
  });

  // 409 = already a member (a race, or a re-scan mid-flow) - not a failure.
  if (response.ok || response.status === 409) {
    await clearPendingJoinCode();
    redirect(response.ok ? `/starter-lifts?gymId=${gymId}` : `/log?gymId=${gymId}`);
  }

  return { error: describeError(error, "Something went wrong joining this gym.") };
}
