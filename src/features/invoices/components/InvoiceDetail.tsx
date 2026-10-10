import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  Receipt,
  Users2,
  RefreshCcw,
  StickyNote,
  Paperclip,
  CalendarClock,
  BookOpen,
  Upload,
  LoaderCircle,
  Pencil,
  Plus,
  X,
  CheckCircle2,
  PenSquare,
  ShieldCheck,
  CheckCheck,
  Copy,
  Undo2,
  Trash2,
  Download,
  Truck,
  RefreshCw,
  ExternalLink,
  Link2,
  Mail,
  MessageCircle,
  FileText,
  FileMinus,
  Printer,
  Banknote,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, StatusPill, type PillTone } from '../../../shared/components/dashboard/DashboardKit'
import { useTheme } from '../../../context/ThemeContext'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useInvoiceNotes,
  useUpdateInvoiceNote,
  useInvoiceContacts,
  useAddInvoiceContact,
  useInvoiceStandingOrders,
  useInvoiceAgenda,
  useInvoiceAgendaCount,
} from '../invoiceDetail.queries'
import {
  useSalesInvoice,
  useAddSalesInvoiceLine,
  useUpdateSalesInvoiceLine,
  useDeleteSalesInvoiceLine,
  useSalesInvoiceAction,
  useValidateSalesInvoice,
  useModifySalesInvoice,
  useSyncSalesInvoiceZra,
  useSalesInvoiceDraftFormOptions,
  useDebitNoteEnabled,
  fetchSalesProductPricing,
  type SalesInvoiceSimpleAction,
  type SalesLineInput,
} from '../salesInvoice.queries'
import type { SalesInvoiceData, SalesInvoiceLine } from '../salesInvoiceApi'
import {
  useSalesInvoiceDocuments,
  useUploadSalesDocument,
  useDeleteSalesDocument,
  useGenerateSalesDocument,
  useAddSalesDocumentLink,
  useDeleteSalesDocumentLink,
  useSalesInvoiceLedgerEntries,
  useDeleteSalesLedgerEntries,
  useSalesInvoiceShipment,
  useSaveSalesInvoiceShipment,
  useConvertToRecurringInvoice,
  useLinkableObjects,
  useLinkSalesObject,
  useUnlinkSalesObject,
  useSalesInvoiceZraPortal,
  LINKABLE_OBJECT_TYPES,
  type SalesShipmentDetails,
  type RecurringInvoiceInput,
} from '../salesInvoiceTabs.queries'
import {
  useCreateCreditNote,
  useCreateDebitNote,
  useSalesInvoiceEmailData,
  useSendSalesInvoiceEmail,
  usePaymentTypeOptions,
  useBankAccountOptions,
  useRecordSalesPayment,
  useSalesInvoicePosReceipt,
  CREDIT_NOTE_REASONS,
  DEBIT_NOTE_REASONS,
  type CreateCreditNoteInput,
  type CreateDebitNoteInput,
  type SendEmailInput,
  type RecordPaymentInput,
} from '../salesInvoiceActions.queries'
import { useNavigate } from 'react-router-dom'

const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'
const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-brand/30'

const TABS = [
  { key: 'invoice', label: 'Customer Invoice', icon: Receipt },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'standingorders', label: 'Direct Debit Orders', icon: RefreshCcw },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
  { key: 'shipment', label: 'Shipment / GRN', icon: Truck },
  { key: 'ledgerentry', label: 'LedgerEntry', icon: BookOpen },
] as const
type TabKey = (typeof TABS)[number]['key']

function TabTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-brand">
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
      {count !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-surface-hover text-text-muted text-xs font-semibold">{count}</span>
      )}
    </h3>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ size?: number; className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon size={28} className="text-text-faint" />
      <p className="text-sm text-text-faint">{message}</p>
    </div>
  )
}

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
  const isBlueMetal = theme === 'blue-metal'
  const [tab, setTab] = useState<TabKey>('invoice')
  // compta/sales/api/invoice.php — the real, reliable JSON API backing
  // compta/sales/card.php (see salesInvoiceApi.ts) — is the source for the
  // header and the Customer Invoice tab; the other tabs load their own data
  // (see invoiceDetail.queries.ts). The Notes and Events/Agenda badges are the
  // classic tab bar's own counts — how many of the two notes are filled in,
  // and how many events — read from those tabs' small JSON answers rather
  // than by downloading compta/facture/card.php (1.5 MB) just for two numbers.
  const { data, isLoading, isError, error, refetch } = useSalesInvoice(id)
  const { data: notes } = useInvoiceNotes(id)
  const { data: agendaCount } = useInvoiceAgendaCount(id)
  const notesBadge = notes ? [notes.notePublic, notes.notePrivate].filter(Boolean).length : 0

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading invoice…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load invoice" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  const inv = data.invoice

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div>
                <Link to={ROUTES.invoiceList} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text mb-1.5">
                  <ChevronLeft size={14} /> Sales Invoices
                </Link>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text!">{inv.ref}</h2>
                  {inv.status_label && (isBlueMetal ? (
                    <StatusPill tone={statusBadgeTone(inv.status_color)}>{inv.status_label}</StatusPill>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeCls(inv.status_color)}`}>{inv.status_label}</span>
                  ))}
                </div>
                <p className="text-xs text-text-faint mt-1">
                  Ref. customer: {inv.ref_client || '—'} · Third-party:{' '}
                  {data.customer.id ? (
                    <Link to={ROUTES.customerDetail.replace(':id', data.customer.id)} className="text-brand hover:underline">
                      {data.customer.name}
                    </Link>
                  ) : (
                    data.customer.name || '—'
                  )}
                </p>
              </div>
            </div>
            <div className="border-t border-border">
              <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6" style={{ scrollBehavior: 'smooth' }}>
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    {label}
                    {key === 'notes' && !!notesBadge && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{notesBadge}</span>
                    )}
                    {key === 'documents' && data.invoice.nb_files > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{data.invoice.nb_files}</span>
                    )}
                    {key === 'agenda' && !!agendaCount && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{agendaCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'invoice' && <InvoiceMainTab data={data} />}
        {tab === 'contacts' && <ContactsTab id={id} />}
        {tab === 'standingorders' && <StandingOrdersTab id={id} />}
        {tab === 'notes' && <NotesTab id={id} />}
        {tab === 'documents' && <DocumentsTab id={id} />}
        {tab === 'agenda' && <AgendaTab id={id} />}
        {tab === 'shipment' && <ShipmentGrnTab id={id} />}
        {tab === 'ledgerentry' && <LedgerEntryTab id={id} />}
      </div>
    </div>
  )
}

// status_color from the real API is one of gray/green/... — mapped to this
// app's own badge tone classes rather than trusting arbitrary color names.
function statusBadgeCls(color: string): string {
  switch (color) {
    case 'green':
      return 'bg-success-bg text-success-fg'
    case 'red':
      return 'bg-danger-bg text-danger-fg'
    case 'orange':
    case 'yellow':
      return 'bg-warning-bg text-warning-fg'
    default:
      return 'bg-surface-hover text-text-muted'
  }
}

function statusBadgeTone(color: string): PillTone {
  switch (color) {
    case 'green':
      return 'success'
    case 'red':
      return 'danger'
    case 'orange':
    case 'yellow':
      return 'warning'
    default:
      return 'neutral'
  }
}

// inv.payment_status_class from the real API is a literal Bootstrap class
// (bg-success/bg-secondary/etc) — mapped the same way as statusBadgeCls.
function bootstrapBadgeCls(cls: string): string {
  if (cls.includes('success')) return 'bg-success-bg text-success-fg'
  if (cls.includes('danger')) return 'bg-danger-bg text-danger-fg'
  if (cls.includes('warning')) return 'bg-warning-bg text-warning-fg'
  if (cls.includes('info')) return 'bg-info-bg text-info-fg'
  return 'bg-surface-hover text-text-muted'
}

// Real per-status action button set, colors and icons ported verbatim from
// the real page's own renderActionButtons(inv) in compta/sales/js/
// invoice.js (btn-success/btn-info/btn-outline-secondary/btn-warning/
// btn-outline-success/btn-danger, fontawesome icons mapped to their lucide
// equivalents). Send Email/WhatsApp/POS Ticket/Create Credit Note/Create
// Debit Note/Record Payment all have confirmed real contracts (see
// salesInvoice.queries.ts header) but aren't wired up yet — deliberately
// left out of this pass rather than half-built.
const TONE_CLS: Record<string, string> = {
  success: 'bg-success text-white hover:opacity-90',
  info: 'bg-info text-white hover:opacity-90',
  warning: 'bg-warning text-white hover:opacity-90',
  danger: 'bg-danger text-white hover:opacity-90',
  outline: 'border border-input-border text-text hover:bg-surface-hover',
  'outline-success': 'border border-success text-success hover:bg-success-bg',
}

function ActionButton({
  tone,
  icon: Icon,
  onClick,
  disabled,
  pending,
  children,
}: {
  tone: keyof typeof TONE_CLS
  icon: React.ComponentType<{ size?: number }>
  onClick: () => void
  disabled?: boolean
  pending?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${TONE_CLS[tone]}`}
    >
      {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Icon size={14} />}
      {children}
    </button>
  )
}

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

