// Route-to-import mapping for hover prefetching. When the user hovers over
// a sidebar nav leaf, we call the matching import function to start
// downloading that route's chunk before they click. The browser caches the
// response, so the actual navigation is instant.
//
// Only covers the most common entry-point routes (list/landing pages for
// each section). Detail/create/edit pages are lower-traffic and their
// chunks are small enough that the click-to-load delay is imperceptible.
//
// Import expressions here intentionally duplicate App.tsx's lazy() imports
// — Vite deduplicates dynamic imports by module path, so calling the same
// import() twice returns the same cached promise. No extra bytes shipped.

const prefetchMap: Record<string, () => Promise<unknown>> = {
  // Dashboard
  '/dashboard': () => import('../modules/dashboard/DashboardModule'),
  '/home': () => import('../modules/dashboard/DashboardModule'),

  // Customers
  '/customers': () => import('../modules/customers/CustomersListModule').then((m) => ({ default: m.CustomersListModule })),
  '/customers/create': () => import('../modules/customers/CustomerCreateModule').then((m) => ({ default: m.CustomerCreateModule })),
  '/prospects': () => import('../modules/customers/ProspectsListModule').then((m) => ({ default: m.ProspectsListModule })),
  '/customer-groups': () => import('../modules/customers/CustomerGroupListModule').then((m) => ({ default: m.CustomerGroupListModule })),
  '/contacts': () => import('../modules/customers/ContactListModule').then((m) => ({ default: m.ContactListModule })),
  '/customers/tags': () => import('../modules/customers/CustomerTagsModule').then((m) => ({ default: m.CustomerTagsModule })),

  // Products
  '/products': () => import('../modules/products/ProductAreaModule').then((m) => ({ default: m.ProductAreaModule })),
  '/products/list': () => import('../modules/products/ProductsListModule').then((m) => ({ default: m.ProductsListModule })),
  '/products/create': () => import('../modules/products/ProductCreateModule').then((m) => ({ default: m.ProductCreateModule })),
  '/services/list': () => import('../modules/products/ServicesListModule').then((m) => ({ default: m.ServicesListModule })),
  '/products/statistics': () => import('../modules/products/ProductStatisticsModule').then((m) => ({ default: m.ProductStatisticsModule })),

  // Sales orders
  '/orders': () => import('../modules/salesOrders/OrdersListModule').then((m) => ({ default: m.OrdersListModule })),
  '/orders/create': () => import('../modules/salesOrders/OrderCreateModule').then((m) => ({ default: m.OrderCreateModule })),
  '/orders/statistics': () => import('../modules/salesOrders/OrderStatisticsModule').then((m) => ({ default: m.OrderStatisticsModule })),

  // Quotations
  '/quotations': () => import('../modules/quotations/QuotationsListModule').then((m) => ({ default: m.QuotationsListModule })),
  '/quotations/create': () => import('../modules/quotations/QuotationCreateModule').then((m) => ({ default: m.QuotationCreateModule })),
  '/quotations/statistics': () => import('../modules/quotations/QuotationStatisticsModule').then((m) => ({ default: m.QuotationStatisticsModule })),

  // Invoices
  '/invoices': () => import('../modules/invoices/InvoicesListModule').then((m) => ({ default: m.InvoicesListModule })),
  '/invoices/create': () => import('../modules/invoices/InvoiceCreateModule').then((m) => ({ default: m.InvoiceCreateModule })),
  '/invoices/statistics': () => import('../modules/invoices/InvoiceStatisticsModule').then((m) => ({ default: m.InvoiceStatisticsModule })),
  '/payments': () => import('../modules/invoices/PaymentsListModule').then((m) => ({ default: m.PaymentsListModule })),

  // Vendors
  '/vendors': () => import('../modules/vendors/VendorsListModule').then((m) => ({ default: m.VendorsListModule })),
  '/vendors/create': () => import('../modules/vendors/VendorCreateModule').then((m) => ({ default: m.VendorCreateModule })),

  // Purchase orders
  '/purchase-orders': () => import('../modules/purchaseOrders/PurchaseOrdersListModule').then((m) => ({ default: m.PurchaseOrdersListModule })),
  '/purchase-orders/create': () => import('../modules/purchaseOrders/PurchaseOrderCreateModule').then((m) => ({ default: m.PurchaseOrderCreateModule })),

  // Contracts
  '/contracts': () => import('../modules/contracts/ContractsListModule').then((m) => ({ default: m.ContractsListModule })),
  '/contracts/create': () => import('../modules/contracts/ContractCreateModule').then((m) => ({ default: m.ContractCreateModule })),

  // Warehouses
  '/warehouses/list': () => import('../modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseListModule })),
  '/warehouses/create': () => import('../modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseCreateModule })),
  '/warehouses/stock-movement/list': () => import('../modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockMovementsListModule })),
  '/warehouses/shipments': () => import('../modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentSearchModule })),
  '/warehouses/receptions': () => import('../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionsAreaModule })),

  // Projects
  '/projects': () => import('../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectListModule })),
  '/projects/create': () => import('../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectCreateModule })),

  // Users
  '/users-dashboard': () => import('../modules/usersDashboard/UsersDashboardModule').then((m) => ({ default: m.UsersDashboardModule })),
  '/users-dashboard/groups': () => import('../modules/usersDashboard/GroupsListModule').then((m) => ({ default: m.GroupsListModule })),

  // Ledger
  '/ledger-list': () => import('../modules/ledger/LedgerModule').then((m) => ({ default: m.LedgerModule })),
  '/ledger-create': () => import('../modules/ledger/NewTransactionModule').then((m) => ({ default: m.NewTransactionModule })),

  // Settings
  '/settings/setup': () => import('../modules/settings/SetupLandingModule').then((m) => ({ default: m.SetupLandingModule })),
  '/settings/company': () => import('../modules/settings/CompanyOrganizationModule').then((m) => ({ default: m.CompanyOrganizationModule })),

  // Reports
  '/reports': () => import('../modules/reports/ReportsModule').then((m) => ({ default: m.ReportsModule })),

  // Agenda
  '/agenda': () => import('../modules/agenda/AgendaModule').then((m) => ({ default: m.AgendaModule })),
}

// Already-prefetched paths — avoids calling import() twice for the same
// route (Vite would return the same cached promise anyway, but this skips
// the map lookup too).
const prefetched = new Set<string>()

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return
  const importer = prefetchMap[path]
  if (!importer) return
  prefetched.add(path)
  // Fire-and-forget — the import promise resolves when the chunk is
  // downloaded and cached. Errors are swallowed (network failure, chunk
  // not found) since this is purely an optimization.
  importer().catch(() => {
    // If the prefetch fails, remove from the set so a retry is possible.
    prefetched.delete(path)
  })
}
