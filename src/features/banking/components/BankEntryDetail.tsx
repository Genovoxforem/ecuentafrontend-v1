import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Landmark, Receipt, X, Printer, ChevronLeft, User, Coins, Calendar, FileCheck2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import {
  useBankEntryDetail,
  useUpdateBankEntry,
  useReconcileBankEntry,
  useBankEntryLog,
  useBankEntryLedger,
  type UpdateBankEntryInput,
  type ReconcileBankEntryInput,
} from '../banking.queries'
import { mdyToIso, isoToMdy, type BankEntryDetail as BankEntryDetailData } from '../bankEntryDetailParser'
import { ROUTES } from '../../../routes'

const selectCls = inputClasses
const TABS = ['Bank entry', 'Log', 'LedgerEntry'] as const

type FormState = UpdateBankEntryInput & { dateOpsIso: string; dateValueIso: string }

function toFormState(data: BankEntryDetailData): FormState {
  return {
    accountId: data.accountId,
    paymentType: data.paymentType,
    checkNum: data.checkNum,
    transmitter: data.transmitter,
    bankOfCheck: data.bankOfCheck,
    dateOps: data.dateOps,
    dateValue: data.dateValue,
    dateOpsIso: mdyToIso(data.dateOps),
    dateValueIso: mdyToIso(data.dateValue),
    label: data.label,
    amount: data.amount,
    categoryIds: data.categoryOptions.filter((o) => o.selected).map((o) => o.value),
  }
}

