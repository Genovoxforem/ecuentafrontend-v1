import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Receipt, Users2, StickyNote, Paperclip, ScrollText, BookOpen, Upload, LoaderCircle, Pencil, Ship, ReceiptText, Calculator } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, StatusPill } from '../../../shared/components/dashboard/DashboardKit'
import { useTheme } from '../../../context/ThemeContext'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useVendorInvoiceDetail,
  useVendorInvoiceNotes,
  useVendorInvoiceNoteEditContext,
  useUpdateVendorInvoiceNote,
  useVendorInvoiceContacts,
  useVendorInvoiceDocuments,
  useVendorInvoiceDocumentsPageMeta,
  useUploadVendorInvoiceDocument,
  useVendorInvoiceLog,
  useVendorInvoiceLedgerEntries,
} from '../vendorInvoiceDetail.queries'
import type { VendorInvoiceDetail as VendorInvoiceDetailData } from '../vendorInvoiceCardParser'

const TABS = [
  { key: 'invoice', label: 'Vendor Invoice', icon: Receipt },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'log', label: 'Log', icon: ScrollText },
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

export function VendorInvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
  const isBlueMetal = theme === 'blue-metal'
  const [tab, setTab] = useState<TabKey>('invoice')
  const { data, isLoading, isError, error, refetch } = useVendorInvoiceDetail(id)

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading vendor invoice…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load vendor invoice" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
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
                <Link to={ROUTES.vendorInvoiceList} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text mb-1.5">
                  <ChevronLeft size={14} /> Vendor Invoices
                </Link>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text!">{data.ref}</h2>
                  {data.statusLabel && (isBlueMetal ? (
                    <StatusPill tone="neutral">{data.statusLabel}</StatusPill>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-hover text-text-muted text-xs font-medium">{data.statusLabel}</span>
                  ))}
                  {data.secondaryStatusLabel && <span className="text-xs text-text-faint">{data.secondaryStatusLabel}</span>}
                </div>
                <p className="text-xs text-text-faint mt-1">
                  Ref. vendor: {data.refVendor || '—'} · Third-party: {data.thirdPartyName || '—'}
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
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'invoice' && <MainTab data={data} />}
        {tab === 'contacts' && <ContactsTab id={id} />}
        {tab === 'notes' && <NotesTab id={id} />}
        {tab === 'documents' && <DocumentsTab id={id} />}
        {tab === 'log' && <LogTab id={id} />}
        {tab === 'ledgerentry' && <LedgerEntryTab id={id} />}
      </div>
    </div>
  )
}

