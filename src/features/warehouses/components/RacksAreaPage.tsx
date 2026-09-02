import { useMemo, useState } from 'react'
import { Boxes, Plus, X as XIcon, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useRacks, useCreateRack, useWarehouses, type RackRecord } from '../warehouseExtras.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

type SortKey = 'name' | 'shortName' | 'warehouse' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Label', key: 'name' },
  { label: 'Ref', key: 'shortName' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = ['No', ...COLUMNS.map((c) => c.label)]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// No REST/scrape source for racks (see warehouseExtras.queries.ts — the
// real llx_rack table exists but its Dolibarr module isn't activated
// server-side) — local-only, same convention as Warehouses/Inventory.
export function RacksAreaPage() {
  const racks = useRacks()
  const warehouses = useWarehouses()
  const createRack = useCreateRack()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [warehouseRef, setWarehouseRef] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const warehouseLabel = (ref: string) => warehouses.find((w) => w.ref === ref)?.shortName || ref || '-'

  function matchesSearch(r: RackRecord, query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [r.name, r.shortName, warehouseLabel(r.warehouseRef), r.status].some((field) => field.toLowerCase().includes(q))
  }

  function sortValue(r: RackRecord, key: SortKey): string | number {
    switch (key) {
      case 'name':
        return r.name
      case 'shortName':
        return r.shortName
      case 'warehouse':
        return warehouseLabel(r.warehouseRef)
      case 'status':
        return r.status
    }
  }

  const filteredRacks = useMemo(() => racks.filter((r) => matchesSearch(r, search)), [racks, search, warehouses])
  const { sorted: sortedRacks, sort, toggleSort } = useSortableRows<RackRecord, SortKey>(filteredRacks, sortValue)
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
    const rows = sortedRacks.map((r) => [r.name, r.shortName, warehouseLabel(r.warehouseRef), r.status])
    return { headers: COLUMN_LABELS.slice(1), rows }
  }

  function handleCreate() {
    if (!name.trim()) return setError('Label is required.')
    createRack({ name, shortName: shortName || name, warehouseRef, status: 'Active' })
    setName('')
    setShortName('')
    setWarehouseRef('')
    setError('')
    setShowForm(false)
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Boxes size={20} className="text-brand" /> Racks
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Rack'}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {showForm && (
          <Card className="!h-auto">
            {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Label</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Ref (short name)</label>
                <input value={shortName} onChange={(e) => setShortName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Warehouse</label>
                <select value={warehouseRef} onChange={(e) => setWarehouseRef(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {warehouses.map((w) => (
                    <option key={w.ref} value={w.ref}>
                      {w.shortName || w.ref}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button type="button" onClick={handleCreate} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                Save
              </button>
            </div>
          </Card>
        )}

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
            <TableExportButtons title="Racks" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th>No</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {racks.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRacks.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No racks match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRacks.map((r, i) => (
                    <tr key={r.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-brand font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-text-muted">{r.shortName}</td>
                      <td className="px-4 py-3 text-text-muted">{warehouseLabel(r.warehouseRef)}</td>
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
      <ListPagination page={page} perPage={perPage} total={filteredRacks.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
