import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Plus, X as XIcon, Search, PackagePlus, LoaderCircle, AlertTriangle, Pencil } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { useWarehouses } from '../warehouseExtras.queries'
import { useRacksReal, useCreateRackReal, useUpdateRackReal, type RackRow, type RackFormInput } from '../racks.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

type SortKey = 'label' | 'ref' | 'warehouse' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Label', key: 'label' },
  { label: 'Ref', key: 'ref' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = ['No', ...COLUMNS.map((c) => c.label), 'Action']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const emptyForm: RackFormInput = { label: '', ref: '', warehouseId: '', active: true }

function sortValue(r: RackRow, key: SortKey): string | number {
  switch (key) {
    case 'label':
      return r.label
    case 'ref':
      return r.ref
    case 'warehouse':
      return r.warehouseName
    case 'status':
      return r.active ? 1 : 0
  }
}

// Real reference module: custom/racks/racksindex.php?action=rack — a genuine
// custom Ecuenta module (llx_rack), not the unactivated Dolibarr core
// feature an earlier pass on this codebase assumed. See racks.queries.ts's
// header comment for the full write-up, including the real backend's own
// "New Rack" status bug (both options submit value=1) that this form avoids
// by sending 1/0 correctly rather than reusing that broken control.
export function RacksAreaPage() {
  const { data: racks, isLoading, isError, error } = useRacksReal()
  const warehouses = useWarehouses()
  const createRack = useCreateRackReal()
  const updateRack = useUpdateRackReal()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<RackFormInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const rows = racks ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = racks ?? []
    if (!q) return list
    return list.filter((r) => [r.label, r.ref, r.warehouseName].some((f) => f.toLowerCase().includes(q)))
  }, [racks, search])
  const { sorted, sort, toggleSort } = useSortableRows<RackRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: COLUMN_LABELS.slice(1, -1),
      rows: sorted.map((r) => [r.label, r.ref, r.warehouseName, r.active ? 'Active' : 'Close']),
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }
  function openEdit(r: RackRow) {
    const warehouse = warehouses.find((w) => w.ref === r.warehouseName || w.shortName === r.warehouseName)
    setEditingId(r.id)
    setForm({ label: r.label, ref: r.ref, warehouseId: warehouse ? String(warehouse.id) : '', active: r.active })
    setFormError('')
    setShowForm(true)
  }

  function handleSave() {
    if (!form.label.trim()) return setFormError('Label is required.')
    if (!form.warehouseId) return setFormError('Warehouse is required.')
    setFormError('')
    const mutation = editingId ? updateRack.mutate({ id: editingId, ...form }) : createRack.mutate(form)
    void mutation
    setShowForm(false)
  }

  const saving = createRack.isPending || updateRack.isPending
  const mutationError = createRack.error ?? updateRack.error

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Boxes size={20} className="text-brand" /> Racks
        </h2>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.productRackAssign} className="flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            <PackagePlus size={14} /> Assign Products
          </Link>
          <button type="button" onClick={() => (showForm ? setShowForm(false) : openCreate())} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            {showForm ? <XIcon size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'New Rack'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load racks.'}</p>
          </Card>
        )}
        {showForm && (
          <Card className="!h-auto">
            <h3 className="text-sm font-semibold text-text! mb-3">{editingId ? 'Edit Rack' : 'New Rack'}</h3>
            {formError && <p className="text-sm font-medium text-danger mb-3">{formError}</p>}
            {mutationError && <p className="text-sm font-medium text-danger mb-3">{(mutationError as Error).message}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Label</label>
                <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Ref (short name)</label>
                <input value={form.ref} onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Warehouse</label>
                <select value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))} className={selectCls}>
                  <option value="">Select…</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.ref}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Status</label>
                <select value={form.active ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === '1' }))} className={selectCls}>
                  <option value="1">Open</option>
                  <option value="0">Close</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button type="button" disabled={saving} onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
                {saving && <LoaderCircle size={14} className="animate-spin" />} Save
              </button>
            </div>
          </Card>
        )}

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
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
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
                      {rows.length === 0 ? 'No Data Available In Table' : `No racks match "${search}".`}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-brand font-medium">{r.label}</td>
                      <td className="px-4 py-3 text-text-muted">{r.ref}</td>
                      <td className="px-4 py-3 text-text-muted">{r.warehouseName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{r.active ? 'Active' : 'Close'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openEdit(r)} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                          <Pencil size={12} /> Edit
                        </button>
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
