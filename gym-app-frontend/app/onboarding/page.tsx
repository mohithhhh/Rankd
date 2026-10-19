import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/api/resources";
import { AuthFrame } from "@/components/rankd/auth-frame";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  if (!(await hasSession())) redirect("/login");
  if ((await getMyProfile()) !== null) redirect("/gyms/join");

  return (
    <AuthFrame
      title="Set up your profile"
      description="Scores are adjusted for bodyweight, so a 60 kg lifter and a 100 kg lifter compete fairly. Enter your current lifts after this and you start at your real tier."
    >
      <OnboardingForm />
    </AuthFrame>
  );
}
