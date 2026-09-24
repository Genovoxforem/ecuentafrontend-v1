import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelRack } from '../hotel.queries'

// Real status tints are fixed light-mode hex (no dark mode of their own);
// mapped to this app's theme-aware status tokens instead.
const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  ready: { label: 'Ready', cls: 'bg-success-bg text-success-fg' },
  occupied: { label: 'Occupied', cls: 'bg-info-bg text-info-fg' },
  dirty: { label: 'To service', cls: 'bg-warning-bg text-warning-fg' },
  arriving: { label: 'Arriving', cls: 'bg-neutral-bg text-neutral-fg' },
  ooo: { label: 'Out of service', cls: 'bg-danger-bg text-danger-fg' },
}

// Reproduces the real "Room Status" section structurally: suites grouped by
// floor, one tile per suite tinted by status, legend below. Read-only, same
// as the real view — editing a suite lives in Settings.
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
