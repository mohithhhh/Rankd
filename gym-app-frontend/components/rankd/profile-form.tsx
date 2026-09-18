"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, type UpdateProfileState } from "@/app/(app)/profile/actions";
import type { components } from "@/lib/api/schema";

type UserOut = components["schemas"]["UserOut"];

export function ProfileForm({ user }: { user: UserOut }) {
  const [state, action, pending] = useActionState<UpdateProfileState, FormData>(
    updateProfileAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={user.username} required autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Email</Label>
        <p className="text-sm text-muted">{user.email}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Sex</Label>
        <p className="text-sm text-muted capitalize">{user.sex}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bodyweight_kg">Bodyweight (kg)</Label>
        <Input
          id="bodyweight_kg"
          name="bodyweight_kg"
          type="number"
          step="0.1"
          min="1"
          defaultValue={user.bodyweight_kg}
          required
        />
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-accent">Saved.</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
