// Shown while a lazy-loaded route module's chunk is still downloading. It fades
// in after a moment (see `route-pending` in index.css) so a chunk that arrives
// quickly never flashes a spinner on its way past.
export function RouteFallback() {
  return (
    <div className="route-pending flex flex-col items-center justify-center gap-3 py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
      <p className="text-sm text-text-faint">Loading…</p>
    </div>
  )
}
