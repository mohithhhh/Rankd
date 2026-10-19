import Link from "next/link";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile, getMyMemberships } from "@/lib/api/resources";
import { AuthFrame } from "@/components/rankd/auth-frame";
import { JoinGymForm } from "@/components/rankd/join-gym-form";
import { CreateGymForm } from "@/components/rankd/create-gym-form";

export default async function JoinGymPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  if (!(await hasSession())) redirect("/login");
  if ((await getMyProfile()) === null) redirect("/onboarding");
  // ?add=1 is the "join another gym" path from the profile page; without it,
  // anyone who already has a gym has finished setup and belongs on the dashboard.
  const { add } = await searchParams;
  const hasGym = (await getMyMemberships()).length > 0;
  if (hasGym && add !== "1") redirect("/dashboard");

  const trigger = "h-full rounded-full data-active:bg-raised data-active:text-tint";

  return (
    <AuthFrame
      title={hasGym ? "Add a gym" : "Find your gym"}
      description="Rankings are per gym. Join yours with the code from a member, or start one and invite the others."
    >
      <Tabs defaultValue="join" className="gap-5">
        <TabsList className="h-11 w-full rounded-full bg-background p-1 ring-1 ring-border">
          <TabsTrigger value="join" className={trigger}>
            Join with code
          </TabsTrigger>
          <TabsTrigger value="create" className={trigger}>
            Create a gym
          </TabsTrigger>
        </TabsList>
        <TabsContent value="join">
          <JoinGymForm />
        </TabsContent>
        <TabsContent value="create">
          <CreateGymForm />
        </TabsContent>
      </Tabs>
      {hasGym && (
        <Link href="/profile" className="text-center text-sm text-sky hover:text-tint hover:underline">
          Back to profile
        </Link>
      )}
    </AuthFrame>
  );
}
