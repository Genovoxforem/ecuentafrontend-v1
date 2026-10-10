import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Check, FileText, Info, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { ROUTES } from '../../../routes'
import { resolveDocLink } from '../ledgerHtmlParser'
import { parseAmount, type PieceCard, type PieceCardAddRow, type PieceCardLine } from '../pieceCardParser'
import {
  fetchExchangeRate,
  useAddPieceLine,
  useDeletePieceLine,
  useJournalOptions,
  usePieceCard,
  useUpdatePieceHeader,
  useUpdatePieceLine,
  useValidateTransaction,
  type PieceHeaderField,
  type PieceLineInput,
} from '../pieceCard.queries'

const inputCls = 'h-9 w-full rounded-md border border-input-border bg-input-bg px-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const th = 'px-3 py-2.5 text-left text-xs font-semibold text-text whitespace-nowrap'

// The real page prints the type as stored ("bank", "expense_report", …).
const formatDocType = (docType: string) => docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// "2026-04-27" for the date box, from the "04/27/2026" the page prints.
function displayDateToIso(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim())
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}

// What the page's own script shows under an amount box while typing: amount x exchange rate.
function converted(amount: string, rate: string): string {
  const value = parseFloat(amount.replace(/,/g, ''))
  const factor = parseFloat(rate.replace(/,/g, ''))
  return Number.isFinite(value) && Number.isFinite(factor) ? (value * factor).toFixed(4) : ''
}

const round2 = (n: number) => String(Math.round(n * 100) / 100)

interface LineForm {
  account: string
  subledger: string
  subledgerLabel: string
  label: string
  currency: string
  rate: string
  debit: string
  credit: string
}

const toInput = (f: LineForm): PieceLineInput => ({
  accountingaccount_number: f.account,
  subledger_account: f.subledger,
  subledger_label: f.subledgerLabel,
  label_operation: f.label,
  multicurrency_code: f.currency,
  currency_amo: f.rate,
  debit: f.debit,
  credit: f.credit,
})

// The boxes of one line, shared by the "add" row and the row being edited.
function LineFields({ form, set, add, busy, submitLabel, onSubmit, onCancel }: { form: LineForm; set: (patch: Partial<LineForm>) => void; add: PieceCardAddRow; busy: boolean; submitLabel: string; onSubmit: () => void; onCancel?: () => void }) {
  const [rateBusy, setRateBusy] = useState(false)
  const changeCurrency = (currency: string) => {
    set({ currency })
    setRateBusy(true)
    // The page fills the rate box with the currency's latest rate.
    fetchExchangeRate(currency)
      .then((rate) => {
        if (/^\d+(\.\d+)?$/.test(rate)) set({ rate })
      })
      .catch(() => undefined)
      .finally(() => setRateBusy(false))
  }
  const preview = (amount: string) => {
    // Like the page's own script, nothing is shown until an amount has been typed.
    const text = Number(amount.replace(/,/g, '')) ? converted(amount, form.rate) : ''
    return text ? <span className="block text-right text-xs italic text-text-faint">{text}</span> : null
  }
  return (
    <>
      <td className="min-w-56 px-2 py-2 align-top">
        <SearchableSelect value={form.account} onChange={(account) => set({ account })} options={add.accountOptions} placeholder="Select account" />
      </td>
      <td className="min-w-48 px-2 py-2 align-top space-y-2">
        <input value={form.subledger} onChange={(e) => set({ subledger: e.target.value })} placeholder="Subledger account" className={inputCls} />
        <input value={form.subledgerLabel} onChange={(e) => set({ subledgerLabel: e.target.value })} placeholder="Subledger account label" className={inputCls} />
      </td>
      <td className="min-w-44 px-2 py-2 align-top">
        <input value={form.label} onChange={(e) => set({ label: e.target.value })} className={inputCls} aria-label="Label operation" />
      </td>
      <td className="min-w-44 px-2 py-2 align-top">
        <select value={form.currency} onChange={(e) => changeCurrency(e.target.value)} className={inputCls} aria-label="Currency">
          {add.currencyOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="w-28 px-2 py-2 align-top">
        <input value={form.rate} onChange={(e) => set({ rate: e.target.value })} className={`${inputCls} text-right`} aria-label="Exchange rate" disabled={rateBusy} />
      </td>
      <td className="w-32 px-2 py-2 align-top">
        <input value={form.debit} onChange={(e) => set({ debit: e.target.value })} className={`${inputCls} text-right`} aria-label="Debit" />
        {preview(form.debit)}
      </td>
      <td className="w-32 px-2 py-2 align-top">
        <input value={form.credit} onChange={(e) => set({ credit: e.target.value })} className={`${inputCls} text-right`} aria-label="Credit" />
        {preview(form.credit)}
      </td>
      <td className="px-2 py-2 align-top">
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={busy} onClick={onSubmit} className="flex h-9 items-center gap-1 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {busy ? <LoaderCircle size={13} className="animate-spin" /> : submitLabel === 'Add' ? <Plus size={13} /> : <Check size={13} />} {submitLabel}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} title="Cancel" className="grid h-9 w-9 place-items-center rounded-md border border-border text-text-faint hover:text-danger hover:bg-danger-bg">
              <X size={14} />
            </button>
          )}
        </div>
      </td>
    </>
  )
}

