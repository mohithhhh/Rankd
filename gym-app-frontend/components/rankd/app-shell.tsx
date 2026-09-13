import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(app)/actions";
import { BottomTabBar } from "@/components/rankd/bottom-tab-bar";

export function AppShell({
  username,
  primaryGymId,
  children,
}: {
  username: string;
  primaryGymId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-primary">
            RankD
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{username}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24">{children}</main>
      <BottomTabBar primaryGymId={primaryGymId} />
    </div>
  );
}
