import { DoorOpen } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelRack } from '../hotel.queries'

// The real custom/hotel/app.php stylesheet's own .s-occupied/.s-ready/
// .s-dirty/.s-arriving/.s-ooo tints are fixed light-mode hex values (its
// page has no dark mode of its own) — reproducing them verbatim here made
// every tile read as a near-white, indistinguishable blank square on this
// app's dark theme. Mapped to this app's own theme-aware status tokens
// instead (the same success/warning/danger/info/neutral pairs every other
// badge in this app already uses), so the 5 statuses stay visually
// distinct — and correctly themed — in both light and dark mode.
const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  ready: { label: 'Ready', cls: 'bg-success-bg text-success-fg' },
  occupied: { label: 'Occupied', cls: 'bg-info-bg text-info-fg' },
  dirty: { label: 'To service', cls: 'bg-warning-bg text-warning-fg' },
  arriving: { label: 'Arriving', cls: 'bg-neutral-bg text-neutral-fg' },
  ooo: { label: 'Out of service', cls: 'bg-danger-bg text-danger-fg' },
}

// Real via custom/hotel/api.php?r=rack — this reproduces the real Hotel
// Suite app's own "Room Status" section (custom/hotel/app.php#view-rooms:
// its "Booking Management → Room Status" classic sidebar entry redirects
// straight into this exact view) structurally: one card titled "Suite Rack
// — live status" with an "N keys" count, suites grouped by floor
// (rackHTML()'s own grouping/sort), a 44×40 tile per suite tinted by its
// real status, and a swatch legend below with no per-status counts —
// matching that view's own rackHTML()/.rm/.s-*/.statkey markup and layout
// (colors are this app's own theme tokens, not the real page's fixed
// light-mode hex — see STATUS_STYLES above). Read-only here, same as the
// real view (it has no click actions of its own — editing a suite lives in
// Settings).
export function HotelRooms() {
  const { data: rack, isLoading, isError, error, refetch } = useHotelRack()

  const byFloor = new Map<string, typeof rack>()
  for (const r of rack ?? []) {
    const key = r.floor || '—'
    if (!byFloor.has(key)) byFloor.set(key, [])
    byFloor.get(key)!.push(r)
  }
  const floors = Array.from(byFloor.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <DoorOpen size={22} />
          </span>
          <h2 className="text-lg font-bold text-text!">Room Status</h2>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading suite rack…" />}
      {isError && <LegacyErrorCard title="Couldn't load the suite rack" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {rack && (
        <Card className="!h-auto">
          <div className="flex items-center mb-4">
            <h3 className="font-semibold text-text!">Suite Rack — live status</h3>
            <span className="ml-auto text-[10.5px] tracking-[2.2px] uppercase text-text-faint font-medium">{rack.length} keys</span>
          </div>

          {rack.length === 0 ? (
            <p className="text-sm text-text-faint italic py-8 text-center">No suites configured yet — add rooms in Room Management.</p>
          ) : (
            <div className="space-y-3">
              {floors.map(([floor, rooms]) => (
                <div key={floor} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-sm text-text-faint">{rooms?.[0]?.floorname || floor}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {rooms
                      ?.slice()
                      .sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true }))
                      .map((r) => {
                        const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.ready
                        return (
                          <span key={r.id} title={`${r.type} · ${r.status}`} className={`w-11 h-10 rounded-[9px] grid place-items-center text-[11.5px] font-medium ${s.cls}`}>
                            {r.no}
                          </span>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-3">
            {Object.values(STATUS_STYLES).map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-text-faint">
                <span className={`w-2.5 h-2.5 rounded-[3px] ${s.cls}`} />
                {s.label}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
