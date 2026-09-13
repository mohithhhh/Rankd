"use server";

import { redirect } from "next/navigation";
import { devLogin } from "@/lib/auth/session";

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

  await devLogin(userId);
  redirect("/");
}
