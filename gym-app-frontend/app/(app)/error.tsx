"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="font-display text-4xl font-extrabold">This page didn&apos;t load</h1>
      <p className="max-w-md text-muted-foreground">
        The RankD server didn&apos;t answer. Your logged sets are safe. Try again, or head back home.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => retry()} size="lg" className="px-4">
          Try again
        </Button>
        <Button asChild variant="secondary" size="lg" className="px-4">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
