import { useEffect, useState, type ComponentType } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useOverallAttendanceGroups,
  useOverallAttendanceEmployees,
  useShiftPivotEntities,
  useShiftPivotReport,
  type ShiftPivotReportPath,
} from '../payrollLists.queries'

// Shared by Employee Over Time Monthly Report (overtime_monthly.php),
// Special Shift Attendance Report (special_shift_report.php) and Holiday
// Shift Attendance Report (holiday_shift_report.php) — confirmed live to
// share one identical real template (Entity/Groups/Employee/Month filters,
// same payroll/ajax.php cascading endpoints, same per-day pivot result
// table) — see shiftPivotReportParser.ts's own top comment for the one
// real per-page inconsistency this works around (the month param name).
export function ShiftPivotReportForm({
  path,
  monthParam,
  title,
  description,
  icon: Icon,
}: {
  path: ShiftPivotReportPath
  monthParam: 'month' | 'monthPic'
  title: string
  description: string
  icon: ComponentType<{ size?: number; className?: string }>
}) {
  const [entity, setEntity] = useState('')
  const [group, setGroup] = useState('')
  const [employee, setEmployee] = useState('')
  const [month, setMonth] = useState('')
  const [applied, setApplied] = useState<{ entity: string; group: string; employee: string; month: string } | null>(null)
  const [error, setError] = useState('')

  const { data: entityOptions } = useShiftPivotEntities(path)
  const { data: groupOptions, isLoading: groupsLoading } = useOverallAttendanceGroups(entity)
  const { data: employeeOptions, isLoading: employeesLoading } = useOverallAttendanceEmployees(entity, group)
  const {
    data: report,
    isLoading,
    isError,
    error: fetchError,
    refetch,
  } = useShiftPivotReport(path, monthParam, applied?.entity ?? '', applied?.group ?? '', applied?.employee ?? '', applied?.month ?? '')

  useEffect(() => {
    setGroup('')
    setEmployee('')
  }, [entity])
  useEffect(() => {
    setEmployee('')
  }, [group])

  function handleRefresh() {
    if (!entity || !group || !employee || !month) return setError('Entity, Groups, Employee and Month are all required.')
    setError('')
    setApplied({ entity, group, employee, month })
  }

  function getExportData() {
    const headers = ['Entity', 'Group', 'Employee', ...(report?.groups[0]?.days.map((d) => `${d.day} ${d.weekday}`) ?? []), 'Total']
    const rows = (report?.groups ?? []).flatMap((g) => g.rows.map((r) => [g.entity, g.group, r.employee, ...r.cells, r.total]))
    return { headers, rows }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
        </h2>
        {report && (
          <div className="flex items-center gap-2">
            <TableExportButtons title={title} getExportData={getExportData} />
          </div>
        )}
      </div>
      <p className="text-xs text-text-faint -mt-3">{description}</p>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Entity" required>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className={inputClasses}>
              <option value="">Select Entity</option>
              {(entityOptions ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
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
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClasses} />
          </Field>
        </div>
        <div className="flex items-center justify-between mt-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <button type="button" onClick={handleRefresh} className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover">
            Refresh
          </button>
        </div>
      </Card>

      {isLoading && <LegacyLoadingCard label="Loading report…" />}
      {isError && <LegacyErrorCard title="Couldn't load report" message={fetchError instanceof Error ? fetchError.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {report && (
        <>
          {(report.subhead || report.periodLabel) && (
            <div className="text-center">
              {report.subhead && <h3 className="text-lg font-bold text-brand">{report.subhead}</h3>}
              {report.periodLabel && <p className="text-sm text-text-muted">For The Month of {report.periodLabel}</p>}
            </div>
          )}

          {report.groups.length === 0 ? (
            <Card className="!h-auto">
              <p className="text-sm text-text-faint italic text-center py-6">No data available.</p>
            </Card>
          ) : (
            report.groups.map((g, gi) => {
              const showEntityHeader = gi === 0 || report.groups[gi - 1].entity !== g.entity
              return (
                <div key={gi} className="space-y-2">
                  {showEntityHeader && <h4 className="text-sm font-bold text-brand underline">{g.entity}</h4>}
                  <Card className="!p-0 overflow-hidden">
                    {g.group && <p className="px-4 pt-3 pb-1 text-xs font-bold text-danger underline">{g.group}</p>}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                            <th className="font-medium px-3 py-2 sticky left-0 bg-surface">Employee</th>
                            {g.days.map((d, di) => (
                              <th key={di} className="font-medium px-2 py-2 text-center whitespace-nowrap">
                                {d.day}
                                <br />
                                <span className="font-normal normal-case text-[10px]">{d.weekday}</span>
                              </th>
                            ))}
                            <th className="font-medium px-3 py-2 text-center">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.length === 0 ? (
                            <tr>
                              <td colSpan={g.days.length + 2} className="px-3 py-4 text-center italic text-text-faint">
                                No employees in this group.
                              </td>
                            </tr>
                          ) : (
                            g.rows.map((r, ri) => (
                              <tr key={ri} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 text-text! sticky left-0 bg-surface whitespace-nowrap">{r.employee}</td>
                                {r.cells.map((c, ci) => (
                                  <td key={ci} className="px-2 py-2 text-center text-text-muted">
                                    {c}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center font-medium text-text!">{r.total}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
