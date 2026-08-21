import { Hourglass } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useTimeSpentWeek } from '../timeSpent.queries'

export function TimeSpentPage() {
  const { data, isLoading, isError, error } = useTimeSpentWeek()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Hourglass size={20} className="text-brand" /> Time Spent Details
      </h2>

      <div className="flex gap-2 border-b border-border">
        <span className="px-4 py-2 text-sm font-semibold uppercase tracking-wide text-text-faint">Input per month</span>
        <span className="px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 border-brand text-brand">Input per week</span>
        <span className="px-4 py-2 text-sm font-semibold uppercase tracking-wide text-text-faint">Input per day</span>
      </div>

      {isError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load Time Spent.'}</Card>}

      {data?.noticeText && <p className="text-sm text-text-faint">{data.noticeText}</p>}

      <Card className="!h-auto !p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Task</th>
              <th className="font-medium py-2 px-4">Planned Workload</th>
              <th className="font-medium py-2 px-4">Declared Real Progress</th>
              <th className="font-medium py-2 px-4">Time Spent Everybody</th>
              <th className="font-medium py-2 px-4">Time Spent</th>
              {(data?.dayHeaders.length ? data.dayHeaders : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d) => (
                <th key={d} className="font-medium py-2 px-4 text-center">
                  {d}
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
                <tr className="border-b border-border">
                  <td colSpan={4} className="py-2.5 px-4 font-medium text-text!">
                    Total - Expected Worked Hours Per Week: {data?.expectedHoursPerWeek ?? '0'}
                  </td>
                  <td colSpan={8} />
                </tr>
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
                    <td colSpan={12} className="py-3 px-4 text-text-faint italic">
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
