import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppShell } from './app/AppShell'
import { queryClient } from './api/queryClient'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarStyleProvider } from './context/SidebarStyleContext'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { RouteFallback } from './shared/components/RouteFallback'
import { LoginModule } from './modules/auth/LoginModule'
import { DashboardModule } from './modules/dashboard/DashboardModule'
import { ROUTES } from './routes'

// Everything below is route-level code-splitting: each of these ~45 modules
// used to be imported eagerly, so visiting /login shipped the entire app
// (ZRA, invoices, POS, reports, every dashboard...) in one ~2.4MB bundle
// before the sign-in form could even paint. lazy() gives each route its own
// chunk, fetched only when that route is actually visited. LoginModule and
// DashboardModule stay eager — they're what nearly every session needs
// first (sign-in, then the landing dashboard), so splitting them out would
// just add a loading flash to the one screen that can least afford it.
//
// Named exports need the `.then(m => ({ default: m.X }))` wrapper because
// lazy() requires a default export from the dynamic import promise; POS's
// components already have default exports, so they don't.
const ReportsModule = lazy(() => import('./modules/reports/ReportsModule').then((m) => ({ default: m.ReportsModule })))
const SettingsModule = lazy(() => import('./modules/settings/SettingsModule').then((m) => ({ default: m.SettingsModule })))
const ZraModule = lazy(() => import('./modules/zra/ZraModule').then((m) => ({ default: m.ZraModule })))
const ZraImportModule = lazy(() => import('./modules/zra/ZraImportModule').then((m) => ({ default: m.ZraImportModule })))
const ZraAutomaticPurchaseModule = lazy(() => import('./modules/zra/ZraAutomaticPurchaseModule').then((m) => ({ default: m.ZraAutomaticPurchaseModule })))
const ZraUnuploadedCustomersModule = lazy(() => import('./modules/zra/ZraUnuploadedCustomersModule').then((m) => ({ default: m.ZraUnuploadedCustomersModule })))
const ZraPendingSalesModule = lazy(() => import('./modules/zra/ZraPendingSalesModule').then((m) => ({ default: m.ZraPendingSalesModule })))
const ZraPendingPurchaseModule = lazy(() => import('./modules/zra/ZraPendingPurchaseModule').then((m) => ({ default: m.ZraPendingPurchaseModule })))
const ZraUnuploadedStockModule = lazy(() => import('./modules/zra/ZraUnuploadedStockModule').then((m) => ({ default: m.ZraUnuploadedStockModule })))
const ZraUnuploadProductsModule = lazy(() => import('./modules/zra/ZraUnuploadProductsModule').then((m) => ({ default: m.ZraUnuploadProductsModule })))
const ZraSalesLookupModule = lazy(() => import('./modules/zra/ZraSalesLookupModule').then((m) => ({ default: m.ZraSalesLookupModule })))
const ZraCustomerInfoModule = lazy(() => import('./modules/zra/ZraCustomerInfoModule').then((m) => ({ default: m.ZraCustomerInfoModule })))
const ZraItemDetailsModule = lazy(() => import('./modules/zra/ZraItemDetailsModule').then((m) => ({ default: m.ZraItemDetailsModule })))
const ZraStockListModule = lazy(() => import('./modules/zra/ZraStockListModule').then((m) => ({ default: m.ZraStockListModule })))
const AsycudaPurchaseInvoiceModule = lazy(() => import('./modules/zra/AsycudaPurchaseInvoiceModule').then((m) => ({ default: m.AsycudaPurchaseInvoiceModule })))
const SalesModule = lazy(() => import('./modules/sales/SalesModule').then((m) => ({ default: m.SalesModule })))
const PurchasesModule = lazy(() => import('./modules/purchases/PurchasesModule').then((m) => ({ default: m.PurchasesModule })))
const WarehousesModule = lazy(() => import('./modules/warehouses/WarehousesModule').then((m) => ({ default: m.WarehousesModule })))
const PayrollModule = lazy(() => import('./modules/payroll/PayrollModule').then((m) => ({ default: m.PayrollModule })))
const LedgerModule = lazy(() => import('./modules/ledger/LedgerModule').then((m) => ({ default: m.LedgerModule })))
const KitchenModule = lazy(() => import('./modules/kitchen/KitchenModule').then((m) => ({ default: m.KitchenModule })))
const HotelModule = lazy(() => import('./modules/hotel/HotelModule').then((m) => ({ default: m.HotelModule })))
const UsersDashboardModule = lazy(() => import('./modules/usersDashboard/UsersDashboardModule').then((m) => ({ default: m.UsersDashboardModule })))
const UserCreateModule = lazy(() => import('./modules/usersDashboard/UserCreateModule').then((m) => ({ default: m.UserCreateModule })))
const UserDetailModule = lazy(() => import('./modules/usersDashboard/UserDetailModule').then((m) => ({ default: m.UserDetailModule })))
const GroupsListModule = lazy(() => import('./modules/usersDashboard/GroupsListModule').then((m) => ({ default: m.GroupsListModule })))
const GroupCreateModule = lazy(() => import('./modules/usersDashboard/GroupCreateModule').then((m) => ({ default: m.GroupCreateModule })))
const TagsListModule = lazy(() => import('./modules/usersDashboard/TagsListModule').then((m) => ({ default: m.TagsListModule })))
const HrmAreaModule = lazy(() => import('./modules/usersDashboard/HrmAreaModule').then((m) => ({ default: m.HrmAreaModule })))
const LinkedFilesAreaModule = lazy(() => import('./modules/usersDashboard/LinkedFilesAreaModule').then((m) => ({ default: m.LinkedFilesAreaModule })))
const CustomersListModule = lazy(() => import('./modules/customers/CustomersListModule').then((m) => ({ default: m.CustomersListModule })))
const CustomerCreateModule = lazy(() => import('./modules/customers/CustomerCreateModule').then((m) => ({ default: m.CustomerCreateModule })))
const ProspectsListModule = lazy(() => import('./modules/customers/ProspectsListModule').then((m) => ({ default: m.ProspectsListModule })))
const ProspectCreateModule = lazy(() => import('./modules/customers/ProspectCreateModule').then((m) => ({ default: m.ProspectCreateModule })))
const CustomerGroupListModule = lazy(() => import('./modules/customers/CustomerGroupListModule').then((m) => ({ default: m.CustomerGroupListModule })))
const CustomerGroupCreateModule = lazy(() => import('./modules/customers/CustomerGroupCreateModule').then((m) => ({ default: m.CustomerGroupCreateModule })))
const VendorsListModule = lazy(() => import('./modules/vendors/VendorsListModule').then((m) => ({ default: m.VendorsListModule })))
const VendorCreateModule = lazy(() => import('./modules/vendors/VendorCreateModule').then((m) => ({ default: m.VendorCreateModule })))
const OrdersListModule = lazy(() => import('./modules/salesOrders/OrdersListModule').then((m) => ({ default: m.OrdersListModule })))
const OrderCreateModule = lazy(() => import('./modules/salesOrders/OrderCreateModule').then((m) => ({ default: m.OrderCreateModule })))
const OrderStatisticsModule = lazy(() => import('./modules/salesOrders/OrderStatisticsModule').then((m) => ({ default: m.OrderStatisticsModule })))
const ContractsListModule = lazy(() => import('./modules/contracts/ContractsListModule').then((m) => ({ default: m.ContractsListModule })))
const ContractCreateModule = lazy(() => import('./modules/contracts/ContractCreateModule').then((m) => ({ default: m.ContractCreateModule })))
const QuotationsListModule = lazy(() => import('./modules/quotations/QuotationsListModule').then((m) => ({ default: m.QuotationsListModule })))
const QuotationCreateModule = lazy(() => import('./modules/quotations/QuotationCreateModule').then((m) => ({ default: m.QuotationCreateModule })))
const QuotationStatisticsModule = lazy(() => import('./modules/quotations/QuotationStatisticsModule').then((m) => ({ default: m.QuotationStatisticsModule })))
const InvoicesListModule = lazy(() => import('./modules/invoices/InvoicesListModule').then((m) => ({ default: m.InvoicesListModule })))
const InvoiceCreateModule = lazy(() => import('./modules/invoices/InvoiceCreateModule').then((m) => ({ default: m.InvoiceCreateModule })))
const PurchaseOrdersListModule = lazy(() => import('./modules/purchaseOrders/PurchaseOrdersListModule').then((m) => ({ default: m.PurchaseOrdersListModule })))
const PurchaseOrderCreateModule = lazy(() => import('./modules/purchaseOrders/PurchaseOrderCreateModule').then((m) => ({ default: m.PurchaseOrderCreateModule })))
const SupplierProposalsListModule = lazy(() => import('./modules/supplierProposals/SupplierProposalsListModule').then((m) => ({ default: m.SupplierProposalsListModule })))
const SupplierProposalCreateModule = lazy(() => import('./modules/supplierProposals/SupplierProposalCreateModule').then((m) => ({ default: m.SupplierProposalCreateModule })))
const ProductsListModule = lazy(() => import('./modules/products/ProductsListModule').then((m) => ({ default: m.ProductsListModule })))
const ServicesListModule = lazy(() => import('./modules/products/ServicesListModule').then((m) => ({ default: m.ServicesListModule })))
const AgendaModule = lazy(() => import('./modules/agenda/AgendaModule').then((m) => ({ default: m.AgendaModule })))

