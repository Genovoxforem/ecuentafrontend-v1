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
      items: [{ label: 'Warehouses Area' }, { label: 'New Warehouse' }, { label: 'Warehouse List', path: ROUTES.warehouseDashboard }],
    },
    {
      label: 'Inventory',
      items: [
        { label: 'New Inventory' },
        { label: 'Inventory List' },
        { label: 'Landed Cost' },
        { label: 'Landed List' },
        { label: 'Trip Details' },
        { label: 'Fleet Expense' },
      ],
    },
    {
      label: 'Shipments',
      items: [
        { label: 'Shipment List' },
        { label: 'Shipment Draft' },
        { label: 'Validated Shipment' },
        { label: 'Processed Shipment' },
        { label: 'Statistics' },
        { label: 'Packing List' },
      ],
    },
    {
      label: 'Receptions',
      items: [
        { label: 'Receptions Area' },
        { label: 'New Reception' },
        { label: 'Reception List' },
        { label: 'Draft Reception' },
        { label: 'Validated Reception' },
        { label: 'Processed' },
        { label: 'Statistics' },
        { label: 'Credit Note Order List' },
      ],
    },
    {
      label: 'Stock Movement',
      items: [
        { label: 'Movements - Full List' },
        { label: 'Box Break' },
        { label: 'UOM Manager' },
        { label: 'Stock Manager' },
        { label: 'FEFO Dashboard' },
        { label: 'Stock Correction' },
        { label: 'Stock Transfer' },
        { label: 'Mass Stock Transfer' },
        { label: 'Replenishment' },
      ],
    },
    {
      label: 'Rack',
      items: [{ label: 'Racks' }, { label: 'Shelves' }, { label: 'Racks List' }, { label: 'Assign Products' }],
    },
  ],
}
