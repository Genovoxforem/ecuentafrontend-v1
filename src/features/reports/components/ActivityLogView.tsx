import { useMemo, useState } from 'react'
import { ListTree } from 'lucide-react'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { activityTable, activityUsers, useActivityLog } from '../activityLog.data'
import { monthEnd, monthStart } from '../reportFormat'
import { inputCls, RangeBar, ReportError, ReportLoading } from './ReportWidgets'

// "Activity Log" and "Online Transaction Log" of the Reports Center (classic: custom/reports/log_report.php and its identical copy
// transaction_report.php), read from custom/reports/fapi/activity_log.php. Admin only on the backend: another user gets its refusal.
export function ActivityLogView({ title }: { title: string }) {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const [user, setUser] = useState('')
  const q = useActivityLog(range.start, range.end, user)
  const table = useMemo(() => activityTable(q.data?.items ?? []), [q.data])
  const users = useMemo(() => activityUsers(q.data?.items ?? []), [q.data])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListTree size={20} className="text-brand" /> {title}
      </h2>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} buttonLabel="Search" onApply={(start, end) => setRange({ start, end })}>
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">User</span>
          <select value={user} onChange={(e) => setUser(e.target.value)} className={`${inputCls} min-w-48`} aria-label="User">
            <option value="">All</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </RangeBar>
      {q.isLoading && <ReportLoading label="Loading the activity log…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {q.data && <LegacyReportTable title={title} table={table} />}
    </div>
  )
}
