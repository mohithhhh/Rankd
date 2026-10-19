"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { describeError } from "@/lib/api/errors";

export type ProfileState = { error?: string; saved?: boolean } | undefined;

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const username = String(formData.get("username") ?? "").trim();
  const bodyweightKg = Number(formData.get("bodyweight_kg"));

  if (!username) return { error: "Enter a username." };
  if (!Number.isFinite(bodyweightKg) || bodyweightKg < 20 || bodyweightKg > 400) {
    return { error: "Enter your bodyweight in kg, between 20 and 400." };
  }

  const { error, response } = await api.PATCH("/users/me", {
    body: { username, bodyweight_kg: bodyweightKg },
  });
  if (!response.ok) return { error: describeError(error, "Couldn't save your profile. Try again.") };

  revalidatePath("/", "layout");
  return { saved: true };
}
