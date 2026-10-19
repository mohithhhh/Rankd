"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGymAction, type CreateGymState } from "@/app/gyms/join/actions";

export function CreateGymForm() {
  const [state, action, pending] = useActionState<CreateGymState, FormData>(
    createGymAction,
    undefined,
  );

  if (state && "success" in state) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-display text-2xl font-bold">{state.gymName} is set up</p>
          <p className="text-sm text-muted-foreground">
            Share this code so members can join. You can find it again on your profile.
          </p>
        </div>
        <p className="rounded-xl bg-background px-4 py-4 text-center font-mono text-3xl tracking-[0.3em] ring-1 ring-ember/50 select-all">
          {state.joinCode}
        </p>
        <Button asChild size="xl" className="w-full">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Gym name</Label>
        <Input id="name" name="name" required className="h-11 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" required className="h-11 rounded-xl" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="xl" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create gym"}
      </Button>
    </form>
  );
}
