import { api } from "@/lib/api/client";

/**
 * Thin named wrappers - only for calls made from 3+ places with the same
 * not-found branching (root redirect waterfall, (app) layout guard, profile
 * page). Everything else calls `api.GET(...)` inline in its own page.
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
