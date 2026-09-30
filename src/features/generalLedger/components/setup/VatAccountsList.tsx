import { useState } from 'react'
import { Loader2, Pencil, Percent, Plus, Search, Trash2, X } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { loadVatAccountEditForm, useAddVatAccount, useDeleteVatAccount, useToggleVatAccount, useUpdateVatAccount, useVatAccounts } from '../../vatAccounts.queries'
import type { VatAccountEditForm, VatAccountValues, VatAccountsPage, VatOption } from '../../vatAccountsParser'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-3 py-2.5 text-left text-xs text-text whitespace-nowrap'
const errorCls = 'whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-2.5 text-sm text-danger'

const EMPTY: VatAccountValues = {
  country: '0',
  code: '',
  taux: '',
  localtax1_type: '0',
  localtax1: '',
  localtax2_type: '0',
  localtax2: '',
  recuperableonly: '0',
  accountancy_code_sell: '',
  accountancy_code_buy: '',
  note: '',
}

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

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: VatOption[]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// The eleven editable fields, shared by the Add card and the Edit dialog.
function ValueFields({ v, set, page }: { v: VatAccountValues; set: (p: Partial<VatAccountValues>) => void; page: VatAccountsPage }) {
  const accounts = [{ value: '', label: '—' }, ...page.accounts]
  return (
    <>
      <Field label="Country" required>
        <SearchableSelect value={v.country} onChange={(country) => set({ country })} options={page.countries} placeholder="Select Country" />
      </Field>
      <Field label="Code">
        <input value={v.code} onChange={(e) => set({ code: e.target.value })} aria-label="Code" className={inputCls} />
      </Field>
      <Field label="Rate" required>
        <input value={v.taux} onChange={(e) => set({ taux: e.target.value })} inputMode="decimal" aria-label="Rate" className={inputCls} />
      </Field>
      <Field label="Include Tax 2">
        <Select value={v.localtax1_type} onChange={(localtax1_type) => set({ localtax1_type })} options={page.localTaxTypes} label="Include Tax 2" />
      </Field>
      <Field label="Rate 2">
        <input value={v.localtax1} onChange={(e) => set({ localtax1: e.target.value })} inputMode="decimal" aria-label="Rate 2" className={inputCls} />
      </Field>
      <Field label="Include Tax 3">
        <Select value={v.localtax2_type} onChange={(localtax2_type) => set({ localtax2_type })} options={page.localTaxTypes} label="Include Tax 3" />
      </Field>
      <Field label="Rate 3">
        <input value={v.localtax2} onChange={(e) => set({ localtax2: e.target.value })} inputMode="decimal" aria-label="Rate 3" className={inputCls} />
      </Field>
      <Field label="NPR">
        <Select value={v.recuperableonly} onChange={(recuperableonly) => set({ recuperableonly })} options={page.nprOptions} label="NPR" />
      </Field>
      <Field label="Sale Account. Code">
        <SearchableSelect value={v.accountancy_code_sell} onChange={(accountancy_code_sell) => set({ accountancy_code_sell })} options={accounts} placeholder="Select account" />
      </Field>
      <Field label="Purchase Account. Code">
        <SearchableSelect value={v.accountancy_code_buy} onChange={(accountancy_code_buy) => set({ accountancy_code_buy })} options={accounts} placeholder="Select account" />
      </Field>
      <Field label="Note">
        <input value={v.note} onChange={(e) => set({ note: e.target.value })} aria-label="Note" className={inputCls} />
      </Field>
    </>
  )
}

// The backend requires a country and a rate.
function missingField(v: VatAccountValues): string {
  if (!v.country || v.country === '0') return 'Country is required.'
  if (!v.taux.trim()) return 'Rate is required.'
  return ''
}

