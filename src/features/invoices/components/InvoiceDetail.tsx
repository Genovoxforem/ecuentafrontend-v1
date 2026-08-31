import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  Receipt,
  Users2,
  RefreshCcw,
  StickyNote,
  Paperclip,
  CalendarClock,
  Truck,
  BookOpen,
  Upload,
  Check,
  LoaderCircle,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useInvoiceDetail,
  useInvoiceNotes,
  useSaveInvoiceNotes,
  useInvoiceContacts,
  useInvoiceStandingOrders,
  useInvoiceDocuments,
  useUploadInvoiceDocument,
  useInvoiceAgenda,
  useInvoiceShipment,
  useSaveInvoiceShipment,
  useInvoiceLedgerEntries,
} from '../invoiceDetail.queries'

const TABS = [
  { key: 'invoice', label: 'Customer Invoice', icon: Receipt },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'standingorders', label: 'Direct Debit Orders', icon: RefreshCcw },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
  { key: 'shipment', label: 'Shipment/GRN', icon: Truck },
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
  const [tab, setTab] = useState<TabKey>('invoice')
  const { data, isLoading, isError, error, refetch } = useInvoiceDetail(id)

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
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-hover text-text-muted text-xs font-medium">{inv.status_label}</span>
                </div>
                <p className="text-xs text-text-faint mt-1">
                  Ref. customer: {inv.ref_client || '—'} · Third-party:{' '}
                  <a href={data.customer.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {data.customer.name}
                  </a>
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
                    <Icon size={14} className="shrink-0" /> {label}
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
        {tab === 'shipment' && <ShipmentTab id={id} />}
        {tab === 'ledgerentry' && <LedgerEntryTab id={id} />}
      </div>
    </div>
  )
}

