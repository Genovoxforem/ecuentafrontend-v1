import { BarChart3, Info } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'

// compta/tva/index.php — a month-by-month VAT collected/paid/balance
// report, computed server-side via tax_by_rate() + raw SQL, no JSON, no writes.
export function VatReportByMonthPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Report By Month - Sales Tax
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/tva/index.php</code> — a classic server-rendered month-by-month VAT summary, no JSON API.
        </p>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">Month</th>
                <th className="font-medium px-3 py-2 text-right">VAT Collected</th>
                <th className="font-medium px-3 py-2 text-right">VAT Paid</th>
                <th className="font-medium px-3 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-3 py-4 text-text-faint italic">
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