// compta/bank/line.php?rowid=N — no JSON API (confirmed live, same as
// compta/bank/card.php?action=create — see bankAccountFormParser.ts), but a
// genuine classic form-POST edit page, not read-only: "Bank entry"
// (action=update) edits the transaction's own fields, and a second,
// independent "Reconciliation" form (action=setreconcile) further down the
// same page handles the statement number/reconciled flag. Both are wired
// here for real — see useUpdateBankEntry/useReconcileBankEntry in
// banking.queries.ts. The Voucher modal is pre-rendered server-side inside
// this same page fetch (not a separate AJAX call), so its content is just
// re-derived here from fields already parsed rather than re-scraped. Log
// (compta/bank/info.php) and LedgerEntry (compta/bank/ledgerentry.php) are
// real too — see useBankEntryLog/useBankEntryLedger — fetched only once
// their tab is actually opened, not eagerly with the main detail.
//
// Header/tabs shell matches BankAccountDetail.tsx's own sticky-header +
// pill-tab pattern (same -m-6/-mx-6 sticky trick, same rounded-full active
// tab) instead of a one-off design, so this page reads as part of the same
// Banking module rather than a visual outlier.
export function BankEntryDetail() {
  const { id } = useParams<{ id: string }>()
  const rowid = id ? Number(id) : undefined
  const [tab, setTab] = useState<(typeof TABS)[number]>('Bank entry')

  const { data, isLoading, isError, error, refetch } = useBankEntryDetail(rowid)
  const updateEntry = useUpdateBankEntry(rowid)
  const reconcileEntry = useReconcileBankEntry(rowid)
  const logQuery = useBankEntryLog(rowid, tab === 'Log')
  const ledgerQuery = useBankEntryLedger(rowid, tab === 'LedgerEntry')

  const [form, setForm] = useState<FormState | null>(null)
  const [reconcileForm, setReconcileForm] = useState<ReconcileBankEntryInput | null>(null)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reconcileError, setReconcileError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setForm(toFormState(data))
    setReconcileForm({ statement: data.reconcileStatement, reconciled: data.reconciled })
  }, [data])

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form) return
    setSaveError(null)
    try {
      await updateEntry.mutateAsync(form)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function handleReconcileSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!reconcileForm) return
    setReconcileError(null)
    try {
      await reconcileEntry.mutateAsync(reconcileForm)
    } catch (err) {
      setReconcileError(err instanceof Error ? err.message : 'Reconciliation update failed.')
    }
  }

  if (isLoading) return <LegacyLoadingCard label="Loading bank entry…" />
  if (isError) return <LegacyErrorCard title="Couldn't load this bank entry" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data || !form || !reconcileForm) return null

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.bankingEntries} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> List Entries
        </Link>
        <Link to={ROUTES.bankingEntries} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-border">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
                  <Landmark size={20} className="text-brand" /> Bank Entry #{data.rowid}
                </h2>
                <p className="text-sm text-text-muted">View and manage bank entry details</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setVoucherOpen(true)} title="View Voucher" className="p-1.5 rounded-md border border-border text-text-faint hover:bg-surface-hover hover:text-text">
                  <Receipt size={15} />
                </button>
                <button type="button" onClick={() => window.print()} title="Print" className="p-1.5 rounded-md border border-border text-text-faint hover:bg-surface-hover hover:text-text">
                  <Printer size={15} />
                </button>
                <Link to={ROUTES.bankingEntries} className="p-1.5 rounded-md border border-border text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
                  <X size={15} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 rounded-lg border border-border divide-y divide-border sm:divide-y-0 sm:divide-x mt-3">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Landmark size={16} className="text-text-faint shrink-0" />
                <div>
                  <p className="text-xs text-text-faint">Account</p>
                  <p className="text-sm font-semibold text-text!">{data.headerAccountLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Coins size={16} className="text-text-faint shrink-0" />
                <div>
                  <p className="text-xs text-text-faint">Amount</p>
                  <p className="text-sm font-semibold text-brand">{data.headerAmount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Calendar size={16} className="text-text-faint shrink-0" />
                <div>
                  <p className="text-xs text-text-faint">Operation Date</p>
                  <p className="text-sm font-semibold text-text!">{data.headerOperationDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3">
                <FileCheck2 size={16} className="text-text-faint shrink-0" />
                <div>
                  <p className="text-xs text-text-faint">Accounted in Ledger</p>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${
                      data.accountedInLedger ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'
                    }`}
                  >
                    {data.accountedInLedger ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-3">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                    tab === t ? 'bg-brand text-white' : 'text-text-muted hover:text-text hover:bg-surface-hover'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'Log' && <LogTab query={logQuery} />}
        {tab === 'LedgerEntry' && <LedgerEntryTab query={ledgerQuery} />}

        {tab === 'Bank entry' && (
          <div className="space-y-4">
            <Card className="!h-auto">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Account">
                  <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className={selectCls}>
                    {data.accountOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Links">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm py-2">
                    {data.links.length === 0 && <span className="text-text-faint">—</span>}
                    {data.links.map((l, i) => (
                      <span key={i}>
                        {l.kind === 'thirdparty' && l.id ? (
                          <Link to={ROUTES.customerDetail.replace(':id', String(l.id))} className="text-brand hover:underline">
                            {l.label}
                          </Link>
                        ) : l.kind === 'entry' && l.id ? (
                          <Link to={ROUTES.bankingEntryDetail.replace(':id', String(l.id))} className="text-brand hover:underline">
                            {l.label}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{l.label}</span>
                        )}
                        {i < data.links.length - 1 && <span className="text-text-faint">,</span>}
                      </span>
                    ))}
                  </div>
                </Field>

                <Field label="Type / Number (Check/Transfer NO)">
                  <div className="flex gap-2">
                    <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} className={selectCls}>
                      <option value="">Select a payment type</option>
                      {data.paymentTypeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input value={form.checkNum} onChange={(e) => setForm({ ...form, checkNum: e.target.value })} className={inputClasses} />
                  </div>
                </Field>

                <Field label="Transmitter (Check/Transfer transmitter)">
                  <input value={form.transmitter} onChange={(e) => setForm({ ...form, transmitter: e.target.value })} className={inputClasses} />
                </Field>

                <Field label="Bank (Bank of Check)">
                  <input value={form.bankOfCheck} onChange={(e) => setForm({ ...form, bankOfCheck: e.target.value })} className={inputClasses} />
                </Field>

                <Field label="Operation date">
                  <input
                    type="date"
                    value={form.dateOpsIso}
                    onChange={(e) => setForm({ ...form, dateOpsIso: e.target.value, dateOps: isoToMdy(e.target.value) })}
                    className={inputClasses}
                  />
                </Field>

                <Field label="Value date">
                  <input
                    type="date"
                    value={form.dateValueIso}
                    onChange={(e) => setForm({ ...form, dateValueIso: e.target.value, dateValue: isoToMdy(e.target.value) })}
                    className={inputClasses}
                  />
                </Field>

                <Field label="Label">
                  <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputClasses} />
                </Field>

                <Field label="Amount">
                  <div className="flex items-center gap-2">
                    <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClasses} />
                    {data.currencyLabel && <span className="text-sm text-text-faint whitespace-nowrap">{data.currencyLabel}</span>}
                  </div>
                </Field>

                <Field label="Tags/Categories of transactions">
                  <select
                    multiple
                    value={form.categoryIds}
                    onChange={(e) => setForm({ ...form, categoryIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
                    className={`${selectCls} h-24`}
                  >
                    {data.categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="md:col-span-3 flex items-center justify-end gap-3">
                  {saveError && <p className="text-sm text-danger">{saveError}</p>}
                  <button
                    type="submit"
                    disabled={updateEntry.isPending}
                    className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    {updateEntry.isPending ? 'Updating…' : 'Update'}
                  </button>
                </div>
              </form>
            </Card>

            <Card className="!h-auto">
              <h3 className="text-sm font-semibold text-text! mb-3">Reconciliation</h3>
              <form onSubmit={handleReconcileSubmit} className="flex flex-wrap items-end gap-4">
                <Field label="Account statement">
                  <input
                    value={reconcileForm.statement}
                    onChange={(e) => setReconcileForm({ ...reconcileForm, statement: e.target.value })}
                    className={inputClasses}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-text-muted pb-2">
                  <input type="checkbox" checked={reconcileForm.reconciled} onChange={(e) => setReconcileForm({ ...reconcileForm, reconciled: e.target.checked })} />
                  Entry reconciled with bank receipt
                </label>
                {reconcileError && <p className="text-sm text-danger">{reconcileError}</p>}
                <button
                  type="submit"
                  disabled={reconcileEntry.isPending}
                  className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
                >
                  {reconcileEntry.isPending ? 'Updating…' : 'Update'}
                </button>
              </form>
            </Card>
          </div>
        )}
      </div>

      {voucherOpen && <VoucherModal data={data} onClose={() => setVoucherOpen(false)} />}
    </div>
  )
}

function LogTab({ query }: { query: ReturnType<typeof useBankEntryLog> }) {
  const { data, isLoading, isError, error, refetch } = query
  if (isLoading) return <LegacyLoadingCard label="Loading log…" />
  if (isError) return <LegacyErrorCard title="Couldn't load this entry's log" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null
  return (
    <Card className="!h-auto">
      {data.accountedStatusText && <p className="text-sm text-text-muted text-center mb-3">{data.accountedStatusText}</p>}
      <div className="rounded-lg border border-border p-4 flex items-start gap-3">
        <User size={16} className="text-brand mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="text-text-muted">
            Created by{' '}
            {data.createdByUserId ? (
              <Link to={ROUTES.userDetail.replace(':id', String(data.createdByUserId))} className="text-brand hover:underline font-medium">
                {data.createdByName || `User #${data.createdByUserId}`}
              </Link>
            ) : (
              <span className="font-medium text-text!">{data.createdByName || '—'}</span>
            )}
          </p>
          <p className="text-text-faint mt-1">Creation date: {data.creationDate || '—'}</p>
          <p className="text-text-faint">Latest modification date: {data.lastModificationDate || '—'}</p>
        </div>
      </div>
    </Card>
  )
}

