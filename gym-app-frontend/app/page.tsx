import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile, getMyMemberships } from "@/lib/api/resources";

export default async function RootPage() {
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

  redirect("/dashboard");
}
