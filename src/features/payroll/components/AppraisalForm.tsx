import { Star, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

// payroll/appraisal.php's "Give Performance Appraisal" panel: picking an
// Employee + Month and pressing Go calls
// payroll/ajax_search.php?apprais=...&month=..., which renders the
// employee's designation's indicator competencies (from
// llx_payroll_indicator, joined on job=designation) as an HTML fragment —
// not JSON — directly into the page. Same reveal-flow limitation as
// IndicatorForm; designed to match the real page's initial state, left
// inert rather than half-wiring a form with no save target of its own.
export function AppraisalForm() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Star size={20} className="text-brand" /> Appraisal
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/appraisal.php</code>. Its "Go" button fetches the employee's competency list from{' '}
          <code className="font-mono">payroll/ajax_search.php</code> as a pre-rendered HTML fragment, not JSON — there's no data contract this page can wire,
          so the fields below are disabled.
        </p>
      </Card>

      <Card className="!h-auto space-y-3">
        <h3 className="text-sm font-semibold text-text!">Give Performance Appraisal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Employee<span className="text-danger"> *</span>
            </span>
            <select disabled className={inputCls}>
              <option>Select Employee...</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Select Month<span className="text-danger"> *</span>
            </span>
            <input disabled type="month" className={inputCls} />
          </label>
        </div>
      </Card>
    </div>
  )
}
