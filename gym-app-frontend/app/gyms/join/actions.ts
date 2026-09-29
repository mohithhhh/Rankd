"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";

function describeError(error: unknown, fallback: string): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg).filter(Boolean).join(", ") || fallback;
  }
  return fallback;
}

export type JoinGymState = { error?: string } | undefined;

export async function joinGymAction(
  _prevState: JoinGymState,
  formData: FormData,
): Promise<JoinGymState> {
  const joinCode = String(formData.get("join_code") ?? "")
    .trim()
    .toUpperCase();
  if (!joinCode) return { error: "Enter a join code." };

  const { data, error, response } = await api.POST("/memberships/join", {
    body: { join_code: joinCode },
  });

  // A fresh join goes to the starter-lifts step so the first screen is a real tier.
  if (response.ok && data) {
    redirect(`/starter-lifts?gymId=${data.gym_id}`);
  }

  // 409 means the desired end state already holds (you're a member) - not a
  // failure. Without this, a double-submit (or a stale page after joining
  // successfully once) shows a scary error instead of just continuing on.
  if (response.status === 409) {
    redirect("/dashboard");
  }

  const fallback = response.status === 404 ? "Invalid join code." : "Something went wrong.";
  return { error: describeError(error, fallback) };
}
