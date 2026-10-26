import { useState } from 'react'
import { ChevronLeft, ChevronRight, Hourglass, UserPlus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useTimeSpent, type TimeSpentPeriod } from '../timeSpentFapi'

const VIEWS: { id: TimeSpentPeriod; label: string }[] = [
  { id: 'month', label: 'Input Per Month' },
  { id: 'week', label: 'Input Per Week' },
  { id: 'day', label: 'Input Per Day' },
]

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromIso = (value: string) => new Date(`${value}T00:00:00`)

function fmtLabel(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: '2-digit', day: '2-digit', year: 'numeric' })
}

function fmtShort(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}

// The classic "Time Spent Details" (the HRM timesheet): the tasks assigned to the user with the time spent on each day of the chosen day,
// week or month, from userprofile/fapi/time_spent.php. Choosing a task, assigning one to yourself and saving time have no fapi writer, so those
// controls stay disabled and the time boxes only show what is recorded.
export function TimeSpentPage() {
  const [view, setView] = useState<TimeSpentPeriod>('week')
  const [anchor, setAnchor] = useState(new Date())
  const { data, isLoading, isError, error, refetch } = useTimeSpent(view, iso(anchor))

  function shift(delta: number) {
    const d = new Date(anchor)
    if (view === 'month') d.setMonth(d.getMonth() + delta)
    else if (view === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setDate(d.getDate() + delta)
    setAnchor(d)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Hourglass size={20} className="text-brand" /> Time Spent Details
      </h2>

      <div className="flex items-center gap-2 border-b border-border">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px uppercase tracking-wide ${
              view === v.id ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <Card className="!h-auto !bg-info-bg border-info/30 text-info-fg text-xs">
        This view is limited to projects or tasks you are a contact for. Only open projects are visible (projects in draft or closed status are not visible).
        <br />
        Only tasks assigned to you are visible. Assign task to yourself if it is not visible and you need to enter time on it.
      </Card>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select disabled className={`text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-2 py-1.5 flex-1 min-w-40`}>
            <option>-- Choose a task… --</option>
          </select>
          <button type="button" disabled title="Not available: the timesheet API has no writer" className="text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-1.5">
            Task executive
          </button>
          <button
            type="button"
            disabled
            title="Not available: the timesheet API has no writer"
            className="flex items-center gap-1.5 rounded-md bg-brand/60 px-3 py-1.5 text-sm font-medium text-white cursor-not-allowed"
          >
            <UserPlus size={14} /> Assign task to me
          </button>
          <div className="flex items-center gap-2 ml-auto text-sm text-text-muted">
            <button type="button" onClick={() => shift(-1)} className="p-1 rounded hover:bg-surface-hover">
              <ChevronLeft size={16} />
            </button>
            <span className="font-medium text-text!">{fmtLabel(data && view === 'week' ? fromIso(data.start) : anchor)}</span>
            <button type="button" onClick={() => shift(1)} className="p-1 rounded hover:bg-surface-hover">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {isLoading && <LegacyLoadingCard label="Loading the timesheet…" />}
        {isError && <LegacyErrorCard title="Couldn't load the timesheet" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2.5">Task</th>
                  <th className="font-medium px-3 py-2.5">Planned Workload</th>
                  <th className="font-medium px-3 py-2.5">Declared Real Progress</th>
                  <th className="font-medium px-3 py-2.5">Time Spent Everybody</th>
                  <th className="font-medium px-3 py-2.5">Time Spent (you)</th>
                  {data.dayColumns.map((day) => {
                    const d = fromIso(day)
                    return (
                      <th key={day} className="font-medium px-3 py-2.5 text-center whitespace-nowrap">
                        {DAY_NAMES[(d.getDay() + 6) % 7]} <br /> {fmtShort(d)}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border font-semibold">
                  <td className="px-3 py-2.5 text-text!" colSpan={3}>
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-text!">{data.everybody}</td>
                  <td className="px-3 py-2.5 text-text!">{data.you}</td>
                  {data.dayColumns.map((day) => (
                    <td key={day} className="px-3 py-2.5 text-center">
                      <input disabled value={data.dayTotals[day] ?? '00:00'} className="w-16 text-center rounded border border-input-border bg-input-bg text-text-faint text-xs py-1" />
                    </td>
                  ))}
                </tr>
                {data.rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-text-faint italic" colSpan={5 + data.dayColumns.length}>
                      No Assigned Tasks Found (assign a project/task to yourself above to enter time on it)
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.taskId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 text-text!">
                        <p>{r.task}</p>
                        {r.project && <p className="text-xs text-text-faint">{r.project}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">{r.planned}</td>
                      <td className="px-3 py-2.5 text-text-muted">{r.progress}</td>
                      <td className="px-3 py-2.5 text-text-muted">{r.everybody}</td>
                      <td className="px-3 py-2.5 text-text-muted">{r.you}</td>
                      {data.dayColumns.map((day) => (
                        <td key={day} className="px-3 py-2.5 text-center">
                          <input disabled value={r.days[day] ?? '00:00'} className="w-16 text-center rounded border border-input-border bg-input-bg text-text-faint text-xs py-1" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <button type="button" disabled title="Not available: the timesheet API has no writer" className="mt-4 rounded-lg bg-brand/60 px-4 py-2 text-sm font-medium text-white cursor-not-allowed">
          Save
        </button>
      </Card>
    </div>
  )
}
