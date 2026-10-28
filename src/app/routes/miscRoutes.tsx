import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'
import { MEMBER_PLACEHOLDERS } from '../../features/members/membersPlaceholders'

const DashboardModule = lazy(() => import('../../modules/dashboard/DashboardModule').then((m) => ({ default: m.DashboardModule })))
const SalesModule = lazy(() => import('../../modules/sales/SalesModule').then((m) => ({ default: m.SalesModule })))
const BudgetModule = lazy(() => import('../../modules/budget/BudgetModule').then((m) => ({ default: m.BudgetModule })))
const JobCardsListModule = lazy(() => import('../../modules/interventions/JobCardsListModule').then((m) => ({ default: m.JobCardsListModule })))
const JobCardCreateModule = lazy(() => import('../../modules/interventions/JobCardCreateModule').then((m) => ({ default: m.JobCardCreateModule })))
const JobCardCreateFromCustomerModule = lazy(() => import('../../modules/interventions/JobCardCreateFromCustomerModule').then((m) => ({ default: m.JobCardCreateFromCustomerModule })))
const ExpenseReportsListPageModule = lazy(() => import('../../modules/expenseReports/ExpenseReportsListPageModule').then((m) => ({ default: m.ExpenseReportsListPageModule })))
const MembersDashboardModule = lazy(() => import('../../modules/members/MembersDashboardModule').then((m) => ({ default: m.MembersDashboardModule })))
const MembersListModule = lazy(() => import('../../modules/members/MembersListModule').then((m) => ({ default: m.MembersListModule })))
const MemberPlaceholderModule = lazy(() => import('../../modules/members/MemberPlaceholderModule').then((m) => ({ default: m.MemberPlaceholderModule })))
const ReportDetailModule = lazy(() => import('../../modules/reports/ReportDetailModule').then((m) => ({ default: m.ReportDetailModule })))
const ReportsModule = lazy(() => import('../../modules/reports/ReportsModule').then((m) => ({ default: m.ReportsModule })))
const StockMovementsModule = lazy(() => import('../../modules/stockMovements/StockMovementsModule').then((m) => ({ default: m.StockMovementsModule })))
const CreateReceptionModule = lazy(() => import('../../modules/purchaseOrders/CreateReceptionModule').then((m) => ({ default: m.CreateReceptionModule })))
const PurchaseOrderCreateFromCustomerModule = lazy(() => import('../../modules/purchaseOrders/PurchaseOrderCreateFromCustomerModule').then((m) => ({ default: m.PurchaseOrderCreateFromCustomerModule })))
const PurchaseOrdersListModule = lazy(() => import('../../modules/purchaseOrders/PurchaseOrdersListModule').then((m) => ({ default: m.PurchaseOrdersListModule })))
const PurchaseOrderCreateModule = lazy(() => import('../../modules/purchaseOrders/PurchaseOrderCreateModule').then((m) => ({ default: m.PurchaseOrderCreateModule })))
const PurchaseOrderDetailModule = lazy(() => import('../../modules/purchaseOrders/PurchaseOrderDetailModule').then((m) => ({ default: m.PurchaseOrderDetailModule })))
const KitchenDashboardModule = lazy(() => import('../../modules/kitchen/KitchenDashboardModule').then((m) => ({ default: m.KitchenDashboardModule })))
const KitchenModule = lazy(() => import('../../modules/kitchen/KitchenModule').then((m) => ({ default: m.KitchenModule })))
const BeverageOrdersModule = lazy(() => import('../../modules/kitchen/BeverageOrdersModule').then((m) => ({ default: m.BeverageOrdersModule })))
const VendorsListModule = lazy(() => import('../../modules/vendors/VendorsListModule').then((m) => ({ default: m.VendorsListModule })))
const VendorCreateModule = lazy(() => import('../../modules/vendors/VendorCreateModule').then((m) => ({ default: m.VendorCreateModule })))
const SupplierProposalsListModule = lazy(() => import('../../modules/supplierProposals/SupplierProposalsListModule').then((m) => ({ default: m.SupplierProposalsListModule })))
const SupplierProposalDetailModule = lazy(() => import('../../modules/supplierProposals/SupplierProposalDetailModule').then((m) => ({ default: m.SupplierProposalDetailModule })))
const SupplierProposalCreateModule = lazy(() => import('../../modules/supplierProposals/SupplierProposalCreateModule').then((m) => ({ default: m.SupplierProposalCreateModule })))
const UnderConstructionModule = lazy(() => import('../../modules/underConstruction/UnderConstructionModule').then((m) => ({ default: m.UnderConstructionModule })))
const AgendaModule = lazy(() => import('../../modules/agenda/AgendaModule').then((m) => ({ default: m.AgendaModule })))
const ReportingModule = lazy(() => import('../../modules/agenda/ReportingModule').then((m) => ({ default: m.ReportingModule })))
const EventCategoriesModule = lazy(() => import('../../modules/agenda/EventCategoriesModule').then((m) => ({ default: m.EventCategoriesModule })))
const TerminalSetupModule = lazy(() => import('../../modules/posAdmin/TerminalSetupModule').then((m) => ({ default: m.TerminalSetupModule })))
const SupplierProposalCreateFromCustomerModule = lazy(() =>
  import('../../modules/supplierProposals/SupplierProposalCreateFromCustomerModule').then((m) => ({ default: m.SupplierProposalCreateFromCustomerModule })),
)

