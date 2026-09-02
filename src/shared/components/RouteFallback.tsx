// Shown while a lazy-loaded route module's chunk is still downloading.
export function RouteFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
      <p className="text-sm text-text-faint">Loading…</p>
    </div>
  )
}
