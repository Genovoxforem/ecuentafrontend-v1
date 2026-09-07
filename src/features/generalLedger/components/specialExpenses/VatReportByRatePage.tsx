import { BarChart3, Info } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'

// compta/tva/quadri_detail.php — same reporting engine, broken down by VAT
// rate, no JSON, no writes.
export function VatReportByRatePage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Report By Rate - Sales Tax
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/tva/quadri_detail.php</code> — a classic server-rendered VAT-by-rate breakdown, no JSON API.
        </p>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">VAT Rate</th>
                <th className="font-medium px-3 py-2 text-right">Amount HT</th>
                <th className="font-medium px-3 py-2 text-right">VAT Amount</th>
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