// Routes of the misc area, rendered inside the app layout (see src/App.tsx).
export function miscRoutes() {
  return (
    <>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path={ROUTES.kitchenCreateOrder}
        element={
          <RouteBoundary>
            <Navigate to={ROUTES.posWaiter} replace />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerSupplierProposalCreate}
        element={
          <RouteBoundary>
            <SupplierProposalCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route path="/sales-orders" element={<Navigate to={ROUTES.orderList} replace />} />
      <Route
        path="/dashboard"
        element={
          <RouteBoundary>
            <DashboardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.home}
        element={
          <RouteBoundary>
            <DashboardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.salesDashboard}
        element={
          <RouteBoundary>
            <SalesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.budget}
        element={
          <RouteBoundary>
            <BudgetModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ticketIntervention}
        element={
          <RouteBoundary>
            <JobCardsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.jobCardCreate}
        element={
          <RouteBoundary>
            <JobCardCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerJobCardCreate}
        element={
          <RouteBoundary>
            <JobCardCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expenseReportsList}
        element={
          <RouteBoundary>
            <ExpenseReportsListPageModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.memberDashboard}
        element={
          <RouteBoundary>
            <MembersDashboardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.memberList}
        element={
          <RouteBoundary>
            <MembersListModule />
          </RouteBoundary>
        }
      />
      {MEMBER_PLACEHOLDERS.map((p) => (
        <Route
          key={p.path}
          path={p.path}
          element={
            <RouteBoundary>
              <MemberPlaceholderModule />
            </RouteBoundary>
          }
        />
      ))}
      <Route
        path={ROUTES.reportDetail}
        element={
          <RouteBoundary>
            <ReportDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.reports}
        element={
          <RouteBoundary>
            <ReportsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.stockMovements}
        element={
          <RouteBoundary>
            <StockMovementsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.purchaseOrderCreateReception}
        element={
          <RouteBoundary>
            <CreateReceptionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerPurchaseOrderCreate}
        element={
          <RouteBoundary>
            <PurchaseOrderCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.purchaseOrderList}
        element={
          <RouteBoundary>
            <PurchaseOrdersListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.purchaseOrderCreate}
        element={
          <RouteBoundary>
            <PurchaseOrderCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.purchaseOrderDetail}
        element={
          <RouteBoundary>
            <PurchaseOrderDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.kitchenDashboard}
        element={
          <RouteBoundary>
            <KitchenDashboardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.kitchenOrderManagement}
        element={
          <RouteBoundary>
            <KitchenModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.kitchenBeverageOrders}
        element={
          <RouteBoundary>
            <BeverageOrdersModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorList}
        element={
          <RouteBoundary>
            <VendorsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorCreate}
        element={
          <RouteBoundary>
            <VendorCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.supplierProposalList}
        element={
          <RouteBoundary>
            <SupplierProposalsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.supplierProposalDetail}
        element={
          <RouteBoundary>
            <SupplierProposalDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.supplierProposalCreate}
        element={
          <RouteBoundary>
            <SupplierProposalCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.underConstruction}
        element={
          <RouteBoundary>
            <UnderConstructionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.agenda}
        element={
          <RouteBoundary>
            <AgendaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.agendaReporting}
        element={
          <RouteBoundary>
            <ReportingModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.agendaCategories}
        element={
          <RouteBoundary>
            <EventCategoriesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.takeposTerminalSetup}
        element={
          <RouteBoundary>
            <TerminalSetupModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