function ExtraPanels({ data }: { data: VendorInvoiceDetailData }) {
  const [panel, setPanel] = useState<'shipment' | 'expenses' | 'landedCost'>('shipment')
  const panels = [
    { key: 'shipment' as const, label: 'Shipment Details', icon: Ship },
    { key: 'expenses' as const, label: 'Expenses', icon: ReceiptText },
    { key: 'landedCost' as const, label: 'Landed Cost', icon: Calculator },
  ]
  return (
    <Card className="!h-auto">
      <div className="flex items-center gap-1 border-b border-border -mx-4 px-4 mb-3">
        {panels.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPanel(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px ${
              panel === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      {panel === 'shipment' &&
        (data.extraPanels.shipmentFields.length === 0 ? (
          <p className="text-sm text-text-faint italic">No shipment details recorded.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.extraPanels.shipmentFields.map((f) => (
              <div key={f.label} className="rounded-lg bg-surface-hover p-2.5">
                <p className="text-[11px] text-text-faint">{f.label}</p>
                <p className="text-sm font-semibold text-text!">{f.value || '—'}</p>
              </div>
            ))}
          </div>
        ))}
      {panel === 'expenses' && <p className="text-sm text-text-faint">{data.extraPanels.expensesMessage || 'No expense information available.'}</p>}
      {panel === 'landedCost' && <p className="text-sm text-text-faint">{data.extraPanels.landedCostMessage || 'No landed cost information available.'}</p>}
    </Card>
  )
}

function MainTab({ data }: { data: VendorInvoiceDetailData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="!h-auto">
          <TabTitle>Invoice Details</TabTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-3 text-sm">
            <div>
              <p className="text-text-faint text-xs">Type</p>
              <p className="font-medium text-text!">{data.typeLabel || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Discounts</p>
              <p className="font-medium text-text!">{data.discountInfo || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Label</p>
              <p className="font-medium text-text!">{data.label || '—'}</p>
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
            {data.zraStatus && (
              <div>
                <p className="text-text-faint text-xs">ZRA Invoice Status</p>
                <p className="font-medium text-text!">{data.zraStatus}</p>
              </div>
            )}
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
                  <th className="font-medium px-4 py-2.5">Lot/Batch</th>
                  <th className="font-medium px-4 py-2.5">Supplier Ref</th>
                  <th className="font-medium px-4 py-2.5">VAT</th>
                  <th className="font-medium px-4 py-2.5">Landed Cost</th>
                  <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-4 py-2.5 text-right">Disc.</th>
                  <th className="font-medium px-4 py-2.5 text-right">Total (Incl.)</th>
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
                            {l.productLabel}
                          </Link>
                        ) : (
                          <span className="font-medium text-text!">{l.productLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted text-xs">{l.lotNumber ? `${l.lotNumber}${l.lotWarehouseName ? ` · ${l.lotWarehouseName}` : ''}` : '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted">{l.fournRef || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted">{l.vatRatePercent}%</td>
                      <td className="px-4 py-2.5 text-text-muted">{l.landedCost ? 'Yes' : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.unitPriceExcl}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.qty}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.discountPercent}%</td>
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

        <ExtraPanels data={data} />

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
              <span className="text-text-muted">Subtotal</span>
              <span className="font-medium text-text!">{data.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Amount (Excl. Tax)</span>
              <span className="font-medium text-text!">{data.amountExclTax}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">VAT</span>
              <span className="font-medium text-text!">{data.vatAmount}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border">
              <span className="font-semibold text-text!">Amount (Incl. Tax)</span>
              <span className="font-bold text-brand">{data.amountInclTax}</span>
            </div>
          </div>
        </Card>

        {data.deleteDisabledReason && (
          <Card className="!h-auto !bg-surface-hover">
            <p className="text-xs text-text-faint">{data.deleteDisabledReason}</p>
          </Card>
        )}

        <Card className="!h-auto">
          <TabTitle count={data.documentsBadge}>Linked Files</TabTitle>
          <p className="text-sm text-text-faint italic mt-2">See the Linked Files tab to manage documents.</p>
        </Card>
      </div>
    </div>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useVendorInvoiceNotes(id)
  const [editingField, setEditingField] = useState<'public' | 'private' | null>(null)
  const [value, setValue] = useState('')
  const editContext = useVendorInvoiceNoteEditContext(id, editingField)
  const updateNote = useUpdateVendorInvoiceNote(id)

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
        <NoteCard field="public" label="Public Note" hint="Visible to vendor on printed documents" content={data.notePublic} />
        <NoteCard field="private" label="Private Note" hint="Internal use only — not visible on documents" content={data.notePrivate} />
      </div>
    </div>
  )
}

function ContactsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useVendorInvoiceContacts(id)
  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.length}>Contacts/Addresses</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        {data.length === 0 ? (
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
              {data.map((c, i) => (
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

function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useVendorInvoiceDocuments(id)
  const { data: meta, isLoading: metaLoading } = useVendorInvoiceDocumentsPageMeta(id)
  const upload = useUploadVendorInvoiceDocument(id)
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

function LogTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useVendorInvoiceLog(id)
  if (isLoading) return <LegacyLoadingCard label="Loading log…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load log" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const rows = [
    ['Created by', data.createdBy],
    ['Creation date', data.creationDate],
    ['Latest modification date', data.latestModificationDate],
    ['Validated by', data.validatedBy],
    ['Validation date', data.validationDate],
  ].filter(([, v]) => v)

  return (
    <div className="space-y-3">
      <TabTitle>Log</TabTitle>
      <Card className="!h-auto">
        {rows.length === 0 ? (
          <EmptyState icon={ScrollText} message="No log information available." />
        ) : (
          <div className="space-y-2 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-text-muted">{label}</span>
                <span className="font-medium text-text! text-right">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function LedgerEntryTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useVendorInvoiceLedgerEntries(id)
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
