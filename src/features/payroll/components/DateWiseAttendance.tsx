import { useState } from 'react'
import { CalendarCheck, History } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useDateWiseAttendance } from '../payrollAttendance.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Real via payroll/attendance_rip_ajax.php — confirmed genuine JSON, gated
// by hasRight('payroll','award_obj','read'). Each row's "action" field on
// the real endpoint is a full HTML modal blob (a per-employee login-history
// popup wired to Bootstrap's data-bs-toggle) — not rendered here since
// injecting raw backend HTML isn't safe practice; the History icon below is
// a placeholder for that real feature rather than a rebuilt modal.
export function DateWiseAttendance() {
  const [date, setDate] = useState(todayIso())
  const { data, isLoading, isError, error, refetch } = useDateWiseAttendance(date)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CalendarCheck size={20} className="text-brand" /> Date Wise Attendance
      </h2>

      <div className="flex items-center gap-2">
        <label className="text-sm text-text-muted">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </div>

      {isLoading && <LegacyLoadingCard label="Loading attendance…" />}
      {isError && <LegacyErrorCard title="Couldn't load attendance" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              [
                { label: 'Employees', value: data.summary.employees },
                { label: 'Present', value: data.summary.present },
                { label: 'Absent', value: data.summary.absent },
                { label: 'Late', value: data.summary.late },
                { label: 'On Leave', value: data.summary.leave },
              ] as const
            ).map((s) => (
              <Card key={s.label} className="!h-auto text-center">
                <p className="text-xl font-bold text-text!">{s.value}</p>
                <p className="text-xs text-text-faint uppercase tracking-wide">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">#</th>
                  <th className="font-medium px-3 py-2">Employee</th>
                  <th className="font-medium px-3 py-2">Attendance</th>
                  <th className="font-medium px-3 py-2">Leave Type</th>
                  <th className="font-medium px-3 py-2">Clock In</th>
                  <th className="font-medium px-3 py-2">Clock Out</th>
                  <th className="font-medium px-3 py-2">Working Hours</th>
                  <th className="font-medium px-3 py-2">Device</th>
                  <th className="font-medium px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                      No active employees found.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.employeeId + r.slNo} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text-muted">{r.slNo}</td>
                      <td className="px-3 py-2 text-text!">{r.employee}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.isPresent ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>
                          {r.attendanceLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-muted">{r.leaveType}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.clockIn}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.clockOut}</td>
                      <td className="px-3 py-2 text-text-muted">{r.workingHours}</td>
                      <td className="px-3 py-2 text-text-muted">{r.device}</td>
                      <td className="px-3 py-2">
                        <button type="button" disabled title="Real login-history modal exists on the legacy endpoint but isn't rebuilt here" className="text-text-faint cursor-default">
                          <History size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
