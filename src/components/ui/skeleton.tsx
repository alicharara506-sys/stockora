import { cn } from "@/lib/utils";

/**
 * Placeholder block shown while content loads.
 *
 * Skeletons beat spinners here because they reserve the space the real
 * content will occupy, so nothing jumps when it arrives (CLS stays low) and
 * the shape hints at what is coming.
 *
 * `animate-pulse` is disabled automatically under prefers-reduced-motion by
 * the global rule in globals.css.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-brand-border/60", className)}
      {...props}
    />
  );
}

/** Skeleton shaped like the app's summary stat cards. */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-brand-border bg-brand-surface p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton shaped like the app's data tables. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
      <div className="border-b border-brand-border px-6 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-brand-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Page-level loading state: a heading placeholder, stats, then a table. */
export function SkeletonPage({ withStats = true }: { withStats?: boolean }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      {withStats && <SkeletonStatCards />}
      <SkeletonTable />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
