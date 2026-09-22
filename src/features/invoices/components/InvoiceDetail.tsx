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
  BookOpen,
  Upload,
  LoaderCircle,
  Pencil,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useInvoiceDetail,
  useInvoiceNotes,
  useInvoiceNoteEditContext,
  useUpdateInvoiceNote,
  useInvoiceContacts,
  useInvoiceStandingOrders,
  useInvoiceDocuments,
  useInvoiceDocumentsPageMeta,
  useUploadInvoiceDocument,
  useInvoiceAgenda,
  useInvoiceLedgerEntries,
} from '../invoiceDetail.queries'
import type { InvoiceDetail as InvoiceDetailData } from '../invoiceCardParser'

const TABS = [
  { key: 'invoice', label: 'Customer Invoice', icon: Receipt },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'standingorders', label: 'Direct Debit Orders', icon: RefreshCcw },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
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
                  <h2 className="text-lg font-bold text-text!">{data.ref}</h2>
                  {data.statusLabel && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-hover text-text-muted text-xs font-medium">{data.statusLabel}</span>}
                  {data.secondaryStatusLabel && <span className="text-xs text-text-faint">{data.secondaryStatusLabel}</span>}
                </div>
                <p className="text-xs text-text-faint mt-1">
                  Ref. customer: {data.refClient || '—'} · Third-party:{' '}
                  {data.thirdPartySocid ? (
                    <Link to={ROUTES.customerDetail.replace(':id', String(data.thirdPartySocid))} className="text-brand hover:underline">
                      {data.thirdPartyName}
                    </Link>
                  ) : (
                    data.thirdPartyName || '—'
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
                    {key === 'notes' && data.notesBadge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{data.notesBadge}</span>
                    )}
                    {key === 'documents' && data.documentsBadge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{data.documentsBadge}</span>
                    )}
                    {key === 'agenda' && data.agendaBadge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{data.agendaBadge}</span>
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
        {tab === 'ledgerentry' && <LedgerEntryTab id={id} />}
      </div>
    </div>
  )
}

