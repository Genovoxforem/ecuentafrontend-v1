import { useState } from 'react'
import { ChevronLeft, ChevronRight, Hourglass, UserPlus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAuth } from '../../auth/AuthContext'
import { useTimeSpentGrid, type TimeSpentMode } from '../timeSpent.queries'

const MODES: { id: TimeSpentMode; label: string }[] = [
  { id: 'month', label: 'Input per month' },
  { id: 'week', label: 'Input per week' },
  { id: 'day', label: 'Input per day' },
]

function addDays(d: Date, days: number) {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}
function addMonths(d: Date, months: number) {
  const next = new Date(d)
  next.setMonth(next.getMonth() + months)
  return next
}

function formatNavDate(mode: TimeSpentMode, d: Date) {
  if (mode === 'month') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  return d.toLocaleDateString('en-US', { weekday: 'long', month: '2-digit', day: '2-digit', year: 'numeric' })
}

// Real projet/activity/per{month,week,day}.php — all three tabs share the
// same real grid/nav mechanics (see timeSpent.queries.ts's header comment
// for how one generic reader covers all three). Confirmed live: an earlier
// version of this page only implemented the Week tab and sent a `re` date
// param the backend never reads, so navigation silently did nothing —
// fixed to use the real day/month/year params, and extended to all three
// tabs since they're the same mechanism. "Assign task to me" stays inert:
// the real action (Task::add_contact via action=addtime&assigntask=1) is
// genuine, but its task-role ("type") dropdown is sourced from
// c_type_contact, which isn't confirmed anywhere in this app yet.
export function TimeSpentPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<TimeSpentMode>('week')
  const [refDate, setRefDate] = useState(() => new Date())
  const { data, isLoading, isError, error } = useTimeSpentGrid(mode, refDate)

  function step(direction: 1 | -1) {
    setRefDate((d) => (mode === 'month' ? addMonths(d, direction) : addDays(d, direction * (mode === 'week' ? 7 : 1))))
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Hourglass size={20} className="text-brand" /> Time Spent Details
      </h2>

      <div className="flex gap-2 border-b border-border">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${
              mode === m.id ? 'border-brand text-brand' : 'border-transparent text-text-faint hover:text-text'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {isError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load Time Spent.'}</Card>}

      {data?.noticeText && <p className="text-sm text-text-faint">{data.noticeText}</p>}

      <Card className="!h-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select disabled title="No real API available on this backend — task-role list not confirmed" className="text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-2 py-1.5 min-w-[220px] cursor-not-allowed">
              <option>-- Choose a task not yet assigned to you… --</option>
            </select>
            <span className="text-sm text-text-muted">Task executive</span>
            <select disabled title="No real API available on this backend — task-role list not confirmed" className="text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-2 py-1.5 cursor-not-allowed">
              <option>—</option>
            </select>
            <button
              type="button"
              disabled
              title="Real action (Task::add_contact), but its task-role dropdown has no confirmed data source in this app yet"
              className="flex items-center gap-1.5 rounded-md bg-brand/60 px-3 py-1.5 text-sm font-medium text-white cursor-not-allowed"
            >
              <UserPlus size={14} /> Assign task to me
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <button type="button" onClick={() => step(-1)} className="p-1 rounded hover:bg-surface-hover" title="Previous">
              <ChevronLeft size={16} />
            </button>
            <span className="font-medium text-text!">{formatNavDate(mode, refDate)}</span>
            <button type="button" onClick={() => step(1)} className="p-1 rounded hover:bg-surface-hover" title="Next">
              <ChevronRight size={16} />
            </button>
            <button type="button" onClick={() => setRefDate(new Date())} className="ml-1 rounded-md border border-input-border px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover">
              Now
            </button>
          </div>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Task</th>
              <th className="font-medium py-2 px-4">Planned Workload</th>
              <th className="font-medium py-2 px-4">Declared Real Progress</th>
              <th className="font-medium py-2 px-4">Time Spent Everybody</th>
              <th className="font-medium py-2 px-4">Time Spent {user ? user.firstname : ''}</th>
              {(data?.extraHeaders ?? []).map((h, i) => (
                <th key={`${h}-${i}`} className="font-medium py-2 px-4 text-center whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-4 px-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : (
              <>
                {data?.totalRowText && (
                  <tr className="border-b border-border">
                    <td colSpan={5 + (data?.extraHeaders.length ?? 0)} className="py-2.5 px-4 font-medium text-text!">
                      {data.totalRowText}
                    </td>
                  </tr>
                )}
                {data?.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {row.cells.map((c, j) => (
                      <td key={j} className="py-2.5 px-4 text-text-muted">
                        {c || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                {data?.emptyMessage && (
                  <tr>
                    <td colSpan={5 + (data?.extraHeaders.length ?? 0)} className="py-3 px-4 text-text-faint italic">
                      {data.emptyMessage}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </Card>

      <button
        type="button"
        disabled
        title="Saving isn't wired up yet — this backend has no task currently assigned to the logged-in user to verify the save request against. Assign yourself a task on the real backend first."
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed"
      >
        Save
      </button>
    </div>
  )
}
