import { useState, type ComponentType } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  X,
  ClipboardList,
  Send,
  Pencil,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Plus,
  ListChecks,
  LoaderCircle,
  Warehouse,
  CalendarDays,
  Link2,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useInventoryDetail, useDeleteInventoryReal, useSetInventoryToDraftReal } from '../warehouseExtras.queries'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { AddEventModal } from '../../agenda/components/AddEventModal'
import { SendInventoryEmailModal } from './SendInventoryEmailModal'
import { InventoryCountLines } from './InventoryCountLines'

// Native rebuild of product/inventory/card.php?id=X — see
// warehouseHtmlParser.ts's parseInventoryCardDocument for how the real
// fields/action links were found (no REST API under product/inventory/).
// "+ Add Link" and a "⋮" menu on these two sections were considered (they
// look natural next to a title bar like this) but dropped: the real page's
// own title-button container for Related Objects is confirmed empty
// (`data-block="showLinkedObject"` with `<div class="ec-title-btn-container">
// </div>`, no button at all), and no such menu exists on the events block
// either — adding either would be a UI element with nothing real behind it.

function EmptyState({ icon: Icon, title, message }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-8 text-center">
      <Icon size={28} className="text-text-faint/60" />
      <p className="text-sm font-medium text-text-muted">{title}</p>
      <p className="text-xs text-text-faint">{message}</p>
    </div>
  )
}

// Matches WarehouseDetail.tsx's own compact icon-button header actions
// (Modify/Validate are the two real links here that still route out — no
// in-app "edit fields"/"validate" flow exists yet, same honesty tier as
// before, just restyled to match).
function ActionIconLink({ href, icon: Icon, label }: { href: string; icon: typeof Send; label: string }) {
  if (!href) return null
  return (
    <a href={stripBackendPrefix(href)} target="_blank" rel="noreferrer" title={label} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
      <Icon size={16} />
    </a>
  )
}

// Matches WarehouseDetail.tsx's own HeaderStatTile exactly (label/value pair
// in the header's stat row) — duplicated locally rather than exported from
// that file, since these two detail pages don't otherwise share components.
function HeaderStatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[120px]">
      <p className="text-xs text-text-faint uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-text! mt-0.5">{value || <span className="text-text-faint">—</span>}</p>
    </div>
  )
}

