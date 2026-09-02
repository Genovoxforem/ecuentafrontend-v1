// Reusable skeleton primitives for loading states. These animate with a
// pulse effect (Tailwind's animate-pulse) to give users a visual indication
// that content is loading, rather than a blank space or a spinner alone.
//
// Usage:
//   <Skeleton className="h-4 w-32" />           // Single bar
//   <SkeletonRows count={5} cols={4} />         // Table rows
//   <DetailPageSkeleton />                       // Full detail page

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className}`} />
}

// A row of skeleton cells — for table loading states.
export function SkeletonRow({ cols, cellHeight = 'h-8' }: { cols: number; cellHeight?: string }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`${cellHeight} w-full`} />
        </td>
      ))}
    </tr>
  )
}

// Multiple skeleton rows for a table body.
export function SkeletonRows({ count = 5, cols = 4, cellHeight = 'h-8' }: { count?: number; cols?: number; cellHeight?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} cellHeight={cellHeight} />
      ))}
    </>
  )
}

// Detail page skeleton — header bar + two-column card layout, matching
// the common detail page structure (OrderDetail, CustomerDetail, etc.).
export function DetailPageSkeleton() {
  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 p-6 space-y-4">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-48" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      {/* Content cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// List page skeleton — search bar + table with skeleton rows.
export function ListPageSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-2.5">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonRows count={rows} cols={cols} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
