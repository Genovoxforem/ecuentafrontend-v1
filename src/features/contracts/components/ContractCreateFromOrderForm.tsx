import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { useOrderDetail } from '../../salesOrders/orderDetail.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ContractCreateForm } from './ContractCreateForm'

// Reached from a Sales Order's own "Create contract" action (see
// OrderDetail.tsx's action bar) — the real legacy destination is
// contrat/index_v2.php?origin=commande&originid=X&socid=Y, a bespoke page
// whose own JS (contract_manager.js) posts to contrat/api/contract_handler.php
// — confirmed by reading both directly that neither ever actually reads
// origin/originid at all (only socid pre-fills), so the real live page's
// Item Table always starts empty regardless of which order you came from.
// This wrapper does one better with real data already on hand: it seeds
// ContractCreateForm's own Item Table from the order's real lines (the same
// order→contract line-copy Dolibarr's OLDER contrat/card.php engine does
// support, just never wired into this app's actual live contract page).
export function ContractCreateFromOrderForm() {
  const { id: orderId } = useParams<{ id: string }>()
  const { data: order, isLoading, isError, error, refetch } = useOrderDetail(orderId)
  const backTo = orderId ? ROUTES.orderDetail.replace(':id', orderId) : ROUTES.orderList

  if (isLoading) return <LegacyLoadingCard label="Loading order…" />
  if (isError || !order) return <LegacyErrorCard title="Couldn't load the order" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const initialLines = order.lines.map((l) => ({
    productId: l.productId > 0 ? String(l.productId) : '',
    description: l.productLabel || l.description,
    qty: l.qty,
    vatRate: l.vatRate,
    unitPrice: l.unitPriceExcl,
    discountPct: l.discountPercent,
  }))

  return <ContractCreateForm fixedCustomerId={order.thirdPartySocid ? String(order.thirdPartySocid) : undefined} backTo={backTo} initialLines={initialLines} />
}
