import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/components/rankd/tier-badge";
import { ProfileForm } from "@/components/rankd/profile-form";

export default async function ProfilePage() {
  const { user } = await requireOnboardedUser();
  const { data: tier } = await api.GET("/users/{user_id}/tier", {
    params: { path: { user_id: user.id } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your profile</h1>
        {tier && <TierBadge tier={tier.tier} subLevel={tier.sub_level} size="lg" />}
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted uppercase tracking-wide">
            Account details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
