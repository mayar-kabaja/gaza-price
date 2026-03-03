import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-border/60",
        className
      )}
    />
  );
}

/** Skeleton for home page product card (product name + price rows). */
export function HomeProductCardSkeleton() {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-2 mb-2 px-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-2 px-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </section>
  );
}

export function PriceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-border">
      <div className="flex justify-between mb-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
}
