import { Wallet, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

// payroll/shiftsmanual_amount.php?shift=manual|holidayshift is search-only
// (no "Add" action at all — confirmed by reading it directly). Its results
// come from payroll/shiftsmanual_ajax.php's list_shift_report action, which
// echoes raw <tr> HTML, not JSON — no data contract to wire without
// scraping, so the fields below are disabled.
export function ShiftSalarySearchForm({ title, sourcePath }: { title: string; sourcePath: string }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet size={20} className="text-brand" /> {title}
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">{sourcePath}</code>. It's search-only — no "Add" action at all — and its results come from
          <code className="font-mono"> payroll/shiftsmanual_ajax.php</code>'s <code className="font-mono">list_shift_report</code> action, which renders
          raw HTML table rows, not JSON. No data contract to wire without scraping, so the fields below are disabled.
        </p>
      </Card>

      <Card className="!h-auto space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Shift Month<span className="text-danger"> *</span>
            </span>
            <input disabled type="month" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Entity<span className="text-danger"> *</span>
            </span>
            <select disabled className={inputCls}>
              <option>All Entity</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Employee<span className="text-danger"> *</span>
            </span>
            <select disabled className={inputCls}>
              <option>All</option>
            </select>
          </label>
        </div>
      </Card>
    </div>
  )
}
