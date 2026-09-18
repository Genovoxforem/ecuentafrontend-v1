import { useEffect, useMemo, useState } from 'react'
import { PackagePlus, Filter, RotateCcw, LoaderCircle, AlertTriangle, Pencil, Trash2, Layers, X as XIcon } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useProductOptions } from '../../products/products.queries'
import { useWarehouses } from '../warehouseExtras.queries'
import {
  useProductAssignments,
  useRacksByWarehouse,
  useShelvesByRack,
  useAssignProductReal,
  useUpdateAssignmentReal,
  useDeleteAssignmentReal,
  fetchAssignmentDetail,
  type ProductAssignmentRow,
  type ProductAssignFilters,
} from '../racks.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SortKey = 'product' | 'warehouse' | 'rack' | 'shelf' | 'qty'

const COLUMNS: { label: string; key?: SortKey; align?: 'right' }[] = [
  { label: 'Product', key: 'product' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Rack', key: 'rack' },
  { label: 'Shelf', key: 'shelf' },
  { label: 'Lot/Batch' },
  { label: 'Lot Count', align: 'right' },
  { label: 'Qty', key: 'qty', align: 'right' },
  { label: 'Shelf Cap.', align: 'right' },
]
const COLUMN_LABELS = ['#', ...COLUMNS.map((c) => c.label), 'Action']

function sortValue(r: ProductAssignmentRow, key: SortKey): string | number {
  switch (key) {
    case 'product':
      return r.productName || r.productRef
    case 'warehouse':
      return r.warehouseName
    case 'rack':
      return r.rackName
    case 'shelf':
      return r.shelfRef
    case 'qty':
      return r.qty ?? -1
  }
}

interface ModalState {
  mode: 'create' | 'edit'
  assignId?: number
  warehouseId: string
  rackId: string
  shelfId: string
  productId: string
  qty: string
  lot: string
}

function AssignmentModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const [form, setForm] = useState(state)
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const racks = useRacksByWarehouse(form.warehouseId || undefined)
  const shelves = useShelvesByRack(form.rackId || undefined)
  const assign = useAssignProductReal()
  const update = useUpdateAssignmentReal()

  const productOptions = (products ?? []).map((p) => ({ value: p.id, label: `${p.ref} — ${p.label}` }))
  const saving = assign.isPending || update.isPending
  const mutationError = assign.error ?? update.error

  function handleWarehouseChange(warehouseId: string) {
    setForm((f) => ({ ...f, warehouseId, rackId: '', shelfId: '' }))
  }
  function handleRackChange(rackId: string) {
    setForm((f) => ({ ...f, rackId, shelfId: '' }))
  }

  function handleSave() {
    if (!form.warehouseId || !form.rackId || !form.shelfId || !form.productId || !form.qty) return
    const qty = Number(form.qty)
    if (!qty || qty <= 0) return
    if (state.mode === 'create') {
      assign.mutate(
        { warehouseId: form.warehouseId, rackId: form.rackId, shelfId: form.shelfId, productId: form.productId, qty, lot: form.lot || undefined },
        { onSuccess: onClose },
      )
    } else if (state.assignId) {
      update.mutate(
        { assignId: state.assignId, warehouseId: form.warehouseId, rackId: form.rackId, shelfId: form.shelfId, productId: form.productId, qty, lot: form.lot || undefined },
        { onSuccess: onClose },
      )
    }
  }

  const canSave = !!form.warehouseId && !!form.rackId && !!form.shelfId && !!form.productId && Number(form.qty) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-surface-alt border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <PackagePlus size={16} className="text-brand" /> {state.mode === 'create' ? 'Assign Product to Shelf' : 'Edit Assignment'}
          </h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <XIcon size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {mutationError && <p className="text-sm font-medium text-danger">{(mutationError as Error).message}</p>}
          <div>
            <label className="block text-xs text-text-faint mb-1">Product</label>
            <SearchableSelect value={form.productId} onChange={(v) => setForm((f) => ({ ...f, productId: v }))} options={productOptions} placeholder="Search a product…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Warehouse</label>
              <select value={form.warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} className={selectCls}>
                <option value="">Select…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.ref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Rack</label>
              <select value={form.rackId} onChange={(e) => handleRackChange(e.target.value)} className={selectCls} disabled={!form.warehouseId}>
                <option value="">{racks.isFetching ? 'Loading…' : 'Select…'}</option>
                {(racks.data ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Shelf</label>
              <select value={form.shelfId} onChange={(e) => setForm((f) => ({ ...f, shelfId: e.target.value }))} className={selectCls} disabled={!form.rackId}>
                <option value="">{shelves.isFetching ? 'Loading…' : 'Select…'}</option>
                {(shelves.data ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Quantity</label>
              <input type="number" min={1} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Lot / Batch (optional)</label>
              <input value={form.lot} onChange={(e) => setForm((f) => ({ ...f, lot: e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving && <LoaderCircle size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Real reference module: custom/racks/product_rack_assign.php?action=list —
// see racks.queries.ts's header comment for the full write-up of this
// module's real read/write contract and the several genuine backend quirks
// (broken cascades, a redirect that silently swallows Edit's own validation
// error) deliberately not reproduced here.
export function ProductRackAssignPage() {
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [rackId, setRackId] = useState('')
  const [shelfId, setShelfId] = useState('')
  const [lot, setLot] = useState('')
  const [applied, setApplied] = useState<ProductAssignFilters>({})
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const racksFilter = useRacksByWarehouse(warehouseId || undefined)
  const shelvesFilter = useShelvesByRack(rackId || undefined)
  const { data, isLoading, isError, error } = useProductAssignments(applied)
  const deleteAssignment = useDeleteAssignmentReal()

  const rows = useMemo(() => data ?? [], [data])
  const { sorted, sort, toggleSort } = useSortableRows<ProductAssignmentRow, SortKey>(rows, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  useEffect(() => {
    setRackId('')
    setShelfId('')
  }, [warehouseId])
  useEffect(() => {
    setShelfId('')
  }, [rackId])

  function handleFilter() {
    setApplied({ productId: productId || undefined, warehouseId: warehouseId || undefined, rackId: rackId || undefined, shelfId: shelfId || undefined, lot: lot || undefined })
    setPage(1)
  }
  function handleReset() {
    setProductId('')
    setWarehouseId('')
    setRackId('')
    setShelfId('')
    setLot('')
    setApplied({})
    setPage(1)
  }

  async function handleEdit(row: ProductAssignmentRow) {
    if (!row.assignId) return
    setEditError(null)
    setLoadingEditId(row.assignId)
    try {
      const detail = await fetchAssignmentDetail(row.assignId)
      setModal({
        mode: 'edit',
        assignId: detail.id,
        warehouseId: String(detail.warehouseId),
        rackId: String(detail.rackId),
        shelfId: String(detail.shelfId),
        productId: String(detail.productId),
        qty: String(detail.qty),
        lot: detail.lot ?? '',
      })
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not load this assignment.')
    } finally {
      setLoadingEditId(null)
    }
  }

  function handleDelete(row: ProductAssignmentRow) {
    if (!row.assignId) return
    if (!window.confirm(`Remove this assignment for ${row.productRef}?`)) return
    deleteAssignment.mutate(row.assignId)
  }

  function getExportData() {
    return {
      headers: COLUMN_LABELS.slice(1, -1),
      rows: sorted.map((r) => [`${r.productRef} - ${r.productName}`, r.warehouseName || '-', r.rackName || '-', r.shelfRef || '-', r.lot || '-', String(r.lotCount), r.qty != null ? String(r.qty) : '-', r.capDisplay]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackagePlus size={20} className="text-brand" /> Product Rack/Shelf Assignments
        </h2>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create', warehouseId: '', rackId: '', shelfId: '', productId: '', qty: '1', lot: '' })}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <PackagePlus size={14} /> Assign Product to Shelf
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load assignments.'}</p>
          </Card>
        )}
        {editError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{editError}</p>
          </Card>
        )}
        {deleteAssignment.isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{(deleteAssignment.error as Error).message}</p>
          </Card>
        )}

        <Card className="!h-auto">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <label className="block text-xs text-text-faint mb-1">Product</label>
              <SearchableSelect value={productId} onChange={setProductId} options={(products ?? []).map((p) => ({ value: p.id, label: `${p.ref} — ${p.label}` }))} placeholder="All Products" />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Warehouse</label>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.ref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Rack</label>
              <select value={rackId} onChange={(e) => setRackId(e.target.value)} className={selectCls} disabled={!warehouseId}>
                <option value="">All Racks</option>
                {(racksFilter.data ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Shelf</label>
              <select value={shelfId} onChange={(e) => setShelfId(e.target.value)} className={selectCls} disabled={!rackId}>
                <option value="">All Shelves</option>
                {(shelvesFilter.data ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Lot</label>
              <input value={lot} onChange={(e) => setLot(e.target.value)} placeholder="Lot / Batch" className={inputCls + ' w-36'} />
            </div>
            <button type="button" onClick={handleFilter} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <Filter size={14} /> Filter
            </button>
            <button type="button" onClick={handleReset} className="flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <TableExportButtons title="Product Rack Assignments" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th>#</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.label} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align} className="whitespace-nowrap">
                      {col.label}
                    </Th>
                  ))}
                  <Th>Action</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-6 text-center text-text-faint">
                      <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr key={`${r.productRef}-${r.assignId ?? 'none'}-${i}`} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-text!">
                        {r.productRef} <span className="text-text-faint">— {r.productName}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.warehouseName || <span className="text-text-faint">—</span>}</td>
                      <td className="px-4 py-3 text-text-muted">{r.rackName || <span className="text-text-faint">—</span>}</td>
                      <td className="px-4 py-3 text-text-muted">{r.shelfRef || <span className="text-text-faint">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {r.lot && <span className="inline-flex items-center rounded-full bg-info-bg text-info-fg px-2 py-0.5 text-xs font-medium">{r.lot}</span>}
                          <button type="button" disabled title="Bulk lot management isn't built in this app yet" className="flex items-center gap-1 text-xs text-text-faint cursor-not-allowed">
                            <Layers size={12} /> Lots
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="inline-flex items-center rounded-full bg-surface-hover text-text-muted px-2 py-0.5 text-xs font-medium">{r.lotCount}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{r.qty != null ? r.qty : <span className="text-text-faint">—</span>}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold" style={{ color: r.capColor }}>
                        {r.capDisplay}
                      </td>
                      <td className="px-4 py-3">
                        {r.hasAssignment ? (
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={loadingEditId === r.assignId} onClick={() => handleEdit(r)} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline disabled:opacity-50">
                              {loadingEditId === r.assignId ? <LoaderCircle size={12} className="animate-spin" /> : <Pencil size={12} />} Edit
                            </button>
                            <button type="button" onClick={() => handleDelete(r)} className="flex items-center gap-1 text-xs font-medium text-danger-fg hover:underline">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-text-faint">Not assigned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} edgeToEdge />

      {modal && <AssignmentModal state={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
