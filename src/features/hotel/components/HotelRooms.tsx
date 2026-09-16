import { DoorOpen } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelRack } from '../hotel.queries'

const STATUS_STYLES: Record<string, { label: string; dot: string; chip: string }> = {
  occupied: { label: 'Occupied', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ready: { label: 'Ready', dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  dirty: { label: 'To service', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  arriving: { label: 'Arriving', dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  ooo: { label: 'Out of service', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
}

// Real via custom/hotel/api.php?r=rack — the Hotel Suite app's own "Rooms"
// / "Room Status" view (both real backend sidebar entries — "Room Status"
// and the classic room_status_obj leftmenu — land here). Read-only: editing
// a suite's own details lives in Settings (not yet ported).
export function HotelRooms() {
  const { data: rack, isLoading, isError, error, refetch } = useHotelRack()

  const byFloor = new Map<string, typeof rack>()
  for (const r of rack ?? []) {
    const key = r.floor || '—'
    if (!byFloor.has(key)) byFloor.set(key, [])
    byFloor.get(key)!.push(r)
  }
  const floors = Array.from(byFloor.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))
  const counts = (rack ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <DoorOpen size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Suite Rack — live status</h2>
            <p className="text-xs text-text-faint mt-0.5">{rack ? `${rack.length} keys` : ''}</p>
          </div>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading suite rack…" />}
      {isError && <LegacyErrorCard title="Couldn't load the suite rack" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {rack && (
        <Card className="!h-auto">
          {rack.length === 0 ? (
            <p className="text-sm text-text-faint italic py-8 text-center">No suites configured yet — add rooms in Hotel Suite Settings.</p>
          ) : (
            <div className="space-y-4">
              {floors.map(([floor, rooms]) => (
                <div key={floor} className="flex items-start gap-3">
                  <span className="w-20 shrink-0 text-sm text-text-faint pt-2">{rooms?.[0]?.floorname || `Floor ${floor}`}</span>
                  <div className="flex flex-wrap gap-2">
                    {rooms
                      ?.slice()
                      .sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true }))
                      .map((r) => {
                        const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.ready
                        return (
                          <span key={r.id} title={`${r.type} · ${r.status}`} className={`w-16 h-12 rounded-lg border grid place-items-center text-sm font-semibold ${s.chip}`}>
                            {r.no}
                          </span>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-border">
            {Object.entries(STATUS_STYLES).map(([k, s]) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} /> {s.label} <span className="text-text-faint">({counts[k] ?? 0})</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
