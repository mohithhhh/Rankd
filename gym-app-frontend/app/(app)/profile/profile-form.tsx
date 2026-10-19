"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, type ProfileState } from "./actions";

export function ProfileForm({ username, bodyweightKg }: { username: string; bodyweightKg: number }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" defaultValue={username} required className="h-11 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bodyweight_kg">Bodyweight (kg)</Label>
          <Input
            id="bodyweight_kg"
            name="bodyweight_kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            defaultValue={bodyweightKg}
            required
            className="h-11 rounded-xl"
          />
        </div>
      </div>
      <p className="text-sm text-faint">
        A new bodyweight applies to lifts you log from now on. Past lifts keep the bodyweight you had
        when you lifted them.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.saved && !pending && <p className="text-sm text-tier-platinum">Profile saved.</p>}
      <Button type="submit" size="lg" disabled={pending} className="self-start px-4">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
