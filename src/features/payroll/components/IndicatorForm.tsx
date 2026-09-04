import { Link } from 'react-router-dom'
import { ArrowLeft, Gauge, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

// payroll/indicator.php's "Add Indicator" panel is more than a plain form:
// picking a Designation calls payroll/ajax_search.php?checkIndicator=... to
// decide whether to reveal a pair of dynamic Technical/Behavioural
// competency-row builders (add/remove rows client-side) before a Save
// button even appears. That check returns a bare 0/1 status with no
// competency data attached — the competency labels/levels the real page
// then lets you type are pure client-side state, not something an API
// hands back. So unlike the module's other 8 HR forms (see
// payrollActions.queries.ts), there's no real write this page's shape can
// responsibly wire without reproducing that whole reveal flow — designed
// here to match the real page's initial state, left inert.
export function IndicatorForm() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Gauge size={20} className="text-brand" /> Indicator
        </h2>
        <Link to={ROUTES.payrollEmployeeIndicator} className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text">
          <ArrowLeft size={14} /> Back to list
        </Link>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/indicator.php</code>. Selecting a Designation there reveals dynamic Technical/Behavioural
          competency-row builders via <code className="font-mono">payroll/ajax_search.php</code>, which returns an HTML fragment rather than JSON — there's
          no data contract this page can wire without reproducing that whole flow, so the field below is disabled.
        </p>
      </Card>

      <Card className="!h-auto space-y-3">
        <h3 className="text-sm font-semibold text-text!">Add Indicator</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Designation<span className="text-danger"> *</span>
            </span>
            <select disabled className={inputCls}>
              <option>Select…</option>
            </select>
          </label>
        </div>
      </Card>
    </div>
  )
}