const todayIso = () => new Date().toISOString().slice(0, 10)

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
      onSuccess: (result) => {
        onCancel()
        if (result.redirect) window.location.href = result.redirect
      },
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

function InvoiceActionButtons({ data }: { data: SalesInvoiceData }) {
  const inv = data.invoice
  const facid = inv.id
  const statut = Number(inv.statut)
  const zraOk = data.zra.errorcode === '000'
  const navigate = useNavigate()

  const [showValidateModal, setShowValidateModal] = useState(false)
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [showUpdateZraModal, setShowUpdateZraModal] = useState(false)
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPosTicket, setShowPosTicket] = useState(false)
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
    if (!formOptions.data) return
    setWarehouse((w) => w || formOptions.data.warehouseOptions.find((o) => o.selected)?.value || formOptions.data.warehouseOptions[0]?.value || '')
    setUnvalWarehouse((w) => w || formOptions.data.unvalidateWarehouseOptions.find((o) => o.selected)?.value || formOptions.data.unvalidateWarehouseOptions[0]?.value || '')
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

// Real margin_info is a small, backend-generated HTML table (see
// salesInvoiceApi.ts SalesInvoiceMargin) — parsed into plain rows rather
// than dangerouslySetInnerHTML, matching this codebase's convention
// elsewhere of rendering structured data, not raw legacy markup.
function parseMarginRows(html: string): { label: string; sellingPrice: string; costPrice: string; margin: string }[] {
  const rowRe = /<tr class="(?:oddeven|totalRow)"><td>([^<]+)<\/td><td class="custumRight">([^<]*)<\/td><td class="custumRight">([^<]*)<\/td><td class="custumRight">([^<]*)<\/td><\/tr>/g
  const rows: { label: string; sellingPrice: string; costPrice: string; margin: string }[] = []
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) rows.push({ label: m[1], sellingPrice: m[2], costPrice: m[3], margin: m[4] })
  return rows
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

