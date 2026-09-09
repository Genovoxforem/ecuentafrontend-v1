import { useMemo, useState } from 'react'
import { Layers, Plus, X as XIcon, Search, LoaderCircle, AlertTriangle, Pencil } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useRacksReal, useShelvesReal, useCreateShelfReal, useUpdateShelfReal, type ShelfRow, type ShelfFormInput } from '../racks.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

type SortKey = 'rack' | 'ref' | 'capacity'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Rack', key: 'rack' },
  { label: 'Shelves Ref', key: 'ref' },
  { label: 'Shelves Capacity', key: 'capacity', align: 'right' },
]
const COLUMN_LABELS = ['No', ...COLUMNS.map((c) => c.label), 'Action']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const emptyForm: ShelfFormInput = { rackId: '', ref: '', capacity: 0 }

function sortValue(s: ShelfRow, key: SortKey): string | number {
  switch (key) {
    case 'rack':
      return s.rackName
    case 'ref':
      return s.ref
    case 'capacity':
      return s.capacity
  }
}

// Real reference module: custom/racks/racksindex.php?action=shelves_list —
// llx_shelves, part of the same real custom "racks" module as
// RacksAreaPage.tsx. See racks.queries.ts's header comment. The rack a shelf
// belongs to is only ever echoed by name/ref here (never its id — confirmed
// by reading the row-rendering code), so editing looks the rack up by name
// against the already-fetched real Racks list to pre-select it.
export function ShelvesPage() {
  const { data: shelves, isLoading, isError, error } = useShelvesReal()
  const { data: racks } = useRacksReal()
  const createShelf = useCreateShelfReal()
  const updateShelf = useUpdateShelfReal()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ShelfFormInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const rows = shelves ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = shelves ?? []
    if (!q) return list
    return list.filter((s) => [s.rackName, s.ref].some((f) => f.toLowerCase().includes(q)))
  }, [shelves, search])
  const { sorted, sort, toggleSort } = useSortableRows<ShelfRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return { headers: COLUMN_LABELS.slice(1, -1), rows: sorted.map((s) => [s.rackName, s.ref, String(s.capacity)]) }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }
  function openEdit(s: ShelfRow) {
    const rack = (racks ?? []).find((r) => r.label === s.rackName)
    setEditingId(s.id)
    setForm({ rackId: rack ? String(rack.id) : '', ref: s.ref, capacity: s.capacity })
    setFormError('')
    setShowForm(true)
  }

  function handleSave() {
    if (!form.rackId) return setFormError('Rack is required.')
    if (!form.ref.trim()) return setFormError('Shelves Ref is required.')
    if (!form.capacity || form.capacity <= 0) return setFormError('Capacity must be a positive number.')
    setFormError('')
    if (editingId) updateShelf.mutate({ shelId: editingId, ...form })
    else createShelf.mutate(form)
    setShowForm(false)
  }

  const saving = createShelf.isPending || updateShelf.isPending
  const mutationError = createShelf.error ?? updateShelf.error

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> Shelves
        </h2>
        <button type="button" onClick={() => (showForm ? setShowForm(false) : openCreate())} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Shelves'}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load shelves.'}</p>
          </Card>
        )}
        {showForm && (
          <Card className="!h-auto">
            <h3 className="text-sm font-semibold text-text! mb-3">{editingId ? 'Edit Shelf' : 'New Shelves'}</h3>
            {formError && <p className="text-sm font-medium text-danger mb-3">{formError}</p>}
            {mutationError && <p className="text-sm font-medium text-danger mb-3">{(mutationError as Error).message}</p>}
            {(racks ?? []).length === 0 && <p className="text-sm text-text-faint mb-3">No racks created yet — add one on the Racks page first.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Rack</label>
                <select value={form.rackId} onChange={(e) => setForm((f) => ({ ...f, rackId: e.target.value }))} className={selectCls}>
                  <option value="">Select…</option>
                  {(racks ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Shelves Ref</label>
                <input value={form.ref} onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Capacity</label>
                <input type="number" min={1} value={form.capacity || ''} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) || 0 }))} className={inputCls} />
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
            <TableExportButtons title="Shelves" getExportData={getExportData} />
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
                      {rows.length === 0 ? 'No Data Available In Table' : `No shelves match "${search}".`}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s, i) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-text-muted">{s.rackName}</td>
                      <td className="px-4 py-3 text-brand font-medium">{s.ref}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{s.capacity}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openEdit(s)} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
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
