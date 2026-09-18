import { useQuery } from '@tanstack/react-query'
import { usePurchaseOrdersSummary, type PurchaseOrderRow } from '../purchaseOrders/purchaseOrders.queries'
import { parsePurchaseOrderDispatch } from '../purchaseOrders/purchaseOrderDispatchParser'

// Real reference page: reception/card.php?action=create2's "Waiting For
// Reception" tab. Its own SQL (read directly from source) is:
//   SELECT * FROM llx_commande_fournisseur WHERE fk_statut > '0'
//     ORDER BY rowid DESC
// then per matching order a second query checks llx_element_element for any
// row with fk_source=<order id> AND targettype='reception', skipping the
// order if one exists (i.e. it already has a reception). No filters on this
// page (unlike Yet To Create Shipment's date/customer/user fields) — just
// the plain list.
//
// Step 1 is reproduced from the already-real fourn/commande/purchase_ajax_list.php
// (usePurchaseOrdersSummary, already used by the Purchase Orders module).
// Step 2 has no JSON equivalent, but Purchase Order Detail's own "Item
// Receipts" tab already does the exact same real check (usePurchaseOrderDispatch,
// parsing fourn/commande/dispatch.php?id=X's real "Receipts for this order"
// table) — an order with zero rows there is exactly "no reception yet". This
// reruns that same real, already-proven parser once per non-Draft purchase
// order, the same "per-order real check bounded by the candidate set"
// approach already used for Yet To Create Shipment.
export interface PendingReceptionRow extends PurchaseOrderRow {
  needsReception: true
}

async function orderStillNeedsReception(id: number): Promise<boolean> {
  const res = await fetch(`/fourn/commande/dispatch.php?id=${id}`, { credentials: 'same-origin' })
  if (!res.ok) return false
  const html = await res.text()
  return parsePurchaseOrderDispatch(html).receipts.length === 0
}

export function useOrdersPendingReception() {
  const summary = usePurchaseOrdersSummary()
  const candidates = (summary.data?.orders ?? []).filter((o) => (o.statusCode ?? 0) > 0)
  const candidateKey = candidates.map((c) => c.id).join(',')

  const check = useQuery({
    queryKey: ['purchaseOrders', 'pendingReception', candidateKey],
    queryFn: async (): Promise<PendingReceptionRow[]> => {
      const results = await Promise.all(
        candidates.map(async (order) => ({ order, needs: order.id !== null ? await orderStillNeedsReception(order.id) : false })),
      )
      return results.filter((r) => r.needs).map((r) => ({ ...r.order, needsReception: true as const }))
    },
    enabled: !summary.isLoading && candidates.length > 0,
    staleTime: 1000 * 30,
  })

  return {
    isLoading: summary.isLoading || (candidates.length > 0 && check.isLoading),
    isError: summary.isError || check.isError,
    error: summary.error ?? check.error,
    rows: candidates.length === 0 ? [] : (check.data ?? []),
  }
}
