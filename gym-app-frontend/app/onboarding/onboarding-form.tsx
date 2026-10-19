"use client";

import { useActionState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProfileAction, type OnboardingState } from "./actions";

const SEXES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    createProfileAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          required
          autoComplete="off"
          placeholder="What your gym sees on the board"
          className="h-11 rounded-xl"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Sex</legend>
        <div className="grid grid-cols-2 gap-2">
          {SEXES.map((s) => (
            <label
              key={s.value}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-xl text-sm ring-1 ring-input transition-colors",
                "has-checked:bg-tint has-checked:font-medium has-checked:text-background has-checked:ring-tint",
                "has-focus-visible:ring-2 has-focus-visible:ring-ring",
              )}
            >
              <input type="radio" name="sex" value={s.value} required className="sr-only" />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>

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
          required
          className="h-11 rounded-xl"
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" size="xl" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
