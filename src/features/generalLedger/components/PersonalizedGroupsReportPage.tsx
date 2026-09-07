import { PieChart, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// compta/resultat/result.php ("By Personalized Groups") — same report engine
// as clientfourn.php but grouped by user-defined AccountingCategory, with a
// month-by-month layout for the selected fiscal year. No JSON, no writes.
export function PersonalizedGroupsReportPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PieChart size={20} className="text-brand" /> By Personalized Groups
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/resultat/result.php</code> — a classic server-rendered per-month report grouped by personalized
          accounting category, no JSON API, no writes.
        </p>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">Accounting Category</th>
                <th className="font-medium px-3 py-2 text-right">Previous Period</th>
                {MONTHS.map((m) => (
                  <th key={m} className="font-medium px-3 py-2 text-right">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={14} className="px-3 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