// Real contract: POST compta/sales/api/payment.php action=create_payment —
// scoped to a single invoice rather than the real page's full multi-invoice
// batch UI (see salesInvoiceActions.queries.ts header).
function RecordPaymentModal({ data, onCancel }: { data: SalesInvoiceData; onCancel: () => void }) {
  const inv = data.invoice
  const paymentTypes = usePaymentTypeOptions(true)
  const bankAccounts = useBankAccountOptions(true)
  const recordPayment = useRecordSalesPayment(inv.id)

  const [amount, setAmount] = useState(data.balance_raw ? String(data.balance_raw) : '0')
  const [datepaid, setDatepaid] = useState(todayIsoDate())
  const [paiementcode, setPaiementcode] = useState('')
  const [accountid, setAccountid] = useState('')
  const [numPaiement, setNumPaiement] = useState('')
  const [comment, setComment] = useState('')
  const [closepaidinvoices, setClosepaidinvoices] = useState(true)

  const submit = () => {
    const input: RecordPaymentInput = {
      facid: inv.id,
      socid: inv.socid,
      invoiceType: inv.type,
      amount,
      datepaid,
      paiementcode,
      accountid,
      numPaiement,
      comment,
      closepaidinvoices,
    }
    recordPayment.mutate(input, { onSuccess: () => setTimeout(onCancel, 800) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Record Payment</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {recordPayment.isSuccess ? (
          <p className="text-sm text-success">Payment recorded.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Amount</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Date</span>
                <input type="date" value={datepaid} onChange={(e) => setDatepaid(e.target.value)} className={`${inputCls} text-left`} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Payment Type</span>
                <select value={paiementcode} onChange={(e) => setPaiementcode(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {(paymentTypes.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Bank Account</span>
                <select value={accountid} onChange={(e) => setAccountid(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {(bankAccounts.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-muted">Payment Number / Ref</span>
                <input value={numPaiement} onChange={(e) => setNumPaiement(e.target.value)} className={`${inputCls} text-left`} />
              </label>
              <label className="block text-sm col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-muted">Comment</span>
                <input value={comment} onChange={(e) => setComment(e.target.value)} className={`${inputCls} text-left`} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={closepaidinvoices} onChange={(e) => setClosepaidinvoices(e.target.checked)} /> Close invoice if fully paid
            </label>
            {recordPayment.isError && <p className="text-xs text-danger">{recordPayment.error instanceof Error ? recordPayment.error.message : 'Could not record this payment.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="success" icon={Banknote} onClick={submit} pending={recordPayment.isPending} disabled={!paiementcode || !accountid || Number(amount) <= 0}>
                Record
              </ActionButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Real contract: POST compta/sales/api/zra.php, action=selectinvoice,
// facid — read verbatim from the inline ZRAOffcanvas script on the real
// page (see salesInvoiceTabs.queries.ts).
function ZraPortalModal({ facid, onCancel }: { facid: string; onCancel: () => void }) {
  const { data, isLoading, isError, error } = useSalesInvoiceZraPortal(facid, true)
  const rows: [string, string | undefined][] = data
    ? [
        ['Customer', data.customer],
        ['Invoice Ref', data.invoice_ref],
        ['Invoice No', data.portal.invoice_no],
        ['Receipt No', data.portal.receipt_no],
        ['Date', data.portal.date],
        ['Internal Data', data.portal.internal_data],
        ['Signature', data.portal.signature],
        ['SDC ID', data.portal.sdc_id],
        ['MRC', data.portal.mrc],
        ['Error Code', data.portal.errorcode],
        ['Error Message', data.portal.errormessage],
      ]
    : []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">ZRA Portal Details</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
        {isError && <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Could not load ZRA portal details.'}</p>}
        {data?.portal.qr_url && (
          <div className="flex justify-center">
            <a href={data.portal.qr_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline break-all text-center">
              {data.portal.qr_url}
            </a>
          </div>
        )}
        <div className="space-y-2 text-sm">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-text-muted">{label}</span>
                <span className="font-medium text-text! text-right break-all">{value}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// Real compact "Linked Files" card on the main Customer Invoice tab — not
// just a read-only file list (what this used to render): the real page's
// own card.php has its own Doc Template/Language/Generate mini-form here
// (InvoiceTab.generateMiniPDF(), separate from the full version on the
// Linked Files tab), confirmed live via sales_invoice.js's own
// renderLinkedFilesCard().
function LinkedFilesMiniCard({ data }: { data: SalesInvoiceData }) {
  const facid = data.invoice.id
  const generateDoc = useGenerateSalesDocument(facid)
  const [model, setModel] = useState('')
  const selectedModel = model || data.models.find((m) => m.selected)?.value || data.models[0]?.value || ''
  const [lang, setLang] = useState('en_US')

  return (
    <Card className="!h-auto">
      <TabTitle count={data.files.length}>Linked Files</TabTitle>
      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide">Generate PDF</p>
        <div className="grid grid-cols-2 gap-2">
          <select value={selectedModel} onChange={(e) => setModel(e.target.value)} className={selectCls}>
            {data.models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className={selectCls}>
            <option value="en_US">English</option>
            <option value="fr_FR">French</option>
            <option value="es_ES">Spanish</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!selectedModel || generateDoc.isPending}
            onClick={() => generateDoc.mutate({ model: selectedModel, lang, token: '' })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {generateDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <FileText size={13} />} Generate
          </button>
          <button
            type="button"
            disabled={!selectedModel || generateDoc.isPending}
            title="Generate Copy"
            onClick={() => generateDoc.mutate({ model: selectedModel, lang, token: '', copy: true })}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-input-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            <Copy size={13} />
          </button>
        </div>
        {generateDoc.isError && <p className="text-xs text-danger">{generateDoc.error instanceof Error ? generateDoc.error.message : 'Could not generate the document.'}</p>}
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Files</p>
        {data.files.length === 0 ? (
          <p className="text-sm text-text-faint italic">No files yet. Generate PDF above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={f.download_url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {f.name}
                </a>
                <span className="text-text-muted shrink-0 text-xs">{f.size}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function InvoiceMainTab({ data }: { data: SalesInvoiceData }) {
  const inv = data.invoice
  const facid = inv.id
  const zraSync = useSyncSalesInvoiceZra(facid)
  const marginRows = data.margin.enabled ? parseMarginRows(data.margin.margin_info) : []
  const [showZraPortal, setShowZraPortal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  // Real bug confirmed live (invoice 342, currency INR): inv.currency_symbol
  // always returns the company's base currency (ZMW) regardless of the
  // invoice's own currency, and total_ht_f/total_tva_f/total_ttc_f are
  // always base-currency amounts — the real compta/sales/card.php page
  // itself pairs these base amounts with the multicurrency_symbol label
  // (showing "100 INR" for what is actually 100 ZMW), which is wrong. Fixed
  // here by switching to the real multicurrency_total_*_f fields (the
  // genuine INR-equivalent amounts) whenever the invoice actually carries a
  // foreign currency — those fields come back as "0" for base-currency
  // invoices, which is how this is detected.
  const isForeignCurrency = Number(inv.multicurrency_total_ttc) > 0
  const amountHt = isForeignCurrency ? inv.multicurrency_total_ht_f : inv.total_ht_f
  const amountTva = isForeignCurrency ? inv.multicurrency_total_tva_f : inv.total_tva_f
  const amountTtc = isForeignCurrency ? inv.multicurrency_total_ttc_f : inv.total_ttc_f
  const amountSymbol = isForeignCurrency ? inv.multicurrency_symbol : inv.currency_symbol

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="!h-auto">
          <TabTitle>Invoice Details</TabTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-3 text-sm">
            <div>
              <p className="text-text-faint text-xs">Type</p>
              <p className="font-medium text-text!">{inv.type_label || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Discounts</p>
              <p className="font-medium text-text!">{inv.discount_info || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Invoice Date</p>
              <p className="font-medium text-text!">{inv.date || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Terms</p>
              <p className="font-medium text-text!">{inv.cond_reglement_label || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Due On</p>
              <p className="font-medium text-text!">{inv.date_due || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Type</p>
              <p className="font-medium text-text!">{inv.mode_reglement_label || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Currency</p>
              <p className="font-medium text-text!">{inv.currency || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Bank Account</p>
              <p className="font-medium text-text!">{inv.bank_label || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Incoterms</p>
              <p className="font-medium text-text!">{inv.incoterms || '—'}</p>
            </div>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-hover text-text-muted text-xs font-medium">
              {inv.ventil_compta ? 'Posted to Ledger' : 'Not Posted to Ledger'}
            </span>
          </div>
        </Card>

        <ItemTableCard data={data} />

        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <TabTitle>Payment Details</TabTitle>
              {inv.payment_status && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bootstrapBadgeCls(inv.payment_status_class)}`}>{inv.payment_status}</span>}
            </div>
            {Number(inv.statut) === 1 && (
              <ActionButton tone="success" icon={Banknote} onClick={() => setShowPaymentModal(true)}>
                Record Payment
              </ActionButton>
            )}
          </div>
          {data.payments.length === 0 ? (
            <p className="text-sm text-text-faint italic p-4">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-4 py-2.5">Payment</th>
                    <th className="font-medium px-4 py-2.5">Date</th>
                    <th className="font-medium px-4 py-2.5">Type</th>
                    <th className="font-medium px-4 py-2.5">Bank Account</th>
                    <th className="font-medium px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.rowid} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-text!">{p.ref}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.date}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.type}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.bank || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-text!">{p.amount_f}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="space-y-1.5 px-4 py-3 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Already Paid (Without Credit Notes And Down Payments)</span>
              <span className="font-medium text-text!">{data.total_paid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Billed</span>
              <span className="font-medium text-text!">
                {amountTtc} {amountSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-text!">Remaining Unpaid</span>
              <span className={`font-bold ${data.balance_raw > 0 ? 'text-danger' : 'text-success'}`}>{data.balance}</span>
            </div>
          </div>
        </Card>

        {inv.online_pay_url && (
          <Card className="!h-auto">
            <TabTitle>URL for Online Payment</TabTitle>
            <div className="flex items-center gap-2 mt-3">
              <input
                readOnly
                value={inv.online_pay_url}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inv.online_pay_url)}
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover"
              >
                Copy
              </button>
              <a href={inv.online_pay_url} target="_blank" rel="noreferrer" className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover">
                Open
              </a>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="!h-auto">
          <TabTitle>Price Details</TabTitle>
          <div className="space-y-1.5 mt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subtotal (Excl. Tax)</span>
              <span className="font-medium text-text!">
                {amountHt} {amountSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">VAT</span>
              <span className="font-medium text-text!">
                {amountTva} {amountSymbol}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border">
              <span className="font-semibold text-text!">Total (Incl. Tax)</span>
              <span className="font-bold text-brand">
                {amountTtc} {amountSymbol}
              </span>
            </div>
          </div>
        </Card>

        <Card className="!h-auto">
          <div className="flex items-center justify-between">
            <TabTitle>ZRA Invoice Details</TabTitle>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowZraPortal(true)}
                title="View ZRA Portal Details"
                className="flex items-center gap-1 rounded-md border border-input-border p-1.5 text-text-muted hover:bg-surface-hover"
              >
                <ExternalLink size={12} />
              </button>
              {data.zra.errorcode && data.zra.errorcode !== '000' && (
                <button
                  type="button"
                  disabled={zraSync.isPending}
                  onClick={() => zraSync.mutate()}
                  title="Query ZRA for this invoice's latest status"
                  className="flex items-center gap-1.5 rounded-md border border-input-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
                >
                  {zraSync.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                  Sync
                </button>
              )}
            </div>
          </div>
          {zraSync.isError && <p className="text-xs text-danger mt-2">{zraSync.error instanceof Error ? zraSync.error.message : 'Sync failed.'}</p>}
          <div className="space-y-2 mt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">ZRA Invoice Status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.zra.errorcode === '000' ? 'bg-success-bg text-success-fg' : data.zra.errorcode ? 'bg-danger-bg text-danger-fg' : 'bg-warning-bg text-warning-fg'}`}>
                {data.zra.errorcode === '000' ? 'IT IS SUCCEEDED' : data.zra.status || 'Not Submitted'}
              </span>
            </div>
            {[
              ['Receipt No', data.zra.receipt_no],
              ['Internal Data', data.zra.internal_data],
              ['Invoice Signature', data.zra.signature],
              ['Invoice No', data.zra.invoice_no],
              ['SDC ID', data.zra.sdc_id],
              ['MRC', data.zra.mrc],
              ['Date', data.zra.date],
            ].map(([label, value]) =>
              value ? (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-medium text-text! text-right break-all">{value}</span>
                </div>
              ) : null,
            )}
          </div>
        </Card>

        <LinkedFilesMiniCard data={data} />

        <Card className="!h-auto">
          <TabTitle>Related Objects</TabTitle>
          {data.related.length === 0 ? <p className="text-sm text-text-faint italic mt-2">None</p> : <p className="text-sm text-text-faint italic mt-2">{data.related.length} linked object(s).</p>}
        </Card>

        {marginRows.length > 0 && (
          <Card className="!h-auto !p-0 overflow-hidden">
            <p className="text-sm font-semibold text-text! px-4 pt-4 pb-2">Margin Details</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Margins</th>
                  <th className="font-medium py-2 px-3 text-right">Selling Price</th>
                  <th className="font-medium py-2 px-3 text-right">Cost Price</th>
                  <th className="font-medium py-2 px-4 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {marginRows.map((r) => (
                  <tr key={r.label} className={r.label === 'TotalMargin' ? '' : 'border-b border-border'}>
                    <td className={`py-2 px-4 ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.label}</td>
                    <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.sellingPrice}</td>
                    <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.costPrice}</td>
                    <td className={`py-2 px-4 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      {showZraPortal && <ZraPortalModal facid={facid} onCancel={() => setShowZraPortal(false)} />}
      {showPaymentModal && <RecordPaymentModal data={data} onCancel={() => setShowPaymentModal(false)} />}
    </div>
  )
}

interface EditingLineState {
  lineId: string
  desc: string
  qty: string
  priceHt: string
  vatDisplay: string
  vatRateStr: string
  discount: string
}

// Real Item Table: view/add/edit/delete lines against compta/sales/api/
// invoice.php (action=addline/updateline/deleteline — see
// salesInvoice.queries.ts), plus the real per-status action button row.
function ItemTableCard({ data }: { data: SalesInvoiceData }) {
  const inv = data.invoice
  const facid = inv.id
  const socid = inv.socid
  const isDraft = inv.statut === '0'
  // See InvoiceMainTab's own isForeignCurrency comment — same real bug,
  // same fix, applied per-line here.
  const isForeignCurrency = Number(inv.multicurrency_total_ttc) > 0

  const [showAddRow, setShowAddRow] = useState(false)
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')
  const [priceHt, setPriceHt] = useState('0')
  const [vatDisplay, setVatDisplay] = useState('0%')
  const [vatRateStr, setVatRateStr] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [pricingError, setPricingError] = useState('')

  const [editingLine, setEditingLine] = useState<EditingLineState | null>(null)
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null)

  const formOptions = useSalesInvoiceDraftFormOptions(facid, showAddRow)
  const addLine = useAddSalesInvoiceLine(facid)
  const updateLine = useUpdateSalesInvoiceLine(facid)
  const deleteLine = useDeleteSalesInvoiceLine(facid)

  const resetAddRow = () => {
    setProductId('')
    setQty('1')
    setPriceHt('0')
    setVatDisplay('0%')
    setVatRateStr('0')
    setDiscount('0')
  }

  const handleProductChange = async (value: string) => {
    setProductId(value)
    if (!value) return
    setLoadingPricing(true)
    setPricingError('')
    try {
      const pricing = await fetchSalesProductPricing(value, socid)
      setPriceHt(pricing.priceHt.toFixed(2))
      setVatDisplay(`${pricing.vatRate}%`)
      setVatRateStr(pricing.vatCode ? `${pricing.vatRate} (${pricing.vatCode})` : String(pricing.vatRate))
    } catch {
      setPricingError("Could not load this product's price/VAT.")
    } finally {
      setLoadingPricing(false)
    }
  }

  const submitAddLine = () => {
    if (!productId || Number(qty) <= 0) return
    const label = formOptions.data?.productOptions.find((p) => p.value === productId)?.label ?? ''
    const input: SalesLineInput = { productId, desc: label, qty: Number(qty), priceHt: Number(priceHt), vatRateStr, discountPercent: Number(discount) || 0, discountType: '1' }
    addLine.mutate(input, { onSuccess: () => { resetAddRow(); setShowAddRow(false) } })
  }

  const startEditLine = (line: SalesInvoiceLine) => {
    const vatRate = Number(line.tva_tx) || 0
    setEditingLine({
      lineId: line.rowid,
      desc: line.desc || line.label,
      qty: line.qty,
      priceHt: String(line.pu_ht),
      vatDisplay: `${vatRate}%${line.vat_src_code ? ` (${line.vat_src_code})` : ''}`,
      vatRateStr: line.vat_src_code ? `${vatRate} (${line.vat_src_code})` : String(vatRate),
      discount: line.remise_percent || '0',
    })
  }

  const submitEditLine = () => {
    if (!editingLine) return
    updateLine.mutate(
      {
        lineId: editingLine.lineId,
        productId: '',
        desc: editingLine.desc,
        qty: Number(editingLine.qty),
        priceHt: Number(editingLine.priceHt),
        vatRateStr: editingLine.vatRateStr,
        discountPercent: Number(editingLine.discount) || 0,
        discountType: '1',
      },
      { onSuccess: () => setEditingLine(null) },
    )
  }

  const confirmDeleteLine = () => {
    if (!deletingLineId) return
    deleteLine.mutate(deletingLineId, { onSuccess: () => setDeletingLineId(null) })
  }

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <TabTitle>Item Table</TabTitle>
        {isDraft && (
          <button
            type="button"
            onClick={() => setShowAddRow((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> Add Line
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-4 py-2.5">Product/Service</th>
              <th className="font-medium px-4 py-2.5">Lot/Batch</th>
              <th className="font-medium px-4 py-2.5">VAT</th>
              <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
              <th className="font-medium px-4 py-2.5 text-right">Unit Price (Inc. Tax)</th>
              <th className="font-medium px-4 py-2.5 text-right">Qty</th>
              <th className="font-medium px-4 py-2.5 text-right">Disc.</th>
              <th className="font-medium px-4 py-2.5 text-right">Total (Inc. Tax)</th>
              {isDraft && <th className="font-medium px-4 py-2.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.lines.length === 0 && (
              <tr>
                <td colSpan={isDraft ? 9 : 8} className="px-4 py-6 text-center text-text-faint italic">
                  No lines on this invoice.
                </td>
              </tr>
            )}
            {data.lines.map((l) => (
              <tr key={l.rowid} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  {l.product_id && Number(l.product_id) > 0 ? (
                    <Link to={ROUTES.productDetail.replace(':id', l.product_id)} className="font-medium text-brand hover:underline">
                      {l.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-text!">{l.label}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-text-muted">{l.lot_number || '—'}</td>
                <td className="px-4 py-2.5 text-text-muted">
                  {Number(l.tva_tx)}%{l.vat_src_code ? ` (${l.vat_src_code})` : ''}
                </td>
                <td className="px-4 py-2.5 text-right text-text-muted">{isForeignCurrency ? l.multicurrency_subprice_f : l.pu_ht_f}</td>
                <td className="px-4 py-2.5 text-right text-text-muted">
                  {isForeignCurrency ? (Number(l.multicurrency_subprice) * (1 + Number(l.tva_tx) / 100)).toFixed(2) : l.pu_ttc_f}
                </td>
                <td className="px-4 py-2.5 text-right text-text-muted">{l.qty}</td>
                <td className="px-4 py-2.5 text-right text-text-muted">{Number(l.remise_percent) > 0 ? `${l.remise_percent}%` : '—'}</td>
                <td className="px-4 py-2.5 text-right text-text!">{isForeignCurrency ? l.multicurrency_total_ttc_f : l.total_ttc_f}</td>
                {isDraft && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => startEditLine(l)} title="Edit" className="rounded-md border border-input-border p-1.5 text-text-muted hover:bg-surface-hover">
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={() => setDeletingLineId(l.rowid)} title="Delete" className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {isDraft && showAddRow && (
              <tr className="bg-surface-hover/40">
                <td className="px-3 py-2" colSpan={2}>
                  <select className={selectCls} value={productId} onChange={(e) => handleProductChange(e.target.value)}>
                    <option value="">Select product…</option>
                    {(formOptions.data?.productOptions ?? []).map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2 text-text-muted text-xs whitespace-nowrap">{loadingPricing ? '…' : vatDisplay}</td>
                <td className="px-2 py-2">
                  <input className={inputCls} value={priceHt} onChange={(e) => setPriceHt(e.target.value)} />
                </td>
                <td className="px-2 py-2 text-text-faint text-xs text-right">—</td>
                <td className="px-2 py-2">
                  <input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
                </td>
                <td className="px-2 py-2">
                  <input className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </td>
                <td className="px-2 py-2 text-right text-text-faint text-xs">—</td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={submitAddLine}
                    disabled={!productId || loadingPricing || addLine.isPending}
                    className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {addLine.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <Plus size={12} />} Add
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pricingError && <p className="text-xs text-danger px-4 pt-2">{pricingError}</p>}
      {addLine.isError && <p className="text-xs text-danger px-4 pt-2">{addLine.error instanceof Error ? addLine.error.message : 'Could not add this line.'}</p>}

      <InvoiceActionButtons data={data} />

      {editingLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingLine(null)}>
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text!">Edit Line</h3>
              <button type="button" onClick={() => setEditingLine(null)} className="text-text-faint hover:text-text" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-muted">
              {editingLine.desc} <span className="text-xs text-text-faint">· VAT {editingLine.vatDisplay} (fixed to product)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Qty</span>
                <input className={inputCls} value={editingLine.qty} onChange={(e) => setEditingLine({ ...editingLine, qty: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Unit Price (Excl.)</span>
                <input className={inputCls} value={editingLine.priceHt} onChange={(e) => setEditingLine({ ...editingLine, priceHt: e.target.value })} />
              </label>
              <label className="block text-sm col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-muted">Discount %</span>
                <input className={inputCls} value={editingLine.discount} onChange={(e) => setEditingLine({ ...editingLine, discount: e.target.value })} />
              </label>
            </div>
            {updateLine.isError && <p className="text-xs text-danger">{updateLine.error instanceof Error ? updateLine.error.message : 'Could not update this line.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingLine(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="success" icon={CheckCircle2} onClick={submitEditLine} pending={updateLine.isPending}>
                Save
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {deletingLineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeletingLineId(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text!">Delete this line?</h3>
            {deleteLine.isError && <p className="text-xs text-danger">{deleteLine.error instanceof Error ? deleteLine.error.message : 'Could not delete this line.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingLineId(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="danger" icon={Trash2} onClick={confirmDeleteLine} pending={deleteLine.isPending}>
                Delete
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceNotes(id)
  const [editingField, setEditingField] = useState<'public' | 'private' | null>(null)
  const [value, setValue] = useState('')
  const updateNote = useUpdateInvoiceNote(id)

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function startEdit(field: 'public' | 'private') {
    setEditingField(field)
    setValue(field === 'public' ? data!.rawPublic : data!.rawPrivate)
  }

  // notes.php saves both notes at once: the other one goes back unchanged.
  function submit() {
    if (!editingField || !data) return
    const next = editingField === 'public' ? { notePublic: value, notePrivate: data.rawPrivate } : { notePublic: data.rawPublic, notePrivate: value }
    updateNote.mutate(next, { onSuccess: () => setEditingField(null) })
  }

  function NoteCard({ field, label, hint, content }: { field: 'public' | 'private'; label: string; hint: string; content: string }) {
    const editing = editingField === field
    return (
      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-text!">{label}</p>
            <p className="text-xs text-text-faint">{hint}</p>
          </div>
          {!editing && (
            <button type="button" onClick={() => startEdit(field)} className="shrink-0 w-7 h-7 rounded-md bg-brand text-white flex items-center justify-center hover:bg-brand-hover">
              <Pencil size={12} />
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2"
            />
            {updateNote.isError && <p className="text-xs text-danger">{updateNote.error instanceof Error ? updateNote.error.message : 'Failed to save.'}</p>}
            <div className="flex gap-2">
              <button type="button" disabled={updateNote.isPending} onClick={submit} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                {updateNote.isPending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingField(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text! whitespace-pre-wrap">{content || <span className="text-text-faint italic">Empty.</span>}</p>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <TabTitle>Notes</TabTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NoteCard field="public" label="Public Note" hint="Visible to customer on printed documents" content={data.notePublic} />
        <NoteCard field="private" label="Private Note" hint="Internal use only — not visible on documents" content={data.notePrivate} />
      </div>
    </div>
  )
}

// Real Add-Contact form (Users + Third-Party Contacts rows) — same generic
// Dolibarr contacts.tpl.php mechanism Sales Orders' own ContactsTab already
// uses (see OrderDetailTabs.tsx), just pointed at this invoice's own
// contact.php.
function ContactsTab({ id }: { id: string | undefined }) {
  const [company, setCompany] = useState<string | undefined>(undefined)
  const { data, isLoading, isError, error, refetch } = useInvoiceContacts(id, company)
  const addContact = useAddInvoiceContact(id)

  const [userid, setUserid] = useState('')
  const [type, setType] = useState('')
  const [contactid, setContactid] = useState('')
  const [typecontact, setTypecontact] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  const { rows, formOptions } = data
  const effectiveCompany = company ?? formOptions.selectedCompanyId
  const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

  return (
    <div className="space-y-3">
      <TabTitle count={rows.length}>Contacts/Addresses</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 px-4">Nature of Contact</th>
                <th className="font-medium py-2 px-3">Third-Party</th>
                <th className="font-medium py-2 px-3">Users/Contacts</th>
                <th className="font-medium py-2 px-3">Type</th>
                <th className="font-medium py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 px-4 text-text! whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Users2 size={13} className="text-text-faint" /> Users
                  </span>
                </td>
                <td className="py-2 px-3 text-text-muted">{formOptions.issuerCompanyName || '—'}</td>
                <td className="py-2 px-3">
                  <select value={userid} onChange={(e) => setUserid(e.target.value)} className={selectCls}>
                    <option value=""></option>
                    {formOptions.internalUserOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                    {formOptions.internalTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-4 text-right">
                  <button
                    type="button"
                    disabled={!userid || !type || type === '0' || addContact.isPending}
                    onClick={() => addContact.mutate({ source: 'internal', userid, type })}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    Add
                  </button>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-4 text-text! whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Users2 size={13} className="text-text-faint" /> Third-Party Contacts
                  </span>
                </td>
                <td className="py-2 px-3">
                  <select
                    value={effectiveCompany}
                    onChange={(e) => {
                      setCompany(e.target.value)
                      setContactid('')
                    }}
                    className={selectCls}
                  >
                    {formOptions.companyOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <select
                    value={contactid}
                    onChange={(e) => setContactid(e.target.value)}
                    disabled={!formOptions.hasRealExternalContact}
                    className={`${selectCls} disabled:opacity-50`}
                  >
                    {formOptions.externalContactOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <select value={typecontact} onChange={(e) => setTypecontact(e.target.value)} className={selectCls}>
                    {formOptions.externalTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-4 text-right">
                  <button
                    type="button"
                    disabled={!formOptions.hasRealExternalContact || !contactid || !typecontact || typecontact === '0' || addContact.isPending}
                    onClick={() => addContact.mutate({ source: 'external', contactid, typecontact })}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {addContact.isError && (
          <p className="text-xs text-danger px-4 pb-3">{addContact.error instanceof Error ? addContact.error.message : 'Could not add this contact.'}</p>
        )}

        <div className="border-t border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 px-4">Nature</th>
                <th className="font-medium py-2 px-3">Third Party</th>
                <th className="font-medium py-2 px-3">Contact</th>
                <th className="font-medium py-2 px-3">Type</th>
                <th className="font-medium py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-text-faint italic">
                    No contacts linked to this invoice yet.
                  </td>
                </tr>
              ) : (
                rows.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4 font-medium text-text!">{c.nature}</td>
                    <td className="py-2 px-3 text-text-muted">{c.thirdParty}</td>
                    <td className="py-2 px-3 text-text-muted">{c.contact}</td>
                    <td className="py-2 px-3 text-text-muted">{c.contactType}</td>
                    <td className="py-2 px-3 text-text-muted">{c.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StandingOrdersTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceStandingOrders(id)
  if (isLoading) return <LegacyLoadingCard label="Loading direct debit orders…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load direct debit orders" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.length}>Direct Debit Orders</TabTitle>
      <Card className="!h-auto">
        {data.length === 0 ? (
          <EmptyState icon={RefreshCcw} message="No direct debit orders found for this invoice." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Request Date</th>
                <th className="font-medium px-4 py-2.5">User</th>
                <th className="font-medium px-4 py-2.5">Amount</th>
                <th className="font-medium px-4 py-2.5">Direct Debit Order</th>
                <th className="font-medium px-4 py-2.5">Process Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-text-muted">{o.requestDate}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.user}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.amount}</td>
                  <td className="px-4 py-2.5 font-medium text-text!">{o.ref}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.processDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

// Real compta/sales/api/documents.php-backed tab (see sales/js/documents.js,
// DocumentsTab.render() — confirmed live against the real backend: this tab
// has NO Generate PDF form of its own. That form only lives on the main
// Customer Invoice tab's Linked Files mini-card (LinkedFilesMiniCard above,
// matching sales_invoice.js). documents.js does build unused model/lang
// option strings but never renders them — dead code on the real page too.
function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useSalesInvoiceDocuments(id)
  const upload = useUploadSalesDocument(id)
  const deleteDoc = useDeleteSalesDocument(id)
  const addLink = useAddSalesDocumentLink(id)
  const deleteLink = useDeleteSalesDocumentLink(id)
  const [file, setFile] = useState<File | null>(null)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState(LINKABLE_OBJECT_TYPES[0].value)
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const linkableObjects = useLinkableObjects(id, linkType, true)
  const linkObject = useLinkSalesObject(id)
  const unlinkObject = useUnlinkSalesObject(id)

  if (isLoading) return <LegacyLoadingCard label="Loading linked files…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load linked files" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const documentsMarginRows = data.margin.enabled ? parseMarginRows(data.margin.margin_info) : []

  return (
    <div className="space-y-3">
      <TabTitle count={data.nb_files}>Linked Files</TabTitle>

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Attach a new file/document</p>
        {upload.isError && <p className="text-xs text-danger mb-2">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-text file:mr-3 file:rounded-md file:border file:border-input-border file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text"
          />
          <button
            type="button"
            disabled={!file || upload.isPending}
            onClick={() => file && upload.mutate(file, { onSuccess: () => setFile(null) })}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            <Upload size={14} /> {upload.isPending ? 'Uploading…' : 'Upload File'}
          </button>
        </div>
      </Card>

      {data.margin.enabled && documentsMarginRows.length > 0 && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <p className="text-sm font-semibold text-text! px-4 pt-4 pb-2">Margin Details</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 px-4">Margins</th>
                <th className="font-medium py-2 px-3 text-right">Selling Price</th>
                <th className="font-medium py-2 px-3 text-right">Cost Price</th>
                <th className="font-medium py-2 px-4 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {documentsMarginRows.map((r) => (
                <tr key={r.label} className={r.label === 'TotalMargin' ? '' : 'border-b border-border'}>
                  <td className={`py-2 px-4 ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.label}</td>
                  <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.sellingPrice}</td>
                  <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.costPrice}</td>
                  <td className={`py-2 px-4 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.margin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Files</p>
        {deleteDoc.isError && <p className="text-xs text-danger mb-2">{deleteDoc.error instanceof Error ? deleteDoc.error.message : 'Could not delete this file.'}</p>}
        {data.files.length === 0 ? (
          <EmptyState icon={Paperclip} message="No files attached to this invoice." />
        ) : (
          <ul className="divide-y divide-border">
            {data.files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={f.download_url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {f.name}
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-muted text-xs">{f.size}</span>
                  <a href={f.download_url} target="_blank" rel="noreferrer" title="Download" className="rounded-md border border-input-border p-1.5 text-text-muted hover:bg-surface-hover">
                    <Download size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteDoc.mutate(f.name)}
                    disabled={deleteDoc.isPending}
                    title="Delete"
                    className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">External Links</p>
        {addLink.isError && <p className="text-xs text-danger mb-2">{addLink.error instanceof Error ? addLink.error.message : 'Could not add this link.'}</p>}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className={`${inputCls} text-left`} style={{ maxWidth: 180 }} />
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className={`${inputCls} text-left flex-1 min-w-[200px]`} />
          <button
            type="button"
            disabled={!linkLabel || !linkUrl || addLink.isPending}
            onClick={() => addLink.mutate({ label: linkLabel, url: linkUrl }, { onSuccess: () => { setLinkLabel(''); setLinkUrl('') } })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {data.links.length === 0 ? (
          <p className="text-sm text-text-faint italic">No external links yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.links.map((l) => (
              <li key={l.rowid} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={l.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {l.label}
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-muted text-xs">{l.date}</span>
                  <button type="button" onClick={() => deleteLink.mutate(l.rowid)} disabled={deleteLink.isPending} title="Delete" className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg disabled:opacity-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Related Objects</p>
        {linkObject.isError && <p className="text-xs text-danger mb-2">{linkObject.error instanceof Error ? linkObject.error.message : 'Could not link this object.'}</p>}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={linkType}
            onChange={(e) => {
              setLinkType(e.target.value)
              setSelectedTargetId('')
            }}
            className={selectCls}
            style={{ maxWidth: 170 }}
          >
            {LINKABLE_OBJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)} className={`${selectCls} flex-1 min-w-[160px]`}>
            <option value="">-- Select item --</option>
            {(linkableObjects.data ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.ref}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedTargetId || linkObject.isPending}
            onClick={() => linkObject.mutate({ targettype: linkType, targetid: selectedTargetId }, { onSuccess: () => setSelectedTargetId('') })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Link2 size={13} /> Link
          </button>
        </div>
        {data.related.length === 0 ? (
          <p className="text-sm text-text-faint italic">No related objects.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.related.map((r) => (
              <li key={r.ee_rowid} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <a href={r.url} className="font-medium text-brand hover:underline truncate block">
                    {r.type_label}: {r.ref}
                  </a>
                  <p className="text-xs text-text-faint">
                    {r.date} {r.amount_ht && `· ${r.amount_ht}`} {r.status && `· ${r.status}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => unlinkObject.mutate(r.ee_rowid)}
                  disabled={unlinkObject.isPending}
                  title="Unlink"
                  className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg disabled:opacity-50 shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// Same list-page routing used by Sales Orders' own Agenda tab for Related
// Objects links — no generic "object by ID" router exists in this app, so
// these point to the relevant list rather than a specific detail page.
function agendaNativeRouteForUrl(url: string): string | null {
  if (!url) return null
  if (url.includes('/compta/facture/card.php') || url.includes('/compta/sales/card.php')) return ROUTES.invoiceList
  if (url.includes('/contrat/')) return ROUTES.contractList
  if (url.includes('/comm/propal/')) return ROUTES.quotationList
  if (url.includes('/commande/card.php')) return ROUTES.orderList
  if (url.includes('/fourn/commande')) return ROUTES.purchaseOrderList
  if (url.includes('/fourn/facture')) return ROUTES.vendorInvoiceList
  return null
}

// Real page shows every server date twice — "PHP Time (server)" (the raw
// value already scraped into creationDate/etc.) plus "Client time (user)",
// computed client-side by converting from the company's configured
// TimeZone (scraped from the topbar panel, e.g. "UTC") to the viewer's own
// browser timezone. Only handles the confirmed UTC case — falls back to the
// plain server value for any other company timezone rather than guessing.
function parseServerDateAsUtc(value: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim())
  if (!m) return null
  const [, mm, dd, yyyy, hh, min, ampm] = m
  let hour = parseInt(hh, 10) % 12
  if (ampm.toUpperCase() === 'PM') hour += 12
  return new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), hour, parseInt(min, 10)))
}

function formatLikeDolibarr(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  let hh = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  const ampm = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12 || 12
  return `${mm}/${dd}/${yyyy} ${String(hh).padStart(2, '0')}:${min} ${ampm}`
}

function AgendaDualTime({ value, timezone }: { value: string; timezone: string }) {
  if (!value) return <span className="text-text-faint">—</span>
  const utcDate = timezone.trim().toUpperCase() === 'UTC' ? parseServerDateAsUtc(value) : null
  if (!utcDate) return <>{value}</>
  return (
    <>
      {value} <span className="text-text-faint font-normal">PHP Time (server)</span>
      {' / '}
      {formatLikeDolibarr(utcDate)} <span className="text-text-faint font-normal">Client time (user)</span>
    </>
  )
}

function AgendaInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

function AgendaEventByAvatar({ name }: { name: string }) {
  if (!name) return null
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-semibold shrink-0">{initials}</span>
      {name}
    </span>
  )
}

// Real compta/facture/agenda.php page — header metadata (Created by/
// Creation date/Latest modification date/Validated by/Validation date) plus
// the real "Actions on invoice" table (Ref./Date/Owner/Label/Related
// Objects/Status), matching Sales Orders' own already-built Agenda tab
// (same generic Dolibarr agenda-list template, confirmed live — see
// invoiceAgendaParser.ts header comment).
function AgendaTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceAgenda(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <AgendaInfoRow label="Created by" value={<AgendaEventByAvatar name={data.createdBy} />} />
        <AgendaInfoRow label="Creation date" value={<AgendaDualTime value={data.creationDate} timezone={data.timezone} />} />
        <AgendaInfoRow label="Latest modification date" value={<AgendaDualTime value={data.latestModificationDate} timezone={data.timezone} />} />
        {data.validatedBy && <AgendaInfoRow label="Validated by" value={<AgendaEventByAvatar name={data.validatedBy} />} />}
        {data.validationDate && <AgendaInfoRow label="Validation date" value={<AgendaDualTime value={data.validationDate} timezone={data.timezone} />} />}
        {data.closingDate && <AgendaInfoRow label="Closing date" value={<AgendaDualTime value={data.closingDate} timezone={data.timezone} />} />}
        <AgendaInfoRow label="Zra Message" value={data.zraMessage} />
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <CalendarClock size={14} className="text-brand" />
          <h3 className="font-semibold text-text!">Actions on invoice</h3>
        </div>
        {data.events.length === 0 ? (
          <EmptyState icon={CalendarClock} message="No events recorded for this invoice." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Ref.</th>
                  <th className="font-medium py-2 px-3">Date</th>
                  <th className="font-medium py-2 px-3">Owner</th>
                  <th className="font-medium py-2 px-3">Label</th>
                  <th className="font-medium py-2 px-3">Related Objects</th>
                  <th className="font-medium py-2 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event, i) => {
                  const relatedRoute = agendaNativeRouteForUrl(event.relatedObjectUrl)
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 px-4 text-text!">{event.ref}</td>
                      <td className="py-2 px-3 text-text-muted whitespace-nowrap">{event.date}</td>
                      <td className="py-2 px-3 text-text-muted">
                        <AgendaEventByAvatar name={event.owner} />
                      </td>
                      <td className="py-2 px-3 text-text-muted">{event.label}</td>
                      <td className="py-2 px-3">
                        {relatedRoute ? (
                          <Link to={relatedRoute} title="Open in this app" className="text-brand hover:underline">
                            {event.relatedObjectRef}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{event.relatedObjectRef || '—'}</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center text-text-muted">{event.statusLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// Real compta/sales/api/ledgerentry.php-backed tab (sales_ledgerentry.js).
const SHIPMENT_FIELDS: SalesShipmentDetails = {
  gdn_no: '',
  grn_no: '',
  month_year: '',
  shipping_via: '',
  shipping_date: '',
  tracking_id: '',
  transporter: '',
  truck_details: '',
  shipping_address: '',
}

// Real compta/sales/api/shipment.php-backed tab (sales_shipment.js). The
// real page's own "Shipment / GRN Details" card is edit-toggled by an
// "+ Add"/pencil button, not always shown editable — matched here. The
// shipping-charges sub-feature (add_charge/get_totals) is real but
// unreachable in the live UI per confirmed research, so left out to match
// current real behavior rather than building a feature the real page
// itself doesn't expose yet.
function ShipmentGrnTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useSalesInvoiceShipment(id)
  const save = useSaveSalesInvoiceShipment(id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<SalesShipmentDetails>(SHIPMENT_FIELDS)

  if (isLoading) return <LegacyLoadingCard label="Loading shipment/GRN details…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load shipment/GRN details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const s = data.shipment
  const hasAnyValue = Object.values(s).some((v) => v)
  const startEdit = () => {
    setForm(s)
    setEditing(true)
  }

  const fieldRows: [keyof SalesShipmentDetails, string, string][] = [
    ['gdn_no', 'GDN No.', 'GDN Number'],
    ['grn_no', 'GRN No.', 'GRN Number'],
    ['month_year', 'Month', 'e.g. January 2025'],
    ['shipping_via', 'Shipping Via', 'Via'],
    ['shipping_date', 'Shipping Date', 'Date'],
    ['tracking_id', 'Tracking ID', 'Tracking ID'],
    ['transporter', 'Transporter', 'Transporter name'],
    ['truck_details', 'Truck Details', 'Truck/Vehicle details'],
  ]

  return (
    <div className="space-y-3">
      <TabTitle>Shipment / GRN Details</TabTitle>
      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-3">
          <span />
          {!editing && (
            <ActionButton tone="outline" icon={Pencil} onClick={startEdit}>
              {hasAnyValue ? 'Edit' : 'Add'}
            </ActionButton>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {fieldRows.map(([key, label, placeholder]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-brand">{label}</span>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-brand">Shipping Address</span>
              <textarea
                value={form.shipping_address}
                onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                placeholder="Address"
                rows={2}
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
            {save.isError && <p className="text-xs text-danger">{save.error instanceof Error ? save.error.message : 'Could not save shipment/GRN details.'}</p>}
            <div className="flex gap-2">
              <ActionButton tone="success" icon={CheckCircle2} pending={save.isPending} onClick={() => save.mutate(form, { onSuccess: () => setEditing(false) })}>
                Save
              </ActionButton>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
            </div>
          </div>
        ) : hasAnyValue ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {fieldRows
              .filter(([key]) => s[key])
              .map(([key, label]) => (
                <div key={key} className="flex justify-between gap-3">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-medium text-text! text-right">{s[key]}</span>
                </div>
              ))}
            {s.shipping_address && (
              <div className="sm:col-span-2">
                <p className="text-text-muted">Shipping Address</p>
                <p className="font-medium text-text! whitespace-pre-line">{s.shipping_address}</p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon={Truck} message="No shipment/GRN details recorded for this invoice." />
        )}
      </Card>
    </div>
  )
}

function LedgerEntryTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useSalesInvoiceLedgerEntries(id)
  const deleteEntries = useDeleteSalesLedgerEntries(id)
  const [confirming, setConfirming] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading ledger entries…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load ledger entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle count={data.count}>Ledger Entries</TabTitle>
        {/* Real page gates this on CAN_EDIT only (always shown for an
            editor), not on whether there are any entries yet — confirmed
            live, sales_ledgerentry.js render(). */}
        <ActionButton tone="danger" icon={Trash2} onClick={() => setConfirming(true)}>
          Delete Ledger Entries
        </ActionButton>
      </div>
      <Card className="!h-auto !p-0 overflow-hidden">
        {data.entries.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <BookOpen size={28} className="text-text-faint" />
            <p className="text-sm text-text-faint">No ledger entries found.</p>
            <p className="text-xs text-text-faint">Entries are created when the invoice is transferred to accounting.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2.5">Date</th>
                  <th className="font-medium px-4 py-2.5">Accounting Doc.</th>
                  <th className="font-medium px-4 py-2.5">Ref.</th>
                  <th className="font-medium px-4 py-2.5">Journal</th>
                  <th className="font-medium px-4 py-2.5">Account</th>
                  <th className="font-medium px-4 py-2.5">Label</th>
                  <th className="font-medium px-4 py-2.5 text-right">Debit</th>
                  <th className="font-medium px-4 py-2.5 text-right">Credit</th>
                  <th className="font-medium px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-muted">{e.date}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.piece}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.ref}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.journal}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.account}</td>
                    <td className="px-4 py-2.5 text-text!">{e.label}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{e.debit}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{e.credit}</td>
                    <td className="px-4 py-2.5 text-right text-text!">{e.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-6 px-4 py-3 border-t border-border text-sm">
              <span className="text-text-muted">
                Debit <span className="font-semibold text-text!">{data.total_debit}</span>
              </span>
              <span className="text-text-muted">
                Credit <span className="font-semibold text-text!">{data.total_credit}</span>
              </span>
              <span className="text-text-muted">
                Balance <span className="font-bold text-brand">{data.balance}</span>
              </span>
            </div>
          </>
        )}
      </Card>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirming(false)}>
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text!">Delete all ledger entries?</h3>
            <p className="text-sm text-text-muted">This removes every ledger entry for this invoice. This cannot be undone.</p>
            {deleteEntries.isError && <p className="text-xs text-danger">{deleteEntries.error instanceof Error ? deleteEntries.error.message : 'Could not delete these entries.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="danger" icon={Trash2} onClick={() => deleteEntries.mutate(undefined, { onSuccess: () => setConfirming(false) })} pending={deleteEntries.isPending}>
                Delete
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
