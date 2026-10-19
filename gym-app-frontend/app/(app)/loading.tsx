import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20 bg-raised" />
        <Skeleton className="h-16 w-56 bg-raised" />
      </div>
      <Skeleton className="h-3 w-full bg-raised" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
