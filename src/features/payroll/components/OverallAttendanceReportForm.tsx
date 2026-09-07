import { useState } from 'react'
import { FileSpreadsheet, Info, Printer, UserPlus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'

// payroll/atten_overall_rip.php's "Overall Attendance Report" — no confirmed
// JSON API (classic report page only, per this module's earlier full audit —
// see payrollPlaceholders.ts), so Refresh can't actually render a report
// here. Entity/Groups stay fixed to this deployment's real single values
// (see HolidayForm's comment on the one real entity); Employee is wired to
// the real user list since that data genuinely exists.
export function OverallAttendanceReportForm() {
  const { data: users } = useUsersSummary()
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState('')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UserPlus size={20} className="text-brand" /> Payroll – Overall Attendance Report
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" disabled title="No confirmed export endpoint" className="p-2 rounded-md bg-brand text-white opacity-50 cursor-not-allowed">
            <FileSpreadsheet size={16} />
          </button>
          <button type="button" disabled title="No confirmed export endpoint" className="p-2 rounded-md bg-brand text-white opacity-50 cursor-not-allowed">
            <Printer size={16} />
          </button>
        </div>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/atten_overall_rip.php</code>. It has no confirmed JSON API — only a classic server-rendered
          report — so Refresh can't render a report here; the filters below match the real page's layout instead.
        </p>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Entity" required>
            <input value="All Entity" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
          </Field>
          <Field label="Groups" required>
            <input value="All Groups" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
          </Field>
          <Field label="Employee" required>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClasses}>
              <option value="">All Employees</option>
              {(users?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.login}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Month" required>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClasses} />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <button type="button" disabled title="No confirmed read endpoint for this report" className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white opacity-50 cursor-not-allowed">
            Refresh
          </button>
        </div>
      </Card>
    </div>
  )
}