function LedgerEntryTab({ query }: { query: ReturnType<typeof useBankEntryLedger> }) {
  const { data, isLoading, isError, error, refetch } = query
  if (isLoading) return <LegacyLoadingCard label="Loading ledger entries…" />
  if (isError) return <LegacyErrorCard title="Couldn't load this entry's ledger postings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-auto max-h-[28rem]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-surface-alt">
              <th className="px-3 py-2 text-left font-medium text-text-muted">Date</th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">Accounting Doc.</th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">Ref.</th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">CodeJournal</th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">Account</th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">Label</th>
              <th className="px-3 py-2 text-right font-medium text-text-muted">Debit</th>
              <th className="px-3 py-2 text-right font-medium text-text-muted">Credit</th>
              <th className="px-3 py-2 text-right font-medium text-text-muted">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-center text-text-faint italic">
                  No record found
                </td>
              </tr>
            ) : (
              data.rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.date}</td>
                  <td className="px-3 py-2 text-text-muted">{r.accountingDoc || '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{r.ref || '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{r.codeJournal || '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{r.account || '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{r.label || '—'}</td>
                  <td className="px-3 py-2 text-right text-text-muted">{r.debit || '—'}</td>
                  <td className="px-3 py-2 text-right text-text-muted">{r.credit || '—'}</td>
                  <td className="px-3 py-2 text-right text-text!">{r.amount || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Sits outside the rows' own overflow-auto div above, so it never scrolls away with them — same technique as ListPagination's own footer bar. */}
      <div className="flex items-center justify-end gap-8 border-t border-border bg-surface-alt px-4 py-2.5 font-semibold">
        <span className="text-text! mr-auto">Balance</span>
        <span className="text-text! w-24 text-right">{data.totalDebit}</span>
        <span className="text-text! w-24 text-right">{data.totalCredit}</span>
        <span className="text-text! w-24 text-right">{data.totalAmount}</span>
      </div>
    </Card>
  )
}