function blankForm(add: PieceCardAddRow): LineForm {
  return { account: '', subledger: '', subledgerLabel: '', label: '', currency: add.currency || add.currencyOptions[0]?.value || '', rate: add.exchangeRate || '1.00', debit: '0.00', credit: '0.00' }
}

// The rate box of an edited line: its own rate, or 1.00 when it has none (the page itself always
// starts an edit at 1.00, which would silently overwrite a foreign line's rate).
function formForEdit(l: PieceCardLine, add: PieceCardAddRow): LineForm {
  const rate = parseAmount(l.exchangeRate) > 0 ? l.exchangeRate.replace(/,/g, '') : '1.00'
  return { account: l.account, subledger: l.subledger, subledgerLabel: l.subledgerLabel, label: l.label, currency: l.currency || add.currency, rate, debit: l.debit.replace(/,/g, ''), credit: l.credit.replace(/,/g, '') }
}

// Date / Journal / Accounting Doc.: a value with a pencil that turns it into the page's own edit form.
function HeaderRow({
  label,
  editing,
  onEdit,
  display,
  editor,
}: {
  label: string
  editing: boolean
  onEdit?: () => void
  display: React.ReactNode
  editor: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(9rem,14rem)_1fr] items-center gap-3 py-1.5">
      <span className="flex items-center justify-between gap-2 text-sm text-text-muted">
        {label}
        {onEdit && !editing && (
          <button type="button" onClick={onEdit} title={`Edit ${label}`} aria-label={`Edit ${label}`} className="grid h-6 w-6 place-items-center rounded-md text-brand hover:bg-brand/10">
            <Pencil size={13} />
          </button>
        )}
      </span>
      <div className="min-h-9 text-sm text-text! flex items-center">{editing ? editor : display}</div>
    </div>
  )
}

