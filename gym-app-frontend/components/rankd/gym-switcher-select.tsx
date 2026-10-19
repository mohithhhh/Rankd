"use client";

import { useRouter } from "next/navigation";

export function GymSwitcherSelect({
  gyms,
  activeGymId,
  hrefTemplate,
}: {
  gyms: { id: string; name: string }[];
  activeGymId: string;
  /** Contains the literal placeholder "GYM_ID", e.g. "/gyms/GYM_ID/leaderboard". */
  hrefTemplate: string;
}) {
  const router = useRouter();

  return (
    <select
      value={activeGymId}
      onChange={(e) => router.push(hrefTemplate.replace("GYM_ID", e.target.value))}
      className="h-9 max-w-40 shrink-0 rounded-full border border-input bg-surface px-3 text-sm"
      aria-label="Switch gym"
    >
      {gyms.map((gym) => (
        <option key={gym.id} value={gym.id}>
          {gym.name}
        </option>
      ))}
    </select>
  );
}
