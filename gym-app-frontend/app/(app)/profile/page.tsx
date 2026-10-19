import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require-onboarded-user";
import { getGymWithId, getTierThresholds, getUserTier } from "@/lib/api/resources";
import { bandLabel, ladderPosition, TIER_COLOR } from "@/lib/tiers";
import { points } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TierLadder } from "@/components/rankd/tier-ladder";
import { Avatar } from "@/components/rankd/gym-leaderboard";
import { signOutAction } from "@/app/(app)/actions";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { user, memberships } = await requireOnboardedUser();

  const [tier, ladder, gyms] = await Promise.all([
    getUserTier(user.id),
    getTierThresholds(),
    Promise.all(memberships.map(async (m) => ({ membership: m, gym: await getGymWithId(m.gym_id) }))),
  ]);
  const position = tier ? ladderPosition(ladder, tier.bar_total) : null;
  const color = tier ? TIER_COLOR[tier.tier] : undefined;

  return (
    <div className="flex flex-col gap-10 animate-rise">
      <header className="flex items-center gap-4">
        <Avatar username={user.username} color={color} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-4xl leading-none font-extrabold">{user.username}</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </header>

      {tier && position && (
        <section className="flex flex-col gap-4 rounded-3xl bg-surface p-5 ring-1 ring-border" aria-label="Your tier">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-4xl font-extrabold" style={{ color }}>
              {bandLabel(tier)}
            </p>
            <p className="tabular-nums text-muted-foreground">
              <span className="font-display text-2xl font-bold text-tint">{points(tier.bar_total)}</span> points
            </p>
          </div>
          <TierLadder ladder={ladder} position={position} />
        </section>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-display text-2xl font-bold">
          Your details
        </h2>
        <ProfileForm username={user.username} bodyweightKg={user.bodyweight_kg} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="gyms-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="gyms-heading" className="font-display text-2xl font-bold">
            Your gyms
          </h2>
          <Link href="/gyms/join?add=1" className="text-sm text-sky hover:text-tint hover:underline">
            Join or create a gym
          </Link>
        </div>
        <ul className="flex flex-col rounded-2xl bg-surface ring-1 ring-border">
          {gyms.map(({ membership, gym }) => (
            <li key={membership.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/gyms/${membership.gym_id}/leaderboard`} className="truncate font-medium hover:underline">
                  {gym?.name ?? "Unknown gym"}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {gym?.city}
                  {membership.role === "admin" && ", you run this gym"}
                </span>
              </div>
              {gym?.join_code && (
                <span className="text-right">
                  <span className="block text-xs text-faint">Join code</span>
                  <span className="font-mono text-base tracking-[0.2em] select-all">{gym.join_code}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="lg" className="px-4">
          <LogOut />
          Sign out
        </Button>
      </form>
    </div>
  );
}
