import { PieChart, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// compta/resultat/clientfourn.php ("Report In/Out, By Predefined Account
// Groups") — a classic P&L-style report driven by accounting mode
// (CREANCES-DETTES/RECETTES-DEPENSES/BOOKKEEPING) and date range, fully
// server-rendered, no JSON, no writes.
export function PredefinedGroupsReportPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PieChart size={20} className="text-brand" /> By Predefined Groups
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/resultat/clientfourn.php</code> — a classic server-rendered income/outcome report (by accounting
          mode and date range), no JSON API, no writes.
        </p>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">Account Group</th>
                <th className="font-medium px-3 py-2 text-right">Amount HT</th>
                <th className="font-medium px-3 py-2 text-right">Amount TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-3 py-4 text-text-faint italic">
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
