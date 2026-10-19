import type { ReactNode } from "react";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
