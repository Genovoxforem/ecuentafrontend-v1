import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Warehouse, Plus, Boxes, Package, CircleDollarSign } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useProductOptions } from '../../products/products.queries'
import { useWarehouses } from '../warehouseExtras.queries'

function StatTile({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Warehouse }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
      </div>
      <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
    </Card>
  )
}

// Warehouses are local-only (see warehouseExtras.queries.ts — no
// /api/warehouses/ endpoint exists), but "Total Products" is real (GET
// /api/products/, the same catalog Warehouses Area's dashboard tiles use).
export function WarehouseListPage() {
  const warehouses = useWarehouses()
  const { data: products } = useProductOptions()
  const totalStockValue = useMemo(() => (products ?? []).reduce((sum, p) => sum + p.priceExclTax * p.stock, 0), [products])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Warehouse size={20} className="text-brand" /> Warehouse Details
        </h2>
        <Link to={ROUTES.warehouseCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Warehouses" value={warehouses.length} icon={Warehouse} />
        <StatTile label="Total Products" value={(products ?? []).length} icon={Boxes} />
        <StatTile label="Total Stock" value={(products ?? []).reduce((sum, p) => sum + p.stock, 0)} icon={Package} />
        <StatTile label="Total Stock Value" value={`${totalStockValue.toFixed(2)} ZMW`} icon={CircleDollarSign} />
      </div>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref</th>
              <th className="font-medium px-4 py-2.5">Short Name Location</th>
              <th className="font-medium px-4 py-2.5">Environment</th>
              <th className="font-medium px-4 py-2.5 text-right">Input Stock Value</th>
              <th className="font-medium px-4 py-2.5 text-right">Value For Sell</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              warehouses.map((w) => (
                <tr key={w.ref} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-brand">{w.shortName || w.addIn}</td>
                  <td className="px-4 py-3 text-text-muted">{w.shortName}</td>
                  <td className="px-4 py-3 text-text-muted">Master Entity</td>
                  <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                  <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                  <td className="px-4 py-3 text-text-muted">{w.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
