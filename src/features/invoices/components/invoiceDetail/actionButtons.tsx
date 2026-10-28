import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X, CheckCircle2, PenSquare, ShieldCheck, CheckCheck, Copy, Undo2, Trash2, RefreshCw, Mail, MessageCircle, FileText, FileMinus, Printer, CreditCard } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { OnlinePaymentModal } from '../OnlinePaymentModal'
import { useSalesInvoiceAction, useValidateSalesInvoice, useModifySalesInvoice, useSalesInvoiceDraftFormOptions, useDebitNoteEnabled, type SalesInvoiceSimpleAction } from '../../salesInvoice.queries'
import type { SalesInvoiceData } from '../../salesInvoiceApi'
import { useConvertToRecurringInvoice, type RecurringInvoiceInput } from '../../salesInvoiceTabs.queries'
import { useCreateCreditNote, useCreateDebitNote, useSalesInvoiceEmailData, useSendSalesInvoiceEmail, useSalesInvoicePosReceipt, CREDIT_NOTE_REASONS, DEBIT_NOTE_REASONS, type CreateCreditNoteInput, type CreateDebitNoteInput, type SendEmailInput } from '../../salesInvoiceActions.queries'
import { todayIso } from '../../../../utils/dates'
import { ActionButton, inputCls, selectCls } from './InvoiceDetailShared'

