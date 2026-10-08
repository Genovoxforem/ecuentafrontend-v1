import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { History } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useQuotationCard } from '../quotationDetail.queries'
import { useStockMovementsList } from '../../warehouses/stockMovementsList.queries'

// Uses the existing stock-movement JSON API and filters returned origin links
// to this quotation. The backend's dedicated consumption-history page has no
// JSON endpoint, so results beyond the movement API's page limit are flagged.
export function ConsumptionHistoryReplica() {
  const { id } = useParams<{ id: string }>()
  const quotation = useQuotationCard(id)
  const movements = useStockMovementsList(
    { search: quotation.data?.ref, limit: 1000 },
    Boolean(quotation.data?.ref && id),
  )
  const history = useMemo(
    () =>
      (movements.data?.movements ?? []).filter((row) => {
        if (!id || !row.originUrl) return false
        try {
          const origin = new URL(row.originUrl, window.location.origin)
          return origin.pathname.includes('/propal/card.php') && origin.searchParams.get('id') === id
        } catch {
          return false
        }
      }),
    [id, movements.data],
  )

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
        <Card className="!h-auto"><p role="alert" className="text-sm text-danger">{movements.error instanceof Error ? movements.error.message : 'Could not load stock movements.'}</p></Card>
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
                    <td className="px-4 py-2.5 text-text-muted">{row.dateFormatted || '—'}</td>
                    <td className="px-4 py-2.5 text-text!">{[row.productRef, row.productLabel].filter(Boolean).join(' — ') || '—'}</td>
                    <td className="px-4 py-2.5 text-text-muted">{row.warehouseRef || '—'}</td>
                    <td className="px-4 py-2.5 text-text-muted">{row.batch || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{row.qty}</td>
                    <td className="px-4 py-2.5 text-text-muted">{row.author || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-text-faint italic">No consumption movements are linked to this quotation.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {(movements.data?.totalRecords ?? 0) > (movements.data?.movements.length ?? 0) && (
            <p className="border-t border-border px-4 py-3 text-xs text-warning">The backend returned a capped movement page. This history may be incomplete.</p>
          )}
        </Card>
      )}
    </div>
  )
}
