import { useStickyTop } from '../useStickyTop'
import { useState } from 'react'
import { Check, LoaderCircle, Pencil, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { CONSTANT_NAME, useAdminConstants, useDeleteConstant, useSaveConstant, type AdminConstant, type ConstantFilters } from '../adminSetup.data'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-surface disabled:text-text-faint'

// The API's modification time (ISO, UTC) as YYYY-MM-DD HH:MM; blank when the constant has none.
const modifiedLabel = (iso: string) => iso.slice(0, 16).replace('T', ' ')

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

// A constant the page may change: not a secret (its value is not sent, so it could only be overwritten blind) and not a MAIN_MODULE_* flag
// (the API refuses those: "use the module manager").
const editable = (c: AdminConstant) => !c.redacted && !c.name.startsWith('MAIN_MODULE_')

// The constants browser of admin/fapi/consts.php with its writers (const_save.php, const_delete.php): name / value / comment filters (the classic
// page's search fields), paging, the add row, and per-row edit and delete. A secret comes without its value and is shown as hidden. Editing sends
// the comment and type the row already has: the API blanks a comment that is not sent.
export function OtherSetupConstants() {
  const [filters, setFilters] = useState<ConstantFilters>({ name: '', value: '', note: '' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const { data, isLoading, isError, error, refetch } = useAdminConstants(filters, page, perPage)
  const save = useSaveConstant()
  const remove = useDeleteConstant()
  const confirm = useConfirm()
  const [draft, setDraft] = useState({ name: '', value: '', note: '' })
  const [editing, setEditing] = useState<{ rowid: number; value: string; note: string } | null>(null)
  const [problem, setProblem] = useState('')
  const [draftEntity, setDraftEntity] = useState('1')
  const stickyTop = useStickyTop()
  const [ticked, setTicked] = useState<Set<number>>(new Set())

  const set = (patch: Partial<ConstantFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  async function add() {
    setProblem('')
    if (!CONSTANT_NAME.test(draft.name.trim())) return setProblem('A valid constant name is required (letters, digits, underscore).')
    try {
      await save.mutateAsync({ name: draft.name.trim(), value: draft.value, note: draft.note, visible: 1, ...(Number(draftEntity) && Number(draftEntity) !== 1 ? { entity: Number(draftEntity) } : {}) })
      setDraft({ name: '', value: '', note: '' })
    } catch (e) {
      setProblem(message(e, 'Could not save this constant.'))
    }
  }

  async function saveEdit(row: AdminConstant) {
    if (!editing) return
    setProblem('')
    try {
      await save.mutateAsync({ name: row.name, value: editing.value, note: editing.note, type: row.type, entity: row.entity, visible: row.visible })
      setEditing(null)
    } catch (e) {
      setProblem(message(e, 'Could not save this constant.'))
    }
  }

  // The tick boxes of the classic page select constants; Delete selected removes the ones the page may change (const_delete.php, one call each).
  async function deleteTicked() {
    setProblem('')
    const rows = (data?.items ?? []).filter((r) => ticked.has(r.rowid) && editable(r))
    if (rows.length === 0) return
    if (!(await confirm({ title: 'Delete constants', message: `Are you sure you want to delete ${rows.length} constant(s)?` }))) return
    try {
      for (const r of rows) await remove.mutateAsync(r.name)
      setTicked(new Set())
    } catch (e) {
      setProblem(message(e, 'Could not delete these constants.'))
    }
  }

  async function del(row: AdminConstant) {
    setProblem('')
    if (!(await confirm({ title: 'Delete constant', message: `Are you sure you want to delete ${row.name}?` }))) return
    try {
      await remove.mutateAsync(row.name)
    } catch (e) {
      setProblem(message(e, 'Could not delete this constant.'))
    }
  }

  const items = [...(data?.items ?? [])].sort((a, b) => a.entity - b.entity || a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  const box = 'block min-h-9 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text'

  return (
    <Card className="!h-auto !p-0 overflow-clip">
      {problem && <p className="px-4 pt-3 text-sm text-danger">{problem}</p>}
      {ticked.size > 0 && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <span className="text-sm text-text-muted">{ticked.size} selected</span>
          <button type="button" onClick={deleteTicked} disabled={remove.isPending} className="rounded-md bg-danger px-3 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            Delete selected
          </button>
          <button type="button" onClick={() => setTicked(new Set())} className="rounded-md border border-border px-3 py-1 text-sm text-text hover:bg-surface-hover">
            ClearSelection
          </button>
        </div>
      )}

      <div className="overflow-x-clip">
        <table className="w-full text-sm">
          <thead className="sticky z-10 bg-surface" style={{ top: stickyTop }}>
            <tr className="border-b border-border bg-surface-2 text-left text-sm text-text">
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Value</th>
              <th className="px-4 py-2.5 font-semibold">Comment</th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Modif. date</th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Environment</th>
              <th className="px-4 py-2" />
            </tr>
            <tr className="border-b border-border bg-surface-2">
              <th className="px-4 py-1.5">
                <input value={filters.name} onChange={(e) => set({ name: e.target.value })} placeholder="Search name" aria-label="Search name" className={`${inputCls} w-full font-normal`} />
              </th>
              <th className="px-4 py-1.5">
                <input value={filters.value} onChange={(e) => set({ value: e.target.value })} placeholder="Search value" aria-label="Search value" className={`${inputCls} w-full font-normal`} />
              </th>
              <th className="px-4 py-1.5">
                <input value={filters.note} onChange={(e) => set({ note: e.target.value })} placeholder="Search comment" aria-label="Search comment" className={`${inputCls} w-full font-normal`} />
              </th>
              <th />
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="New constant name" className={`${inputCls} w-full`} />
              </td>
              <td className="px-4 py-2.5">
                <input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} aria-label="New constant value" className={`${inputCls} w-full`} />
              </td>
              <td className="px-4 py-2.5">
                <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} aria-label="New constant comment" className={`${inputCls} w-full`} />
              </td>
              <td />
              <td className="px-4 py-2.5">
                <input value={draftEntity} onChange={(e) => setDraftEntity(e.target.value)} aria-label="New constant environment" className={`${inputCls} w-24`} />
              </td>
              <td className="px-2 py-2.5 text-right">
                <button type="button" onClick={add} disabled={save.isPending} className="flex items-center gap-1.5 rounded-md border border-input-border bg-surface-2 px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-50">
                  {save.isPending && !editing && <LoaderCircle size={13} className="animate-spin" />} Add
                </button>
              </td>
            </tr>
            {items.map((row) => {
              const isEditing = editing?.rowid === row.rowid
              return (
                <tr key={row.rowid} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-sm text-text!">{row.name}</td>
                  <td className="px-4 py-2 text-text-muted">
                    {isEditing ? (
                      <input value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} aria-label={`Value of ${row.name}`} className={`${inputCls} w-full`} />
                    ) : row.redacted ? (
                      <span className={`${box} italic text-text-faint`}>hidden (secret)</span>
                    ) : (
                      <span className={box}>{row.value ?? ''}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-text">
                    {isEditing ? <input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} aria-label={`Comment of ${row.name}`} className={`${inputCls} w-full`} /> : <span className={box}>{row.note}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-sm text-text">{modifiedLabel(row.modified)}</td>
                  <td className="whitespace-nowrap px-4 py-2"><span className={`${box} w-24`}>{row.entity}</span></td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.name}`}
                      disabled={!editable(row)}
                      checked={ticked.has(row.rowid)}
                      onChange={(e) =>
                        setTicked((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(row.rowid)
                          else next.delete(row.rowid)
                          return next
                        })
                      }
                      className="mr-2 align-middle"
                    />
                    {isEditing ? (
                      <>
                        <button type="button" title="Save" onClick={() => saveEdit(row)} disabled={save.isPending} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-brand disabled:opacity-60">
                          {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button type="button" title="Cancel" onClick={() => setEditing(null)} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      editable(row) && (
                        <>
                          <button type="button" title="Edit" onClick={() => setEditing({ rowid: row.rowid, value: row.value ?? '', note: row.note })} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-brand">
                            <Pencil size={14} />
                          </button>
                          <button type="button" title="Delete" onClick={() => del(row)} disabled={remove.isPending} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-60">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center italic text-text-faint">
                  No constant matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading constants…" />}
      {isError && <LegacyErrorCard title="Couldn't load the constants" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && <ListPagination page={page} perPage={perPage} total={data.total} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} perPageOptions={[25, 50, 100]} />}
    </Card>
  )
}
