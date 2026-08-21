import { Link } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useInventories, useWarehouses } from '../warehouseExtras.queries'
import { formatDate } from '../../../utils/format'

export function InventoryListPage() {
  const inventories = useInventories()
  const warehouses = useWarehouses()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ClipboardList size={20} className="text-brand" /> List Of Inventories
        </h2>
        <Link to={ROUTES.inventoryCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New
        </Link>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref.</th>
              <th className="font-medium px-4 py-2.5">Label</th>
              <th className="font-medium px-4 py-2.5">Warehouse</th>
              <th className="font-medium px-4 py-2.5">Product</th>
              <th className="font-medium px-4 py-2.5">Value Date</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              inventories.map((inv) => (
                <tr key={inv.ref} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-brand">{inv.ref}</td>
                  <td className="px-4 py-3 text-text!">{inv.label}</td>
                  <td className="px-4 py-3 text-text-muted">{warehouses.find((w) => w.ref === inv.warehouseRef)?.shortName ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{inv.productLabel || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(inv.valueDate)}</td>
                  <td className="px-4 py-3 text-text-muted">{inv.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
