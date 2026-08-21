import { HandCoins } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../utils/format'
import { useAdvancePayments } from '../advancePayments.queries'

function fmtDate(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

// Real GET /api/invoices/advance-payments/ data (see
// advancePayments.queries.ts), reading llx_paiement_advance directly.
export function AdvancePaymentListPage() {
  const { data, isLoading, isError } = useAdvancePayments()
  const rows = data?.items ?? []

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <HandCoins size={20} className="text-brand" /> Customer Advance Payments
      </h2>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref</th>
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5">Payment Type</th>
              <th className="font-medium px-4 py-2.5">Author</th>
              <th className="font-medium px-4 py-2.5 text-right">Total Advance</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-danger">
                  Could not load advance payments.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 text-text!">{r.thirdParty || '-'}</td>
                  <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                  <td className="px-4 py-3 text-text-muted">{r.author || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
