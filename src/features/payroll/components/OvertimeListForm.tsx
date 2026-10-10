import { useState } from 'react'
import { Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useOvertimeList } from '../payrollLists.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const today = () => new Date().toISOString().slice(0, 10)

// Real via payroll/over_time.php — see overtimeListParser.ts's own top
// comment. One real row per attendance record with overtime > 0 on the
// chosen date; entity scoping is automatic server-side, no user control.
export function OvertimeListForm() {
  const [date, setDate] = useState(today())
  const [applied, setApplied] = useState(today())

  const { data: rows, isLoading, isError, error, refetch } = useOvertimeList(applied)

  function getExportData() {
    return {
      headers: ['Date', 'Employee', 'Attendance', 'Clock In', 'Clock Out', 'Overtime'],
      rows: (rows ?? []).map((r) => [r.date, r.employee, r.attendance, r.clockIn, r.clockOut, r.overtime]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <button type="button" onClick={() => setApplied(date)} title="Search" className="h-9 w-11 grid place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
            <Search size={15} />
          </button>
          <div className="ml-auto">
            <TableExportButtons title="Overtime List" getExportData={getExportData} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading overtime list…" />}
        {isError && <LegacyErrorCard title="Couldn't load overtime list" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {rows && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-3 py-2">Date</th>
                    <th className="font-medium px-3 py-2">Employee</th>
                    <th className="font-medium px-3 py-2">Attendance</th>
                    <th className="font-medium px-3 py-2">Clock In</th>
                    <th className="font-medium px-3 py-2">Clock Out</th>
                    <th className="font-medium px-3 py-2">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center italic text-text-faint">
                        No data available in table.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">{r.date}</td>
                        <td className="px-3 py-2 text-text-muted">{r.employee}</td>
                        <td className="px-3 py-2 text-text-muted">{r.attendance}</td>
                        <td className="px-3 py-2 text-text-muted">{r.clockIn}</td>
                        <td className="px-3 py-2 text-text-muted">{r.clockOut}</td>
                        <td className="px-3 py-2 text-text-muted">{r.overtime}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
