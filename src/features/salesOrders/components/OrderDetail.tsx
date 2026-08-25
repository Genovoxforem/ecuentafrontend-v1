import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, X, FileText, StickyNote, Paperclip, Copy, Trash2, Building2, Briefcase, TriangleAlert } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useOrderDetail, useOrderNotes, useOrderDocuments } from '../orderDetail.queries'
import type { OrderDetail as OrderDetailData } from '../orderCardParser'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'

// Native rebuild of commande/card.php?id=X + note.php + document.php — see
// orderCardParser.ts's header comment for why this scrapes real HTML rather
// than calling a REST endpoint (no order-detail API exists on this
// backend), and for the confirmed real limitation that per-line product
// detail isn't available from this page for an already-created order.

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

const TABS = [
  { key: 'details', label: 'Details', icon: FileText },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked files', icon: Paperclip },
] as const
type TabKey = (typeof TABS)[number]['key']

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('details')
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
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.orderList} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> Orders
        </Link>
        <Link to={ROUTES.orderList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-text!">{data.ref}</h2>
                  <StatusBadge label={data.statusLabel} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-faint">
                  {data.thirdPartyName && data.thirdPartySocid && (
                    <Link to={ROUTES.customerDetail.replace(':id', String(data.thirdPartySocid))} className="flex items-center gap-1 hover:text-brand">
                      <Building2 size={12} /> {data.thirdPartyName}
                    </Link>
                  )}
                  {data.projectRef && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={12} /> {data.projectRef}
                      {data.projectLabel && ` — ${data.projectLabel}`}
                    </span>
                  )}
                  {data.refCustomer && <span>Ref. customer: {data.refCustomer}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {data.cloneUrl && (
                  <a
                    href={stripBackendPrefix(data.cloneUrl)}
                    target="_blank"
                    rel="noreferrer"
                    title="Clone"
                    className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text"
                  >
                    <Copy size={16} />
                  </a>
                )}
                {data.deleteUrl && (
                  <a
                    href={stripBackendPrefix(data.deleteUrl)}
                    target="_blank"
                    rel="noreferrer"
                    title="Delete"
                    className="p-1.5 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <Trash2 size={16} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-border">
              <div>
                <p className="text-xs text-text-faint uppercase tracking-wide">Amount (excl. tax)</p>
                <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.totalHt)}</p>
              </div>
              <div>
                <p className="text-xs text-text-faint uppercase tracking-wide">VAT</p>
                <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.totalVat)}</p>
              </div>
              <div>
                <p className="text-xs text-text-faint uppercase tracking-wide">Amount (incl. tax)</p>
                <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.totalTtc)}</p>
              </div>
            </div>

            <div className="border-t border-border">
              <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6">
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
        {tab === 'details' && <DetailsTab data={data} />}
        {tab === 'notes' && <NotesTab id={id} />}
        {tab === 'documents' && <DocumentsTab id={id} />}
      </div>
    </div>
  )
}

function DetailsTab({ data }: { data: OrderDetailData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="!h-auto">
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
      </Card>
      {data.discountNote && (
        <Card className="!h-auto lg:col-span-2">
          <p className="text-sm text-text-muted italic">{data.discountNote}</p>
        </Card>
      )}
      {/* Real limitation, not a frontend gap: commande/card.php's own "Item
          Table" component never renders or fetches existing line items for
          an already-created order (confirmed by reading order_handler.php —
          its only read-style action is search_products, for the add-line
          autocomplete). Only the order's own aggregate totals above are
          real data available from this page. */}
      <Card className="!h-auto lg:col-span-2">
        <div className="flex items-start gap-2 text-xs text-text-faint">
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />
          <span>Line-item detail (products, quantities, unit prices) isn't available from this backend page for an already-created order — only the order's own totals above are.</span>
        </div>
      </Card>
    </div>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderNotes(id)
  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
          <StickyNote size={14} className="text-brand" /> Public Note
        </h3>
        <p className="text-sm text-text! whitespace-pre-wrap">{data.notePublic || <span className="text-text-faint italic">No public note.</span>}</p>
      </Card>
      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
          <StickyNote size={14} className="text-brand" /> Private Note
        </h3>
        <p className="text-sm text-text! whitespace-pre-wrap">{data.notePrivate || <span className="text-text-faint italic">No private note.</span>}</p>
      </Card>
    </div>
  )
}

function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderDocuments(id)
  if (isLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return (
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}
