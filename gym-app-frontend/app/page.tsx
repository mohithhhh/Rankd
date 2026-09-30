import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile, getMyMemberships } from "@/lib/api/resources";
import { getPendingJoinCode } from "@/lib/auth/pending-join";

export default async function RootPage() {
  if (!(await hasSession())) {
    redirect("/login");
  }

  const user = await getMyProfile();
  if (user === null) {
    redirect("/onboarding");
  }

  // Both sign-in paths land here right after auth (Google's callback and the
  // dev bypass), which is why this is the one place that checks for a code
  // stashed before sign-in (lib/auth/pending-join.ts) - /join/[code] takes it
  // from here (already-a-member vs. needs-to-join vs. invalid code).
  const pendingJoinCode = await getPendingJoinCode();
  if (pendingJoinCode) {
    redirect(`/join/${pendingJoinCode}`);
  }

  const memberships = await getMyMemberships();
  if (memberships.length === 0) {
    redirect("/gyms/join");
  }

  redirect("/dashboard");
}
