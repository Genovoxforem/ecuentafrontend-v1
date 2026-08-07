import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppShell } from './app/AppShell'
import { queryClient } from './api/queryClient'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginModule } from './modules/auth/LoginModule'
import { DashboardModule } from './modules/dashboard/DashboardModule'
import { ReportsModule } from './modules/reports/ReportsModule'
import { SettingsModule } from './modules/settings/SettingsModule'
import { ZraModule } from './modules/zra/ZraModule'
import { ZraImportModule } from './modules/zra/ZraImportModule'
import { ZraAutomaticPurchaseModule } from './modules/zra/ZraAutomaticPurchaseModule'
import { ZraUnuploadedCustomersModule } from './modules/zra/ZraUnuploadedCustomersModule'
import { ZraPendingSalesModule } from './modules/zra/ZraPendingSalesModule'
import { ZraPendingPurchaseModule } from './modules/zra/ZraPendingPurchaseModule'
import { ZraUnuploadedStockModule } from './modules/zra/ZraUnuploadedStockModule'
import { ZraUnuploadProductsModule } from './modules/zra/ZraUnuploadProductsModule'
import { SalesModule } from './modules/sales/SalesModule'
import { PurchasesModule } from './modules/purchases/PurchasesModule'
import { WarehousesModule } from './modules/warehouses/WarehousesModule'
import { PayrollModule } from './modules/payroll/PayrollModule'
import { LedgerModule } from './modules/ledger/LedgerModule'
import { KitchenModule } from './modules/kitchen/KitchenModule'
import { HotelModule } from './modules/hotel/HotelModule'
import { UsersDashboardModule } from './modules/usersDashboard/UsersDashboardModule'
import { UserCreateModule } from './modules/usersDashboard/UserCreateModule'
import { CustomersListModule } from './modules/customers/CustomersListModule'
import { CustomerCreateModule } from './modules/customers/CustomerCreateModule'
import { VendorsListModule } from './modules/vendors/VendorsListModule'
import { VendorCreateModule } from './modules/vendors/VendorCreateModule'
import { OrdersListModule } from './modules/salesOrders/OrdersListModule'
import { OrderCreateModule } from './modules/salesOrders/OrderCreateModule'
import { ContractsListModule } from './modules/contracts/ContractsListModule'
import { ContractCreateModule } from './modules/contracts/ContractCreateModule'
import { QuotationsListModule } from './modules/quotations/QuotationsListModule'
import { QuotationCreateModule } from './modules/quotations/QuotationCreateModule'
import { InvoicesListModule } from './modules/invoices/InvoicesListModule'
import { InvoiceCreateModule } from './modules/invoices/InvoiceCreateModule'
import { PurchaseOrdersListModule } from './modules/purchaseOrders/PurchaseOrdersListModule'
import { PurchaseOrderCreateModule } from './modules/purchaseOrders/PurchaseOrderCreateModule'
import { SupplierProposalsListModule } from './modules/supplierProposals/SupplierProposalsListModule'
import { SupplierProposalCreateModule } from './modules/supplierProposals/SupplierProposalCreateModule'
import { ProductsListModule } from './modules/products/ProductsListModule'
import { ServicesListModule } from './modules/products/ServicesListModule'
import { AgendaModule } from './modules/agenda/AgendaModule'
import { ROUTES } from './routes'

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginModule />} />
              <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardModule />} />
                <Route path={ROUTES.home} element={<DashboardModule />} />
                <Route path={ROUTES.zra} element={<ZraModule />} />
                <Route path={ROUTES.zraImport} element={<ZraImportModule />} />
                <Route path={ROUTES.zraAutomaticPurchase} element={<ZraAutomaticPurchaseModule />} />
                <Route path={ROUTES.zraUnuploadedCustomers} element={<ZraUnuploadedCustomersModule />} />
                <Route path={ROUTES.zraPendingSales} element={<ZraPendingSalesModule />} />
                <Route path={ROUTES.zraPendingPurchase} element={<ZraPendingPurchaseModule />} />
                <Route path={ROUTES.zraUnuploadedStockMovements} element={<ZraUnuploadedStockModule />} />
                <Route path={ROUTES.zraUnuploadedProducts} element={<ZraUnuploadProductsModule />} />
                <Route path={ROUTES.salesDashboard} element={<SalesModule />} />
                <Route path={ROUTES.purchasesDashboard} element={<PurchasesModule />} />
                <Route path={ROUTES.warehouseDashboard} element={<WarehousesModule />} />
                <Route path={ROUTES.payrollDashboard} element={<PayrollModule />} />
                <Route path={ROUTES.ledgerDashboard} element={<LedgerModule />} />
                <Route path={ROUTES.kitchenDashboard} element={<KitchenModule />} />
                <Route path={ROUTES.bookingDashboard} element={<HotelModule />} />
                <Route path={ROUTES.usersDashboard} element={<UsersDashboardModule />} />
                <Route path={ROUTES.userCreate} element={<UserCreateModule />} />
                <Route path={ROUTES.customerList} element={<CustomersListModule />} />
                <Route path={ROUTES.customersCreate} element={<CustomerCreateModule />} />
                <Route path={ROUTES.vendorList} element={<VendorsListModule />} />
                <Route path={ROUTES.vendorCreate} element={<VendorCreateModule />} />
                <Route path={ROUTES.orderList} element={<OrdersListModule />} />
                <Route path={ROUTES.orderCreate} element={<OrderCreateModule />} />
                <Route path={ROUTES.contractList} element={<ContractsListModule />} />
                <Route path={ROUTES.contractCreate} element={<ContractCreateModule />} />
                <Route path={ROUTES.quotationList} element={<QuotationsListModule />} />
                <Route path={ROUTES.quotationCreate} element={<QuotationCreateModule />} />
                <Route path={ROUTES.invoiceList} element={<InvoicesListModule />} />
                <Route path={ROUTES.invoiceCreate} element={<InvoiceCreateModule />} />
                <Route path={ROUTES.purchaseOrderList} element={<PurchaseOrdersListModule />} />
                <Route path={ROUTES.purchaseOrderCreate} element={<PurchaseOrderCreateModule />} />
                <Route path={ROUTES.supplierProposalList} element={<SupplierProposalsListModule />} />
                <Route path={ROUTES.supplierProposalCreate} element={<SupplierProposalCreateModule />} />
                <Route path={ROUTES.productList} element={<ProductsListModule />} />
                <Route path={ROUTES.serviceList} element={<ServicesListModule />} />
                <Route path={ROUTES.agenda} element={<AgendaModule />} />
                <Route path="/reports" element={<ReportsModule />} />
                <Route path="/settings" element={<SettingsModule />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
