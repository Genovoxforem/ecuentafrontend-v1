import { useMemo, useState } from 'react'
import { Layers, Plus, X as XIcon, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useShelves, useCreateShelf, useRacks, type ShelfRecord } from '../warehouseExtras.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

type SortKey = 'rack' | 'ref' | 'capacity'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Rack', key: 'rack' },
  { label: 'Shelves Ref', key: 'ref' },
  { label: 'Capacity', key: 'capacity', align: 'right' },
]
const COLUMN_LABELS = ['No', ...COLUMNS.map((c) => c.label)]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Same local-only convention as RacksAreaPage.tsx (real llx_shelves table
// exists, but its module isn't activated server-side).
export function ShelvesPage() {
  const shelves = useShelves()
  const racks = useRacks()
  const createShelf = useCreateShelf()
  const [showForm, setShowForm] = useState(false)
  const [rackRef, setRackRef] = useState('')
  const [capacity, setCapacity] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const rackLabel = (ref: string) => racks.find((r) => r.ref === ref)?.name || ref || '-'

  function matchesSearch(s: ShelfRecord, query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [rackLabel(s.rackRef), s.ref].some((field) => field.toLowerCase().includes(q))
  }

  function sortValue(s: ShelfRecord, key: SortKey): string | number {
    switch (key) {
      case 'rack':
        return rackLabel(s.rackRef)
      case 'ref':
        return s.ref
      case 'capacity':
        return s.capacity
    }
  }

  const filteredShelves = useMemo(() => shelves.filter((s) => matchesSearch(s, search)), [shelves, search, racks])
  const { sorted: sortedShelves, sort, toggleSort } = useSortableRows<ShelfRecord, SortKey>(filteredShelves, sortValue)
  const pageShelves = sortedShelves.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedShelves.map((s, i) => [String(i + 1), rackLabel(s.rackRef), s.ref, String(s.capacity)])
    return { headers: COLUMN_LABELS, rows }
  }

  function handleCreate() {
    if (!rackRef) return setError('Rack is required.')
    const cap = Number(capacity)
    if (!capacity || Number.isNaN(cap) || cap <= 0) return setError('Capacity must be a positive number.')
    createShelf({ rackRef, capacity: cap })
    setRackRef('')
    setCapacity('')
    setError('')
    setShowForm(false)
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> Shelves
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Shelf'}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {showForm && (
          <Card className="!h-auto">
            {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
            {racks.length === 0 && <p className="text-sm text-text-faint mb-3">No racks created yet — add one on the Racks page first.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Rack</label>
                <select value={rackRef} onChange={(e) => setRackRef(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {racks.map((r) => (
                    <option key={r.ref} value={r.ref}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Capacity</label>
                <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
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
            <TableExportButtons title="Shelves" getExportData={getExportData} />
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
                {shelves.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredShelves.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No shelves match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageShelves.map((s, i) => (
                    <tr key={s.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-text-muted">{rackLabel(s.rackRef)}</td>
                      <td className="px-4 py-3 text-brand font-medium">{s.ref}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{s.capacity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredShelves.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
