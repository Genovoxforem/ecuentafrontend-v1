import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const WarehousesModule = lazy(() => import('../../modules/warehouses/WarehousesModule').then((m) => ({ default: m.WarehousesModule })))
const WarehouseCreateModule = lazy(() => import('../../modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseCreateModule })))
const WarehouseListModule = lazy(() => import('../../modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseListModule })))
const WarehouseDetailModule = lazy(() => import('../../modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseDetailModule })))
const InventoryCreateModule = lazy(() => import('../../modules/warehouses/InventoryModules').then((m) => ({ default: m.InventoryCreateModule })))
const InventoryListModule = lazy(() => import('../../modules/warehouses/InventoryModules').then((m) => ({ default: m.InventoryListModule })))
const InventoryDetailModule = lazy(() => import('../../modules/warehouses/InventoryModules').then((m) => ({ default: m.InventoryDetailModule })))
const LandedCostCreateModule = lazy(() => import('../../modules/warehouses/LandedCostModules').then((m) => ({ default: m.LandedCostCreateModule })))
const LandedCostListModule = lazy(() => import('../../modules/warehouses/LandedCostModules').then((m) => ({ default: m.LandedCostListModule })))
const ShipmentSearchModule = lazy(() => import('../../modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentSearchModule })))
const ShipmentDraftModule = lazy(() => import('../../modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentDraftModule })))
const ShipmentValidatedModule = lazy(() => import('../../modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentValidatedModule })))
const ShipmentProcessedModule = lazy(() => import('../../modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentProcessedModule })))
const StatisticsShipmentModule = lazy(() => import('../../modules/warehouses/ShipmentModules').then((m) => ({ default: m.StatisticsShipmentModule })))
const PackingListModule = lazy(() => import('../../modules/warehouses/ShipmentModules').then((m) => ({ default: m.PackingListModule })))
const ReceptionsAreaModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionsAreaModule })))
const ReceptionCreateModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionCreateModule })))
const ReceptionListModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionListModule })))
const ReceptionDraftModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionDraftModule })))
const ReceptionValidatedModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionValidatedModule })))
const ReceptionProcessedModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionProcessedModule })))
const ReceptionStatisticsModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionStatisticsModule })))
const CreditNoteOrderListModule = lazy(() => import('../../modules/warehouses/ReceptionModules').then((m) => ({ default: m.CreditNoteOrderListModule })))
const StockMovementsListModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockMovementsListModule })))
const BoxBreakModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.BoxBreakModule })))
const UomManagerModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.UomManagerModule })))
const MinMaxStockModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.MinMaxStockModule })))
const FefoDashboardModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.FefoDashboardModule })))
const StockCorrectionModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockCorrectionModule })))
const StockTransferModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockTransferModule })))
const MassStockTransferModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.MassStockTransferModule })))
const ReplenishmentModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.ReplenishmentModule })))
const StockMovementReportModule = lazy(() => import('../../modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockMovementReportModule })))
const RacksAreaModule = lazy(() => import('../../modules/warehouses/RackModules').then((m) => ({ default: m.RacksAreaModule })))
const ShelvesModule = lazy(() => import('../../modules/warehouses/RackModules').then((m) => ({ default: m.ShelvesModule })))
const RacksListModule = lazy(() => import('../../modules/warehouses/RackModules').then((m) => ({ default: m.RacksListModule })))
const ProductRackAssignModule = lazy(() => import('../../modules/warehouses/RackModules').then((m) => ({ default: m.ProductRackAssignModule })))

// Routes of the warehouses area, rendered inside the app layout (see src/App.tsx).
export function warehousesRoutes() {
  return (
    <>
      <Route
        path={ROUTES.warehouseDashboard}
        element={
          <RouteBoundary>
            <WarehousesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.warehouseCreate}
        element={
          <RouteBoundary>
            <WarehouseCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.warehouseList}
        element={
          <RouteBoundary>
            <WarehouseListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.warehouseDetail}
        element={
          <RouteBoundary>
            <WarehouseDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.inventoryCreate}
        element={
          <RouteBoundary>
            <InventoryCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.inventoryList}
        element={
          <RouteBoundary>
            <InventoryListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.inventoryDetail}
        element={
          <RouteBoundary>
            <InventoryDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.landedCostCreate}
        element={
          <RouteBoundary>
            <LandedCostCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.landedCostList}
        element={
          <RouteBoundary>
            <LandedCostListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.shipmentList}
        element={
          <RouteBoundary>
            <ShipmentSearchModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.shipmentDraft}
        element={
          <RouteBoundary>
            <ShipmentDraftModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.shipmentValidated}
        element={
          <RouteBoundary>
            <ShipmentValidatedModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.shipmentProcessed}
        element={
          <RouteBoundary>
            <ShipmentProcessedModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.shipmentStatistics}
        element={
          <RouteBoundary>
            <StatisticsShipmentModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.packingList}
        element={
          <RouteBoundary>
            <PackingListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.receptionsArea}
        element={
          <RouteBoundary>
            <ReceptionsAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.receptionCreate}
        element={
          <RouteBoundary>
            <ReceptionCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.receptionList}
        element={
          <RouteBoundary>
            <ReceptionListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.receptionDraft}
        element={
          <RouteBoundary>
            <ReceptionDraftModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.receptionValidated}
        element={
          <RouteBoundary>
            <ReceptionValidatedModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.receptionProcessed}
        element={
          <RouteBoundary>
            <ReceptionProcessedModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.receptionStatistics}
        element={
          <RouteBoundary>
            <ReceptionStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.creditNoteOrderList}
        element={
          <RouteBoundary>
            <CreditNoteOrderListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.stockMovementsList}
        element={
          <RouteBoundary>
            <StockMovementsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.boxBreak}
        element={
          <RouteBoundary>
            <BoxBreakModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.uomManager}
        element={
          <RouteBoundary>
            <UomManagerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.minMaxStock}
        element={
          <RouteBoundary>
            <MinMaxStockModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.fefoDashboard}
        element={
          <RouteBoundary>
            <FefoDashboardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.stockCorrection}
        element={
          <RouteBoundary>
            <StockCorrectionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.stockTransfer}
        element={
          <RouteBoundary>
            <StockTransferModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.massStockTransfer}
        element={
          <RouteBoundary>
            <MassStockTransferModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.replenishment}
        element={
          <RouteBoundary>
            <ReplenishmentModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.stockMovementReport}
        element={
          <RouteBoundary>
            <StockMovementReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.racksArea}
        element={
          <RouteBoundary>
            <RacksAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.shelvesList}
        element={
          <RouteBoundary>
            <ShelvesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.racksList}
        element={
          <RouteBoundary>
            <RacksListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productRackAssign}
        element={
          <RouteBoundary>
            <ProductRackAssignModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
