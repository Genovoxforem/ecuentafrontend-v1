import { Info, Settings2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'

const TABS = ['Settings', 'EmpDesignation', 'Tax Deductions', 'Device Setting', 'About', 'Add Expenses & Allowances', 'Payee Tax Slab']

// Real page: custom/payroll/admin/setup.php — no confirmed JSON API
// (classic form-POST only, per this module's earlier full audit — see
// payrollPlaceholders.ts). Only the Settings tab is built (matching the one
// screenshot of this page seen this session); the other 6 tabs are shown
// for layout context but aren't wired to anything. Row values below mirror
// what that screenshot showed as already configured — shown read-only
// rather than turned into editable selects, since there's no confirmed
// source for the full option lists (accounting codes, bank list, etc.)
// beyond what's currently set.
const CODE_ROWS = [
  { code: 'Basic001', label: 'Basic Salary', account: 'Salaries' },
  { code: 'Gratuity002', label: 'Gratuity', account: 'PROVISIONS FOR EMPLOYEE BENEFITS' },
  { code: 'Overtime003', label: 'Overtime Rate', account: 'Wages' },
  { code: 'Tax004', label: 'Tax Deduction', account: 'Payroll tax payable' },
  { code: 'Adv005', label: 'Advance Payment', account: 'Salary in advance' },
  { code: 'Loan006', label: 'Loan', account: 'Loans and advances' },
]

export function PayrollSetupForm() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Settings2 size={20} className="text-brand" /> PayrollSetup
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">custom/payroll/admin/setup.php</code>. It has no confirmed JSON API, so only the Settings tab is built
          here (matching what was seen on the real page) and shown read-only — the other tabs aren't wired.
        </p>
      </Card>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab, i) => (
          <span
            key={tab}
            className={`px-3 py-2 text-sm font-medium uppercase tracking-wide ${
              i === 0 ? 'text-brand border-b-2 border-brand' : 'text-text-faint cursor-not-allowed'
            }`}
            title={i === 0 ? undefined : 'Not built — see the classic page'}
          >
            {tab}
          </span>
        ))}
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Code</th>
              <th className="font-medium px-4 py-2.5">Label</th>
              <th className="font-medium px-4 py-2.5">Accounting Code</th>
            </tr>
          </thead>
          <tbody>
            {CODE_ROWS.map((r) => (
              <tr key={r.code} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text!">{r.code}</td>
                <td className="px-4 py-3 text-text-muted">{r.label}</td>
                <td className="px-4 py-3 text-text-muted">
                  <input value={r.account} disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="!h-auto space-y-4">
        <Field label="Bank For Payroll Payments" required>
          <input value="CreditBank" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
        </Field>
        <Field label="NAPSA Limit" required>
          <input value="1700" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
        </Field>
        <Field label="Salary Calculation From" required>
          <input value="Gross Salary" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
        </Field>
        <div className="flex justify-end">
          <button type="button" disabled title="No confirmed write endpoint for this action" className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white opacity-50 cursor-not-allowed">
            Update
          </button>
        </div>
      </Card>
    </div>
  )
}