function InvoiceMainTab({ data }: { data: InvoiceDetailData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="!h-auto">
          <TabTitle>Invoice Details</TabTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-3 text-sm">
            <div>
              <p className="text-text-faint text-xs">Type</p>
              <p className="font-medium text-text!">
                {data.typeLabel || '—'} {data.typeNote && <span className="text-text-faint font-normal">({data.typeNote})</span>}
              </p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Discounts</p>
              <p className="font-medium text-text!">{data.discountInfo || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Invoice Date</p>
              <p className="font-medium text-text!">{data.invoiceDate || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Terms</p>
              <p className="font-medium text-text!">{data.paymentTerms || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Due On</p>
              <p className="font-medium text-text!">{data.paymentDueOn || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Payment Type</p>
              <p className="font-medium text-text!">{data.paymentType || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Currency</p>
              <p className="font-medium text-text!">{data.currencyLabel || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Bank Account</p>
              <p className="font-medium text-text!">{data.bankAccount || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Incoterms</p>
              <p className="font-medium text-text!">{data.incoterms || '—'}</p>
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
                  <th className="font-medium px-4 py-2.5">Landed Cost</th>
                  <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 text-right">Unit Price (Inc. Tax)</th>
                  <th className="font-medium px-4 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-4 py-2.5 text-right">Disc.</th>
                  <th className="font-medium px-4 py-2.5 text-right">Cost Price</th>
                  <th className="font-medium px-4 py-2.5 text-right">Total (Inc. Tax)</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-text-faint italic">
                      No lines on this invoice.
                    </td>
                  </tr>
                ) : (
                  data.lines.map((l) => (
                    <tr key={l.rowid} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        {l.productId ? (
                          <Link to={ROUTES.productDetail.replace(':id', l.productId)} className="font-medium text-brand hover:underline">
                            {l.label}
                          </Link>
                        ) : (
                          <span className="font-medium text-text!">{l.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{l.vatRatePercent || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted">{l.landedCost || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.unitPriceExcl}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.unitPriceIncl}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.qty}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.discountPercent || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.costPrice || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-text!">{l.totalIncl}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-border">
              {data.actions.map((a) => (
                <a key={a.label} href={a.url} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
                  {a.label}
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <TabTitle>Payment Details</TabTitle>
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
                    <tr key={p.ref} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <a href={p.url} className="font-medium text-brand hover:underline">
                          {p.ref}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{p.date}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.type}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.bankAccount}</td>
                      <td className="px-4 py-2.5 text-right text-text!">{p.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="space-y-1.5 px-4 py-3 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Already paid (without credit notes and down payments)</span>
              <span className="font-medium text-text!">{data.alreadyPaid || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Billed</span>
              <span className="font-medium text-text!">{data.billed || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-text!">Remaining unpaid</span>
              <span className="font-bold text-brand">{data.remainingUnpaid || '—'}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="!h-auto">
          <TabTitle>Price Details</TabTitle>
          <div className="space-y-1.5 mt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subtotal (Excl. Tax)</span>
              <span className="font-medium text-text!">{data.amountExclTax}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">VAT</span>
              <span className="font-medium text-text!">{data.vatAmount}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border">
              <span className="font-semibold text-text!">Total (Incl. Tax)</span>
              <span className="font-bold text-brand">{data.amountInclTax}</span>
            </div>
          </div>
        </Card>

        <Card className="!h-auto">
          <TabTitle>ZRA Invoice Details</TabTitle>
          <div className="space-y-2 mt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">ZRA Invoice Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg text-xs font-medium">{data.zra.status || 'Not Submitted'}</span>
            </div>
            {[
              ['Receipt No', data.zra.receiptNo],
              ['Internal Data', data.zra.internalData],
              ['Invoice Signature', data.zra.invoiceSignature],
              ['Invoice No', data.zra.invoiceNo],
              ['SDC ID', data.zra.sdcId],
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

        <Card className="!h-auto">
          <TabTitle count={data.documentsBadge}>Linked Files</TabTitle>
          <p className="text-sm text-text-faint italic mt-2">See the Linked Files tab to manage documents.</p>
        </Card>
      </div>
    </div>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceNotes(id)
  const [editingField, setEditingField] = useState<'public' | 'private' | null>(null)
  const [value, setValue] = useState('')
  const editContext = useInvoiceNoteEditContext(id, editingField)
  const updateNote = useUpdateInvoiceNote(id)

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function startEdit(field: 'public' | 'private') {
    setEditingField(field)
    setValue('')
  }

  function submit() {
    if (!editingField || !editContext.data?.token) return
    updateNote.mutate({ field: editingField, token: editContext.data.token, value }, { onSuccess: () => setEditingField(null) })
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
          editContext.isLoading ? (
            <p className="text-xs text-text-faint flex items-center gap-1.5">
              <LoaderCircle size={12} className="animate-spin" /> Loading real note form…
            </p>
          ) : (
            <div className="space-y-2">
              <textarea
                autoFocus
                defaultValue={editContext.data?.currentValue ?? ''}
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
          )
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

function ContactsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceContacts(id)
  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.rows.length}>Contacts/Addresses</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        {data.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-8">No contacts linked to this invoice.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Nature</th>
                <th className="font-medium px-4 py-2.5">Third Party</th>
                <th className="font-medium px-4 py-2.5">Contact</th>
                <th className="font-medium px-4 py-2.5">Type</th>
                <th className="font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-text!">{c.nature}</td>
                  <td className="px-4 py-2.5 text-text-muted">{c.thirdParty}</td>
                  <td className="px-4 py-2.5 text-text-muted">{c.contact}</td>
                  <td className="px-4 py-2.5 text-text-muted">{c.contactType}</td>
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

function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceDocuments(id)
  const { data: meta, isLoading: metaLoading } = useInvoiceDocumentsPageMeta(id)
  const upload = useUploadInvoiceDocument(id)
  const [file, setFile] = useState<File | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading linked files…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load linked files" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={meta?.attachedCount ?? data.length}>Linked Files</TabTitle>
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
            disabled={!file || !meta || metaLoading || upload.isPending}
            onClick={() => file && meta && upload.mutate({ token: meta.attachToken, file, savingDocMask: meta.savingDocMask, useMask: false }, { onSuccess: () => setFile(null) })}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            <Upload size={14} /> {upload.isPending ? 'Uploading…' : 'Upload File'}
          </button>
        </div>
      </Card>

      <Card className="!h-auto">
        {data.length === 0 ? (
          <EmptyState icon={Paperclip} message="No files attached to this invoice." />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((f) => (
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

      {meta && meta.links.length > 0 && (
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text! mb-2">Linked Files and Documents</p>
          <ul className="divide-y divide-border">
            {meta.links.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={l.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {l.label}
                </a>
                <span className="text-text-muted shrink-0">{l.date}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function AgendaTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceAgenda(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.events.length}>Events & Agenda</TabTitle>
      <Card className="!h-auto">
        {data.events.length === 0 ? (
          <EmptyState icon={CalendarClock} message="No events recorded for this invoice." />
        ) : (
          <ul className="divide-y divide-border">
            {data.events.map((e, i) => (
              <li key={i} className="py-2 text-sm">
                <p className="font-medium text-text!">{e.label}</p>
                <p className="text-xs text-text-faint">
                  {e.date} · {e.owner}
                  {e.statusLabel ? ` · ${e.statusLabel}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
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
      <TabTitle count={data.rows.length}>Ledger Entries</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        {data.rows.length === 0 ? (
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
                {data.rows.map((e, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-muted">{e.date}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.accountingDoc}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.ref}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.codeJournal}</td>
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
                Debit <span className="font-semibold text-text!">{data.totalDebit}</span>
              </span>
              <span className="text-text-muted">
                Credit <span className="font-semibold text-text!">{data.totalCredit}</span>
              </span>
              <span className="text-text-muted">
                Balance <span className="font-bold text-brand">{data.balance}</span>
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
