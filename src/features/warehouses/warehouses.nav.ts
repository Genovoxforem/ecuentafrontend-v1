import { Warehouse } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Warehouses" left menu (llx_menu, mainmenu=inventwarehouse)
// exactly — pulled straight from the source database, not approximated.
export const nav: NavSection = {
  key: 'warehouses',
  label: 'Warehouses',
  icon: Warehouse,
  items: [
    {
      label: 'Warehouses',
      items: [
        { label: 'Warehouses Area', path: ROUTES.warehouseDashboard },
        { label: 'New Warehouse', path: ROUTES.warehouseCreate },
        { label: 'Warehouse List', path: ROUTES.warehouseList },
      ],
    },
    {
      label: 'Inventory',
      items: [
        { label: 'New Inventory', path: ROUTES.inventoryCreate },
        { label: 'Inventory List', path: ROUTES.inventoryList },
        { label: 'Landed Cost', path: ROUTES.landedCostCreate },
        { label: 'Landed List', path: ROUTES.landedCostList },
        { label: 'Trip Details' },
        { label: 'Fleet Expense' },
      ],
    },
    {
      label: 'Shipments',
      items: [
        { label: 'Shipment List', path: ROUTES.shipmentList },
        { label: 'Shipment Draft', path: ROUTES.shipmentDraft },
        { label: 'Validated Shipment', path: ROUTES.shipmentValidated },
        { label: 'Processed Shipment', path: ROUTES.shipmentProcessed },
        { label: 'Statistics Shipment', path: ROUTES.shipmentStatistics },
        { label: 'Packing List', path: ROUTES.packingList },
      ],
    },
    {
      label: 'Receptions',
      items: [
        { label: 'Receptions Area', path: ROUTES.receptionsArea },
        { label: 'New Reception', path: ROUTES.receptionCreate },
        { label: 'Reception List', path: ROUTES.receptionList },
        { label: 'Draft Reception', path: ROUTES.receptionDraft },
        { label: 'Validated Reception', path: ROUTES.receptionValidated },
        { label: 'Processed', path: ROUTES.receptionProcessed },
        { label: 'Statistics Reception', path: ROUTES.receptionStatistics },
        { label: 'Credit Note Order List', path: ROUTES.creditNoteOrderList },
      ],
    },
    {
      label: 'Stock Movement',
      items: [
        { label: 'Movements - Full List', path: ROUTES.stockMovementsList },
        { label: 'Box Break', path: ROUTES.boxBreak },
        { label: 'UOM Manager' },
        { label: 'Stock Manager' },
        { label: 'FEFO Dashboard', path: ROUTES.fefoDashboard },
        { label: 'Stock Correction', path: ROUTES.stockCorrection },
        { label: 'Stock Transfer', path: ROUTES.stockTransfer },
        { label: 'Mass Stock Transfer', path: ROUTES.massStockTransfer },
        { label: 'Replenishment', path: ROUTES.replenishment },
      ],
    },
    {
      label: 'Rack',
      items: [
        { label: 'Racks', path: ROUTES.racksArea },
        { label: 'Shelves', path: ROUTES.shelvesList },
        { label: 'Racks List', path: ROUTES.racksList },
        { label: 'Assign Products', path: ROUTES.productRackAssign },
      ],
    },
  ],
}
