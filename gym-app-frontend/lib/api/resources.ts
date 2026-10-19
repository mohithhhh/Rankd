import { api } from "@/lib/api/client";

/**
 * Thin named wrappers - only for calls made from 3+ places (route guards,
 * dashboard, log, history, profile). Everything else calls `api.GET(...)`
 * inline in its own page.
 */

export async function getMyProfile() {
  const { data, response } = await api.GET("/users/me");
  if (response.status === 404) return null;
  return data ?? null;
}

export async function getMyMemberships() {
  const { data } = await api.GET("/memberships/me");
  return data ?? [];
}

export async function getGymWithId(gymId: string) {
  const { data, response } = await api.GET("/gyms/{gym_id}", {
    params: { path: { gym_id: gymId } },
  });
  if (response.status === 404) return null;
  return data ?? null;
}

export async function getTierThresholds() {
  const { data } = await api.GET("/tiers/thresholds");
  return data ?? [];
}

export async function getExercises() {
  const { data } = await api.GET("/exercises");
  return data ?? [];
}

export async function getMyLoggedSets() {
  const { data } = await api.GET("/logged-sets/me");
  return data ?? [];
}

export async function getUserTier(userId: string) {
  const { data } = await api.GET("/users/{user_id}/tier", {
    params: { path: { user_id: userId } },
  });
  return data ?? null;
}
