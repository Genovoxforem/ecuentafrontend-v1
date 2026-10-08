import { useMemo, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useUsersSummary } from '../../users/users.queries'
import { usePayrollLegacyList } from '../payrollLists.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(value: string) {
  if (!value) return ''
  const [year, month] = value.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// payroll/payment.php's employee/status table comes from
// payroll/ajax_search.php?entityEmpPay=1 as an HTML fragment — not scraped
// here. Its Salary Type/Basic Salary columns are instead resolved from this
// real Manage Salary List (payroll/manage_salary_list.php), matching the real
// page's own "Salary Did Not Set Yet" fallback for anyone unassigned. Payable Salary and the actual
// Generate Payroll/Pay All writes are NOT reproduced: the real
// payroll/ajax.php?savePayment write needs ~20 pre-computed values (worked
// hours from real attendance, approved advance/loan deductions, allowances,
// PAYE) that only exist inside that same HTML-fragment computation — read
// directly, not guessed — so fabricating a payable number here would very
// likely disagree with the real page's own figure.
export function MakePaymentForm() {
  const { data: users } = useUsersSummary()
  const { data: salaryList } = usePayrollLegacyList('manageSalaryList')

  const [month, setMonth] = useState(currentMonthIso())
  const [hasGenerated, setHasGenerated] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  // The real list names employees by their display name, not id.
  const assignmentByName = useMemo(() => {
    const map = new Map<string, { salaryType: string; basicSalary: string }>()
    if (!salaryList) return map
    const col = (label: string) => salaryList.headers.findIndex((h) => h.toLowerCase() === label)
    const nameCol = col('employee name')
    const typeCol = col('salary type')
    const basicCol = col('basic salary')
    for (const row of salaryList.rows) {
      const key = (row.cells[nameCol] ?? '').toLowerCase()
      if (key && !map.has(key)) map.set(key, { salaryType: row.cells[typeCol] ?? '', basicSalary: row.cells[basicCol] ?? '' })
    }
    return map
  }, [salaryList])

  const rows = users?.users ?? []
  const pageRows = rows.slice((page - 1) * perPage, page * perPage)

  function handleGenerate() {
    setHasGenerated(true)
    setPage(1)
  }
  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    // -m-6/-mx-6/-top-6: same sticky-header pattern as ManualShiftAttendanceForm.tsx /
    // StickyFormShell.tsx — sticky's offset is measured from the scrolling ancestor's
    // padding edge, so the negative offsets compensate for AppShell main's own p-6 inset.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <CreditCard size={20} className="text-brand" /> Make Payment
        </h2>


        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-danger mb-1">Select Month *</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Select Entity *</label>
            <input value="Master entity" disabled className={`w-full ${inputCls} cursor-not-allowed opacity-70`} />
          </div>
          <button type="button" onClick={handleGenerate} className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
            Generate Payroll
          </button>
          <button
            type="button"
            disabled
            title="No confirmed write endpoint for this action — see the banner above"
            className="h-9 rounded-md border border-input-border px-4 text-sm font-medium text-text-muted opacity-50 cursor-not-allowed"
          >
            Pay All
          </button>
        </div>
      </div>

      {hasGenerated && (
        <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-end gap-3 p-3 border-b border-border">
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-3 py-2 w-10">
                      <input type="checkbox" disabled title="Pay All isn't wired — see the banner above" />
                    </th>
                    <th className="font-medium px-3 py-2">Employee Name</th>
                    <th className="font-medium px-3 py-2">Month</th>
                    <th className="font-medium px-3 py-2">Salary Type</th>
                    <th className="font-medium px-3 py-2">Currency</th>
                    <th className="font-medium px-3 py-2">Basic Salary</th>
                    <th className="font-medium px-3 py-2">Payable Salary</th>
                    <th className="font-medium px-3 py-2">Status</th>
                    <th className="font-medium px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u) => {
                    const assignment = assignmentByName.get((u.name || u.login).toLowerCase())
                    return (
                      <tr key={u.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <input type="checkbox" disabled />
                        </td>
                        <td className="px-3 py-2 text-text!">{u.name || u.login}</td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{formatMonthLabel(month)}</td>
                        <td className="px-3 py-2">
                          {assignment ? (
                            <span className="text-text-muted">{assignment.salaryType}</span>
                          ) : (
                            <span className="text-danger">Salary Did Not Set Yet</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-muted">ZMW</td>
                        <td className="px-3 py-2 text-text-muted">{assignment ? assignment.basicSalary || '0.00' : '0.00'}</td>
                        <td className="px-3 py-2 text-text-faint" title="Not computed — see the banner above">
                          —
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">Unpaid</span>
                        </td>
                        <td className="px-3 py-2">
                          <button type="button" disabled title="No confirmed write endpoint for this action" className="text-text-faint opacity-60 cursor-not-allowed">
                            Pay
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {hasGenerated && <ListPagination page={page} perPage={perPage} total={rows.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