function WarehouseModal({
  title,
  icon: Icon,
  confirmLabel,
  options,
  value,
  onChange,
  onCancel,
  onConfirm,
  pending,
  error,
}: {
  title: string
  icon: React.ComponentType<{ size?: number }>
  confirmLabel: string
  options: { value: string; label: string }[] | undefined
  value: string
  onChange: (v: string) => void
  onCancel: () => void
  onConfirm: () => void
  pending: boolean
  error: unknown
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">{title}</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Warehouse</span>
          <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
            {(options ?? []).map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        {!!error && <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Something went wrong.'}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
            Cancel
          </button>
          <ActionButton tone="success" icon={Icon} onClick={onConfirm} pending={pending}>
            {pending ? 'Working…' : confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

function RecurringInvoiceModal({ facid, onCancel }: { facid: string; onCancel: () => void }) {
  const convert = useConvertToRecurringInvoice(facid)
  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState('1')
  const [unitFrequency, setUnitFrequency] = useState<'d' | 'm' | 'y'>('m')
  const [startDate, setStartDate] = useState(todayIso())
  const [rehour, setRehour] = useState('0')
  const [nbGenMax, setNbGenMax] = useState('0')
  const [autoValidate, setAutoValidate] = useState(false)
  const [useNewPrice, setUseNewPrice] = useState(false)
  const [generatePdf, setGeneratePdf] = useState(true)

  const submit = () => {
    const [y, m, d] = startDate.split('-')
    const input: RecurringInvoiceInput = {
      title,
      frequency,
      unitFrequency,
      reday: d,
      remonth: m,
      reyear: y,
      rehour,
      nbGenMax,
      autoValidate,
      useNewPrice,
      generatePdf,
    }
    convert.mutate(input, {
      onSuccess: () => onCancel(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Convert to Recurring Invoice</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} text-left`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Frequency</span>
            <input type="number" min="1" value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Unit</span>
            <select value={unitFrequency} onChange={(e) => setUnitFrequency(e.target.value as 'd' | 'm' | 'y')} className={selectCls}>
              <option value="d">Day(s)</option>
              <option value="m">Month(s)</option>
              <option value="y">Year(s)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Next Generation Date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls} text-left`} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-text-muted">Hour</span>
            <input type="number" min="0" max="23" value={rehour} onChange={(e) => setRehour(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm col-span-2">
            <span className="mb-1 block text-xs font-medium text-text-muted">Max Generations (0 = unlimited)</span>
            <input type="number" min="0" value={nbGenMax} onChange={(e) => setNbGenMax(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={autoValidate} onChange={(e) => setAutoValidate(e.target.checked)} /> Auto-validate generated invoices
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={useNewPrice} onChange={(e) => setUseNewPrice(e.target.checked)} /> Use current product prices
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={generatePdf} onChange={(e) => setGeneratePdf(e.target.checked)} /> Generate PDF
          </label>
        </div>
        {convert.isError && <p className="text-xs text-danger">{convert.error instanceof Error ? convert.error.message : 'Could not create the recurring invoice template.'}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
            Cancel
          </button>
          <ActionButton tone="info" icon={RefreshCw} onClick={submit} pending={convert.isPending}>
            Create
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

// Real contract: GET compta/sales/api/email.php?action=get_email_data,
// POST compta/sales/api/email.php action=send_email (see
// salesInvoiceActions.queries.ts header).
function SendEmailModal({ facid, onCancel }: { facid: string; onCancel: () => void }) {
  const { data, isLoading } = useSalesInvoiceEmailData(facid, true)
  const sendEmail = useSendSalesInvoiceEmail(facid)
  const [sendto, setSendto] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachpdf, setAttachpdf] = useState(true)
  const [initialized, setInitialized] = useState(false)

  if (data && !initialized) {
    setSendto(data.customer_email || '')
    setSubject(data.subject || '')
    setMessage(data.body || '')
    setInitialized(true)
  }

  const input: SendEmailInput = {
    sendto,
    sendtocc: '',
    sendtobcc: data?.bcc ?? '',
    subject,
    message,
    frommail: data?.from_mail ?? '',
    fromname: data?.from_name ?? '',
    replytomail: data?.from_mail ?? '',
    replytoname: data?.from_name ?? '',
    attachpdf,
    deliveryreceipt: false,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Send Email</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {isLoading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : sendEmail.isSuccess ? (
          <p className="text-sm text-success">{sendEmail.data?.message || 'Email sent.'}</p>
        ) : (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-text-muted">To</span>
              <input value={sendto} onChange={(e) => setSendto(e.target.value)} className={`${inputCls} text-left`} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-text-muted">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputCls} text-left`} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-text-muted">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className={`${inputCls} text-left`} />
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={attachpdf} onChange={(e) => setAttachpdf(e.target.checked)} /> Attach PDF
            </label>
            {sendEmail.isError && <p className="text-xs text-danger">{sendEmail.error instanceof Error ? sendEmail.error.message : 'Could not send this email.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="info" icon={Mail} onClick={() => sendEmail.mutate(input)} pending={sendEmail.isPending} disabled={!sendto}>
                Send
              </ActionButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Real contract: GET compta/sales/api/receipt.php?facid=X, rendered as a
// print-styled receipt (window.print() on the real page) — see
// salesInvoiceActions.queries.ts header.
function PosTicketModal({ facid, onCancel }: { facid: string; onCancel: () => void }) {
  const { data, isLoading, isError, error } = useSalesInvoicePosReceipt(facid, true)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-surface p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">POS Ticket</h3>
          <div className="flex items-center gap-2">
            {data && (
              <button type="button" onClick={() => window.print()} title="Print" className="rounded-md border border-input-border p-1.5 text-text-muted hover:bg-surface-hover">
                <Printer size={14} />
              </button>
            )}
            <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
        {isError && <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Could not load the receipt.'}</p>}
        {data && (
          <div className="font-mono text-xs space-y-2">
            <div className="text-center">
              <p className="font-bold text-sm text-text!">{data.company.name}</p>
              <p className="text-text-muted">{data.company.address}</p>
              <p className="text-text-muted">{data.company.phone}</p>
            </div>
            <div className="border-t border-dashed border-border pt-2">
              <p>
                Ref: <span className="font-semibold text-text!">{data.invoice.ref}</span>
              </p>
              <p>Date: {data.invoice.date}</p>
              <p>Customer: {data.customer.name}</p>
            </div>
            <table className="w-full border-t border-dashed border-border pt-2">
              <tbody>
                {data.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-0.5">
                      {l.label} x{l.qty}
                    </td>
                    <td className="py-0.5 text-right">{l.total_ttc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-dashed border-border pt-2 flex justify-between font-bold text-text!">
              <span>Total</span>
              <span>
                {data.totals.total_ttc} {data.totals.currency}
              </span>
            </div>
            {data.payments.length > 0 && (
              <div className="border-t border-dashed border-border pt-2">
                {data.payments.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{p.label}</span>
                    <span>{p.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Real contract: POST compta/sales/api/invoice.php action=createcreditnote
// — see salesInvoiceActions.queries.ts header.
function CreateCreditNoteModal({ facid, onCancel }: { facid: string; onCancel: () => void }) {
  const createCreditNote = useCreateCreditNote(facid)
  const [createtype, setCreatetype] = useState<'lines' | 'remaining'>('lines')
  const [cnDate, setCnDate] = useState(() => {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  })
  const [notePublic, setNotePublic] = useState(CREDIT_NOTE_REASONS[0])
  const [notePrivate, setNotePrivate] = useState('')

  const submit = () => {
    const input: CreateCreditNoteInput = { createtype, cnDate, notePublic, notePrivate }
    createCreditNote.mutate(input, {
      onSuccess: (result) => {
        if (result.redirect) window.location.href = result.redirect
        else onCancel()
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Create Credit Note</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="radio" checked={createtype === 'lines'} onChange={() => setCreatetype('lines')} /> Credit note with lines of origin invoice
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="radio" checked={createtype === 'remaining'} onChange={() => setCreatetype('remaining')} /> Credit note for remaining unpaid amount
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Date (dd/mm/yyyy)</span>
          <input value={cnDate} onChange={(e) => setCnDate(e.target.value)} className={`${inputCls} text-left`} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Reason</span>
          <select value={notePublic} onChange={(e) => setNotePublic(e.target.value)} className={selectCls}>
            {CREDIT_NOTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Private Note</span>
          <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} rows={2} className={`${inputCls} text-left`} />
        </label>
        {createCreditNote.isError && <p className="text-xs text-danger">{createCreditNote.error instanceof Error ? createCreditNote.error.message : 'Could not create the credit note.'}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
            Cancel
          </button>
          <ActionButton tone="success" icon={FileText} onClick={submit} pending={createCreditNote.isPending}>
            Create
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

// Real contract: POST compta/sales/api/invoice.php action=createdebitnote
// — see salesInvoiceActions.queries.ts header.
function CreateDebitNoteModal({ facid, onCancel }: { facid: string; onCancel: () => void }) {
  const createDebitNote = useCreateDebitNote(facid)
  const [dnDate, setDnDate] = useState(() => {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  })
  const [reasonCode, setReasonCode] = useState(DEBIT_NOTE_REASONS[0].code)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')

  const submit = () => {
    const input: CreateDebitNoteInput = { dnDate, reasonCode, notePublic, notePrivate }
    createDebitNote.mutate(input, {
      onSuccess: (result) => {
        if (result.redirect) window.location.href = result.redirect
        else onCancel()
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Create Debit Note</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Date (dd/mm/yyyy)</span>
          <input value={dnDate} onChange={(e) => setDnDate(e.target.value)} className={`${inputCls} text-left`} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Reason</span>
          <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className={selectCls}>
            {DEBIT_NOTE_REASONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Public Note</span>
          <input value={notePublic} onChange={(e) => setNotePublic(e.target.value)} className={`${inputCls} text-left`} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Private Note</span>
          <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} rows={2} className={`${inputCls} text-left`} />
        </label>
        {createDebitNote.isError && <p className="text-xs text-danger">{createDebitNote.error instanceof Error ? createDebitNote.error.message : 'Could not create the debit note.'}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
            Cancel
          </button>
          <ActionButton tone="success" icon={FileMinus} onClick={submit} pending={createDebitNote.isPending}>
            Create
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

export function InvoiceActionButtons({ data }: { data: SalesInvoiceData }) {
  const inv = data.invoice
  const facid = inv.id
  const statut = Number(inv.statut)
  const zraOk = data.zra.errorcode === '000'
  const navigate = useNavigate()

  const [showValidateModal, setShowValidateModal] = useState(false)
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [showUpdateZraModal, setShowUpdateZraModal] = useState(false)
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  // ?action=email / ?action=print: arriving from the quick invoice's Mail Invoice / Save and Print.
  const [searchParams] = useSearchParams()
  const arrivedFor = searchParams.get('action')
  const [showEmailModal, setShowEmailModal] = useState(arrivedFor === 'email')
  const [showPosTicket, setShowPosTicket] = useState(arrivedFor === 'print')
  const [showOnlinePay, setShowOnlinePay] = useState(arrivedFor === 'pay')
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false)
  const [showDebitNoteModal, setShowDebitNoteModal] = useState(false)
  const [whatsAppNotice, setWhatsAppNotice] = useState(false)
  const [warehouse, setWarehouse] = useState('')
  const [unvalWarehouse, setUnvalWarehouse] = useState('')

  const invoiceTypeNum = Number(inv.type)
  const canCreateCreditNote = [0, 1, 3, 4, 5].includes(invoiceTypeNum)
  const debitNoteEnabled = useDebitNoteEnabled(facid)
  const canCreateDebitNote = [0, 5, 6, 7].includes(invoiceTypeNum) && !!debitNoteEnabled.data

  const anyModalOpen = showValidateModal || showModifyModal || showUpdateZraModal
  const formOptions = useSalesInvoiceDraftFormOptions(facid, anyModalOpen)

  useEffect(() => {
    const opts = formOptions.data
    if (!opts) return
    setWarehouse((w) => w || opts.warehouseOptions.find((o) => o.selected)?.value || opts.warehouseOptions[0]?.value || '')
    setUnvalWarehouse((w) => w || opts.unvalidateWarehouseOptions.find((o) => o.selected)?.value || opts.unvalidateWarehouseOptions[0]?.value || '')
  }, [formOptions.data])

  const action = useSalesInvoiceAction(facid)
  const validateInvoice = useValidateSalesInvoice(facid)
  const modifyInvoice = useModifySalesInvoice(facid)

  const handleSimple = async (act: SalesInvoiceSimpleAction, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    const result = (await action.mutateAsync(act)) as { new_id?: string }
    if (act === 'clone' && result.new_id) navigate(ROUTES.invoiceDetail.replace(':id', result.new_id))
    if (act === 'delete') navigate(ROUTES.invoiceList)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border">
        {statut === 0 && (
          <ActionButton tone="success" icon={CheckCircle2} onClick={() => setShowValidateModal(true)}>
            Validate
          </ActionButton>
        )}
        {statut === 0 && (
          <ActionButton tone="info" icon={RefreshCw} onClick={() => setShowRecurringModal(true)}>
            Convert to Recurring Invoice
          </ActionButton>
        )}
        {statut === 1 && !zraOk && (
          <ActionButton tone="outline" icon={PenSquare} onClick={() => setShowModifyModal(true)}>
            Modify
          </ActionButton>
        )}
        {(statut === 1 || statut === 2) && !zraOk && (
          <ActionButton tone="warning" icon={ShieldCheck} onClick={() => setShowUpdateZraModal(true)}>
            Update To ZRA
          </ActionButton>
        )}
        {(statut === 1 || statut === 2) && (
          <ActionButton tone="info" icon={Mail} onClick={() => setShowEmailModal(true)}>
            Send Email
          </ActionButton>
        )}
        {statut === 1 && (
          <ActionButton tone="outline-success" icon={CreditCard} onClick={() => setShowOnlinePay(true)}>
            Online Payment
          </ActionButton>
        )}
        {(statut === 1 || statut === 2) && (
          <ActionButton tone="outline-success" icon={MessageCircle} onClick={() => setWhatsAppNotice(true)}>
            Send WhatsApp
          </ActionButton>
        )}
        {statut >= 1 && (
          <ActionButton tone="outline" icon={Printer} onClick={() => setShowPosTicket(true)}>
            POS Ticket
          </ActionButton>
        )}
        {statut === 1 && (
          <ActionButton tone="outline-success" icon={CheckCheck} pending={action.isPending} onClick={() => handleSimple('classifypaid', "Mark this invoice as fully paid?")}>
            Classify 'Paid'
          </ActionButton>
        )}
        {statut >= 1 && canCreateCreditNote && (
          <ActionButton tone="outline" icon={FileText} onClick={() => setShowCreditNoteModal(true)}>
            Create Credit Note
          </ActionButton>
        )}
        {statut >= 1 && canCreateDebitNote && (
          <ActionButton tone="outline" icon={FileMinus} onClick={() => setShowDebitNoteModal(true)}>
            Create Debit Note
          </ActionButton>
        )}
        <ActionButton tone="outline" icon={Copy} pending={action.isPending} onClick={() => handleSimple('clone')}>
          Clone
        </ActionButton>
        {statut >= 2 && !zraOk && (
          <ActionButton tone="outline" icon={Undo2} pending={action.isPending} onClick={() => handleSimple('reopen', 'Re-open this invoice back to draft?')}>
            Re-open
          </ActionButton>
        )}
        {statut === 0 && (
          <ActionButton tone="danger" icon={Trash2} pending={action.isPending} onClick={() => handleSimple('delete', 'Delete this invoice? This cannot be undone.')}>
            Delete
          </ActionButton>
        )}
      </div>
      {action.isError && <p className="text-xs text-danger px-4 pb-3">{action.error instanceof Error ? action.error.message : 'That action failed.'}</p>}

      {showValidateModal && (
        <WarehouseModal
          title="Validate Invoice"
          icon={CheckCircle2}
          confirmLabel="Validate"
          options={formOptions.data?.warehouseOptions}
          value={warehouse}
          onChange={setWarehouse}
          onCancel={() => setShowValidateModal(false)}
          onConfirm={() => {
            validateInvoice.mutate({ idwarehouse: warehouse })
            setShowValidateModal(false)
          }}
          pending={validateInvoice.isPending}
          error={validateInvoice.error}
        />
      )}
      {showModifyModal && (
        <WarehouseModal
          title="Modify Invoice (back to Draft)"
          icon={PenSquare}
          confirmLabel="Modify"
          options={formOptions.data?.unvalidateWarehouseOptions}
          value={unvalWarehouse}
          onChange={setUnvalWarehouse}
          onCancel={() => setShowModifyModal(false)}
          onConfirm={() => {
            modifyInvoice.mutate(unvalWarehouse)
            setShowModifyModal(false)
          }}
          pending={modifyInvoice.isPending}
          error={modifyInvoice.error}
        />
      )}
      {showUpdateZraModal && (
        <WarehouseModal
          title="Update To ZRA"
          icon={ShieldCheck}
          confirmLabel="Update To ZRA"
          options={formOptions.data?.warehouseOptions}
          value={warehouse}
          onChange={setWarehouse}
          onCancel={() => setShowUpdateZraModal(false)}
          onConfirm={() => {
            validateInvoice.mutate({ idwarehouse: warehouse, zravalidate: 'yes' })
            setShowUpdateZraModal(false)
          }}
          pending={validateInvoice.isPending}
          error={validateInvoice.error}
        />
      )}
      {showRecurringModal && <RecurringInvoiceModal facid={facid} onCancel={() => setShowRecurringModal(false)} />}
      {showEmailModal && <SendEmailModal facid={facid} onCancel={() => setShowEmailModal(false)} />}
      {showOnlinePay && <OnlinePaymentModal invoiceId={facid} onClose={() => setShowOnlinePay(false)} />}
      {showPosTicket && <PosTicketModal facid={facid} onCancel={() => setShowPosTicket(false)} />}
      {showCreditNoteModal && <CreateCreditNoteModal facid={facid} onCancel={() => setShowCreditNoteModal(false)} />}
      {showDebitNoteModal && <CreateDebitNoteModal facid={facid} onCancel={() => setShowDebitNoteModal(false)} />}
      {whatsAppNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setWhatsAppNotice(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text!">Send WhatsApp</h3>
            <p className="text-sm text-text-muted">WhatsApp sender not loaded — this isn't configured on this backend yet (confirmed: the real page's own "Send WhatsApp" button hits the same wall).</p>
            <div className="flex justify-end">
              <button type="button" onClick={() => setWhatsAppNotice(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
