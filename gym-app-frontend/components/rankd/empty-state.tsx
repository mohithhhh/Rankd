import type { ReactNode } from "react";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-10 text-center">
      <p className="max-w-xs text-sm text-muted">{message}</p>
      {action}
    </div>
  );
}
