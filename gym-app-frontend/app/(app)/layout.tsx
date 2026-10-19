import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { AppShell } from "@/components/rankd/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { memberships } = await requireOnboardedUser();

  return <AppShell primaryGymId={memberships[0].gym_id}>{children}</AppShell>;
}
