"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type OnboardingState = { error?: string } | undefined;

function describeError(error: unknown): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg).filter(Boolean).join(", ");
  }
  return "Something went wrong. Please try again.";
}

export async function createProfileAction(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const username = String(formData.get("username") ?? "").trim();
  const sex = formData.get("sex") as components["schemas"]["Sex"];
  const bodyweightKg = Number(formData.get("bodyweight_kg"));

  if (!username) return { error: "Enter a username." };
  if (sex !== "male" && sex !== "female") return { error: "Select a sex." };
  if (!Number.isFinite(bodyweightKg) || bodyweightKg <= 0) {
    return { error: "Enter a valid bodyweight." };
  }

  const { error, response } = await api.POST("/users/me", {
    body: { username, sex, bodyweight_kg: bodyweightKg },
  });

  if (!response.ok) {
    return { error: describeError(error) };
  }

  redirect("/gyms/join");
}
