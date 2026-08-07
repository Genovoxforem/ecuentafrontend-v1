import { usePayrollSummary } from '../../features/payroll/payroll.queries'
import { PayrollOverview } from '../../features/payroll/components/PayrollOverview'

export function PayrollModule() {
  const { data: summary, isError } = usePayrollSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the payroll dashboard.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <PayrollOverview summary={summary} />}
    </div>
  )
}
