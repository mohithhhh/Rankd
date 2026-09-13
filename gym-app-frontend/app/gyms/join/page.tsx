import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile, getMyMemberships } from "@/lib/api/resources";
import { JoinGymForm } from "@/components/rankd/join-gym-form";
import { CreateGymForm } from "@/components/rankd/create-gym-form";

export default async function JoinGymPage() {
  if (!(await hasSession())) redirect("/login");
  if ((await getMyProfile()) === null) redirect("/onboarding");
  if ((await getMyMemberships()).length > 0) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm border-border/80">
        <CardHeader>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">RankD</p>
          <CardTitle className="text-2xl">Find your gym</CardTitle>
          <CardDescription>Join with a code from a member, or start a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="join">
            <TabsList className="w-full">
              <TabsTrigger value="join" className="flex-1">
                Join with code
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1">
                Create a gym
              </TabsTrigger>
            </TabsList>
            <TabsContent value="join" className="pt-4">
              <JoinGymForm />
            </TabsContent>
            <TabsContent value="create" className="pt-4">
              <CreateGymForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
