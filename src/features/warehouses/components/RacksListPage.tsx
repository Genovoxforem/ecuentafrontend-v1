import { useMemo, useState } from 'react'
import { ListFilter, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useRacks, useShelves, useWarehouses, type RackRecord } from '../warehouseExtras.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

type SortKey = 'label' | 'ref' | 'warehouse' | 'shelves' | 'status'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Label', key: 'label' },
  { label: 'Ref', key: 'ref' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Shelves', key: 'shelves', align: 'right' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = ['No', ...COLUMNS.map((c) => c.label)]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const warehouseLabel = (ref: string) => warehouses.find((w) => w.ref === ref)?.shortName || ref || '-'
  const shelfCountFor = (rackRef: string) => shelves.filter((s) => s.rackRef === rackRef).length

  function matchesSearch(r: RackRecord, query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [r.name, r.shortName, warehouseLabel(r.warehouseRef), r.status].some((field) => field.toLowerCase().includes(q))
  }

  function sortValue(r: RackRecord, key: SortKey): string | number {
    switch (key) {
      case 'label':
        return r.name
      case 'ref':
        return r.shortName
      case 'warehouse':
        return warehouseLabel(r.warehouseRef)
      case 'shelves':
        return shelfCountFor(r.ref)
      case 'status':
        return r.status
    }
  }

  const filtered = useMemo(
    () =>
      racks.filter(
        (r) => (!warehouseFilter || r.warehouseRef === warehouseFilter) && (!rackFilter || r.ref === rackFilter) && matchesSearch(r, search),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [racks, warehouseFilter, rackFilter, search, shelves, warehouses],
  )
  const { sorted: sortedRacks, sort, toggleSort } = useSortableRows<RackRecord, SortKey>(filtered, sortValue)
  const pageRacks = sortedRacks.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedRacks.map((r, i) => [
      String(i + 1),
      r.name,
      r.shortName,
      warehouseLabel(r.warehouseRef),
      String(shelfCountFor(r.ref)),
      r.status,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListFilter size={20} className="text-brand" /> Racks List
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
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

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Racks List" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap select-none text-left">No</th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      {racks.length === 0 ? 'No Data Available In Table' : 'No racks match these filters.'}
                    </td>
                  </tr>
                ) : (
                  pageRacks.map((r, i) => (
                    <tr key={r.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
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
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
