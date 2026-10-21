import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { History } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useQuotationConsumptionHistory } from '../quotationDetail.queries'
import { useQuotationCard } from '../quotationDetail.queries'

export function ConsumptionHistoryReplica() {
  const { id } = useParams<{ id: string }>()
  const quotation = useQuotationCard(id)
  const movements = useQuotationConsumptionHistory(id)
  const history = useMemo(() => movements.data?.rows ?? [], [movements.data])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History size={20} className="text-brand" />
        <h2 className="text-lg font-bold text-text!">Consumption History{quotation.data?.ref ? ` — ${quotation.data.ref}` : ` — Quotation #${id}`}</h2>
        <Link to={ROUTES.quotationDetail.replace(':id', id ?? '')} className="ml-auto text-sm font-medium text-brand hover:underline">Back to quotation</Link>
      </div>
      {quotation.isError ? (
        <Card className="!h-auto"><p role="alert" className="text-sm text-danger">{quotation.error instanceof Error ? quotation.error.message : 'Could not load the quotation.'}</p></Card>
      ) : quotation.isLoading || movements.isLoading ? (
        <Card className="!h-auto text-sm text-text-muted">Loading consumption history…</Card>
      ) : movements.isError ? (
        <Card className="!h-auto"><p role="alert" className="text-sm text-danger">{movements.error instanceof Error ? movements.error.message : 'Could not load consumption history.'}</p></Card>
      ) : (
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2.5">Date</th>
                  <th className="font-medium px-4 py-2.5">Product</th>
                  <th className="font-medium px-4 py-2.5">Warehouse</th>
                  <th className="font-medium px-4 py-2.5">Batch / Lot</th>
                  <th className="font-medium px-4 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-4 py-2.5">User</th>
                </tr>
              </thead>
              <tbody>
                {history.length ? history.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-muted">{row.date || '—'}</td>
                    <td className="px-4 py-2.5 text-text!">{[row.product_ref, row.product_label].filter(Boolean).join(' — ') || '—'}</td>
                    <td className="px-4 py-2.5 text-text-muted">{row.warehouse || '—'}</td>
                    <td className="px-4 py-2.5 text-text-muted">{row.lot_serial || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{row.qty}</td>
                    <td className="px-4 py-2.5 text-text-muted">{row.by || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-text-faint italic">No consumption movements are linked to this quotation.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
