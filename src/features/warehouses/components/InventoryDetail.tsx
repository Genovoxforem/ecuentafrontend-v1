import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, X, ClipboardList, Send, Pencil, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useInventoryDetail } from '../warehouseExtras.queries'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'

// Native rebuild of product/inventory/card.php?id=X — see
// warehouseHtmlParser.ts's parseInventoryCardDocument for how the real
// fields/action links were found (no REST API under product/inventory/).

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

function ActionLink({ href, icon: Icon, label, danger }: { href: string; icon: typeof Send; label: string; danger?: boolean }) {
  if (!href) return null
  return (
    <a
      href={stripBackendPrefix(href)}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-hover ${danger ? 'text-danger hover:bg-danger-bg' : 'text-text'}`}
    >
      <Icon size={14} /> {label}
    </a>
  )
}

export function InventoryDetail() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useInventoryDetail(id)

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading inventory…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load inventory" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.inventoryList} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> Inventories
        </Link>
        <Link to={ROUTES.inventoryList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-11 h-10 rounded-xl bg-brand/10 text-brand shrink-0">
                  <ClipboardList size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-text!">{data.label || `Inventory #${data.id}`}</h2>
                  {data.statusLabel && <span className="text-xs text-text-faint">{data.statusLabel}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ActionLink href={data.emailUrl} icon={Send} label="Send Email" />
                <ActionLink href={data.modifyUrl} icon={Pencil} label="Modify" />
                <ActionLink href={data.validateUrl} icon={CheckCircle2} label="Validate" />
                <ActionLink href={data.backToDraftUrl} icon={RotateCcw} label="Back to Draft" />
                <ActionLink href={data.deleteUrl} icon={Trash2} label="Delete" danger />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        <Card className="!h-auto">
          <InfoRow label="Label" value={data.label} />
          <InfoRow
            label="Warehouse"
            value={
              data.warehouseId ? (
                <a href={`/product/stock/card.php?id=${data.warehouseId}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  {data.warehouseLabel}
                </a>
              ) : (
                ''
              )
            }
          />
          <InfoRow label="Product" value={data.productLabel} />
          <InfoRow label="Value date" value={data.valueDate} />
        </Card>

        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-text!">Related Objects</h3>
          </div>
          <div className="p-4 overflow-x-auto">
            {data.relatedObjects.length === 0 ? (
              <p className="text-sm text-text-faint italic py-4 text-center">None</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2 pr-3">Type</th>
                    <th className="font-medium py-2 pr-3">Ref.</th>
                    <th className="font-medium py-2 pr-3">Date</th>
                    <th className="font-medium py-2 pr-3">Amount (Excl.)</th>
                    <th className="font-medium py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.relatedObjects.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 text-text-muted">{r.type}</td>
                      <td className="py-2 pr-3 text-text!">{r.ref}</td>
                      <td className="py-2 pr-3 text-text-muted">{r.date}</td>
                      <td className="py-2 pr-3 text-text-muted">{r.amount}</td>
                      <td className="py-2 text-text-muted">{r.statusLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-text!">Latest 10 linked events</h3>
          </div>
          <div className="p-4 overflow-x-auto">
            {data.linkedEvents.length === 0 ? (
              <p className="text-sm text-text-faint italic py-4 text-center">None</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2 pr-3">Ref.</th>
                    <th className="font-medium py-2 pr-3">Date</th>
                    <th className="font-medium py-2 pr-3">By</th>
                    <th className="font-medium py-2 pr-3">Type</th>
                    <th className="font-medium py-2">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {data.linkedEvents.map((e, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 text-text!">{e.ref}</td>
                      <td className="py-2 pr-3 text-text-muted">{e.date}</td>
                      <td className="py-2 pr-3 text-text-muted">{e.by}</td>
                      <td className="py-2 pr-3 text-text-muted">{e.type}</td>
                      <td className="py-2 text-text-muted">{e.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
