import { useState, type ComponentType } from 'react'
import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import {
  loadDictionaryEditForm,
  useAddDictionaryEntry,
  useDeleteDictionaryEntry,
  useDictionary,
  useToggleDictionaryEntry,
  useUpdateDictionaryEntry,
  type DictionaryFilters,
} from '../../dictionary.queries'
import type { DictionaryEditForm, DictionaryField, DictionaryFilter, DictionaryPage as DictionaryData } from '../../dictionaryParser'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-3 py-2.5 text-left text-xs text-text whitespace-nowrap'
const errorCls = 'whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-2.5 text-sm text-danger'
// Long lists (the chart of accounts) get a searchable picker; short ones a plain select.
const SEARCHABLE_FROM = 20

type Values = Record<string, string>

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className={`mb-1 text-xs font-medium ${required ? 'text-danger' : 'text-text-faint'}`}>
        {label}
        {required && '*'}
      </p>
      {children}
    </div>
  )
}

function Control({ field, value, onChange }: { field: Pick<DictionaryField, 'name' | 'label' | 'kind' | 'options'> & { required?: boolean }; value: string; onChange: (v: string) => void }) {
  if (field.kind === 'text') return <input value={value} onChange={(e) => onChange(e.target.value)} aria-label={field.label} className={inputCls} />
  const options = field.required ? field.options : [{ value: '', label: '—' }, ...field.options]
  if (field.options.length >= SEARCHABLE_FROM) return <SearchableSelect value={value} onChange={onChange} options={options} placeholder={`Select ${field.label.toLowerCase()}`} />
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={field.label} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const startValues = (fields: DictionaryField[]): Values => Object.fromEntries(fields.map((f) => [f.name, f.value]))

// A required field must be filled; a required country select must not sit on its "Select Country" choice.
function missingField(fields: DictionaryField[], values: Values): string {
  const empty = fields.find((f) => f.required && (!(values[f.name] ?? '').trim() || (f.kind === 'select' && f.name.startsWith('country') && values[f.name] === '0')))
  return empty ? `${empty.label} is required.` : ''
}

function EditDialog({ id, title, form, fields, onClose }: { id: string; title: string; form: DictionaryEditForm; fields: DictionaryField[]; onClose: () => void }) {
  const update = useUpdateDictionaryEntry(id)
  const [values, setValues] = useState<Values>(form.values)
  const [missing, setMissing] = useState('')

  function submit() {
    const problem = missingField(fields, values)
    setMissing(problem)
    if (!problem) update.mutate({ form, values }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-gray-950" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-text!">Edit {title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {(missing || update.isError) && (
          <div role="alert" className={`mb-3 ${errorCls}`}>
            {missing || (update.error instanceof Error ? update.error.message : 'Saving failed.')}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <Field key={f.name} label={f.label} required={f.required}>
              <Control field={f} value={values[f.name] ?? ''} onChange={(v) => setValues((cur) => ({ ...cur, [f.name]: v }))} />
            </Field>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" disabled={update.isPending} onClick={submit} className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {update.isPending && <Loader2 size={14} className="animate-spin" />} Modify
          </button>
        </div>
      </div>
    </div>
  )
}

// The value a filter goes back to when cleared: a select's "0" / "Select …" choice, otherwise empty.
const clearedFilters = (filters: DictionaryFilter[]): DictionaryFilters => Object.fromEntries(filters.map((f) => [f.name, f.kind === 'select' && f.options.some((o) => o.value === '0') ? '0' : '']))

function DictionaryBody({ id, title, icon: Icon, dictionaryName, data, applied, setApplied, isFetching }: {
  id: string
  title: string
  icon: ComponentType<{ size?: number; className?: string }>
  dictionaryName: string
  data: DictionaryData
  applied: DictionaryFilters
  setApplied: (f: DictionaryFilters) => void
  isFetching: boolean
}) {
  const add = useAddDictionaryEntry(id)
  const toggle = useToggleDictionaryEntry(id)
  const remove = useDeleteDictionaryEntry(id)
  const confirm = useConfirm()
  const [values, setValues] = useState<Values>(() => startValues(data.fields))
  const [missing, setMissing] = useState('')
  const [draft, setDraft] = useState<DictionaryFilters | null>(null)
  const [editing, setEditing] = useState<DictionaryEditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  // What the filter row shows: the user's draft, else what the list was read with, else the page's own value.
  const shown: DictionaryFilters = draft ?? Object.fromEntries(data.filters.map((f) => [f.name, applied[f.name] ?? f.value]))
  const busy = toggle.isPending || remove.isPending

  function submitAdd() {
    const problem = missingField(data.fields, values)
    setMissing(problem)
    if (!problem) add.mutate(values, { onSuccess: () => setValues(startValues(data.fields)) })
  }

  async function openEdit(editUrl: string, rowid: string) {
    setEditError(null)
    setLoadingEdit(rowid)
    try {
      setEditing(await loadDictionaryEditForm(editUrl, data.fields.map((f) => f.name)))
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not open the edit form.')
    } finally {
      setLoadingEdit(null)
    }
  }

  async function handleDelete(rowid: string, label: string) {
    if (await confirm({ title: `Delete ${dictionaryName}?`, message: `Delete "${label}"? This cannot be undone.`, confirmLabel: 'Delete' })) remove.mutate({ rowid, filters: applied })
  }

  const actionError = editError ?? ((toggle.error ?? remove.error) instanceof Error ? ((toggle.error ?? remove.error) as Error).message : null)
  const columns = data.rows[0] && data.columns.length === data.rows[0].cells.length ? data.columns : (data.rows[0]?.cells ?? data.columns).map((_, i) => data.columns[i] ?? `Column ${i + 1}`)
  const colCount = columns.length + 2

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {title}
      </h2>

      <Card className="!h-auto">
        {(missing || add.isError) && (
          <div role="alert" className={`mb-3 ${errorCls}`}>
            {missing || (add.error instanceof Error ? add.error.message : 'Adding failed.')}
          </div>
        )}
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ ['--cols' as string]: Math.ceil((data.fields.length + 1) / 2) }}>
          {data.fields.map((f) => (
            <Field key={f.name} label={f.label} required={f.required}>
              <Control field={f} value={values[f.name] ?? ''} onChange={(v) => setValues((cur) => ({ ...cur, [f.name]: v }))} />
            </Field>
          ))}
          <div className="flex justify-end">
            <button type="button" disabled={add.isPending} onClick={submitAdd} className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              {add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </button>
          </div>
        </div>
      </Card>

      {data.filters.length > 0 && (
        <Card className="!h-auto">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.filters.map((f) => (
              <Field key={f.name} label={f.label}>
                <Control field={{ ...f, required: false }} value={shown[f.name] ?? ''} onChange={(v) => setDraft({ ...shown, [f.name]: v })} />
              </Field>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setApplied({ ...shown })} title="Search" className="grid h-9 w-11 place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
                {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null)
                  setApplied(clearedFilters(data.filters))
                }}
                title="Clear filters"
                className="grid h-9 w-11 place-items-center rounded-md bg-danger text-white hover:opacity-90"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </Card>
      )}

      {actionError && (
        <div role="alert" className={errorCls}>
          {actionError}
        </div>
      )}

      <Card className={`!h-auto !p-0 overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {columns.map((c) => (
                  <th key={c} className={th}>
                    {c}
                  </th>
                ))}
                <th className={th}>Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-3 py-8 text-center italic text-text-faint">
                    No entries match these filters.
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.rowid} className={`border-b border-border ${r.active ? '' : 'opacity-60'}`}>
                  {r.cells.map((cell, i) => (
                    <td key={i} className={`px-3 py-2.5 ${i === 0 ? 'font-medium text-text!' : 'text-text-muted'}`}>
                      {cell}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.active}
                      aria-label={`${r.active ? 'Disable' : 'Enable'} ${r.cells[0] ?? ''}`}
                      disabled={!r.toggleUrl || busy}
                      onClick={() => toggle.mutate({ rowid: r.rowid, enable: !r.active, filters: applied })}
                      title={r.active ? 'Disable' : 'Enable'}
                      className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${r.active ? 'bg-brand' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${r.active ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={!r.editUrl || loadingEdit === r.rowid}
                        onClick={() => r.editUrl && openEdit(r.editUrl, r.rowid)}
                        title="Edit"
                        className="text-text-muted hover:text-brand disabled:opacity-40"
                      >
                        {loadingEdit === r.rowid ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                      </button>
                      <button type="button" disabled={!r.deleteUrl || busy} onClick={() => handleDelete(r.rowid, r.cells[1] || r.cells[0] || '')} title="Delete" className="text-danger hover:opacity-80 disabled:opacity-40">
                        {remove.isPending && remove.variables?.rowid === r.rowid ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && <EditDialog id={id} title={dictionaryName} form={editing} fields={data.fields} onClose={() => setEditing(null)} />}
    </div>
  )
}

// A Dolibarr dictionary (admin/dict.php?id=N) shown natively: its add row, filters, entries,
// status switch, edit and delete — all read from and sent to that page.
export function DictionaryPage({ id, title, dictionaryName, icon }: { id: string; title: string; dictionaryName: string; icon: ComponentType<{ size?: number; className?: string }> }) {
  const [applied, setApplied] = useState<DictionaryFilters>({})
  const { data, isLoading, isFetching, isError, error, refetch } = useDictionary(id, applied)

  if (isLoading) return <LegacyLoadingCard label={`Loading ${dictionaryName}…`} />
  if (isError || !data) return <LegacyErrorCard title={`Couldn't load ${dictionaryName}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return <DictionaryBody id={id} title={title} icon={icon} dictionaryName={dictionaryName} data={data} applied={applied} setApplied={setApplied} isFetching={isFetching} />
}
