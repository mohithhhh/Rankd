import { getGymWithId } from "@/lib/api/resources";
import type { components } from "@/lib/api/schema";
import { GymSwitcherSelect } from "@/components/rankd/gym-switcher-select";

type MembershipOut = components["schemas"]["MembershipOut"];

export async function GymSwitcher({
  memberships,
  activeGymId,
  hrefTemplate,
}: {
  memberships: MembershipOut[];
  activeGymId: string;
  /** Contains the literal placeholder "GYM_ID", e.g. "/gyms/GYM_ID/leaderboard". */
  hrefTemplate: string;
}) {
  if (memberships.length <= 1) return null;

  const gyms = await Promise.all(
    memberships.map(async (m) => {
      const gym = await getGymWithId(m.gym_id);
      return { id: m.gym_id, name: gym?.name ?? "Unknown gym" };
    }),
  );

  return <GymSwitcherSelect gyms={gyms} activeGymId={activeGymId} hrefTemplate={hrefTemplate} />;
}
