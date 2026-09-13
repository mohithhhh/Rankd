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
      className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
      aria-label="Active gym"
    >
      {gyms.map((gym) => (
        <option key={gym.id} value={gym.id}>
          {gym.name}
        </option>
      ))}
    </select>
  );
}
