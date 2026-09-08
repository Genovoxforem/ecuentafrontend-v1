import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  X,
  FileText,
  Paperclip,
  Copy,
  Trash2,
  Building2,
  Briefcase,
  Check,
  Pencil,
  CalendarClock,
  Lock,
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
  Plus,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useOrderDetail,
  useOrderDocuments,
  useGenerateOrderDoc,
  useRestoreOrderToDraft,
  useValidateOrder,
  useReopenOrder,
  useClassifyOrderDelivered,
  useSetOrderBilled,
  useCloneOrder,
  useCancelOrder,
  useDeleteOrder,
} from '../orderDetail.queries'
import type { OrderDetail as OrderDetailData } from '../orderCardParser'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { SendOrderEmailModal } from './SendOrderEmailModal'
import { AddOrderEventModal } from './AddOrderEventModal'
import { OrderQuickSearchPanel } from './OrderQuickSearchPanel'
import { InfoRow, EditPencil, EventByAvatar, StatCard, deleteOrderDocument, TABS, type TabKey } from './OrderDetailShared'

// Non-default tabs (Contacts, Shipments, Consumption, Notes, Documents,
// Events/Agenda) are lazy-loaded from a separate chunk - only the active
// tab's code downloads, cutting the initial OrderDetail chunk from ~71KB
// to ~35KB. DetailsTab stays inline (it's the default, always visible).
const LazyTabRenderer = lazy(() => import('./OrderDetailTabs').then((m) => ({ default: m.LazyTabRenderer })))

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

