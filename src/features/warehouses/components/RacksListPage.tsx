import { useMemo, useState } from 'react'
import { ListFilter } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useRacks, useShelves, useWarehouses } from '../warehouseExtras.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

// Same rack data as RacksAreaPage.tsx, but with the Warehouse/Rack/Shelf
// filters actually wired to the table below them — the legacy page's own
// "Racks List" action renders this exact filter row but never connects it
// to a results table (confirmed in racksindex.php), so this fixes that gap
// rather than reproducing it.
export function RacksListPage() {
  const racks = useRacks()
  const shelves = useShelves()
  const warehouses = useWarehouses()
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [rackFilter, setRackFilter] = useState('')

  const warehouseLabel = (ref: string) => warehouses.find((w) => w.ref === ref)?.shortName || ref || '-'
  const shelfCountFor = (rackRef: string) => shelves.filter((s) => s.rackRef === rackRef).length

  const filtered = useMemo(
    () => racks.filter((r) => (!warehouseFilter || r.warehouseRef === warehouseFilter) && (!rackFilter || r.ref === rackFilter)),
    [racks, warehouseFilter, rackFilter],
  )

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListFilter size={20} className="text-brand" /> Racks List
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-faint mb-1">Warehouse</label>
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className={selectCls}>
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.ref} value={w.ref}>
                  {w.shortName || w.ref}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Rack</label>
            <select value={rackFilter} onChange={(e) => setRackFilter(e.target.value)} className={selectCls}>
              <option value="">All Racks</option>
              {racks.map((r) => (
                <option key={r.ref} value={r.ref}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Shelf</label>
            <select className={selectCls} disabled>
              <option>All Shelves</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Lot</label>
            <select className={selectCls} disabled>
              <option>All Lots</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Product</label>
            <select className={selectCls} disabled>
              <option>All Products</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">No</th>
              <th className="font-medium px-4 py-2.5">Label</th>
              <th className="font-medium px-4 py-2.5">Ref</th>
              <th className="font-medium px-4 py-2.5">Warehouse</th>
              <th className="font-medium px-4 py-2.5 text-right">Shelves</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                  {racks.length === 0 ? 'No Data Available In Table' : 'No racks match these filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={r.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-text-faint">{i + 1}</td>
                  <td className="px-4 py-3 text-brand font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-text-muted">{r.shortName}</td>
                  <td className="px-4 py-3 text-text-muted">{warehouseLabel(r.warehouseRef)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text!">{shelfCountFor(r.ref)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.status === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{r.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
