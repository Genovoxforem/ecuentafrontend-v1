import { useMemo, useState } from 'react'
import { CreditCard, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useUsersSummary } from '../../users/users.queries'
import { useSalaryAssignmentRecords } from '../payrollLists.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

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
// session's own real Manage Salary assignments (see
// useSalaryAssignmentRecords), matching the real page's own "Salary Did Not
// Set Yet" fallback for anyone unassigned. Payable Salary and the actual
// Generate Payroll/Pay All writes are NOT reproduced: the real
// payroll/ajax.php?savePayment write needs ~20 pre-computed values (worked
// hours from real attendance, approved advance/loan deductions, allowances,
// PAYE) that only exist inside that same HTML-fragment computation — read
// directly, not guessed — so fabricating a payable number here would very
// likely disagree with the real page's own figure.
export function MakePaymentForm() {
  const { data: users } = useUsersSummary()
  const assignments = useSalaryAssignmentRecords()

  const [month, setMonth] = useState(currentMonthIso())
  const [hasGenerated, setHasGenerated] = useState(false)

  const assignmentByEmployee = useMemo(() => {
    const map = new Map<number, (typeof assignments)[number]>()
    for (const a of assignments) if (!map.has(a.employeeId)) map.set(a.employeeId, a)
    return map
  }, [assignments])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CreditCard size={20} className="text-brand" /> Make Payment
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/payment.php</code>. Employee/Salary Type/Basic Salary below reflect this session's own real
          Manage Salary assignments. Payable Salary and Generate Payroll/Pay All aren't wired to a real write — the real computation chains attendance,
          approved advances/loans, allowances and PAYE tax in a way that can't be reproduced honestly here (see this file's own comment).
        </p>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-danger mb-1">Select Month *</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Select Entity *</label>
            <input value="Master entity" disabled className={`w-full ${inputCls} cursor-not-allowed opacity-70`} />
          </div>
          <button
            type="button"
            onClick={() => setHasGenerated(true)}
            className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
          >
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
      </Card>

      {hasGenerated && (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
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
                {(users?.users ?? []).map((u) => {
                  const assignment = assignmentByEmployee.get(u.id)
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <input type="checkbox" disabled />
                      </td>
                      <td className="px-3 py-2 text-text!">{u.name || u.login}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{formatMonthLabel(month)}</td>
                      <td className="px-3 py-2">
                        {assignment ? (
                          <span className="text-text-muted">{assignment.salaryType} (Monthly)</span>
                        ) : (
                          <span className="text-danger">Salary Did Not Set Yet</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">ZMW</td>
                      <td className="px-3 py-2 text-text-muted">{assignment ? assignment.basicSalary.toFixed(2) : '0.00'}</td>
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
      )}
    </div>
  )
}
