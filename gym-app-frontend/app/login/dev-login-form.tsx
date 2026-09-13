"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { devLoginAction, type DevLoginState } from "./actions";

export function DevLoginForm({ defaultUserId }: { defaultUserId: string }) {
  const [state, action, pending] = useActionState<DevLoginState, FormData>(
    devLoginAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="user_id">Dev user id</Label>
        <Input id="user_id" name="user_id" defaultValue={defaultUserId} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Continue as this user"}
      </Button>
    </form>
  );
}
