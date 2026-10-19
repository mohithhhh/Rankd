import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="font-display text-8xl leading-none font-extrabold text-faint">404</p>
      <h1 className="font-display text-3xl font-bold">No page here</h1>
      <p className="max-w-sm text-muted-foreground">The link may be old, or the gym may no longer exist.</p>
      <Button asChild size="lg" className="px-4">
        <Link href="/dashboard">Back to home</Link>
      </Button>
    </main>
  );
}
