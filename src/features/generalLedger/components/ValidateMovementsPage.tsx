import { useState } from 'react'
import { ShieldCheck, Info, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// accountancy/closure/validate.php — same 12-month pivot as Annual Closure,
// plus a per-month checkbox and a "ValidateMovements" action. That action is
// a plain GET link on the real page (not a form-POST or JSON call) that
// bulk-sets date_validated on every unvalidated accounting_bookkeeping row
// for the checked months — an unsafe pattern (a bulk write behind a GET
// request) not worth reproducing as-is, so it stays inert here rather than
// wired to imitate it.
export function ValidateMovementsPage() {
  const [year, setYear] = useState(new Date().getFullYear())

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ShieldCheck size={20} className="text-brand" /> Validate Movements
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
          Backend page: <code className="font-mono">accountancy/closure/validate.php</code>. Its bulk validate action is a plain GET link on the real page
          (not a form-POST or JSON write) — an unsafe pattern for a bulk data change, so it isn't reproduced here; the checkboxes below stay disabled.
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
              </tr>
            </thead>
            <tbody>
              <tr>
                {MONTHS.map((m) => (
                  <td key={m} className="px-3 py-3 text-center">
                    <input type="checkbox" disabled className="cursor-not-allowed" />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <button type="button" disabled title="Not reproduced — see the banner above" className="px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white opacity-50 cursor-not-allowed">
            Validate Movements
          </button>
          <span className="flex items-center gap-1 text-xs text-text-faint">
            <AlertTriangle size={12} /> {year}
          </span>
        </div>
      </Card>
    </div>
  )
}
