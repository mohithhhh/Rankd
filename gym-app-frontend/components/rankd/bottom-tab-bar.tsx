"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Plus, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

function useTabs(primaryGymId: string) {
  const pathname = usePathname();
  const tabs = [
    { href: "/dashboard", label: "Home", icon: Home, match: "/dashboard" },
    { href: `/gyms/${primaryGymId}/leaderboard`, label: "Ranks", icon: Trophy, match: "/gyms/" },
    { href: "/log", label: "Log", icon: Plus, match: "/log" },
    { href: "/history", label: "History", icon: History, match: "/history" },
    { href: "/profile", label: "Profile", icon: User, match: "/profile" },
  ];
  return tabs.map((tab) => ({ ...tab, active: pathname.startsWith(tab.match) }));
}

/** Mobile: fixed bottom bar with Log as a raised center button. */
export function BottomTabBar({ primaryGymId }: { primaryGymId: string }) {
  const tabs = useTabs(primaryGymId);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-lg items-end">
        {tabs.map((tab) =>
          tab.href === "/log" ? (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 pb-2 text-xs font-medium text-ember"
            >
              <span className="-mt-5 grid size-14 place-items-center rounded-full bg-ember text-background shadow-[0_6px_24px_-4px] shadow-ember/60 ring-4 ring-background transition-transform active:scale-95">
                <tab.icon className="size-7" strokeWidth={2.5} />
              </span>
              {tab.label}
            </Link>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-xs",
                tab.active ? "font-medium text-tint" : "text-faint",
              )}
            >
              <tab.icon className="size-6" strokeWidth={tab.active ? 2.25 : 1.75} />
              {tab.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}

/** Desktop: the same destinations as inline header links. */
export function HeaderNav({ primaryGymId }: { primaryGymId: string }) {
  const tabs = useTabs(primaryGymId);

  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {tabs.map((tab) =>
        tab.href === "/log" ? (
          <Link
            key={tab.href}
            href={tab.href}
            className="ml-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-ember px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            <tab.icon className="size-4" strokeWidth={2.5} />
            Log a lift
          </Link>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              tab.active ? "bg-raised text-tint" : "text-muted-foreground hover:text-tint",
            )}
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}
