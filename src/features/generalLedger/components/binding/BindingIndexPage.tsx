import { GitCompareArrows, Info } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Shared shell for the 3 real Binding "index.php" dashboards (customer/
// supplier/expensereport) — each a 12-month pivot of bound vs. unbound line
// counts, server-rendered, no JSON. The one write action on each (
// "ValidateHistory") is a plain GET link doing a bulk auto-bind UPDATE — not
// a form-POST or JSON call, so not reproduced here.
export function BindingIndexPage({ title, sourcePath }: { title: string; sourcePath: string }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <GitCompareArrows size={20} className="text-brand" /> {title}
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">{sourcePath}</code> — a 12-month pivot of bound/unbound line counts, server-rendered, no JSON. Its
          "ValidateHistory" bulk auto-bind is a plain GET link (not a form-POST or JSON write) — an unsafe pattern for a bulk change, so it isn't reproduced
          here.
        </p>
      </Card>
      {['Lines Not Bound', 'Lines Bound'].map((section) => (
        <Card key={section} className="!p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">{section}</div>
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
      ))}
    </div>
  )
}
