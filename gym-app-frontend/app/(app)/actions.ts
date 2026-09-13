"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/session";

export async function signOutAction() {
  await signOut();
  redirect("/login");
}
