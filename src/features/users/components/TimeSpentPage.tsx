import { useState } from 'react'
import { ChevronLeft, ChevronRight, Hourglass, UserPlus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

type ViewMode = 'month' | 'week' | 'day'
const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'month', label: 'Input Per Month' },
  { id: 'week', label: 'Input Per Week' },
  { id: 'day', label: 'Input Per Day' },
]

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Monday-start week containing `d`.
function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  return start
}

function fmtLabel(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: '2-digit', day: '2-digit', year: 'numeric' })
}

function fmtShort(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}

// No task/project time-tracking endpoint exists on this backend — same gap
// as agenda/leave. The real reference app's own demo account shows this
// exact "no assigned tasks" empty state too (nothing to fabricate), so this
// reproduces that honestly rather than inventing task rows.
export function TimeSpentPage() {
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(new Date())

  const weekStart = startOfWeek(anchor)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

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
          <button type="button" disabled title="No tasks assigned yet" className="text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-1.5">
            Task executive
          </button>
          <button
            type="button"
            disabled
            title="No project/task backend exists yet"
            className="flex items-center gap-1.5 rounded-md bg-brand/60 px-3 py-1.5 text-sm font-medium text-white cursor-not-allowed"
          >
            <UserPlus size={14} /> Assign task to me
          </button>
          <div className="flex items-center gap-2 ml-auto text-sm text-text-muted">
            <button type="button" onClick={() => shift(-1)} className="p-1 rounded hover:bg-surface-hover">
              <ChevronLeft size={16} />
            </button>
            <span className="font-medium text-text!">{view === 'week' ? fmtLabel(weekDays[0]) : fmtLabel(anchor)}</span>
            <button type="button" onClick={() => shift(1)} className="p-1 rounded hover:bg-surface-hover">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {view === 'week' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2.5">Task</th>
                  <th className="font-medium px-3 py-2.5">Planned Workload</th>
                  <th className="font-medium px-3 py-2.5">Declared Real Progress</th>
                  <th className="font-medium px-3 py-2.5">Time Spent Everybody</th>
                  <th className="font-medium px-3 py-2.5">Time Spent (you)</th>
                  {weekDays.map((d) => (
                    <th key={d.toISOString()} className="font-medium px-3 py-2.5 text-center whitespace-nowrap">
                      {DAY_NAMES[(d.getDay() + 6) % 7]} <br /> {fmtShort(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border font-semibold">
                  <td className="px-3 py-2.5 text-text!" colSpan={5}>
                    Total – Expected Worked Hours Per Week: 0
                  </td>
                  {weekDays.map((d) => (
                    <td key={d.toISOString()} className="px-3 py-2.5 text-center">
                      <input disabled value="00:00" className="w-16 text-center rounded border border-input-border bg-input-bg text-text-faint text-xs py-1" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-3 text-text-faint italic" colSpan={5 + 7}>
                    No Assigned Tasks Found (assign a project/task to yourself above to enter time on it)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-faint italic py-8 text-center">No Assigned Tasks Found for this {view === 'month' ? 'month' : 'day'}.</p>
        )}

        <button type="button" disabled className="mt-4 rounded-lg bg-brand/60 px-4 py-2 text-sm font-medium text-white cursor-not-allowed">
          Save
        </button>
      </Card>
    </div>
  )
}
