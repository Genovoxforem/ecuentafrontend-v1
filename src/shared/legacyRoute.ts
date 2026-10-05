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
  // The third party's customer tab (the classic dashboard links every customer and supplier here).
  { path: '/comm/card.php', params: ['socid', 'id'], route: ROUTES.customerDetail },
  // Ecuenta's own paths for the same invoices (same ids: /compta/sales/card.php?facid=289 shows the
  // invoice /compta/facture/card.php?facid=289 does).
  { path: '/compta/sales/card.php', params: ['facid', 'id'], route: ROUTES.invoiceDetail },
  { path: '/fourn/purchase/card.php', params: ['id', 'facid'], route: ROUTES.vendorInvoiceDetail },
  { path: '/fourn/commande/card.php', params: ['id'], route: ROUTES.purchaseOrderDetail },
  // Ecuenta's own purchase order page (same ids as fourn/commande/card.php); without an id it is the create page.
  { path: '/commande/purchaseorder/index_v2.php', params: ['id'], route: ROUTES.purchaseOrderDetail },
  { path: '/fourn/facture/card.php', params: ['facid', 'id'], route: ROUTES.vendorInvoiceDetail },
  { path: '/holiday/card.php', params: ['id'], route: ROUTES.leaveDetail },
  { path: '/contrat/card.php', params: ['id'], route: ROUTES.contractDetail },
  { path: '/societe/card.php', params: ['socid', 'id'], route: ROUTES.customerDetail },
  { path: '/contact/card.php', params: ['id'], route: ROUTES.contactDetail },
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