function TransactionCard({ card, pieceNum, mode }: { card: PieceCard; pieceNum: string; mode: string }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const updateHeader = useUpdatePieceHeader(pieceNum, mode)
  const addLine = useAddPieceLine(pieceNum, mode)
  const updateLine = useUpdatePieceLine(pieceNum, mode)
  const deleteLine = useDeletePieceLine(pieceNum, mode)
  const validate = useValidateTransaction(pieceNum)

  const [editingField, setEditingField] = useState<PieceHeaderField | null>(null)
  const [fieldValue, setFieldValue] = useState('')
  const journals = useJournalOptions(pieceNum, mode, editingField === 'journal')

  const add = card.add
  const [newValues, setNewValues] = useState<LineForm | null>(null)
  const newLine = newValues ?? (add ? blankForm(add) : null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<LineForm | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dismissedFor, setDismissedFor] = useState('')

  const totals = useMemo(() => {
    const debit = card.lines.reduce((s, l) => s + parseAmount(l.debit), 0)
    const credit = card.lines.reduce((s, l) => s + parseAmount(l.credit), 0)
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 }
  }, [card.lines])
  // A changed total brings the warning back.
  const warningKey = `${totals.debit}|${totals.credit}`

  const fail = (e: unknown) => setProblem(e instanceof Error ? e.message : 'The request was refused.')
  const clear = () => {
    setProblem(null)
    setNotice(null)
  }

  const startField = (field: PieceHeaderField) => {
    clear()
    setEditingField(field)
    setFieldValue(field === 'date' ? displayDateToIso(card.date) : field === 'journal' ? card.journal : card.accountingDoc)
  }
  const saveField = () => {
    if (!editingField) return
    clear()
    updateHeader.mutate({ field: editingField, value: fieldValue }, { onSuccess: () => setEditingField(null), onError: fail })
  }

  const checkLine = (f: LineForm): string | null => {
    if (!f.account) return 'Select an account.'
    if (Number(f.debit.replace(/,/g, '')) !== 0 && Number(f.credit.replace(/,/g, '')) !== 0) return 'A line cannot have both a debit and a credit.'
    return null
  }
  const submitNew = () => {
    if (!newLine || !add) return
    clear()
    const bad = checkLine(newLine)
    if (bad) return setProblem(bad)
    addLine.mutate(toInput(newLine), { onSuccess: () => { setNewValues(null); setNotice('Line added.') }, onError: fail })
  }
  const submitEdit = () => {
    if (!editingId || !editValues) return
    clear()
    const bad = checkLine(editValues)
    if (bad) return setProblem(bad)
    updateLine.mutate({ id: editingId, input: toInput(editValues) }, { onSuccess: () => { setEditingId(null); setNotice('Record saved.') }, onError: fail })
  }
  const removeLine = async (l: PieceCardLine) => {
    clear()
    const ok = await confirm({ title: 'Delete movement?', message: `Delete the line ${l.account}${l.label ? ` — ${l.label}` : ''} from transaction ${pieceNum}?` })
    if (!ok) return
    deleteLine.mutate(l.id, { onSuccess: () => setNotice('Line deleted.'), onError: fail })
  }
  const doValidate = async () => {
    clear()
    const ok = await confirm({
      title: 'Validate transaction?',
      message: `Move transaction ${pieceNum} into the ledger?`,
      warningTitle: 'The ledger gives it a new number.',
      warningMessage: 'Once validated it is an ordinary ledger transaction.',
      variant: 'default',
      confirmLabel: 'Validate Transaction',
    })
    if (!ok) return
    validate.mutate(undefined, { onSuccess: () => navigate(ROUTES.ledgerList), onError: fail })
  }

  const docTo = resolveDocLink(card.docType, card.hidden.fk_doc ?? '', null)
  const scratch = mode === '_tmp'

  return (
    <div className="space-y-4">
      {!totals.balanced && dismissedFor !== warningKey && card.lines.length > 0 && (
        <div role="status" className="fixed top-[67px] right-4 z-[60] flex max-w-sm items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-bg px-4 py-3 text-warning-fg shadow-lg">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p className="text-xs font-medium leading-snug">
            Movement not correctly balanced. Debit = {round2(totals.debit)} | Credit = {round2(totals.credit)}
          </p>
          <button type="button" onClick={() => setDismissedFor(warningKey)} aria-label="Dismiss" className="shrink-0 rounded-md p-0.5 hover:bg-warning-fg/10">
            <X size={14} />
          </button>
        </div>
      )}

      {scratch && (
        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="mt-0.5 shrink-0 text-info-fg" />
          <p className="text-xs text-info-fg">This transaction is still being entered. It joins the ledger, under a new number, when you press Validate Transaction (debit and credit must be equal).</p>
        </Card>
      )}
      {notice && <div className="rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{notice}</div>}
      {problem && (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {problem}
        </div>
      )}

      <div className="border-b border-border">
        <span className="inline-block border-b-2 border-brand px-3 py-2 text-sm font-semibold uppercase text-brand">Transaction</span>
      </div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div>
            <HeaderRow label="Numero Of Transaction" editing={false} display={card.pieceNum} editor={null} />
            <HeaderRow
              label="Date"
              editing={editingField === 'date'}
              onEdit={() => startField('date')}
              display={card.date || '—'}
              editor={<HeaderEditor onSave={saveField} onCancel={() => setEditingField(null)} busy={updateHeader.isPending}><input type="date" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} className={inputCls} aria-label="Date" /></HeaderEditor>}
            />
            <HeaderRow
              label="Journal"
              editing={editingField === 'journal'}
              onEdit={() => startField('journal')}
              display={card.journal || '—'}
              editor={
                <HeaderEditor onSave={saveField} onCancel={() => setEditingField(null)} busy={updateHeader.isPending} disabled={!journals.data}>
                  {journals.data ? (
                    <select value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} className={inputCls} aria-label="Journal">
                      {journals.data.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-text-faint">
                      <LoaderCircle size={13} className="animate-spin" /> Loading…
                    </span>
                  )}
                </HeaderEditor>
              }
            />
            <HeaderRow
              label="Accounting Doc."
              editing={editingField === 'docRef'}
              onEdit={() => startField('docRef')}
              display={
                docTo ? (
                  <Link to={docTo} className="flex items-center gap-1 text-brand hover:underline">
                    <FileText size={12} /> {card.accountingDoc}
                  </Link>
                ) : (
                  card.accountingDoc || '—'
                )
              }
              editor={<HeaderEditor onSave={saveField} onCancel={() => setEditingField(null)} busy={updateHeader.isPending}><input value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} className={inputCls} aria-label="Accounting Doc." /></HeaderEditor>}
            />
          </div>
          <div>
            {card.docType && <HeaderRow label="Type Of Document" editing={false} display={formatDocType(card.docType)} editor={null} />}
            <HeaderRow label="Creation Date" editing={false} display={card.creationDate || '—'} editor={null} />
          </div>
        </div>
      </Card>

      <h3 className="text-lg font-medium text-text!">List Of Movements</h3>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className={th}>Account</th>
                <th className={th}>Subledger Account</th>
                <th className={th}>Label Operation</th>
                <th className={th}>Currency</th>
                <th className={`${th} text-right`}>Exchange Rate</th>
                <th className={`${th} text-right`}>Debit{card.currencyLabel ? ` (${card.currencyLabel})` : ''}</th>
                <th className={`${th} text-right`}>Credit{card.currencyLabel ? ` (${card.currencyLabel})` : ''}</th>
                <th className={th}>Event</th>
              </tr>
            </thead>
            <tbody>
              {card.lines.map((l) =>
                editingId === l.id && editValues && add ? (
                  <tr key={l.id} className="border-b border-border bg-surface/50">
                    <LineFields form={editValues} set={(patch) => setEditValues((f) => (f ? { ...f, ...patch } : f))} add={add} busy={updateLine.isPending} submitLabel="Update" onSubmit={submitEdit} onCancel={() => setEditingId(null)} />
                  </tr>
                ) : (
                  <tr key={l.id} className="border-b border-border align-top">
                    <td className="px-3 py-2.5 text-text!">
                      {l.account}
                      {l.accountLabel && <span className="text-text-faint"> - {l.accountLabel}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">
                      {l.subledger || '-'}
                      {l.subledger && l.subledgerLabel && <span className="text-text-faint"> - {l.subledgerLabel}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">{l.label}</td>
                    <td className="px-3 py-2.5 text-text-muted">{l.currency}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{l.exchangeRate}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-danger">
                      {l.debit}
                      <span className="block text-xs italic">({l.debitConverted})</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-brand">
                      {l.credit}
                      <span className="block text-xs italic">({l.creditConverted})</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Edit"
                          aria-label={`Edit line ${l.account}`}
                          disabled={!add}
                          onClick={() => {
                            clear()
                            if (!add) return
                            setEditingId(l.id)
                            setEditValues(formForEdit(l, add))
                          }}
                          className="grid h-8 w-8 place-items-center rounded-md text-brand hover:bg-brand/10 disabled:opacity-40"
                        >
                          <Pencil size={14} />
                        </button>
                        <button type="button" title="Delete" aria-label={`Delete line ${l.account}`} disabled={!l.deleteHref || deleteLine.isPending} onClick={() => removeLine(l)} className="grid h-8 w-8 place-items-center rounded-md text-danger hover:bg-danger-bg disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {add && newLine && editingId === null && (
                <tr className="border-b border-border bg-surface/50">
                  <LineFields form={newLine} set={(patch) => setNewValues((f) => ({ ...(f ?? blankForm(add)), ...patch }))} add={add} busy={addLine.isPending} submitLabel="Add" onSubmit={submitNew} />
                </tr>
              )}
            </tbody>
            {card.lines.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td colSpan={5} className="px-3 py-2 text-text!">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text!">{round2(totals.debit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text!">{round2(totals.credit)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {scratch && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!totals.balanced || card.lines.length === 0 || validate.isPending}
            title={totals.balanced ? undefined : `Movement not correctly balanced. Debit = ${round2(totals.debit)} | Credit = ${round2(totals.credit)}`}
            onClick={doValidate}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {validate.isPending && <LoaderCircle size={14} className="animate-spin" />} Validate Transaction
          </button>
          <Link to={ROUTES.ledgerList} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </Link>
        </div>
      )}
    </div>
  )
}

function HeaderEditor({ children, onSave, onCancel, busy, disabled }: { children: React.ReactNode; onSave: () => void; onCancel: () => void; busy: boolean; disabled?: boolean }) {
  return (
    <div className="flex w-full max-w-md items-center gap-1.5">
      <div className="flex-1">{children}</div>
      <button type="button" disabled={busy || disabled} onClick={onSave} className="flex h-9 items-center gap-1 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
        {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />} Modify
      </button>
      <button type="button" onClick={onCancel} title="Cancel" className="grid h-9 w-9 place-items-center rounded-md border border-border text-text-faint hover:text-danger hover:bg-danger-bg">
        <X size={14} />
      </button>
    </div>
  )
}

// The backend's own "Modification of a transaction" card (accountancy/bookkeeping/card.php).
export function PieceDetailPage() {
  const { pieceNum = '' } = useParams<{ pieceNum: string }>()
  const [search] = useSearchParams()
  const mode = search.get('mode') === '_tmp' ? '_tmp' : ''
  const { data: card, isLoading, isError, error, refetch } = usePieceCard(pieceNum, mode)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text!">Modification Of A Transaction</h2>
        <Link to={ROUTES.ledgerList} className="text-sm font-medium text-brand hover:underline">
          Back To List
        </Link>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading transaction…" />}
      {isError && <LegacyErrorCard title="Couldn't load transaction" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {!isLoading && !isError && !card && (
        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="mt-0.5 shrink-0 text-info-fg" />
          <p className="text-xs text-info-fg">
            There is no transaction {pieceNum}
            {mode === '_tmp' ? ' being entered' : ''} on the backend.
          </p>
        </Card>
      )}
      {card && <TransactionCard key={`${pieceNum}-${mode}`} card={card} pieceNum={pieceNum} mode={mode} />}
    </div>
  )
}
