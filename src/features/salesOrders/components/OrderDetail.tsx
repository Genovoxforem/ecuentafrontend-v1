import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  X,
  FileText,
  StickyNote,
  Paperclip,
  Copy,
  Trash2,
  Building2,
  Briefcase,
  Check,
  Pencil,
  Users,
  Truck,
  PackageMinus,
  CalendarClock,
  ExternalLink,
  Plus,
  Link2,
  TrendingUp,
  Percent,
  Wallet,
  MoreVertical,
  RefreshCw,
  ClipboardList,
  Search,
  Unlink,
  FileCog,
  LoaderCircle,
  Eye,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useOrderDetail,
  useOrderNotes,
  useOrderDocuments,
  useOrderContacts,
  useOrderShipmentStock,
  useGenerateOrderDoc,
  useAddOrderContact,
  useOrderConsumption,
  useDeclareConsumption,
  useOrderAgendaPage,
  useOrderDocumentsPageMeta,
  useUploadOrderDocument,
  useLinkOrderDocument,
} from '../orderDetail.queries'
import type { OrderDetail as OrderDetailData } from '../orderCardParser'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { SendOrderEmailModal } from './SendOrderEmailModal'
import { OrderQuickSearchPanel } from './OrderQuickSearchPanel'

// Native rebuild of commande/card.php?id=X + note.php + document.php +
// contact.php + expedition/shipment.php — see orderCardParser.ts's header
// comment for why this scrapes real HTML rather than calling a REST
// endpoint (no order-detail API exists on this backend), and for how the
// real per-line Item Table data (a client-side JSON blob, not
// server-rendered markup) is extracted. orderExtraTabsParser.ts covers the
// Contacts/Addresses and Shipments-Delivery Receipts tabs' own separate
// pages. Stock Consumptions has no read-only report of its own on the real
// page (just a "declare consumption from a warehouse" form with a CSRF
// token) — its tab reuses this page's own already-fetched line data and
// links out only for that one mutating submit action, the same treatment
// already given to Modify/Cancel/Classify delivered below.

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-info-bg text-info-fg',
  Validated: 'bg-warning-bg text-warning-fg',
  Closed: 'bg-success-bg text-success-fg',
  Cancelled: 'bg-neutral-bg text-neutral-fg',
}

