import { useEffect, useState } from 'react'
import { FileSpreadsheet, Info, Printer, UserPlus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { MonthYearPicker } from '../../../shared/components/forms/MonthYearPicker'
import { useOverallAttendanceGroups, useOverallAttendanceEmployees } from '../payrollLists.queries'

// payroll/atten_overall_rip.php's Entity/Groups/Employee filters are real,
// live cascading selects — payroll/ajax.php?overallreport=<entity> for
// Groups and ?oallreport=1&entt=&grup= for Employee, both confirmed to work
// with no CSRF issue (that file defines NOCSRFCHECK itself, same as every
// other payroll/ajax.php action). The actual day-by-day attendance grid is
// a different story: it's served by payroll/ajax_get_attendance_rows.php,
// which — unlike ajax.php — does NOT disable Dolibarr's CSRF check, and
// only accepts POST (a GET with the same params returns nothing). Confirmed
// live: a POST from any origin other than this backend's own host is
// rejected outright ("Access refused by CSRF protection... Referrer ... is
// outside the server that serve this page"), so this app can never call it
// safely — Refresh stays disabled rather than faking a report.
export function OverallAttendanceReportForm() {
  const [entity, setEntity] = useState('')
  const [group, setGroup] = useState('')
  const [employee, setEmployee] = useState('')
  const [month, setMonth] = useState('')

  const { data: groupOptions, isLoading: groupsLoading } = useOverallAttendanceGroups(entity)
  const { data: employeeOptions, isLoading: employeesLoading } = useOverallAttendanceEmployees(entity, group)

  useEffect(() => {
    setGroup('')
    setEmployee('')
  }, [entity])
  useEffect(() => {
    setEmployee('')
  }, [group])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UserPlus size={20} className="text-brand" /> Payroll – Overall Attendance Report
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" disabled title="Refresh never ran — nothing to export yet" className="p-2 rounded-md bg-brand text-white opacity-50 cursor-not-allowed">
            <FileSpreadsheet size={16} />
          </button>
          <button type="button" disabled title="Refresh never ran — nothing to print yet" className="p-2 rounded-md bg-brand text-white opacity-50 cursor-not-allowed">
            <Printer size={16} />
          </button>
        </div>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/atten_overall_rip.php</code>. Entity, Groups and Employee below are real, live cascading
          dropdowns. The day-by-day grid itself comes from a different endpoint (<code className="font-mono">payroll/ajax_get_attendance_rows.php</code>)
          that enforces Dolibarr's own Referer-based CSRF check with no GET fallback — confirmed live, it rejects any request whose origin isn't this
          backend's own host — so this app can't call it safely, and Refresh stays disabled rather than faking a report.
        </p>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Entity" required>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className={inputClasses}>
              <option value="">Select Entity</option>
              <option value="All">All Entity</option>
              <option value="1">Master entity</option>
            </select>
          </Field>
          <Field label="Groups" required>
            <select value={group} onChange={(e) => setGroup(e.target.value)} disabled={!entity} className={`${inputClasses} disabled:opacity-70`}>
              <option value="">{!entity ? 'Select Entity first' : groupsLoading ? 'Loading…' : 'Select Group'}</option>
              {(groupOptions ?? []).map((o) => (
                <option key={o.value || 'blank'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Employee" required>
            <select value={employee} onChange={(e) => setEmployee(e.target.value)} disabled={!group} className={`${inputClasses} disabled:opacity-70`}>
              <option value="">{!group ? 'Select Group first' : employeesLoading ? 'Loading…' : 'Select Employee'}</option>
              {employeeOptions?.topLevel.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {employeeOptions?.groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Month" required>
            <MonthYearPicker value={month} onChange={setMonth} />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            disabled
            title="ajax_get_attendance_rows.php is CSRF-blocked from this app's origin (confirmed live) — see the note above"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white opacity-50 cursor-not-allowed"
          >
            Refresh
          </button>
        </div>
      </Card>
    </div>
  )
}
