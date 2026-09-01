import { Wallet, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

// payroll/manage_salary.php's "Go" button fetches every employee's salary/
// shift assignment via payroll/ajax_search.php?entityEmp=..., which renders
// a full HTML table (with a per-row "Assign Details" edit modal) directly
// into the page — not JSON. There's no data contract this page can wire
// without scraping, so the search field below is disabled.
export function ManageSalaryForm() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet size={20} className="text-brand" /> Manage Salary
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/manage_salary.php</code>. Selecting an entity and pressing "Go" fetches every employee's
          salary/shift assignment from <code className="font-mono">payroll/ajax_search.php</code> as a pre-rendered HTML table — no JSON contract to wire
          without scraping, so the field below is disabled.
        </p>
      </Card>

      <Card className="!h-auto space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Select Entity<span className="text-danger"> *</span>
            </span>
            <select disabled className={inputCls}>
              <option>Master entity</option>
            </select>
          </label>
        </div>
      </Card>
    </div>
  )
}
