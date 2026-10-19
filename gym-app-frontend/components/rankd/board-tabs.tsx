import Link from "next/link";
import { cn } from "@/lib/utils";

/** Overall / weekly switch shared by the two leaderboard pages. */
export function BoardTabs({
  tabs,
}: {
  tabs: { href: string; label: string; active: boolean }[];
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-full bg-surface p-1 ring-1 ring-border" aria-label="Boards">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-center text-sm whitespace-nowrap transition-colors",
            tab.active ? "bg-raised font-medium text-tint" : "text-muted-foreground hover:text-tint",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
