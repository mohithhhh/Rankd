"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProfileAction, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    createProfileAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sex">Sex</Label>
        <Select name="sex" required>
          <SelectTrigger id="sex" className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bodyweight_kg">Bodyweight (kg)</Label>
        <Input
          id="bodyweight_kg"
          name="bodyweight_kg"
          type="number"
          step="0.1"
          min="1"
          required
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
