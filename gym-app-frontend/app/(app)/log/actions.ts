"use server";

import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type LoggedSetOut = components["schemas"]["LoggedSetOut"];

function describeError(error: unknown, fallback: string): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d as { msg?: string }).msg).filter(Boolean).join(", ") || fallback;
  }
  return fallback;
}

export type LogSetState = { error: string } | { success: true; logged: LoggedSetOut } | undefined;

export async function logSetAction(
  _prevState: LogSetState,
  formData: FormData,
): Promise<LogSetState> {
  const gymId = String(formData.get("gym_id") ?? "");
  const exerciseId = String(formData.get("exercise_id") ?? "");
  const isBodyweight = formData.get("exercise_type") === "bodyweight";
  const clientRequestId = String(formData.get("client_request_id") ?? "");

  if (!exerciseId) return { error: "Pick an exercise first." };

  const reps = Number(formData.get("reps"));
  if (!Number.isFinite(reps) || reps <= 0) return { error: "Enter a valid rep count." };

  // Bodyweight exercises ignore weight_kg entirely in scoring (bodyweight +
  // added_weight_kg is the effective load instead) - see scoring.py - so
  // there's no visible weight_kg field for them and we submit 0.
  const weightKg = isBodyweight ? 0 : Number(formData.get("weight_kg"));
  if (!isBodyweight && (!Number.isFinite(weightKg) || weightKg < 0)) {
    return { error: "Enter a valid weight." };
  }

  const addedWeightRaw = formData.get("added_weight_kg");
  const addedWeightKg =
    isBodyweight && addedWeightRaw ? Number(addedWeightRaw) : undefined;
  if (addedWeightKg !== undefined && (!Number.isFinite(addedWeightKg) || addedWeightKg < 0)) {
    return { error: "Enter a valid added weight." };
  }

  const { data, error, response } = await api.POST("/logged-sets", {
    body: {
      gym_id: gymId,
      exercise_id: exerciseId,
      weight_kg: weightKg,
      reps,
      added_weight_kg: addedWeightKg,
      client_request_id: clientRequestId,
    },
  });

  if (!response.ok || !data) {
    return { error: describeError(error, "Something went wrong.") };
  }

  return { success: true, logged: data };
}
