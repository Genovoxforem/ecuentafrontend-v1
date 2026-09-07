import { useState } from 'react'
import { CalendarCheck2, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// accountancy/closure/index.php — a 12-month pivot of accounting_bookkeeping
// row counts for the selected fiscal year, built from a single raw SQL
// query and rendered server-side. No JSON, no writes on this page (the
// "Validate Movements" button just links to validate.php).
export function AnnualClosurePage() {
  const [year, setYear] = useState(new Date().getFullYear())

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <CalendarCheck2 size={20} className="text-brand" /> Annual Closure
        </h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-text! px-1.5">Year {year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">accountancy/closure/index.php</code> — a classic server-rendered per-month entry-count report, no JSON
          API. Columns match the real page exactly.
        </p>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {MONTHS.map((m) => (
                  <th key={m} className="font-medium px-3 py-2 text-center">
                    {m}
                  </th>
                ))}
                <th className="font-medium px-3 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {MONTHS.map((m) => (
                  <td key={m} className="px-3 py-3 text-center text-text-faint">
                    —
                  </td>
                ))}
                <td className="px-3 py-3 text-center text-text-faint">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
