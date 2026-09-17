import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GymSwitcher } from "@/components/rankd/gym-switcher";
import { LogLiftForm } from "@/components/rankd/log-lift-form";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ gymId?: string }>;
}) {
  const { memberships } = await requireOnboardedUser();
  const { gymId } = await searchParams;
  const activeGymId = gymId ?? memberships[0].gym_id;

  const { data: exercises } = await api.GET("/exercises");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Log a lift</h1>
        <GymSwitcher
          memberships={memberships}
          activeGymId={activeGymId}
          hrefTemplate="/log?gymId=GYM_ID"
        />
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted uppercase tracking-wide">
            What are you training today?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LogLiftForm gymId={activeGymId} exercises={exercises ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