function InvoiceMainTab({ data }: { data: import('../invoiceDetail.queries').InvoiceDetailResponse }) {
  const inv = data.invoice
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="!h-auto">
          <TabTitle>Invoice Details</TabTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-3 text-sm">
            <div>
              <p className="text-text-faint text-xs">Type</p>
              <p className="font-medium text-text!">{inv.type_label}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Discounts</p>
              <p className="font-medium text-text!">{inv.discount_info}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Invoice Date</p>
              <p className="font-medium text-text!">{inv.date}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Terms</p>
              <p className="font-medium text-text!">{inv.cond_reglement_label || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Due On</p>
              <p className="font-medium text-text!">{inv.date_due}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Type</p>
              <p className="font-medium text-text!">{inv.mode_reglement_label || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Currency</p>
              <p className="font-medium text-text!">{inv.currency}</p>
            </div>
          </div>
        </Card>

        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <TabTitle>Item Table</TabTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2.5">Product/Service</th>
                  <th className="font-medium px-4 py-2.5">VAT</th>
                  <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 text-right">Unit Price (Inc. Tax)</th>
                  <th className="font-medium px-4 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-4 py-2.5 text-right">Disc.</th>
                  <th className="font-medium px-4 py-2.5 text-right">Total (Inc. Tax)</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-text-faint italic">
                      No lines on this invoice.
                    </td>
                  </tr>
                ) : (
                  data.lines.map((l) => (
                    <tr key={l.rowid} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        {l.product_url ? (
                          <a href={l.product_url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                            {l.label || l.product_ref}
                          </a>
                        ) : (
                          <span className="font-medium text-text!">{l.label || l.desc}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{l.tva_tx}%</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.pu_ht_f}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.pu_ttc_f}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.qty}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.remise_percent}%</td>
                      <td className="px-4 py-2.5 text-right text-text!">{l.total_ttc_f}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="!h-auto">
          <TabTitle>Payment Details</TabTitle>
          <p className="text-xs text-text-faint mt-1">{inv.payment_status}</p>
          {data.payments.length === 0 ? <p className="text-sm text-text-faint italic mt-2">No payments recorded yet.</p> : null}
        </Card>

        {inv.online_pay_url && (
          <Card className="!h-auto">
            <TabTitle>URL for Online Payment</TabTitle>
            <p className="text-xs text-brand break-all mt-2">{inv.online_pay_url}</p>
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
                {inv.total_ht_f} {inv.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">VAT</span>
              <span className="font-medium text-text!">
                {inv.total_tva_f} {inv.currency}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border">
              <span className="font-semibold text-text!">Total (Incl. Tax)</span>
              <span className="font-bold text-brand">
                {inv.total_ttc_f} {inv.currency}
              </span>
            </div>
          </div>
        </Card>

        <Card className="!h-auto">
          <TabTitle>ZRA Invoice Details</TabTitle>
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-text-muted">ZRA Invoice Status</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg text-xs font-medium">{data.zra.status || 'Not Submitted'}</span>
          </div>
        </Card>

        <Card className="!h-auto">
          <TabTitle count={inv.nb_files}>Linked Files</TabTitle>
          <p className="text-sm text-text-faint italic mt-2">See the Linked Files tab to manage documents.</p>
        </Card>
      </div>
    </div>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceNotes(id)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [initialized, setInitialized] = useState(false)
  const saveNotes = useSaveInvoiceNotes(id)
  const [saved, setSaved] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  if (!initialized) {
    setNotePublic(data.note_public ?? '')
    setNotePrivate(data.note_private ?? '')
    setInitialized(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Notes</TabTitle>
        <button
          type="button"
          disabled={saveNotes.isPending}
          onClick={() =>
            saveNotes.mutate(
              { note_public: notePublic, note_private: notePrivate },
              {
                onSuccess: () => {
                  setSaved(true)
                  setTimeout(() => setSaved(false), 2500)
                },
              },
            )
          }
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          <Check size={14} /> {saveNotes.isPending ? 'Saving…' : 'Save Notes'}
        </button>
      </div>
      {saved && <p className="text-xs text-success-fg">Saved.</p>}
      {saveNotes.isError && <p className="text-xs text-danger">{saveNotes.error instanceof Error ? saveNotes.error.message : 'Failed to save.'}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text!">Public Note</p>
          <p className="text-xs text-text-faint mb-2">Visible to customer on printed documents</p>
          <textarea value={notePublic} onChange={(e) => setNotePublic(e.target.value)} rows={3} className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </Card>
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text!">Private Note</p>
          <p className="text-xs text-text-faint mb-2">Internal use only — not visible on documents</p>
          <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} rows={3} className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </Card>
      </div>
    </div>
  )
}

function ContactsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceContacts(id)
  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const rows = [...data.internal, ...data.external]
  return (
    <div className="space-y-3">
      <TabTitle count={data.total}>Contacts/Addresses</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-8">No contacts linked to this invoice.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Name</th>
                <th className="font-medium px-4 py-2.5">Role</th>
                <th className="font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.rowid} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-text!">{c.name}</td>
                  <td className="px-4 py-2.5 text-text-muted">{c.type_label}</td>
                  <td className="px-4 py-2.5 text-text-muted">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
      <TabTitle count={data.count}>Direct Debit Orders</TabTitle>
      <Card className="!h-auto">
        {data.orders.length === 0 ? (
          <EmptyState icon={RefreshCcw} message="No direct debit orders found for this invoice." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Ref</th>
                <th className="font-medium px-4 py-2.5">Amount</th>
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-text!">{o.ref}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.amount}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.date}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceDocuments(id)
  const upload = useUploadInvoiceDocument(id)
  const [file, setFile] = useState<File | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading linked files…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load linked files" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.nb_files}>Linked Files</TabTitle>
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Attach a new file/document</p>
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

      {data.margin.enabled && (
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text! mb-2">Margin Details</p>
          <div className="text-sm overflow-x-auto [&_table]:w-full [&_td]:py-1.5 [&_td]:px-2 [&_.liste_titre]:text-xs [&_.liste_titre]:text-text-faint [&_.right]:text-right [&_.custumRight]:text-right [&_.totalRow]:font-semibold [&_.totalRow]:border-t [&_.totalRow]:border-border" dangerouslySetInnerHTML={{ __html: data.margin.margin_info }} />
        </Card>
      )}

      <Card className="!h-auto">
        {data.files.length === 0 ? <EmptyState icon={Paperclip} message="No files attached to this invoice." /> : (
          <ul className="divide-y divide-border">
            {data.files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={f.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {f.name}
                </a>
                <span className="text-text-muted shrink-0">
                  {f.size} · {f.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Related Objects</p>
        {data.related.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-4">None</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 pr-3">Type</th>
                <th className="font-medium py-2 pr-3">Ref.</th>
                <th className="font-medium py-2 pr-3">Date</th>
                <th className="font-medium py-2 pr-3">Amount</th>
                <th className="font-medium py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.related.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-text-muted">{r.type}</td>
                  <td className="py-2 pr-3 font-medium text-text!">{r.ref}</td>
                  <td className="py-2 pr-3 text-text-muted">{r.date}</td>
                  <td className="py-2 pr-3 text-text-muted">{r.amount}</td>
                  <td className="py-2 text-text-muted">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function AgendaTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceAgenda(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.count}>Events & Agenda</TabTitle>
      <Card className="!h-auto">
        {data.events.length === 0 ? (
          <EmptyState icon={CalendarClock} message="No events recorded for this invoice." />
        ) : (
          <ul className="divide-y divide-border">
            {data.events.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <p className="font-medium text-text!">{e.label}</p>
                <p className="text-xs text-text-faint">
                  {e.type} · {e.date} · {e.user}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function ShipmentTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceShipment(id)
  const save = useSaveInvoiceShipment(id)
  const existing = data ? (Array.isArray(data.shipment) ? data.shipment[0] : data.shipment) : undefined

  const [form, setForm] = useState({
    gdn_no: '',
    grn_no: '',
    month_year: '',
    shipping_via: '',
    shipping_date: '',
    tracking_id: '',
    transporter: '',
    truck_details: '',
    shipping_address: '',
  })
  const [initialized, setInitialized] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading shipment details…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load shipment details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  if (!initialized && existing) {
    setForm({
      gdn_no: existing.gdn_no ?? '',
      grn_no: existing.grn_no ?? '',
      month_year: existing.shipment_month ?? '',
      shipping_via: existing.shipping_via ?? '',
      shipping_date: existing.shipping_date ?? '',
      tracking_id: existing.tracking_id ?? '',
      transporter: existing.transporter ?? '',
      truck_details: existing.truck_details ?? '',
      shipping_address: existing.shipping_address ?? '',
    })
    setInitialized(true)
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })
  const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2'

  return (
    <div className="space-y-3">
      <TabTitle>Shipment / GRN Details</TabTitle>
      <Card className="!h-auto">
        {save.isError && <p className="text-xs text-danger mb-2">{save.error instanceof Error ? save.error.message : 'Failed to save.'}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">GDN No.</span>
            <input {...field('gdn_no')} placeholder="GDN Number" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">GRN No.</span>
            <input {...field('grn_no')} placeholder="GRN Number" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">Month</span>
            <input {...field('month_year')} placeholder="e.g. January 2025" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">Shipping Via</span>
            <input {...field('shipping_via')} placeholder="Via" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">Shipping Date</span>
            <input {...field('shipping_date')} placeholder="Date" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">Tracking ID</span>
            <input {...field('tracking_id')} placeholder="Tracking ID" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">Transporter</span>
            <input {...field('transporter')} placeholder="Transporter name" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-faint text-xs">Truck Details</span>
            <input {...field('truck_details')} placeholder="Truck/Vehicle details" className={inputCls} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm mt-4">
          <span className="text-text-faint text-xs">Shipping Address</span>
          <textarea value={form.shipping_address} onChange={(e) => setForm((f) => ({ ...f, shipping_address: e.target.value }))} placeholder="Address" rows={2} className={inputCls} />
        </label>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
      </Card>
    </div>
  )
}

function LedgerEntryTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceLedgerEntries(id)
  if (isLoading) return <LegacyLoadingCard label="Loading ledger entries…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load ledger entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.count}>Ledger Entries</TabTitle>
      <Card className="!h-auto">
        {data.entries.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <BookOpen size={28} className="text-text-faint" />
            <p className="text-sm text-text-faint">No ledger entries found.</p>
            <p className="text-xs text-text-faint">Entries are created when the invoice is transferred to accounting.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 pr-3">Date</th>
                <th className="font-medium py-2 pr-3">Account</th>
                <th className="font-medium py-2 pr-3">Label</th>
                <th className="font-medium py-2 pr-3 text-right">Debit</th>
                <th className="font-medium py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.rowid} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-text-muted">{e.date}</td>
                  <td className="py-2 pr-3 text-text-muted">{e.account}</td>
                  <td className="py-2 pr-3 text-text!">{e.label}</td>
                  <td className="py-2 pr-3 text-right text-text-muted">{e.debit}</td>
                  <td className="py-2 text-right text-text-muted">{e.credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

