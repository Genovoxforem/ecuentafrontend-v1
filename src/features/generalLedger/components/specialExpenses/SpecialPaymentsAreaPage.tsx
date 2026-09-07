import { Wallet2, Info } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'

// compta/charges/index.php — a dashboard combining 3 server-rendered
// tables (Social Contributions / VAT / Local Tax payments), pure
// `$db->query()` + print, no JSON, no writes on this page itself.
export function SpecialPaymentsAreaPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet2 size={20} className="text-brand" /> Area For All Special Payments
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/charges/index.php</code> — a dashboard of 3 server-rendered payment tables (Social Contributions,
          VAT, Local Tax), no JSON API. Use Social/Fiscal Taxes and Sales Tax in the sidebar for each area's own list.
        </p>
      </Card>
      {['Social Contributions Payments', 'VAT Payments', 'Local Tax Payments'].map((title) => (
        <Card key={title} className="!p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">{title}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {['Period End Date', 'Label', 'Type', 'Expected To Pay', 'Payment Ref', 'Date Payment', 'Account', 'Paid'].map((c) => (
                    <th key={c} className="font-medium px-3 py-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                    No Data Available In Table
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}
