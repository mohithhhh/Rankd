"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ConfirmJoinState } from "@/app/join/[code]/actions";

export function ConfirmJoinForm({
  gymName,
  action,
}: {
  gymName: string;
  /** confirmJoinAction pre-bound with (code, gymId) - see the page. */
  action: (state: ConfirmJoinState, formData: FormData) => Promise<ConfirmJoinState>;
}) {
  const [state, formAction, pending] = useActionState<ConfirmJoinState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Joining…" : `Join ${gymName}`}
      </Button>
    </form>
  );
}