export function InventoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useInventoryDetail(id)
  const [tab, setTab] = useState<'card' | 'inventory'>('card')
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showSendEmail, setShowSendEmail] = useState(false)
  const deleteInventory = useDeleteInventoryReal()
  const setToDraft = useSetInventoryToDraftReal()

  function handleDelete() {
    if (!id) return
    if (!window.confirm('Delete this inventory? This cannot be undone.')) return
    deleteInventory.mutate(id, { onSuccess: () => navigate(ROUTES.inventoryList) })
  }

  function handleSetToDraft() {
    if (!id) return
    if (!window.confirm('Set this inventory back to Draft?')) return
    setToDraft.mutate(id)
  }

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
          <ChevronLeft size={18} /> Back to Inventory
        </Link>
        <Link to={ROUTES.inventoryList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      {/* Unified "identity card" header — avatar, name/status, id/warehouse,
          real stats, pill tab bar — matching WarehouseDetail.tsx's own
          header exactly (see that file's header comment) instead of this
          page's earlier separate title-row + gradient-card layout. */}
      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="flex items-start gap-4 min-w-[240px] flex-1">
                <span className="flex items-center justify-center w-16 h-16 rounded-lg bg-brand text-white shrink-0">
                  <ClipboardList size={28} />
                </span>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-text!">{data.label || `Inventory #${data.id}`}</h2>
                    {data.statusLabel && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">{data.statusLabel}</span>}
                  </div>
                  <p className="text-xs text-text-faint">#{data.id}</p>
                  {data.warehouseId && (
                    <p className="flex items-center gap-1 text-xs text-text-faint">
                      <Warehouse size={12} />
                      <Link to={ROUTES.warehouseDetail.replace(':id', String(data.warehouseId))} className="text-brand hover:underline">
                        {data.warehouseLabel}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {data.emailUrl && (
                  <button type="button" onClick={() => setShowSendEmail(true)} title="Send Email" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                    <Send size={16} />
                  </button>
                )}
                <ActionIconLink href={data.modifyUrl} icon={Pencil} label="Modify" />
                <ActionIconLink href={data.validateUrl} icon={CheckCircle2} label="Validate" />
                {data.backToDraftUrl && (
                  <button
                    type="button"
                    disabled={setToDraft.isPending}
                    onClick={handleSetToDraft}
                    title="Back to Draft"
                    className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text disabled:opacity-50"
                  >
                    {setToDraft.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  </button>
                )}
                <span className="w-px h-5 bg-border mx-1" />
                {data.deleteUrl && (
                  <button
                    type="button"
                    disabled={deleteInventory.isPending}
                    onClick={handleDelete}
                    title="Delete"
                    className="p-1.5 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg disabled:opacity-50"
                  >
                    {deleteInventory.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
                <Link to={ROUTES.inventoryList} title="Close" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                  <X size={16} />
                </Link>
              </div>
            </div>

            {(setToDraft.isError || deleteInventory.isError) && (
              <p className="px-4 pt-3 text-xs text-danger">
                {setToDraft.isError
                  ? setToDraft.error instanceof Error
                    ? setToDraft.error.message
                    : 'Could not set this inventory back to draft.'
                  : deleteInventory.error instanceof Error
                    ? deleteInventory.error.message
                    : 'Could not delete this inventory.'}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-border">
              <HeaderStatTile label="Label" value={data.label} />
              <HeaderStatTile label="Product" value={data.productLabel} />
              <HeaderStatTile label="Value Date" value={data.valueDate} />
            </div>

            <div className="border-t border-border px-3 py-2.5">
              <div className="flex items-center gap-1 bg-surface rounded-full p-1 w-fit">
                {(
                  [
                    { key: 'card' as const, label: 'Card', icon: ClipboardList },
                    { key: 'inventory' as const, label: 'Inventory', icon: ListChecks },
                  ]
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      tab === key ? 'bg-brand text-white shadow-sm shadow-brand/25' : 'text-text-muted hover:text-text hover:bg-surface-hover'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
        {showSendEmail && <SendInventoryEmailModal id={id!} inventoryLabel={data.label || `Inventory #${data.id}`} onClose={() => setShowSendEmail(false)} />}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'inventory' && <InventoryCountLines inventoryId={id!} />}

        {tab === 'card' && (
        <>
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Link2 size={15} className="text-brand" />
            <h3 className="font-semibold text-text!">Related Objects</h3>
          </div>
          <div className="p-4 overflow-x-auto">
            {data.relatedObjects.length === 0 ? (
              <EmptyState icon={FileText} title="No related objects found" message="There are no linked documents for this inventory card." />
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
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold text-text!">
              <Clock size={15} className="text-brand" /> Latest 10 linked events
            </h3>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => refetch()} title="Refresh" className="flex items-center justify-center w-6 h-6 rounded-md border border-border text-text-faint hover:bg-surface-hover hover:text-text">
                <RefreshCw size={12} />
              </button>
              {/* Real link is /comm/action/card.php?action=create&origin=
                  inventory&originid=X — routed through the same real
                  AddEventModal every other origin-linked caller reuses (see
                  WarehouseDetail.tsx's own Events tab for the precedent).
                  elementtype="inventory" matches Dolibarr's real Inventory
                  class element name, confirmed by that real link's own
                  origin=inventory param. */}
              {data.addEventUrl && (
                <button type="button" onClick={() => setShowAddEvent(true)} title="Add event" className="flex items-center justify-center w-6 h-6 rounded-md bg-brand text-white hover:bg-brand-hover">
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>
          {showAddEvent && (
            <AddEventModal
              elementtype="inventory"
              fkElement={data.id}
              linkedObjectLabel={data.label || `Inventory #${data.id}`}
              linkedObjectPath={ROUTES.inventoryDetail.replace(':id', String(data.id))}
              onClose={() => setShowAddEvent(false)}
              onCreated={() => {
                setShowAddEvent(false)
                refetch()
              }}
            />
          )}
          <div className="p-4 overflow-x-auto">
            {data.linkedEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No events found" message="There are no recent events linked to this inventory card." />
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
        </>
        )}
      </div>
    </div>
  )
}
