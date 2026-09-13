import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { AppShell } from "@/components/rankd/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships } = await requireOnboardedUser();

  return (
    <AppShell username={user.username} primaryGymId={memberships[0].gym_id}>
      {children}
    </AppShell>
  );
}
