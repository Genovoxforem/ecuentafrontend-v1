import { useMemo, useState } from 'react'
import { PackagePlus, X as XIcon, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useProductOptions } from '../../products/products.queries'
import { useRackAssignments, useCreateRackAssignment, useRacks, useShelves, useWarehouses, type RackAssignmentRecord } from '../warehouseExtras.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

type SortKey = 'rack' | 'warehouse' | 'shelf' | 'lot' | 'product' | 'qty'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Rack Label', key: 'rack' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Shelves Ref', key: 'shelf' },
  { label: 'Lot', key: 'lot' },
  { label: 'Product Name', key: 'product' },
  { label: 'Qty', key: 'qty', align: 'right' },
]
const COLUMN_LABELS = ['No', ...COLUMNS.map((c) => c.label)]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Same local-only convention as the other Rack pages (real llx_shelvesdet
// table exists, but its module isn't activated server-side).
export function ProductRackAssignPage() {
  const assignments = useRackAssignments()
  const racks = useRacks()
  const shelves = useShelves()
  const warehouses = useWarehouses()
  const { data: products } = useProductOptions()
  const createAssignment = useCreateRackAssignment()

  const [showForm, setShowForm] = useState(false)
  const [rackRef, setRackRef] = useState('')
  const [shelfRef, setShelfRef] = useState('')
  const [productRef, setProductRef] = useState('')
  const [lotSerial, setLotSerial] = useState('')
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const rackLabel = (ref: string) => racks.find((r) => r.ref === ref)?.name || ref || '-'
  const warehouseLabelForRack = (ref: string) => {
    const rack = racks.find((r) => r.ref === ref)
    return warehouses.find((w) => w.ref === rack?.warehouseRef)?.shortName || '-'
  }
  const shelvesForRack = shelves.filter((s) => s.rackRef === rackRef)

  function matchesSearch(a: RackAssignmentRecord, query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [rackLabel(a.rackRef), warehouseLabelForRack(a.rackRef), a.shelfRef, a.lotSerial, a.productLabel].some((field) => field.toLowerCase().includes(q))
  }

  function sortValue(a: RackAssignmentRecord, key: SortKey): string | number {
    switch (key) {
      case 'rack':
        return rackLabel(a.rackRef)
      case 'warehouse':
        return warehouseLabelForRack(a.rackRef)
      case 'shelf':
        return a.shelfRef
      case 'lot':
        return a.lotSerial
      case 'product':
        return a.productLabel
      case 'qty':
        return a.qty
    }
  }

  const filteredAssignments = useMemo(() => assignments.filter((a) => matchesSearch(a, search)), [assignments, search, racks, warehouses])
  const { sorted: sortedAssignments, sort, toggleSort } = useSortableRows<RackAssignmentRecord, SortKey>(filteredAssignments, sortValue)
  const pageAssignments = sortedAssignments.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedAssignments.map((a) => [rackLabel(a.rackRef), warehouseLabelForRack(a.rackRef), a.shelfRef, a.lotSerial || '-', a.productLabel, String(a.qty)])
    return { headers: COLUMN_LABELS.slice(1), rows }
  }

  function handleAssign() {
    const product = (products ?? []).find((p) => p.ref === productRef)
    if (!rackRef) return setError('Rack is required.')
    if (!shelfRef) return setError('Shelf is required.')
    if (!product) return setError('Product is required.')
    const q = Number(qty)
    if (!qty || Number.isNaN(q) || q <= 0) return setError('Qty must be a positive number.')
    setError('')
    createAssignment({ rackRef, shelfRef, productRef: product.ref, productLabel: product.label, lotSerial, qty: q })
    setRackRef('')
    setShelfRef('')
    setProductRef('')
    setLotSerial('')
    setQty('')
    setShowForm(false)
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackagePlus size={20} className="text-brand" /> Product Rack/Shelf Assignment
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <PackagePlus size={14} />}
          {showForm ? 'Cancel' : 'Assign Products'}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {showForm && (
          <Card className="!h-auto">
            {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
            {racks.length === 0 && <p className="text-sm text-text-faint mb-3">No racks created yet — add one on the Racks page first.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Rack</label>
                <select value={rackRef} onChange={(e) => { setRackRef(e.target.value); setShelfRef('') }} className={selectCls}>
                  <option value="">Select…</option>
                  {racks.map((r) => (
                    <option key={r.ref} value={r.ref}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Shelf</label>
                <select value={shelfRef} onChange={(e) => setShelfRef(e.target.value)} className={selectCls} disabled={!rackRef}>
                  <option value="">Select…</option>
                  {shelvesForRack.map((s) => (
                    <option key={s.ref} value={s.ref}>
                      {s.ref}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Product</label>
                <select value={productRef} onChange={(e) => setProductRef(e.target.value)} className={selectCls}>
                  <option value="">Select Predefined Product/services</option>
                  {(products ?? []).map((p) => (
                    <option key={p.id} value={p.ref}>
                      {p.ref} — {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Lot/Serial</label>
                <input value={lotSerial} onChange={(e) => setLotSerial(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Qty</label>
                <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button type="button" onClick={handleAssign} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
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
            <TableExportButtons title="Rack Assignments" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th>No</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No assignments match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageAssignments.map((a, i) => (
                    <tr key={a.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-brand font-medium">{rackLabel(a.rackRef)}</td>
                      <td className="px-4 py-3 text-text-muted">{warehouseLabelForRack(a.rackRef)}</td>
                      <td className="px-4 py-3 text-text-muted">{a.shelfRef}</td>
                      <td className="px-4 py-3 text-text-muted">{a.lotSerial || '-'}</td>
                      <td className="px-4 py-3 text-text!">{a.productLabel}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{a.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredAssignments.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