// Header icon links (Edit/Clone/Delete) and the bottom action-button row
// share this same "open the real backend URL in a new tab" treatment — see
// orderCardParser.ts's parseActionButtons() comment for why mutating,
// modal-confirm-only actions fall back to the base order page instead of a
// fabricated POST.
function HeaderIconLink({ url, title, tone, children }: { url: string; title: string; tone?: 'danger'; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text disabled:opacity-50 ${tone === 'danger' ? 'hover:bg-danger-bg hover:text-danger-fg' : ''}`}
    >
      {children}
    </button>
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

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('details')
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const { data, isLoading, isError, error, refetch } = useOrderDetail(id)
  const restoreToDraft = useRestoreOrderToDraft(id)
  const validateOrder = useValidateOrder(id)
  const reopenOrder = useReopenOrder(id)
  const cloneOrder = useCloneOrder(id)
  const deleteOrder = useDeleteOrder(id)
  const classifyDelivered = useClassifyOrderDelivered(id)
  const setBilled = useSetOrderBilled(id)
  const cancelOrder = useCancelOrder(id)

  function handleModify() {
    if (!window.confirm(`Are you sure you want to restore order ${data?.ref ?? ''} to draft status?`)) return
    restoreToDraft.mutate()
  }
  function handleValidate() {
    if (!window.confirm(`Are you sure you want to validate this order under name ${data?.ref ?? ''}?`)) return
    validateOrder.mutate()
  }
  function handleReopen() {
    reopenOrder.mutate()
  }
  function handleClone() {
    if (!window.confirm(`Clone order ${data?.ref ?? ''} into a new draft?`)) return
    cloneOrder.mutate(data?.thirdPartySocid ?? null, {
      onSuccess: (newId) => newId && navigate(ROUTES.orderDetail.replace(':id', newId)),
    })
  }
  function handleDelete() {
    if (!window.confirm(`Delete order ${data?.ref ?? ''}? This cannot be undone.`)) return
    deleteOrder.mutate(undefined, { onSuccess: () => navigate(ROUTES.orderList) })
  }
  function handleClassifyDelivered() {
    if (!window.confirm(`Are you sure you want to set this order to delivered? Once an order is delivered, it can be set to billed.`)) return
    classifyDelivered.mutate()
  }
  function handleSetBilled(billed: boolean) {
    if (billed && !window.confirm(`Classify order ${data?.ref ?? ''} as billed?`)) return
    if (!billed && !window.confirm(`Classify order ${data?.ref ?? ''} as unbilled?`)) return
    setBilled.mutate(billed)
  }
  function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel')) return
    cancelOrder.mutate()
  }

  const orderActions = {
    onModify: handleModify,
    onValidate: handleValidate,
    onReopen: handleReopen,
    onClone: handleClone,
    onDelete: handleDelete,
    onClassifyDelivered: handleClassifyDelivered,
    onSetBilled: handleSetBilled,
    onCancel: handleCancel,
    pending: {
      modify: restoreToDraft.isPending,
      validate: validateOrder.isPending,
      reopen: reopenOrder.isPending,
      clone: cloneOrder.isPending,
      delete: deleteOrder.isPending,
      classifyDelivered: classifyDelivered.isPending,
      setBilled: setBilled.isPending,
      cancel: cancelOrder.isPending,
    },
  }

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading sales order..." />
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
                  {data.otherOrdersUrl && data.thirdPartySocid && (
                    <span>
                      (
                      <Link to={`${ROUTES.orderList}?customerId=${data.thirdPartySocid}`} className="text-brand hover:underline">
                        Other orders
                      </Link>
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
                <HeaderIconButton onClick={handleModify} title="Edit (restores this order to draft status)" disabled={orderActions.pending.modify}>
                  <Pencil size={16} />
                </HeaderIconButton>
                <HeaderIconButton onClick={handleClone} title="Clone" disabled={orderActions.pending.clone}>
                  <Copy size={16} />
                </HeaderIconButton>
                <HeaderIconButton onClick={handleDelete} title="Delete" tone="danger" disabled={orderActions.pending.delete}>
                  <Trash2 size={16} />
                </HeaderIconButton>
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
        {tab === 'details' && <DetailsTab id={id} data={data} onRefresh={() => refetch()} onSwitchTab={setTab} actions={orderActions} />}
        {tab !== 'details' && (
          <Suspense fallback={<LegacyLoadingCard label="Loading..." />}>
            <LazyTabRenderer tab={tab} id={id} data={data} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

interface OrderActions {
  onModify: () => void
  onValidate: () => void
  onReopen: () => void
  onClone: () => void
  onDelete: () => void
  onClassifyDelivered: () => void
  onSetBilled: (billed: boolean) => void
  onCancel: () => void
  pending: {
    modify: boolean
    validate: boolean
    reopen: boolean
    clone: boolean
    delete: boolean
    classifyDelivered: boolean
    setBilled: boolean
    cancel: boolean
  }
}

function DetailsTab({
  id,
  data,
  onRefresh,
  onSwitchTab,
  actions,
}: {
  id: string | undefined
  data: OrderDetailData
  onRefresh: () => void
  onSwitchTab: (tab: TabKey) => void
  actions: OrderActions
}) {
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  return (
    <div className="space-y-4">
      {showEmailModal && id && <SendOrderEmailModal id={id} orderRef={data.ref} onClose={() => setShowEmailModal(false)} />}
      {showAddEventModal && id && <AddOrderEventModal id={id} socid={data.thirdPartySocid} onClose={() => setShowAddEventModal(false)} />}
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
                      <button
                        type="button"
                        onClick={actions.onModify}
                        disabled={actions.pending.modify}
                        title="Restore order to draft to edit this line"
                        className="inline-flex text-text-faint hover:text-text disabled:opacity-50"
                      >
                        <MoreVertical size={14} />
                      </button>
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
              const actionBtnCls = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors disabled:opacity-60 ${
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
              // "Modify" really means "restore this Validated order to
              // draft status" (same confirm_modif action the header's Edit
              // pencil fires) - see orderDetail.queries.ts.
              if (action.label === 'Modify') {
                return (
                  <button key={action.label} type="button" onClick={actions.onModify} disabled={actions.pending.modify} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              if (action.label === 'Validate') {
                return (
                  <button key={action.label} type="button" onClick={actions.onValidate} disabled={actions.pending.validate} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              if (action.label === 'Re-Open') {
                return (
                  <button key={action.label} type="button" onClick={actions.onReopen} disabled={actions.pending.reopen} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              if (action.label === 'Classify delivered') {
                return (
                  <button key={action.label} type="button" onClick={actions.onClassifyDelivered} disabled={actions.pending.classifyDelivered} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              if (action.label === 'Classify Billed' || action.label === "Classify 'Unbilled'") {
                const billed = action.label === 'Classify Billed'
                return (
                  <button key={action.label} type="button" onClick={() => actions.onSetBilled(billed)} disabled={actions.pending.setBilled} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              if (action.label === 'Clone') {
                return (
                  <button key={action.label} type="button" onClick={actions.onClone} disabled={actions.pending.clone} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              if (action.label === 'Cancel') {
                return (
                  <button key={action.label} type="button" onClick={actions.onCancel} disabled={actions.pending.cancel} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              if (action.label === 'Delete') {
                return (
                  <button key={action.label} type="button" onClick={actions.onDelete} disabled={actions.pending.delete} className={actionBtnCls}>
                    {action.label}
                  </button>
                )
              }
              // "Create contract"/"Create Invoice" convert this order's
              // real lines into a new Contract/Invoice, exactly like the
              // legacy contrat/index_v2.php / compta/facture/card.php
              // conversion buttons - real in-app pages, not a PHP link.
              if (action.label === 'Create contract' && id) {
                return (
                  <Link key={action.label} to={ROUTES.orderCreateContract.replace(':id', id)} className={actionBtnCls}>
                    {action.label}
                  </Link>
                )
              }
              if (action.label === 'Create Invoice' && id) {
                return (
                  <Link key={action.label} to={ROUTES.orderCreateInvoice.replace(':id', id)} className={actionBtnCls}>
                    {action.label}
                  </Link>
                )
              }
              // Any other real backend action this app hasn't wired yet
              // (e.g. workflow buttons gated behind config flags this
              // deployment doesn't use) is shown honestly disabled rather
              // than silently dropped or linked out to PHP.
              return (
                <span
                  key={action.label}
                  title="This action isn't available in this app yet."
                  className={`${actionBtnCls} bg-neutral-bg! text-neutral-fg cursor-not-allowed`}
                >
                  <Lock size={11} className="opacity-70" /> {action.label}
                </span>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                Link to... <ExternalLink size={11} className="opacity-70" />
              </a>
            )}
          </div>
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
                {data.relatedObjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-2 px-4 text-text-faint italic">
                      None.
                    </td>
                  </tr>
                ) : (
                  data.relatedObjects.map((obj, i) => {
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-brand" />
            <h3 className="font-semibold text-text!">Latest linked events</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowAddEventModal(true)}
              title="Add Event"
              className="p-1.5 rounded-md bg-brand text-white hover:bg-brand-hover"
            >
              <Plus size={13} />
            </button>
            <button type="button" onClick={onRefresh} title="Refresh" className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
              <RefreshCw size={13} />
            </button>
          </div>
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
          <LegacyLoadingCard label="Loading documents..." />
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
                  {doc.size} - {doc.date}
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