function VoucherModal({ data, onClose }: { data: BankEntryDetailData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-surface border border-border shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Receipt size={16} className="text-brand" /> BankVoucher
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center border-b border-border pb-4">
            <h4 className="text-base font-bold text-text!">PaymentVoucher</h4>
          </div>
          <div className="text-center bg-info-bg/40 rounded-lg py-2">
            <p className="text-xs text-text-faint">Payment ref.</p>
            <p className="text-lg tracking-wide text-text!">{data.links.find((l) => l.kind === 'payment')?.label.replace(/^Payment\s*/i, '') || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-surface-alt p-3 space-y-1">
              <p>
                <strong className="text-text!">VoucherNo:</strong> BNK-{data.rowid}
              </p>
              <p>
                <strong className="text-text!">Date:</strong> {data.headerOperationDate}
              </p>
              <p>
                <strong className="text-text!">Account:</strong> {data.accountOptions.find((o) => o.value === data.accountId)?.label}
              </p>
            </div>
            <div className="rounded-md bg-surface-alt p-3 space-y-1 text-right">
              <p>
                <strong className="text-text!">Type:</strong> {data.paymentType}
              </p>
              <p>
                <strong className="text-text!">Number:</strong> {data.checkNum || '—'}
              </p>
            </div>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-hover">
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-center">Operation date</th>
                <th className="p-2 text-center">Value date</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="p-2">{data.label}</td>
                <td className="p-2 text-center">{data.dateOps}</td>
                <td className="p-2 text-center">{data.dateValue}</td>
                <td className="p-2 text-right font-semibold text-success-fg">
                  {data.amount} {data.currencyLabel}
                </td>
              </tr>
            </tbody>
          </table>
          {data.links.length > 0 && (
            <div className="bg-warning-bg/40 border-l-4 border-warning rounded-r-md p-3">
              <p className="text-xs font-semibold text-text-muted mb-1">Links:</p>
              {data.links.map((l, i) => (
                <p key={i} className="text-sm text-text-muted pl-2">
                  • {l.label}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border bg-surface-alt rounded-b-lg">
          <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Printer size={14} /> Print
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
