import Link from "next/link";
import { BottomTabBar, HeaderNav } from "@/components/rankd/bottom-tab-bar";

export function AppShell({
  primaryGymId,
  children,
}: {
  primaryGymId: string;
  children: React.ReactNode;
}) {
  return (
    // overflow-x-clip: the tier glow bleeds past the content column by design
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/dashboard" className="font-display text-2xl font-extrabold tracking-wide">
            RankD
          </Link>
          <HeaderNav primaryGymId={primaryGymId} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-32 md:pb-16">{children}</main>
      <BottomTabBar primaryGymId={primaryGymId} />
    </div>
  );
}