function StatusBadge({ label }: { label: string }) {
  const key = Object.keys(STATUS_STYLES).find((k) => label.includes(k))
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${key ? STATUS_STYLES[key] : 'bg-neutral-bg text-neutral-fg'}`}>{label}</span>
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

// Header icon links (Edit/Clone/Delete) and the bottom action-button row
// share this same "open the real backend URL in a new tab" treatment — see
// orderCardParser.ts's parseActionButtons() comment for why mutating,
// modal-confirm-only actions fall back to the base order page instead of a
// fabricated POST.
function HeaderIconLink({ url, title, tone, children }: { url: string; title: string; tone?: 'danger'; children: ReactNode }) {
  return (
    <a
      href={stripBackendPrefix(url)}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={`p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text ${tone === 'danger' ? 'hover:bg-danger-bg hover:text-danger-fg' : ''}`}
    >
      {children}
    </a>
  )
}

// Small inline pencil used next to the Ref./Ref. customer/Project labels —
// each has its own real per-field edit link (action=editref,
// action=editref_client, action=classify), distinct from the header's
// whole-order action=modif pencil.
function EditPencil({ url, title }: { url: string; title: string }) {
  return (
    <a href={stripBackendPrefix(url)} target="_blank" rel="noreferrer" title={title} className="text-text-faint hover:text-brand">
      <Pencil size={11} />
    </a>
  )
}

// Related Objects' `type` cell text (e.g. "Customer invoice") maps to this
// app's own native list page for that record type, rather than the real
// backend's PHP card page — this app has no per-record detail route for
// invoices/contracts/quotations/purchase orders yet, only list pages, so
// this is deliberately a link to the right SECTION of the app, not a deep
// link to the exact record. Falls back to plain (unlinked) text for any
// type this app doesn't have a native area for yet (e.g. "Intervention").
function nativeRouteForRelatedObjectType(type: string): string | null {
  const t = type.toLowerCase()
  if (t.includes('invoice') && (t.includes('vendor') || t.includes('supplier'))) return ROUTES.vendorInvoiceList
  if (t.includes('invoice')) return ROUTES.invoiceList
  if (t.includes('contract')) return ROUTES.contractList
  if (t.includes('quotation') || t.includes('proposal')) return ROUTES.quotationList
  if (t.includes('purchase order') || (t.includes('order') && (t.includes('vendor') || t.includes('supplier')))) return ROUTES.purchaseOrderList
  return null
}

function EventByAvatar({ name }: { name: string }) {
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

const TABS = [
  { key: 'details', label: 'Sales Order', icon: FileText },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users },
  { key: 'shipments', label: 'Shipments - Delivery Receipts', icon: Truck },
  { key: 'consumption', label: 'Stock Consumptions', icon: PackageMinus },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
] as const
type TabKey = (typeof TABS)[number]['key']

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('details')
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const { data, isLoading, isError, error, refetch } = useOrderDetail(id)

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading sales order…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load sales order" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      {showQuickSearch && <OrderQuickSearchPanel onClose={() => setShowQuickSearch(false)} />}
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center gap-4">
          <Link to={ROUTES.orderList} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
            <ChevronLeft size={18} /> Orders
          </Link>
          <span className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-text!">
            <ClipboardList size={16} className="text-brand" /> Sales Order Details
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowQuickSearch(true)}
          title="Search sales orders"
          className="hidden md:flex items-center gap-2 w-64 text-sm text-text-faint rounded-md border border-input-border bg-input-bg px-3 py-1.5 hover:border-brand"
        >
          <Search size={14} /> Search
        </button>
        <Link to={ROUTES.orderList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm text-text!">
                      <span className="font-semibold">Ref.</span>
                      {data.refEditUrl && <EditPencil url={data.refEditUrl} title="Edit Ref." />}
                      <span>: {data.ref}</span>
                    </span>
                    <StatusBadge label={data.statusLabel} />
                  </span>
                  <div className="flex flex-wrap items-stretch gap-3">
                    <StatCard icon={FileText} tone="purple" label="Amount (Excl. Tax)" value={formatMoney(data.totalHt)} />
                    <StatCard icon={Percent} tone="green" label="VAT" value={formatMoney(data.totalVat)} />
                    <StatCard icon={Wallet} tone="blue" label="Amount (Inc. Tax)" value={formatMoney(data.totalTtc)} />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-faint">
                  <span className="font-medium">Ref. customer</span>
                  {data.refCustomerEditUrl && <EditPencil url={data.refCustomerEditUrl} title="Edit Ref. customer" />}
                  <span>: {data.refCustomer || <span className="text-text-faint">—</span>}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs text-text-faint">
                  <span className="font-medium flex items-center gap-1">
                    <Building2 size={12} /> Third-party:
                  </span>
                  {data.thirdPartyName && data.thirdPartySocid ? (
                    <Link to={ROUTES.customerDetail.replace(':id', String(data.thirdPartySocid))} className="text-brand hover:underline">
                      {data.thirdPartyName}
                    </Link>
                  ) : (
                    <span className="text-text-faint">—</span>
                  )}
                  {data.otherOrdersUrl && (
                    <span>
                      (
                      <a href={stripBackendPrefix(data.otherOrdersUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        Other orders
                      </a>
                      )
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs text-text-faint">
                  <span className="font-medium flex items-center gap-1">
                    <Briefcase size={12} /> Project
                  </span>
                  {data.projectEditUrl && <EditPencil url={data.projectEditUrl} title="Set project" />}
                  <span>
                    : {data.projectRef || <span className="text-text-faint">—</span>}
                    {data.projectLabel && ` — ${data.projectLabel}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {data.editUrl && (
                  <HeaderIconLink url={data.editUrl} title="Edit">
                    <Pencil size={16} />
                  </HeaderIconLink>
                )}
                {data.cloneUrl && (
                  <HeaderIconLink url={data.cloneUrl} title="Clone">
                    <Copy size={16} />
                  </HeaderIconLink>
                )}
                {data.deleteUrl && (
                  <HeaderIconLink url={data.deleteUrl} title="Delete" tone="danger">
                    <Trash2 size={16} />
                  </HeaderIconLink>
                )}
              </div>
            </div>
            <div className="border-t border-border">
              <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6">
                {TABS.map(({ key, label, icon: Icon }) => {
                  const badge = key === 'notes' ? data.notesBadge : key === 'documents' ? data.documentsBadge : key === 'agenda' ? data.agendaBadge : 0
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                        tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                      }`}
                    >
                      <Icon size={14} className="shrink-0" /> {label}
                      {badge > 0 && <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-danger-bg text-danger-fg text-[10px] font-bold">{badge}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'details' && <DetailsTab id={id} data={data} onRefresh={() => refetch()} onSwitchTab={setTab} />}
        {tab === 'contacts' && <ContactsTab id={id} />}
        {tab === 'shipments' && <ShipmentsTab id={id} data={data} />}
        {tab === 'consumption' && <ConsumptionTab id={id} />}
        {tab === 'notes' && <NotesTab id={id} />}
        {tab === 'documents' && <DocumentsTab id={id} />}
        {tab === 'agenda' && <EventsAgendaTab id={id} data={data} />}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: 'purple' | 'green' | 'blue'; label: string; value: string }) {
  const toneCls = { purple: 'bg-violet-500', green: 'bg-emerald-500', blue: 'bg-blue-500' }[tone]
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg text-white shrink-0 ${toneCls}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-faint truncate">{label}</p>
        <p className="text-sm font-bold text-text! mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function DetailsTab({ id, data, onRefresh, onSwitchTab }: { id: string | undefined; data: OrderDetailData; onRefresh: () => void; onSwitchTab: (tab: TabKey) => void }) {
  const [showEmailModal, setShowEmailModal] = useState(false)
  return (
    <div className="space-y-4">
      {showEmailModal && id && <SendOrderEmailModal id={id} orderRef={data.ref} onClose={() => setShowEmailModal(false)} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="!h-auto">
            <InfoRow label="Discounts" value={data.discountNote} />
            <InfoRow label="Order date" value={data.orderDate} />
            <InfoRow label="Planned delivery" value={data.plannedDelivery} />
            <InfoRow label="Shipping method" value={data.shippingMethod} />
            <InfoRow label="Channel" value={data.channel} />
            <InfoRow label="Incoterms" value={data.incoterms} />
          </Card>
          <Card className="!h-auto">
            <InfoRow label="Payment Terms" value={data.paymentTerms} />
            <InfoRow label="Payment Type" value={data.paymentType} />
            <InfoRow label="Currency" value={data.currencyLabel} />
            <InfoRow label="Availability delay" value={data.availabilityDelay} />
            <InfoRow label="Bank account" value={data.bankAccountLabel} />
            <InfoRow
              label="Stock Reserve"
              value={
                data.stockReserveEnabled === null ? (
                  '—'
                ) : (
                  <span className={data.stockReserveEnabled ? 'text-success-fg' : 'text-warning-fg'}>{data.stockReserveEnabled ? 'Enabled' : 'Disabled'}</span>
                )
              }
            />
          </Card>
        </div>
         <Card className="!h-auto !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp size={14} className="text-brand" />
            <h3 className="font-semibold text-text!">Margin Details</h3>
          </div>
          {data.marginRows.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No margin data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2 px-4">Margins</th>
                    <th className="font-medium py-2 px-3 text-right">Selling</th>
                    <th className="font-medium py-2 px-3 text-right">Cost</th>
                    <th className="font-medium py-2 px-4 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.marginRows.map((row) => (
                    <tr key={row.label} className={`border-b border-border last:border-0 ${row.label === 'Total Margin' ? 'font-semibold' : ''}`}>
                      <td className="py-2 px-4 text-text!">{row.label}</td>
                      <td className="py-2 px-3 text-right text-text-muted">{formatMoney(row.sellingPrice)}</td>
                      <td className="py-2 px-3 text-right text-text-muted">{formatMoney(row.costPrice)}</td>
                      <td className="py-2 px-4 text-right text-text!">{formatMoney(row.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Item Table</h3>
        </div>
        {data.lines.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No line items on this order.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">#</th>
                  <th className="font-medium py-2 px-3">Product / Service</th>
                  <th className="font-medium py-2 px-3 text-center">VAT</th>
                  <th className="font-medium py-2 px-3 text-right">Unit Price (Excl.)</th>
                  <th className="font-medium py-2 px-3 text-right">Unit Price (Incl.)</th>
                  <th className="font-medium py-2 px-3 text-center">Qty</th>
                  <th className="font-medium py-2 px-3 text-center">Disc.</th>
                  <th className="font-medium py-2 px-3 text-right">Cost Price</th>
                  <th className="font-medium py-2 px-3 text-right">Total (Incl.)</th>
                  <th className="font-medium py-2 px-3 text-center">Reserve</th>
                  <th className="font-medium py-2 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line, i) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="py-2 px-4 text-text-faint">{i + 1}</td>
                    <td className="py-2 px-3 text-text!">
                      {line.productId > 0 ? (
                        <Link to={ROUTES.productDetail.replace(':id', String(line.productId))} className="hover:text-brand hover:underline">
                          {line.productRef && <span className="font-medium">{line.productRef}</span>}
                          {line.productRef && line.productLabel && ' — '}
                          {line.productLabel}
                        </Link>
                      ) : (
                        <>
                          {line.productRef && <span className="font-medium">{line.productRef}</span>}
                          {line.productRef && line.productLabel && ' — '}
                          {line.productLabel || line.description || '—'}
                        </>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-text-muted">
                      {line.vatRate}% {line.vatCode && `(${line.vatCode})`}
                    </td>
                    <td className="py-2 px-3 text-right text-text-muted">{formatMoney(line.unitPriceExcl)}</td>
                    <td className="py-2 px-3 text-right text-text-muted">{formatMoney(line.unitPriceIncl)}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{line.qty}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{line.discountPercent > 0 ? `${line.discountPercent.toFixed(2)}%` : '—'}</td>
                    <td className="py-2 px-3 text-right text-text-muted">{formatMoney(line.costPrice)}</td>
                    <td className="py-2 px-3 text-right font-medium text-text!">{formatMoney(line.totalTtc)}</td>
                    <td className="py-2 px-3 text-center">{line.stockReserve && <Check size={14} className="inline text-success-fg" />}</td>
                    <td className="py-2 px-4 text-center">
                      {data.editUrl && (
                        <a href={stripBackendPrefix(data.editUrl)} target="_blank" rel="noreferrer" title="Open order to edit this line" className="inline-flex text-text-faint hover:text-text">
                          <MoreVertical size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.actions.length > 0 && (
        <Card className="!h-auto">
          <div className="flex flex-wrap gap-2">
            {data.actions.map((action) => {
              const danger = action.label === 'Cancel' || action.label === 'Delete'
              const actionBtnCls = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors ${
                danger ? 'bg-danger hover:opacity-90' : 'bg-brand hover:bg-brand-hover'
              }`
              // "Create shipment" points at the exact same real page
              // (expedition/shipment.php?id=X) our own Shipments -
              // Delivery Receipts tab already fetches — switching tabs
              // in-app is the correct destination, not a duplicate
              // external copy of a page this app already natively renders.
              if (action.label === 'Create shipment') {
                return (
                  <button key={action.label} type="button" onClick={() => onSwitchTab('shipments')} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              // "Send email" opens a native compose form instead of the
              // legacy page's own inline one — see SendOrderEmailModal.tsx.
              if (action.label === 'Send email') {
                return (
                  <button key={action.label} type="button" onClick={() => setShowEmailModal(true)} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              return (
                <a key={action.label} href={stripBackendPrefix(action.url)} target="_blank" rel="noreferrer" className={actionBtnCls}>
                  {action.label} <ExternalLink size={11} className="shrink-0 opacity-70" />
                </a>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <LinkedFilesCard id={id} data={data} />
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-brand" />
              <h3 className="font-semibold text-text!">Related Objects</h3>
            </div>
            {/* The real "Link to..." button opens a dropdown with 7 async,
                per-type search widgets (quotation/invoice/contract/etc,
                each its own select2 AJAX search) — not natively rebuilt
                here; this opens the real page where that flow already
                works, same treatment as Modify/Cancel/Add Event above. */}
            {id && (
              <a
                href={stripBackendPrefix(`/commande/card.php?id=${id}`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover"
              >
                Link to… <ExternalLink size={11} className="opacity-70" />
              </a>
            )}
          </div>
          {data.relatedObjects.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">None.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2 px-4">Type</th>
                    <th className="font-medium py-2 px-3">Ref.</th>
                    <th className="font-medium py-2 px-3">Date</th>
                    <th className="font-medium py-2 px-3 text-right">Amount</th>
                    <th className="font-medium py-2 px-3">Status</th>
                    <th className="font-medium py-2 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.relatedObjects.map((obj, i) => {
                    const nativeRoute = nativeRouteForRelatedObjectType(obj.type)
                    return (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 px-4 text-text-muted">{obj.type}</td>
                        <td className="py-2 px-3">
                          {nativeRoute ? (
                            <Link to={nativeRoute} title={`Open ${obj.type} in this app`} className="text-brand hover:underline">
                              {obj.ref}
                            </Link>
                          ) : (
                            obj.ref
                          )}
                        </td>
                        <td className="py-2 px-3 text-text-muted">{obj.date}</td>
                        <td className="py-2 px-3 text-right text-text-muted">{formatMoney(obj.amount)}</td>
                        <td className="py-2 px-3 text-text-muted">{obj.statusLabel}</td>
                        <td className="py-2 px-4 text-center">
                          {obj.dellinkUrl && (
                            <a
                              href={stripBackendPrefix(obj.dellinkUrl)}
                              target="_blank"
                              rel="noreferrer"
                              title="Remove link"
                              className="inline-flex text-text-faint hover:text-danger"
                            >
                              <Unlink size={14} />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-brand" />
            <h3 className="font-semibold text-text!">Latest linked events</h3>
          </div>
          <button type="button" onClick={onRefresh} title="Refresh" className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <RefreshCw size={13} />
          </button>
        </div>
        {data.linkedEvents.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No events recorded for this order yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Ref.</th>
                  <th className="font-medium py-2 px-3">Date</th>
                  <th className="font-medium py-2 px-3">By</th>
                  <th className="font-medium py-2 px-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {data.linkedEvents.map((event, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {/* No link out to the real event's PHP page here — this
                        app's own Agenda area (see agenda.queries.ts) is a
                        local-only mock with no real events behind it, so
                        linking there would show a page that doesn't
                        actually contain the real event being referenced.
                        Honest plain text beats a link to the wrong place. */}
                    <td className="py-2 px-4 text-text!">{event.ref}</td>
                    <td className="py-2 px-3 text-text-muted whitespace-nowrap">{event.date}</td>
                    <td className="py-2 px-3 text-text-muted">
                      <EventByAvatar name={event.by} />
                    </td>
                    <td className="py-2 px-4 text-text-muted">{event.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// The real `.deletefilelink` href only ever lands on document.php's own
// confirmation box (action=deletefile) — reading
// core/actions_linkedfiles.inc.php directly shows the actual file removal
// only happens on action=confirm_deletefile&confirm=yes. Since we render
// our own window.confirm() above in place of that box, we go straight to
// the real final action instead of fetching (and discarding) the
// intermediate confirmation page — the previous version silently never
// deleted anything.
async function deleteOrderDocument(deleteUrl: string, name: string, refetch: () => void) {
  if (!deleteUrl) return
  if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
  const finalUrl = deleteUrl.replace('action=deletefile', 'action=confirm_deletefile') + '&confirm=yes'
  await fetch(stripBackendPrefix(finalUrl), { credentials: 'same-origin' })
  refetch()
}

function LinkedFilesCard({ id, data }: { id: string | undefined; data: OrderDetailData }) {
  const { data: docs, isLoading, isError, error, refetch } = useOrderDocuments(id)
  const generateDoc = useGenerateOrderDoc(id)
  const { docGenOptions } = data
  const [model, setModel] = useState(docGenOptions.modelOptions[0]?.value ?? '')
  const [langId, setLangId] = useState(docGenOptions.defaultLang)

  function handleGenerate() {
    if (!model) return
    generateDoc.mutate({ token: docGenOptions.token, model, langId })
  }

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Paperclip size={14} className="text-brand" />
        <h3 className="font-semibold text-text!">Linked files</h3>
      </div>
      <div className="p-4 space-y-4">
        {docGenOptions.modelOptions.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Doc template</span>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
                {docGenOptions.modelOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Language</span>
              <select value={langId} onChange={(e) => setLangId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 max-w-40">
                {docGenOptions.langOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={generateDoc.isPending || !model}
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {generateDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <FileCog size={13} />} Generate
            </button>
          </div>
        )}
        {generateDoc.isError && <p className="text-xs text-danger">Could not generate the document — please try again.</p>}

        {isLoading ? (
          <LegacyLoadingCard label="Loading documents…" />
        ) : isError || !docs ? (
          <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : docs.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-4">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc.url} className="flex items-center justify-between gap-2 text-sm">
                <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand hover:underline truncate">
                  <FileText size={13} className="shrink-0" /> {doc.name}
                </a>
                <span className="flex items-center gap-2 text-xs text-text-faint shrink-0">
                  {doc.size} · {doc.date}
                  <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" title="Preview" className="text-text-faint hover:text-text">
                    <Eye size={13} />
                  </a>
                  {doc.deleteUrl && (
                    <button type="button" title="Delete" onClick={() => deleteOrderDocument(doc.deleteUrl, doc.name, refetch)} className="text-text-faint hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

function ContactsTab({ id }: { id: string | undefined }) {
  const [company, setCompany] = useState<string | undefined>(undefined)
  const { data, isLoading, isError, error, refetch } = useOrderContacts(id, company)
  const addContact = useAddOrderContact(id)

  const [userid, setUserid] = useState('')
  const [type, setType] = useState('')
  const [contactid, setContactid] = useState('')
  const [typecontact, setTypecontact] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  const { rows, formOptions } = data
  const effectiveCompany = company ?? formOptions.selectedCompanyId

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users size={14} className="text-brand" />
        <h3 className="font-semibold text-text!">Contacts / Addresses</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Nature of Contact</th>
              <th className="font-medium py-2 px-3">Third-Party</th>
              <th className="font-medium py-2 px-3">Users/Contacts/Addresses</th>
              <th className="font-medium py-2 px-3">Contact Type</th>
              <th className="font-medium py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2 px-4 text-text! whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-text-faint" /> Users
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
                  <Users size={13} className="text-text-faint" /> Third-Party Contacts
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
              <th className="font-medium py-2 px-4">Nature of Contact</th>
              <th className="font-medium py-2 px-3">Third-party</th>
              <th className="font-medium py-2 px-3">Users/Contacts/Addresses</th>
              <th className="font-medium py-2 px-3">Contact type</th>
              <th className="font-medium py-2 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-text-faint italic">
                  No contacts have been assigned to this order yet.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 px-4 text-text!">{row.nature}</td>
                  <td className="py-2 px-3 text-text-muted">{row.thirdParty}</td>
                  <td className="py-2 px-3 text-text-muted">{row.contact}</td>
                  <td className="py-2 px-3 text-text-muted">{row.contactType}</td>
                  <td className="py-2 px-4 text-text-muted">{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ShipmentsTab({ id, data }: { id: string | undefined; data: OrderDetailData }) {
  const { data: shipmentData, isLoading, isError, error, refetch } = useOrderShipmentStock(id)
  const [warehouse, setWarehouse] = useState('')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="!h-auto lg:col-span-2">
          <InfoRow label="Discounts" value={data.discountNote} />
          <InfoRow label="Date" value={data.orderDate} />
          <InfoRow label="Planned delivery" value={data.plannedDelivery} />
          <InfoRow label="Shipping method" value={data.shippingMethod} />
          <InfoRow label="Availability delay" value={data.availabilityDelay} />
          <InfoRow label="Source" value={data.channel} />
          <InfoRow label="Incoterms" value={data.incoterms} />
        </Card>
        <div className="flex flex-col gap-3">
          <StatCard icon={FileText} tone="purple" label="Amount (Excl. Tax)" value={formatMoney(data.totalHt)} />
          <StatCard icon={Percent} tone="green" label="VAT" value={formatMoney(data.totalVat)} />
          <StatCard icon={Wallet} tone="blue" label="Amount (Inc. Tax)" value={formatMoney(data.totalTtc)} />
        </div>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Truck size={14} className="text-brand" />
          <h3 className="font-semibold text-text!">Stock Details</h3>
        </div>
        {isLoading ? (
          <LegacyLoadingCard label="Loading stock details…" />
        ) : isError || !shipmentData ? (
          <LegacyErrorCard title="Couldn't load stock details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : shipmentData.stockRows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No lines to ship.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Description</th>
                  <th className="font-medium py-2 px-3 text-center">Qty ordered</th>
                  <th className="font-medium py-2 px-3 text-center">Qty shipped</th>
                  <th className="font-medium py-2 px-3 text-center">Remain to ship</th>
                  <th className="font-medium py-2 px-4 text-center">Real Stock</th>
                </tr>
              </thead>
              <tbody>
                {shipmentData.stockRows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4 text-text!">{row.description}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.qtyOrdered}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.qtyShipped}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.remainToShip}</td>
                    <td className="py-2 px-4 text-center text-text-muted">{row.realStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Real form: GET expedition/card.php?action=create&origin=commande&
          origin_id=X&entrepot_id=Y — a safe navigation to the actual
          shipment-creation review page, not itself a destructive submit. */}
      {shipmentData && shipmentData.createForm.warehouseOptions.length > 0 && id && (
        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
            <Truck size={14} className="text-brand" /> Create Shipment
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Source warehouse</span>
              <select
                value={warehouse || shipmentData.createForm.defaultWarehouseId}
                onChange={(e) => setWarehouse(e.target.value)}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 min-w-48"
              >
                {shipmentData.createForm.warehouseOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <a
              href={stripBackendPrefix(
                `/expedition/card.php?action=create&shipping_method_id=&origin=commande&origin_id=${id}&projectid=&entrepot_id=${warehouse || shipmentData.createForm.defaultWarehouseId}`,
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover"
            >
              Create Shipment <ExternalLink size={11} className="opacity-70" />
            </a>
          </div>
        </Card>
      )}
    </div>
  )
}

function ConsumptionTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderConsumption(id)
  const declareConsumption = useDeclareConsumption(id)

  const [product, setProduct] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [nbpiece, setNbpiece] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [label, setLabel] = useState('')
  const [eatby, setEatby] = useState('')
  const [sellby, setSellby] = useState('')
  const [formError, setFormError] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading stock consumptions…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load stock consumptions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  const { formOptions } = data
  const effectiveLabel = label || formOptions.defaultLabel

  function handleDeclare() {
    setFormError('')
    if (!warehouse || !product || !nbpiece.trim() || !batchNumber.trim()) {
      setFormError('Warehouse, Product, Number of units and Lot/Serial number are required.')
      return
    }
    declareConsumption.mutate(
      { token: formOptions.token, product, id_entrepot: warehouse, nbpiece, batch_number: batchNumber, label: effectiveLabel, eatby, sellby },
      {
        onSuccess: () => {
          setNbpiece('')
          setBatchNumber('')
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
          <PackageMinus size={14} className="text-brand" /> Consumptions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Warehouse*</span>
            <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={selectCls}>
              <option value="">Select a warehouse</option>
              {formOptions.warehouseOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Product*</span>
            <select value={product} onChange={(e) => setProduct(e.target.value)} className={selectCls}>
              <option value="">Select Predefined Product/services</option>
              {formOptions.productOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Number of units*</span>
            <input value={nbpiece} onChange={(e) => setNbpiece(e.target.value)} className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Lot/Serial number*</span>
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Label of movement</span>
            <input value={effectiveLabel} onChange={(e) => setLabel(e.target.value)} className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Eat-by date</span>
            <input value={eatby} onChange={(e) => setEatby(e.target.value)} placeholder="mm/dd/yyyy" className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Sell-by date</span>
            <input value={sellby} onChange={(e) => setSellby(e.target.value)} placeholder="mm/dd/yyyy" className={selectCls} />
          </label>
        </div>
        {(formError || declareConsumption.isError) && (
          <p className="text-xs text-danger mt-3">
            {formError || (declareConsumption.error instanceof Error ? declareConsumption.error.message : 'Could not declare this consumption.')}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={declareConsumption.isPending}
            onClick={handleDeclare}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            Declare
          </button>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">List of Consumption (For this Order)</h3>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No consumption declared for this order yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Ref.</th>
                  <th className="font-medium py-2 px-3">Date</th>
                  <th className="font-medium py-2 px-3">Product ref.</th>
                  <th className="font-medium py-2 px-3 text-center">Lot/Serial</th>
                  <th className="font-medium py-2 px-3">Warehouse</th>
                  <th className="font-medium py-2 px-3">Inv./Mov. code</th>
                  <th className="font-medium py-2 px-3">Label of movement</th>
                  <th className="font-medium py-2 px-3">Origin</th>
                  <th className="font-medium py-2 px-4 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4 text-text!">{row.ref}</td>
                    <td className="py-2 px-3 text-text-muted whitespace-nowrap">{row.date}</td>
                    <td className="py-2 px-3 text-text-muted">{row.productRef}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.lotSerial}</td>
                    <td className="py-2 px-3 text-text-muted">{row.warehouse}</td>
                    <td className="py-2 px-3 text-text-muted">{row.invMovCode}</td>
                    <td className="py-2 px-3 text-text-muted">{row.labelOfMovement}</td>
                    <td className="py-2 px-3 text-text-muted">{row.origin}</td>
                    <td className="py-2 px-4 text-right text-text-muted">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderNotes(id)
  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return (
    <Card className="!h-auto">
      <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
        <StickyNote size={14} className="text-brand" /> Notes
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm font-medium text-text!">Note (public)</span>
            {data.notePublicEditUrl && <EditPencil url={data.notePublicEditUrl} title="Edit public note" />}
          </div>
          <p className="text-sm text-text! whitespace-pre-wrap">{data.notePublic || <span className="text-text-faint italic">No public note.</span>}</p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm font-medium text-text!">Note (private)</span>
            {data.notePrivateEditUrl && <EditPencil url={data.notePrivateEditUrl} title="Edit private note" />}
          </div>
          <p className="text-sm text-text! whitespace-pre-wrap">{data.notePrivate || <span className="text-text-faint italic">No private note.</span>}</p>
        </div>
      </div>
    </Card>
  )
}

function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderDocuments(id)
  const { data: meta, isLoading: metaLoading, isError: metaIsError, error: metaError, refetch: refetchMeta } = useOrderDocumentsPageMeta(id)
  const uploadDoc = useUploadOrderDocument(id)
  const linkDoc = useLinkOrderDocument(id)

  const [file, setFile] = useState<File | null>(null)
  const [useMask, setUseMask] = useState(true)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  if (isLoading || metaLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (metaIsError || !meta) return <LegacyErrorCard title="Couldn't load documents" message={metaError instanceof Error ? metaError.message : 'Unknown error.'} onRetry={() => refetchMeta()} />

  function handleUpload() {
    if (!file) return
    uploadDoc.mutate(
      { token: meta!.attachToken, file, savingDocMask: meta!.savingDocMask, useMask },
      { onSuccess: () => setFile(null) },
    )
  }

  function handleLink() {
    if (!linkUrl.trim()) return
    linkDoc.mutate(
      { token: meta!.attachToken, link: linkUrl.trim(), label: linkLabel.trim() },
      { onSuccess: () => { setLinkUrl(''); setLinkLabel('') } },
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <InfoRow label="Number of attached files/documents" value={String(meta.attachedCount)} />
        <InfoRow label="Total size of attached files/documents" value={meta.totalSize} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Attach a new file/document</h3>
          <div className="space-y-3">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-surface-hover file:text-text hover:file:bg-border"
            />
            {meta.savingDocMask && (
              <label className="flex items-start gap-2 text-xs text-text-faint">
                <input type="checkbox" checked={useMask} onChange={(e) => setUseMask(e.target.checked)} className="mt-0.5" />
                <span>
                  Save file on server with name "<b className="text-text-muted">{meta.savingDocMask}</b>" (otherwise original filename)
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={!file || uploadDoc.isPending}
              onClick={handleUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {uploadDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Upload size={13} />} Upload
            </button>
            {uploadDoc.isError && <p className="text-xs text-danger">Could not upload the file — please try again.</p>}
            {uploadDoc.isSuccess && <p className="text-xs text-success">File uploaded.</p>}
          </div>
        </Card>

        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Link a new file/document</h3>
          <div className="space-y-3">
            <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL to link" className={selectCls} />
            <input type="text" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className={selectCls} />
            <button
              type="button"
              disabled={!linkUrl.trim() || linkDoc.isPending}
              onClick={handleLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {linkDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Link2 size={13} />} Link
            </button>
            {linkDoc.isError && <p className="text-xs text-danger">Could not link the file — please try again.</p>}
            {linkDoc.isSuccess && <p className="text-xs text-success">Link added.</p>}
          </div>
        </Card>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Attached files and documents</h3>
        </div>
        <div className="p-4">
          {data.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No documents uploaded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Document</th>
                  <th className="font-medium py-2 pr-3">Size</th>
                  <th className="font-medium py-2">Date</th>
                  <th className="font-medium py-2 pl-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((doc) => (
                  <tr key={doc.url} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {doc.name}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-text-muted">{doc.size}</td>
                    <td className="py-2 text-text-muted">{doc.date}</td>
                    <td className="py-2 pl-3">
                      <div className="flex items-center justify-center gap-2">
                        <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" title="Preview" className="text-text-faint hover:text-text">
                          <Eye size={14} />
                        </a>
                        {doc.deleteUrl && (
                          <button type="button" title="Delete" onClick={() => deleteOrderDocument(doc.deleteUrl, doc.name, refetch)} className="text-text-faint hover:text-danger">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Linked files and documents</h3>
        </div>
        <div className="p-4">
          {meta.links.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No registered links.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Links</th>
                  <th className="font-medium py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {meta.links.map((link, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {link.label}
                      </a>
                    </td>
                    <td className="py-2 text-text-muted">{link.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function EventsAgendaTab({ id, data }: { id: string | undefined; data: OrderDetailData }) {
  const { data: agenda, isLoading, isError, error, refetch } = useOrderAgendaPage(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !agenda) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <InfoRow label="Created by" value={<EventByAvatar name={agenda.createdBy} />} />
        <InfoRow label="Creation date" value={agenda.creationDate} />
        <InfoRow label="Latest modification date" value={agenda.latestModificationDate} />
        <InfoRow label="Validated by" value={<EventByAvatar name={agenda.validatedBy} />} />
        <InfoRow label="Validation date" value={agenda.validationDate} />
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-brand" />
            <h3 className="font-semibold text-text!">Events on order</h3>
          </div>
          {data.addEventUrl && (
            <a
              href={stripBackendPrefix(data.addEventUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover"
            >
              <Plus size={12} /> Add Event
            </a>
          )}
        </div>
        {agenda.events.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No events recorded for this order yet.</p>
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
                {agenda.events.map((event, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4">
                      {event.url ? (
                        <a href={stripBackendPrefix(event.url)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {event.ref}
                        </a>
                      ) : (
                        <span className="text-text!">{event.ref}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-text-muted whitespace-nowrap">{event.date}</td>
                    <td className="py-2 px-3 text-text-muted">
                      <EventByAvatar name={event.owner} />
                    </td>
                    <td className="py-2 px-3 text-text-muted">{event.label}</td>
                    <td className="py-2 px-3">
                      {event.relatedObjectUrl ? (
                        <a href={stripBackendPrefix(event.relatedObjectUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {event.relatedObjectRef}
                        </a>
                      ) : (
                        <span className="text-text-muted">{event.relatedObjectRef || '—'}</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center text-text-muted">{event.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
