import { useState } from 'react'
import { Loader2, Pencil, Plus, Receipt, Search, Trash2, X } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import {
  loadTaxAccountEditForm,
  useAddTaxAccount,
  useFollowTaxAccountLink,
  useTaxAccounts,
  useUpdateTaxAccount,
  type TaxAccountFilters,
} from '../../taxAccounts.queries'
import { dictConfirmDeleteUrl } from '../../dictLinks'
import type { Option, TaxAccountEditForm, TaxAccountValues } from '../../taxAccountsParser'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-3 py-2.5 text-left text-xs text-text whitespace-nowrap'

const EMPTY: TaxAccountValues = { code: '', libelle: '', country: '0', decuctableper: '', module: '', modulecode: '', accountancy_code: '', deductible: '0' }

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

// The eight editable fields, shared by the Add card and the Edit dialog.
function ValueFields({ v, set, countries, accounts }: { v: TaxAccountValues; set: (p: Partial<TaxAccountValues>) => void; countries: Option[]; accounts: Option[] }) {
  return (
    <>
      <Field label="Code" required>
        <input value={v.code} onChange={(e) => set({ code: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Label" required>
        <input value={v.libelle} onChange={(e) => set({ libelle: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Country" required>
        <SearchableSelect value={v.country} onChange={(country) => set({ country })} options={countries} placeholder="Select Country" />
      </Field>
      <Field label="Rate %">
        <input value={v.decuctableper} onChange={(e) => set({ decuctableper: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Module/Application">
        <input value={v.module} onChange={(e) => set({ module: e.target.value })} className={inputCls} />
      </Field>
      <Field label="TaxType Code">
        <input value={v.modulecode} onChange={(e) => set({ modulecode: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Accounting Code">
        <SearchableSelect value={v.accountancy_code} onChange={(accountancy_code) => set({ accountancy_code })} options={accounts} placeholder="Select account" />
      </Field>
      <Field label="Deductible">
        <select value={v.deductible} onChange={(e) => set({ deductible: e.target.value })} className={inputCls}>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      </Field>
    </>
  )
}

function EditDialog({ form, countries, accounts, onClose }: { form: TaxAccountEditForm; countries: Option[]; accounts: Option[]; onClose: () => void }) {
  const update = useUpdateTaxAccount()
  const [v, setV] = useState<TaxAccountValues>(form.values)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl dark:bg-gray-950" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-text!">Edit tax account</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {update.isError && <div className="mb-3 whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-2.5 text-sm text-danger">{update.error instanceof Error ? update.error.message : 'Saving failed.'}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ValueFields v={v} set={(p) => setV({ ...v, ...p })} countries={countries} accounts={accounts} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ form, values: v }, { onSuccess: onClose })}
            className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {update.isPending && <Loader2 size={14} className="animate-spin" />} Modify
          </button>
        </div>
      </div>
    </div>
  )
}

// admin/dict.php?id=7 — the real "Tax accounts" dictionary (see
// taxAccountsParser.ts): add, filter, enable/disable, edit and delete all go
// to the backend page's own forms and tokened links.
export function TaxAccountsList() {
  const [applied, setApplied] = useState<TaxAccountFilters>({ code: '', country: '__MYCOUNTRYID__', rate: '', module: '' })
  const [draft, setDraft] = useState<TaxAccountFilters | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useTaxAccounts(applied)
  const add = useAddTaxAccount()
  const follow = useFollowTaxAccountLink()
  const confirm = useConfirm()
  const [values, setValues] = useState<TaxAccountValues>(EMPTY)
  const [editing, setEditing] = useState<TaxAccountEditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading tax accounts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the tax accounts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const filters = draft ?? data.filters
  const patchFilter = (p: Partial<TaxAccountFilters>) => setDraft({ ...filters, ...p })
  const setVals = (p: Partial<TaxAccountValues>) => setValues((s) => ({ ...s, ...p }))

  const openEdit = async (editUrl: string, rowid: string) => {
    setEditError(null)
    setLoadingEdit(rowid)
    try {
      setEditing(await loadTaxAccountEditForm(editUrl))
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not open the edit form.')
    } finally {
      setLoadingEdit(null)
    }
  }

  const remove = async (url: string, label: string) => {
    // The row's delete link only shows the backend's confirmation box; this dialog replaces it,
    // and the confirmed request is what actually deletes.
    if (await confirm({ title: 'Delete Tax Account?', message: `Delete "${label}"? This cannot be undone.` })) follow.mutate(dictConfirmDeleteUrl(url))
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> Tax accounts
      </h2>

      <Card className="!h-auto !flex-row flex-wrap items-end gap-4">
        {add.isError && <div className="mb-3 whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-2.5 text-sm text-danger">{add.error instanceof Error ? add.error.message : 'Adding failed.'}</div>}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <ValueFields v={values} set={setVals} countries={data.countries} accounts={data.accounts} />
        </div>
        <div className="flex shrink-0 items-end">
          <button
            type="button"
            disabled={add.isPending}
            onClick={() => add.mutate({ token: data.token, values }, { onSuccess: () => setValues(EMPTY) })}
            className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1fr_1.4fr_auto]">
          <Field label="Code">
            <input value={filters.code} onChange={(e) => patchFilter({ code: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Country">
            <SearchableSelect value={filters.country} onChange={(country) => patchFilter({ country })} options={data.countries} placeholder="All countries" />
          </Field>
          <Field label="Rate %">
            <input value={filters.rate} onChange={(e) => patchFilter({ rate: e.target.value })} placeholder="%" className={inputCls} />
          </Field>
          <Field label="TaxType Code">
            <select value={filters.module} onChange={(e) => patchFilter({ module: e.target.value })} className={inputCls}>
              {data.moduleFilter.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => setApplied(filters)} title="Search" className="grid h-9 w-11 place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                setApplied({ code: '', country: '0', rate: '', module: '' })
              }}
              title="Clear filters"
              className="grid h-9 w-11 place-items-center rounded-md bg-danger text-white hover:opacity-90"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </Card>

      {(editError || follow.isError) && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-2.5 text-sm text-danger">
          {editError ?? (follow.error instanceof Error ? follow.error.message : 'The action failed.')}
        </div>
      )}

      <Card className={`!h-auto !p-0 overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className={th}>Code</th>
                <th className={th}>Label</th>
                <th className={th}>Country</th>
                <th className={th}>Rate %</th>
                <th className={th}>Module/Application</th>
                <th className={th}>TaxType Code</th>
                <th className={th}>Accounting Code</th>
                <th className={th}>Deductible</th>
                <th className={th}>Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center italic text-text-faint">
                    No tax accounts match these filters.
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.rowid} className={`border-b border-border ${r.active ? '' : 'opacity-60'}`}>
                  <td className="px-3 py-2.5 font-medium text-text!">{r.code}</td>
                  <td className="px-3 py-2.5">{r.label}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-text-muted">{r.country}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.rate}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.module}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.taxTypeCode}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.accountingCode}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.deductible}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.active}
                      disabled={!r.toggleUrl || follow.isPending}
                      onClick={() => r.toggleUrl && follow.mutate(r.toggleUrl)}
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
                      <button type="button" disabled={!r.deleteUrl || follow.isPending} onClick={() => r.deleteUrl && remove(r.deleteUrl, r.label)} title="Delete" className="text-danger hover:opacity-80 disabled:opacity-40">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && <EditDialog form={editing} countries={data.countries} accounts={data.accounts} onClose={() => setEditing(null)} />}
    </div>
  )
}
