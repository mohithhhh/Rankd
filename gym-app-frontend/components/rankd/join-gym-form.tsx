"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinGymAction, type JoinGymState } from "@/app/gyms/join/actions";

export function JoinGymForm() {
  const [state, action, pending] = useActionState<JoinGymState, FormData>(joinGymAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="join_code">Join code</Label>
        <Input
          id="join_code"
          name="join_code"
          placeholder="ABCD1234"
          className="uppercase tracking-widest"
          maxLength={8}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Joining…" : "Join gym"}
      </Button>
    </form>
  );
}
