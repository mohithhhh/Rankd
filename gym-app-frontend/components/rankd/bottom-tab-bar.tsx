"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, PlusCircle, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomTabBar({ primaryGymId }: { primaryGymId: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: `/gyms/${primaryGymId}/leaderboard`, label: "Ranks", icon: Trophy },
    { href: "/log", label: "Log", icon: PlusCircle },
    { href: "/history", label: "History", icon: History },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-5xl">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const isLog = tab.href === "/log";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs"
            >
              <tab.icon
                className={cn(
                  "size-6",
                  isLog ? "text-accent" : isActive ? "text-primary" : "text-muted",
                )}
                strokeWidth={isActive || isLog ? 2.25 : 1.75}
              />
              <span className={cn(isActive ? "font-medium text-primary" : "text-muted")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
