import { FileSpreadsheet, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

// payroll/salary_temp.php's "Salary Template" panel recalculates its
// NAPSA/NHIMA/PAYE figures on every keystroke by POSTing the whole
// serialized form to payroll/loadcalculation.php (a real, working, server-
// side tax engine — confirmed by reading it directly) — but that endpoint
// renders an HTML fragment straight into the page, not JSON, so there's no
// data contract to wire without scraping. payroll/ajax.php's own
// saveTemplate/saveSalaryList actions are real too, but every save depends
// on that same live-computed total matching Gross Salary first — so this
// reproduces the real page's initial field layout only, left inert.
export function SalaryTemplateForm() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileSpreadsheet size={20} className="text-brand" /> Salary Template
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/salary_temp.php</code>. Its live PAYE/NAPSA/NHIMA figures come from a real server-side
          calculation (<code className="font-mono">payroll/loadcalculation.php</code>), but that endpoint renders an HTML fragment, not JSON — no data
          contract to wire without scraping, so the fields below are disabled rather than half-computing the numbers.
        </p>
      </Card>

      <Card className="!h-auto space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Salary Grades<span className="text-danger"> *</span>
            </span>
            <input disabled placeholder="Enter Grade Name" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Currency</span>
            <select disabled className={inputCls}>
              <option>Zambian Kwacha (ZMW)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Gross Salary<span className="text-danger"> *</span>
            </span>
            <input disabled placeholder="Enter Gross Salary" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              % Of Basic Salary<span className="text-danger"> *</span>
            </span>
            <input disabled className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Basic Salary<span className="text-danger"> *</span>
            </span>
            <input disabled placeholder="Enter Basic Salary" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Monthly Permitted Leaves</span>
            <input disabled defaultValue="0" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Per day salary calculation<span className="text-danger"> *</span>
            </span>
            <select disabled className={inputCls}>
              <option>Select...</option>
            </select>
          </label>
        </div>
      </Card>
    </div>
  )
}
