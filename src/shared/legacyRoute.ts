import { ROUTES } from '../routes'

// Backend object-card pages that have a native React detail page, keyed by the
// card's path. `params` lists the query parameters that carry the object id
// (Dolibarr is inconsistent: invoices use facid, third parties socid, the rest
// id) — the first one present wins. Sorted longest path first because paths are
// matched by suffix (installs can sit under a sub-directory) and
// /fourn/commande/card.php also ends with /commande/card.php.
const CARD_ROUTES: { path: string; params: string[]; route: string }[] = [
  { path: '/commande/card.php', params: ['id'], route: ROUTES.orderDetail },
  { path: '/comm/propal/card.php', params: ['id'], route: ROUTES.quotationDetail },
  { path: '/compta/facture/card.php', params: ['facid', 'id'], route: ROUTES.invoiceDetail },
  // Ecuenta's own paths for the same invoices (same ids: /compta/sales/card.php?facid=289 shows the
  // invoice /compta/facture/card.php?facid=289 does).
  { path: '/compta/sales/card.php', params: ['facid', 'id'], route: ROUTES.invoiceDetail },
  { path: '/fourn/purchase/card.php', params: ['id', 'facid'], route: ROUTES.vendorInvoiceDetail },
  { path: '/fourn/commande/card.php', params: ['id'], route: ROUTES.purchaseOrderDetail },
  { path: '/fourn/facture/card.php', params: ['facid', 'id'], route: ROUTES.vendorInvoiceDetail },
  { path: '/contrat/card.php', params: ['id'], route: ROUTES.contractDetail },
  { path: '/societe/card.php', params: ['socid', 'id'], route: ROUTES.customerDetail },
  { path: '/product/card.php', params: ['id'], route: ROUTES.productDetail },
  // Ecuenta's own product page (same ids as product/card.php).
  { path: '/productinfo/index.php', params: ['id'], route: ROUTES.productDetail },
  { path: '/projet/card.php', params: ['id'], route: ROUTES.projectDetail },
  { path: '/expensereport/card.php', params: ['id'], route: ROUTES.expenseReportDetail },
  // Ecuenta's own expense module page for the same reports.
  { path: '/expense/card.php', params: ['id'], route: ROUTES.expenseCard },
  // Ecuenta's user profile (same ids as user/card.php).
  { path: '/userprofile/index.php', params: ['id'], route: ROUTES.userDetail },
  { path: '/product/stock/card.php', params: ['id'], route: ROUTES.warehouseDetail },
  { path: '/product/inventory/card.php', params: ['id'], route: ROUTES.inventoryDetail },
].sort((a, b) => b.path.length - a.path.length)

// Turns a backend object-card URL into the React route that shows the same
// object, or null when that kind of object has no React page. Callers render
// null as plain text — never as a link to the backend page (see
// feedback-no-direct-php-links). Accepts absolute URLs and the `/<dir>/htdocs`
// prefix some backend installs put in front of every path.
export function resolveLegacyRoute(url: string | null | undefined): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url, 'http://backend.invalid')
  } catch {
    return null
  }
  const path = parsed.pathname.replace(/^\/[^/]+\/htdocs(?=\/)/, '')
  for (const card of CARD_ROUTES) {
    if (!path.endsWith(card.path)) continue
    const id = card.params.map((p) => parsed.searchParams.get(p)).find((v) => v && /^\d+$/.test(v))
    return id ? card.route.replace(':id', id) : null
  }
  return null
}
