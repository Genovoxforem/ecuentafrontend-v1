import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelCalendar } from '../hotel.queries'

const CELL_STYLE: Record<string, string> = {
  occupied: 'bg-emerald-800 text-white',
  reserved: 'bg-amber-400 text-amber-950',
  vacant: 'bg-neutral-bg text-transparent',
  ooo: 'bg-rose-600 text-white',
}
const CELL_LABEL: Record<string, string> = { occupied: 'In', reserved: 'Res', vacant: '', ooo: 'OOO' }

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Real via custom/hotel/api.php?r=calendar&start=&days= — the Hotel Suite
// app's own Booking Calendar (a day-by-day availability grid per suite).
export function HotelCalendar() {
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10))
  const [days, setDays] = useState(14)
  const { data, isLoading, isError, error, refetch } = useHotelCalendar(start, days)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <CalendarDays size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">Booking Calendar</h2>
          <p className="text-xs text-text-faint mt-0.5 uppercase tracking-wide">Room-by-day availability grid</p>
        </div>
      </div>

      <Card className="!h-auto">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button type="button" onClick={() => setStart((s) => addDays(s, -days))} className="h-8 px-3 rounded-md border border-border text-sm text-text hover:bg-surface-hover">
            &lt; Prev
          </button>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <button type="button" onClick={() => setStart((s) => addDays(s, days))} className="h-8 px-3 rounded-md border border-border text-sm text-text hover:bg-surface-hover">
            Next &gt;
          </button>
          <div className="flex items-center gap-3 ml-auto text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-800" /> Occupied
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Reserved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-neutral-bg border border-border" /> Vacant
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-600" /> Out of order
            </span>
          </div>
        </div>

        {isLoading && <LegacyLoadingCard label="Loading calendar…" />}
        {isError && <LegacyErrorCard title="Couldn't load calendar" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <div className="overflow-auto">
            <table className="border-collapse text-xs min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface text-left px-2.5 py-1.5 border-b border-border">Suite</th>
                  {data.dates.map((d) => (
                    <th key={d} className="px-1.5 py-1.5 border-b border-border font-medium text-text-faint whitespace-nowrap">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={data.dates.length + 1} className="px-2.5 py-6 text-sm text-text-faint italic text-center">
                      No rooms.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.no}>
                      <td className="sticky left-0 z-10 bg-surface px-2.5 py-1.5 border-b border-border whitespace-nowrap">
                        <span className="font-semibold text-text!">{r.no}</span> <span className="text-text-faint">{r.type}</span>
                      </td>
                      {r.cells.map((c, i) => (
                        <td
                          key={i}
                          title={c.bnum ? `${c.bnum}${c.guest ? ` · ${c.guest}` : ''}` : c.st}
                          className={`px-1 py-1.5 border-b border-border text-center font-semibold ${CELL_STYLE[c.st] ?? ''}`}
                        >
                          {CELL_LABEL[c.st] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
