"use server";

import { api } from "@/lib/api/client";

function describeError(error: unknown, fallback: string): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg).filter(Boolean).join(", ") || fallback;
  }
  return fallback;
}

export type UpdateProfileState = { error: string } | { success: true } | undefined;

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const username = String(formData.get("username") ?? "").trim();
  const bodyweightKg = Number(formData.get("bodyweight_kg"));

  if (!username) return { error: "Enter a username." };
  if (!Number.isFinite(bodyweightKg) || bodyweightKg <= 0) {
    return { error: "Enter a valid bodyweight." };
  }

  const { error, response } = await api.PATCH("/users/me", {
    body: { username, bodyweight_kg: bodyweightKg },
  });

  if (!response.ok) {
    return { error: describeError(error, "Something went wrong.") };
  }

  return { success: true };
}
