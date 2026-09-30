"use server";

import { redirect } from "next/navigation";
import { devLogin } from "@/lib/auth/session";
import { stashPendingJoinCode } from "@/lib/auth/pending-join";

export type DevLoginState = { error?: string } | undefined;

export async function devLoginAction(
  _prevState: DevLoginState,
  formData: FormData,
): Promise<DevLoginState> {
  const userId = String(formData.get("user_id") ?? "").trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId)) {
    return { error: "Enter a valid UUID (the backend's X-Dev-User-Id)." };
  }

  const joinCode = formData.get("join_code");
  if (typeof joinCode === "string" && joinCode) await stashPendingJoinCode(joinCode);

  await devLogin(userId);
  redirect("/");
}
