import "server-only";
import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile, getMyMemberships } from "@/lib/api/resources";
import type { components } from "@/lib/api/schema";

type UserOut = components["schemas"]["UserOut"];
type MembershipOut = components["schemas"]["MembershipOut"];

export type OnboardedUser = {
  user: UserOut;
  memberships: MembershipOut[];
};

/**
 * The single gatekeeper for every route under (app) - mirrors the backend's
 * own single-gatekeeper pattern (require_membership in
 * gym-app-backend/app/services/memberships.py). Redirects instead of
 * returning null so callers never have to re-check.
 */
export async function requireOnboardedUser(): Promise<OnboardedUser> {
  if (!(await hasSession())) {
    redirect("/login");
  }

  const user = await getMyProfile();
  if (user === null) {
    redirect("/onboarding");
  }

  const memberships = await getMyMemberships();
  if (memberships.length === 0) {
    redirect("/gyms/join");
  }

  return { user, memberships };
}