function EditDialog({ form, page, onClose }: { form: VatAccountEditForm; page: VatAccountsPage; onClose: () => void }) {
  const update = useUpdateVatAccount()
  const [v, setV] = useState<VatAccountValues>(form.values)
  const [missing, setMissing] = useState('')

  function submit() {
    const problem = missingField(v)
    setMissing(problem)
    if (!problem) update.mutate({ form, values: v }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-gray-950" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-text!">Edit VAT rate</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {(missing || update.isError) && (
          <div role="alert" className={`mb-3 ${errorCls}`}>
            {missing || (update.error instanceof Error ? update.error.message : 'Saving failed.')}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ValueFields v={v} set={(p) => setV((cur) => ({ ...cur, ...p }))} page={page} />
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

// General Ledger > Setup > Vat accounts (admin/dict.php?id=10): the backend's own VAT rates, with
// the same add, filter, enable/disable, edit and delete requests as that page.
export function VatAccountsList() {
  // The country goes to the backend; the code narrows the rows in the browser (see vatAccounts.queries.ts).
  type Filters = { country: string; code: string }
  const [applied, setApplied] = useState<Filters>({ country: '__MYCOUNTRYID__', code: '' })
  const [draft, setDraft] = useState<Filters | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useVatAccounts(applied.country)
  const add = useAddVatAccount()
  const toggle = useToggleVatAccount()
  const remove = useDeleteVatAccount()
  const confirm = useConfirm()
  const [values, setValues] = useState<VatAccountValues>(EMPTY)
  const [missing, setMissing] = useState('')
  const [editing, setEditing] = useState<VatAccountEditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading VAT accounts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the VAT accounts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // What the filter row shows (the page resolves "my country" to a real id).
  const shown: Filters = draft ?? { country: data.filters.country, code: applied.code }
  const patchFilter = (p: Partial<Filters>) => setDraft({ ...shown, ...p })
  // The country list the rows below were read from — what row actions must re-read.
  const listCountry = data.filters.country
  const codeQuery = applied.code.trim().toLowerCase()
  const rows = codeQuery ? data.rows.filter((r) => r.code.toLowerCase().includes(codeQuery)) : data.rows
  const busy = toggle.isPending || remove.isPending

  function submitAdd() {
    const problem = missingField(values)
    setMissing(problem)
    if (!problem) add.mutate(values, { onSuccess: () => setValues(EMPTY) })
  }

  async function openEdit(editUrl: string, rowid: string) {
    setEditError(null)
    setLoadingEdit(rowid)
    try {
      setEditing(await loadVatAccountEditForm(editUrl))
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not open the edit form.')
    } finally {
      setLoadingEdit(null)
    }
  }

  async function handleDelete(rowid: string, label: string) {
    if (await confirm({ title: 'Delete VAT rate?', message: `Delete "${label}"? This cannot be undone.`, confirmLabel: 'Delete' })) remove.mutate({ rowid, country: listCountry })
  }

  const actionError = editError ?? ((toggle.error ?? remove.error) instanceof Error ? ((toggle.error ?? remove.error) as Error).message : null)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Percent size={20} className="text-brand" /> Vat accounts
      </h2>

      <Card className="!h-auto">
        {(missing || add.isError) && (
          <div role="alert" className={`mb-3 ${errorCls}`}>
            {missing || (add.error instanceof Error ? add.error.message : 'Adding failed.')}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ValueFields v={values} set={(p) => setValues((cur) => ({ ...cur, ...p }))} page={data} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" disabled={add.isPending} onClick={submitAdd} className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_auto]">
          <Field label="Country">
            <SearchableSelect value={shown.country} onChange={(country) => patchFilter({ country })} options={data.countries} placeholder="All countries" />
          </Field>
          <Field label="Code">
            <input value={shown.code} onChange={(e) => patchFilter({ code: e.target.value })} aria-label="Filter by code" className={inputCls} />
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => setApplied({ ...shown })} title="Search" className="grid h-9 w-11 place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
              {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                setApplied({ country: '0', code: '' })
              }}
              title="Clear filters"
              className="grid h-9 w-11 place-items-center rounded-md bg-danger text-white hover:opacity-90"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </Card>

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
                <th className={th}>Country</th>
                <th className={th}>Code</th>
                <th className={th}>Rate</th>
                <th className={th}>Include Tax 2</th>
                <th className={th}>Rate 2</th>
                <th className={th}>Include Tax 3</th>
                <th className={th}>Rate 3</th>
                <th className={th}>NPR</th>
                <th className={th}>Sale Account. Code</th>
                <th className={th}>Purchase Account. Code</th>
                <th className={th}>Note</th>
                <th className={th}>Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center italic text-text-faint">
                    No VAT rates match these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.rowid} className={`border-b border-border ${r.active ? '' : 'opacity-60'}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap text-text-muted">{r.country}</td>
                  <td className="px-3 py-2.5 font-medium text-text!">{r.code}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.rate}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.localTax1Type}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.localTax1}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.localTax2Type}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.localTax2}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.npr}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.saleAccount}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.purchaseAccount}</td>
                  <td className="px-3 py-2.5">{r.note}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.active}
                      aria-label={`${r.active ? 'Disable' : 'Enable'} ${r.code}`}
                      disabled={!r.toggleUrl || busy}
                      onClick={() => toggle.mutate({ rowid: r.rowid, enable: !r.active, country: listCountry })}
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
                      <button type="button" disabled={!r.deleteUrl || busy} onClick={() => handleDelete(r.rowid, r.code || r.note)} title="Delete" className="text-danger hover:opacity-80 disabled:opacity-40">
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

      {editing && <EditDialog form={editing} page={data} onClose={() => setEditing(null)} />}
    </div>
  )
}