const PosLayout = lazy(() => import('./pos/layouts/DashboardLayout'))
const PosHome = lazy(() => import('./pos/features/pos/Components/PosHome'))
const PosProductsPage = lazy(() => import('./pos/features/products/Components/ProductsPage'))

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

// Wraps every route's element: Suspense covers the lazy-chunk download (a
// no-op for the two eager routes below), ErrorBoundary means a crash in one
// module blanks only that route's content, not the sidebar/navbar chrome
// around it or the rest of the app.
function RouteBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ErrorBoundary fallback={<FullPageError />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SidebarStyleProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<RouteBoundary><LoginModule /></RouteBoundary>} />
                <Route element={<ProtectedRoute />}>
                {/* Full-bleed, own chrome (PosNavbar/PosSidebar) — not wrapped in
                    AppLayout's admin Navbar/Sidebar, same as pos_standalone was
                    full-screen on its own. See src/pos/layouts/DashboardLayout.jsx. */}
                <Route path="/pos" element={<RouteBoundary><PosLayout /></RouteBoundary>}>
                  <Route index element={<RouteBoundary><PosHome /></RouteBoundary>} />
                  <Route path="products" element={<RouteBoundary><PosProductsPage /></RouteBoundary>} />
                </Route>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<RouteBoundary><DashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.home} element={<RouteBoundary><DashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.zra} element={<RouteBoundary><ZraModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraImport} element={<RouteBoundary><ZraImportModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraAutomaticPurchase} element={<RouteBoundary><ZraAutomaticPurchaseModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraUnuploadedCustomers} element={<RouteBoundary><ZraUnuploadedCustomersModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraPendingSales} element={<RouteBoundary><ZraPendingSalesModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraPendingPurchase} element={<RouteBoundary><ZraPendingPurchaseModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraUnuploadedStockMovements} element={<RouteBoundary><ZraUnuploadedStockModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraUnuploadedProducts} element={<RouteBoundary><ZraUnuploadProductsModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraInvoiceDetails} element={<RouteBoundary><ZraSalesLookupModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraCustomerInfo} element={<RouteBoundary><ZraCustomerInfoModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraItemDetails} element={<RouteBoundary><ZraItemDetailsModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraStockList} element={<RouteBoundary><ZraStockListModule /></RouteBoundary>} />
                  <Route path={ROUTES.asycudaPurchase} element={<RouteBoundary><AsycudaPurchaseInvoiceModule /></RouteBoundary>} />
                  <Route path={ROUTES.salesDashboard} element={<RouteBoundary><SalesModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchasesDashboard} element={<RouteBoundary><PurchasesModule /></RouteBoundary>} />
                  <Route path={ROUTES.warehouseDashboard} element={<RouteBoundary><WarehousesModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollDashboard} element={<RouteBoundary><PayrollModule /></RouteBoundary>} />
                  <Route path={ROUTES.ledgerDashboard} element={<RouteBoundary><LedgerModule /></RouteBoundary>} />
                  <Route path={ROUTES.kitchenDashboard} element={<RouteBoundary><KitchenModule /></RouteBoundary>} />
                  <Route path={ROUTES.bookingDashboard} element={<RouteBoundary><HotelModule /></RouteBoundary>} />
                  <Route path={ROUTES.usersDashboard} element={<RouteBoundary><UsersDashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.userCreate} element={<RouteBoundary><UserCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.userDetail} element={<RouteBoundary><UserDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.userGroupList} element={<RouteBoundary><GroupsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.userGroupCreate} element={<RouteBoundary><GroupCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.userTags} element={<RouteBoundary><TagsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.hrmArea} element={<RouteBoundary><HrmAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.userDocuments} element={<RouteBoundary><LinkedFilesAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerList} element={<RouteBoundary><CustomersListModule /></RouteBoundary>} />
                  <Route path={ROUTES.customersCreate} element={<RouteBoundary><CustomerCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.prospectList} element={<RouteBoundary><ProspectsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.prospectsCreate} element={<RouteBoundary><ProspectCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerGroupList} element={<RouteBoundary><CustomerGroupListModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerGroupCreate} element={<RouteBoundary><CustomerGroupCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerGroupEdit} element={<RouteBoundary><CustomerGroupCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorList} element={<RouteBoundary><VendorsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorCreate} element={<RouteBoundary><VendorCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.orderList} element={<RouteBoundary><OrdersListModule /></RouteBoundary>} />
                  <Route path={ROUTES.orderCreate} element={<RouteBoundary><OrderCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.orderStats} element={<RouteBoundary><OrderStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.contractList} element={<RouteBoundary><ContractsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.contractCreate} element={<RouteBoundary><ContractCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationList} element={<RouteBoundary><QuotationsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationCreate} element={<RouteBoundary><QuotationCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationStats} element={<RouteBoundary><QuotationStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceList} element={<RouteBoundary><InvoicesListModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceCreate} element={<RouteBoundary><InvoiceCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchaseOrderList} element={<RouteBoundary><PurchaseOrdersListModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchaseOrderCreate} element={<RouteBoundary><PurchaseOrderCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.supplierProposalList} element={<RouteBoundary><SupplierProposalsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.supplierProposalCreate} element={<RouteBoundary><SupplierProposalCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.productList} element={<RouteBoundary><ProductsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.serviceList} element={<RouteBoundary><ServicesListModule /></RouteBoundary>} />
                  <Route path={ROUTES.agenda} element={<RouteBoundary><AgendaModule /></RouteBoundary>} />
                  <Route path="/reports" element={<RouteBoundary><ReportsModule /></RouteBoundary>} />
                  <Route path="/settings" element={<RouteBoundary><SettingsModule /></RouteBoundary>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
          </SidebarStyleProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

// Root fallback — only reached if something above every route boundary
// throws (a provider, AppShell/sidebar itself, or a bug in RouteBoundary),
// since any single route's own error is already caught closer to its source.
function FullPageError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
      <p className="text-lg font-semibold text-text">Something went wrong.</p>
      <p className="text-sm text-text-muted">Please reload the page. If this keeps happening, contact support.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Reload page
      </button>
    </div>
  )
}

export default App
