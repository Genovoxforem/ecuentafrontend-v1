import { useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useShiftTimeline, useShiftTimelineFilters } from '../payrollStatutoryReports.queries'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'

function monthBounds(): { start: string; end: string } {
  const d = new Date()
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  return { start: iso(new Date(d.getFullYear(), d.getMonth(), 1)), end: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
}

// Real via payroll/shift_timeline.php — a genuine GET form (shift_filter[],
// emp_filter, start_filter, end_filter, all YYYY-MM-DD), so no workaround is
// needed. The page lists every shift assignment overlapping the date range;
// it defaults to the current month and loads on open, like the real page.
export function ShiftTimelineForm() {
  const bounds = useMemo(monthBounds, [])
  const [shifts, setShifts] = useState<string[]>([])
  const [employee, setEmployee] = useState('')
  const [start, setStart] = useState(bounds.start)
  const [end, setEnd] = useState(bounds.end)
  const [applied, setApplied] = useState({ shifts: [] as string[], employee: '', start: bounds.start, end: bounds.end })

  const { data: filters } = useShiftTimelineFilters()
  const { data: table, isLoading, isError, error, refetch } = useShiftTimeline(applied)

  const employeeOptions = useMemo(() => [{ value: '', label: 'All' }, ...(filters?.employees ?? [])], [filters])

  function toggleShift(id: string) {
    setShifts((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function handleReset() {
    setShifts([])
    setEmployee('')
    setStart(bounds.start)
    setEnd(bounds.end)
    setApplied({ shifts: [], employee: '', start: bounds.start, end: bounds.end })
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Clock size={20} className="text-brand" /> Shift Timeline
      </h2>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Shift">
            <div className="flex flex-wrap gap-2">
              {(filters?.shifts ?? []).map((s) => (
                <label
                  key={s.value}
                  className={`cursor-pointer select-none rounded-md border px-3 py-1.5 text-sm ${
                    shifts.includes(s.value) ? 'border-brand bg-brand/10 text-brand' : 'border-input-border bg-input-bg text-text'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={shifts.includes(s.value)} onChange={() => toggleShift(s.value)} />
                  {s.label}
                </label>
              ))}
              {shifts.length === 0 && <span className="self-center text-xs text-text-faint">All shifts</span>}
            </div>
          </Field>
          <Field label="Employee">
            <SearchableSelect value={employee} onChange={setEmployee} options={employeeOptions} placeholder="All" />
          </Field>
          <Field label="Start date">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="End date">
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={inputClasses} />
          </Field>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setApplied({ shifts, employee, start, end })}
            disabled={!start || !end}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            Filter
          </button>
          <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-surface-hover">
            Reset
          </button>
        </div>
      </Card>

      {isLoading && <LegacyLoadingCard label="Loading shift timeline…" />}
      {isError && <LegacyErrorCard title="Couldn't load shift timeline" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {table && <LegacyReportTable key={JSON.stringify(applied)} title="Shift Timeline" table={table} />}
    </div>
  )
}