// Backend list / setup pages that have a native React page, keyed by the page's
// path. `when` narrows a path that several React pages share to the query
// parameter value that picks one (categories/index.php?type=2 is the customer
// tags page, type=4 the contact tags page); the first entry that matches wins,
// so a more specific entry goes before a plain one.
const LIST_ROUTES: { path: string; when?: { param: string; value: string }; route: string }[] = [
  { path: '/compta/facture/card.php', when: { param: 'action', value: 'create' }, route: ROUTES.invoiceCreate },
  { path: '/compta/facture/invoice.php', when: { param: 'action', value: 'create' }, route: ROUTES.invoiceCreateQuick },
  { path: '/fourn/facture/card.php', when: { param: 'action', value: 'create' }, route: ROUTES.vendorInvoiceCreate },
  { path: '/product/card.php', when: { param: 'action', value: 'create' }, route: ROUTES.productCreate },
  { path: '/societe/card.php', when: { param: 'action', value: 'create' }, route: ROUTES.customersCreate },
  { path: '/fourn/commande/list.php', route: ROUTES.purchaseOrderList },
  { path: '/compta/facture/list.php', when: { param: 'search_status', value: '3' }, route: ROUTES.invoiceAbandoned },
  // search_status=1 is "validated, not paid" — the same list filtered to its unpaid invoices.
  { path: '/compta/facture/list.php', when: { param: 'search_status', value: '1' }, route: `${ROUTES.invoiceList}?status=1` },
  { path: '/compta/facture/list.php', route: ROUTES.invoiceList },
  // Purchase invoices: the ⋮ status menu of fourn/facture/list.php and the toolbar's importlist.php views.
  { path: '/fourn/facture/list.php', when: { param: 'search_status', value: '8' }, route: ROUTES.vendorInvoicePaid },
  { path: '/fourn/facture/list.php', when: { param: 'search_status', value: '9' }, route: ROUTES.vendorInvoiceUnpaid },
  { path: '/fourn/facture/list.php', when: { param: 'search_status', value: '0' }, route: `${ROUTES.vendorInvoiceList}?status=draft` },
  { path: '/fourn/facture/list.php', when: { param: 'search_status', value: '1' }, route: `${ROUTES.vendorInvoiceList}?status=validated` },
  { path: '/fourn/facture/list.php', when: { param: 'search_status', value: '6' }, route: `${ROUTES.vendorInvoiceList}?status=succeeded` },
  { path: '/fourn/facture/list.php', when: { param: 'search_status', value: '7' }, route: `${ROUTES.vendorInvoiceList}?status=notSucceeded` },
  { path: '/fourn/facture/list.php', when: { param: 'search_status', value: '3' }, route: `${ROUTES.vendorInvoiceList}?status=abandoned` },
  { path: '/fourn/facture/list.php', route: ROUTES.vendorInvoiceList },
  { path: '/fourn/facture/importlist.php', when: { param: 'code', value: 'M' }, route: ROUTES.vendorInvoiceManual },
  { path: '/fourn/facture/importlist.php', when: { param: 'code', value: 'A' }, route: ROUTES.vendorInvoiceAutomatic },
  { path: '/fourn/facture/importlist.php', when: { param: 'code', value: 'IE' }, route: ROUTES.vendorInvoiceExpense },
  { path: '/fourn/facture/importlist.php', when: { param: 'type', value: '01' }, route: ROUTES.vendorInvoiceImports },
  { path: '/fourn/facture/purchase.php', route: ROUTES.vendorInvoiceCreateQuick },
  { path: '/comm/propal/list.php', route: ROUTES.quotationList },
  { path: '/compta/bank/list.php', route: ROUTES.bankingAccounts },
  { path: '/product/stock/list.php', route: ROUTES.warehouseList },
  { path: '/custom/zra/zraindex.php', route: ROUTES.zra },
  { path: '/takeposnew/index.php', route: '/pos' },
  { path: '/compta/facture/invoicetemplate_list.php', route: ROUTES.invoiceTemplates },
  { path: '/compta/paiement/list.php', route: ROUTES.paymentsList },
  { path: '/custom/zra/rebate_list.php', route: ROUTES.rebateInvoiceList },
  { path: '/custom/zra/rebate_create.php', route: ROUTES.rebateInvoiceCreate },
  { path: '/categories/index.php', when: { param: 'type', value: '2' }, route: ROUTES.customerTags },
  { path: '/categories/index.php', when: { param: 'type', value: 'customer' }, route: ROUTES.customerTags },
  { path: '/categories/index.php', when: { param: 'type', value: '4' }, route: ROUTES.contactTags },
  { path: '/categories/index.php', when: { param: 'type', value: 'contact' }, route: ROUTES.contactTags },
  // The import wizard: Step 2 carries the dataset code, every other step starts the wizard over.
  { path: '/imports/import.php', route: ROUTES.importCustomers },
]

// Turns a backend object-card URL — or the URL of one of the list / setup pages
// above — into the React route that shows the same thing, or null when that
// page has no React equivalent. Callers render null as plain text — never as a
// link to the backend page (see feedback-no-direct-php-links). Accepts absolute
// URLs and the `/<dir>/htdocs` prefix some backend installs put in front of
// every path.
export function resolveLegacyRoute(url: string | null | undefined): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url, 'http://backend.invalid')
  } catch {
    return null
  }
  const path = parsed.pathname.replace(/^\/[^/]+\/htdocs(?=\/)/, '')
  for (const page of LIST_ROUTES) {
    if (!path.endsWith(page.path)) continue
    if (page.when && parsed.searchParams.get(page.when.param) !== page.when.value) continue
    if (page.path === '/imports/import.php') {
      // Step 2 and later name the dataset being imported; a code of the form `societe_1` is the only shape the wizard accepts.
      const dataset = parsed.searchParams.get('datatoimport')
      return dataset && /^[a-z0-9_]+$/i.test(dataset) ? `${page.route}?dataset=${dataset}` : page.route
    }
    return page.route
  }
  for (const card of CARD_ROUTES) {
    if (!path.endsWith(card.path)) continue
    const id = card.params.map((p) => parsed.searchParams.get(p)).find((v) => v && /^\d+$/.test(v))
    return id ? card.route.replace(':id', id) : null
  }
  return null
}
