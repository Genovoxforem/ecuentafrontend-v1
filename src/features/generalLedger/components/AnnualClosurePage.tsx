import { CalendarCheck2 } from 'lucide-react'
import { ClosurePivotPage } from './ClosurePivotPage'

// accountancy/closure/index.php — the real per-month count of accounting
// movements that are not validated yet, for the chosen year.
export function AnnualClosurePage() {
  return (
    <ClosurePivotPage
      icon={CalendarCheck2}
      title="Annual Closure"
      path="/accountancy/closure/index.php"
      note="Number of movements by month that are not validated yet (needed before a fiscal year can be closed)."
    />
  )
}
