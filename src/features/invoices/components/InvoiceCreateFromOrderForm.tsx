import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { useOrderDetail } from '../../salesOrders/orderDetail.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { InvoiceCreateForm } from './InvoiceCreateForm'
import type { NewInvoiceLine } from '../invoiceCreate.queries'

// Reached from a Sales Order's own "Create Invoice" action (see
// OrderDetail.tsx's action bar) — the real legacy destination is
// compta/facture/card.php?action=create&origin=commande&originid=X, which
// copies that order's own real lines into the new invoice 1:1 (confirmed by
// reading that handler directly: card.php's `toselect[]`-driven addline()
// loop passes each selected order line's subprice/qty/tva_tx straight
// through unchanged). Reproduced here by seeding InvoiceCreateForm's own
// Item Table from the order's already-fetched real lines — not a literal
// copy of the PHP page, but the same real conversion, wired to live data.
//
// InvoiceCreateForm's `fixedCustomerId`/`initialLines` props are captured
// once into local state on mount (same as every other CreateXFromCustomer
// wrapper in this app, whose :id comes synchronously from the route) — so
// this wrapper waits for the order to finish loading before rendering it,
// rather than mounting early with an empty customer/lines that would then
// silently never update.
export function InvoiceCreateFromOrderForm() {
  const { id: orderId } = useParams<{ id: string }>()
  const { data: order, isLoading, isError, error, refetch } = useOrderDetail(orderId)
  const backTo = orderId ? ROUTES.orderDetail.replace(':id', orderId) : ROUTES.orderList

  if (isLoading) return <LegacyLoadingCard label="Loading order…" />
  if (isError || !order) return <LegacyErrorCard title="Couldn't load the order" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const initialLines: NewInvoiceLine[] = order.lines.map((l) => ({
    productId: l.productId > 0 ? String(l.productId) : undefined,
    label: l.productLabel || l.description,
    qty: l.qty,
    unitPriceHt: l.unitPriceExcl,
    vatRate: l.vatRate,
    vatCode: l.vatCode || undefined,
    discountPercent: l.discountPercent > 0 ? l.discountPercent : undefined,
  }))

  return <InvoiceCreateForm fixedCustomerId={order.thirdPartySocid ? String(order.thirdPartySocid) : undefined} backTo={backTo} initialLines={initialLines} />
}
