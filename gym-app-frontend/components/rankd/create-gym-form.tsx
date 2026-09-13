"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createGymAction, type CreateGymState } from "@/app/gyms/join/actions";

export function CreateGymForm() {
  const [state, action, pending] = useActionState<CreateGymState, FormData>(
    createGymAction,
    undefined,
  );

  if (state && "success" in state) {
    return (
      <div className="flex flex-col gap-4">
        <Alert className="border-accent/40 bg-accent/10">
          <AlertTitle>{state.gymName} is live</AlertTitle>
          <AlertDescription>
            This join code is shown once — save it before continuing.
          </AlertDescription>
        </Alert>
        <p className="rounded-md border border-border bg-surface px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] tabular-nums">
          {state.joinCode}
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard">Continue to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Gym name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create gym"}
      </Button>
    </form>
  );
}
