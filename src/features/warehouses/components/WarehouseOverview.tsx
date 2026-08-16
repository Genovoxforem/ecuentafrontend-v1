import { useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Warehouse,
  BarChart2,
  Package,
  Boxes,
  Banknote,
  AlertTriangle,
  BatteryLow,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ClipboardList,
  Truck,
  PackageCheck,
  Shuffle,
  ListChecks,
  Bookmark,
  CheckCircle2,
  CheckCheck,
  ShoppingCart,
  FilePenLine,
  PackagePlus,
  Plus,
  X,
  History,
  AlertOctagon,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, SectionHeading, ICON_STYLES, ActionGroupCard, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../utils/format'
import { useStockRows, useRecentMovements, useRecordStockMovement, type WarehouseSummary } from '../warehouses.queries'

const HERO_WASH: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-50 dark:from-blue-500/10',
  indigo: 'bg-gradient-to-br from-indigo-50 dark:from-indigo-500/10',
  cyan: 'bg-gradient-to-br from-cyan-50 dark:from-cyan-500/10',
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  color,
  listPath,
  newPath,
  alert,
  hero,
}: {
  label: string
  value: string | number
  caption?: string
  icon: ComponentType<{ size?: number }>
  color: IconColor
  listPath?: string
  newPath?: string
  alert?: boolean
  hero?: boolean
}) {
  return (
    <Card
      className={`group flex flex-col gap-2 !p-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        alert ? 'border-l-4 border-l-danger bg-danger-bg/30' : hero ? `${HERO_WASH[color] ?? ''} to-transparent` : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-text-muted truncate">{label}</p>
          <p className={`font-bold text-text! mt-1 ${hero ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
          {caption && <p className="text-xs text-text-faint mt-0.5">{caption}</p>}
        </div>
        <span
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 ${ICON_STYLES[color]}`}
        >
          <Icon size={20} />
        </span>
      </div>
      {(listPath || newPath) && (
        <div className="flex items-center gap-3 text-xs">
          {listPath ? (
            <Link to={listPath} className="text-brand hover:underline">
              List
            </Link>
          ) : (
            <span className="text-text-faint cursor-default">List</span>
          )}
          {newPath ? (
            <Link to={newPath} className="text-brand hover:underline">
              + New
            </Link>
          ) : (
            <span className="text-text-faint cursor-default">+ New</span>
          )}
        </div>
      )}
    </Card>
  )
}

function ReservationCard({ label, value, icon: Icon, color, links }: { label: string; value: number; icon: ComponentType<{ size?: number }>; color: IconColor; links?: ReactNode }) {
  return (
    <Card className="group flex flex-col gap-2 !p-3 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-bold text-text! mt-1">{value}</p>
        </div>
        <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 ${ICON_STYLES[color]}`}>
          <Icon size={20} />
        </span>
      </div>
      {links}
    </Card>
  )
}

function LegacyStatsWarning({ message }: { message: string }) {
  return (
    <Card className="!bg-warning-bg border-warning/40 flex items-start gap-3">
      <AlertOctagon size={18} className="text-warning-fg shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-warning-fg">Some stats couldn't load from the live backend</p>
        <p className="text-xs text-warning-fg/80 mt-0.5">
          Inventories, Shipments, Receptions, Reservations and Movements Today are showing 0 as a fallback. {message}
        </p>
      </div>
    </Card>
  )
}

function RecordMovementForm({ onClose }: { onClose: () => void }) {
  const stockRows = useStockRows()
  const recordMovement = useRecordStockMovement()
  const [productRef, setProductRef] = useState('')
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const product = stockRows.find((p) => p.ref === productRef)
    if (!product || delta === 0) {
      setError('Product and a non-zero quantity are both required.')
      return
    }
    recordMovement({ productRef: product.ref, productLabel: product.label, delta, reason })
    onClose()
  }

  return (
    <Card className="border-brand/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Record Stock Movement</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Product</span>
          <select value={productRef} onChange={(e) => setProductRef(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2">
            <option value="">{stockRows.length === 0 ? 'No products' : 'Select a product'}</option>
            {stockRows.map((p) => (
              <option key={p.ref} value={p.ref}>
                {p.label} (current: {p.effectiveStock})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Quantity (+ in / - out)</span>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Reason</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Manual recount"
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2"
          />
        </label>
      </div>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="flex justify-end mt-3">
        <button type="button" onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Record movement
        </button>
      </div>
    </Card>
  )
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function RecentMovements() {
  const movements = useRecentMovements()
  if (movements.length === 0) {
    return (
      <Card className="!h-auto items-center justify-center gap-2 py-10 text-center">
        <span className="w-11 h-11 rounded-full grid place-items-center bg-surface-hover text-text-faint">
          <History size={18} />
        </span>
        <p className="text-sm text-text-faint">No stock movements recorded yet</p>
      </Card>
    )
  }
  return (
    <Card className="!p-0 !h-auto overflow-hidden">
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="text-left text-xs font-semibold text-text uppercase tracking-wide border-b border-border bg-surface">
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const DeltaIcon = m.delta >= 0 ? ArrowUpRight : ArrowDownRight
              return (
                <tr key={m.ref} className="border-t border-border hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-brand">
                      <History size={13} />
                      {m.ref}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text!">{m.productLabel}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${m.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      <DeltaIcon size={13} />
                      {m.delta >= 0 ? '+' : ''}
                      {m.delta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{m.reason || '-'}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{timeLabel(m.date)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function WarehouseOverview({ summary }: { summary: WarehouseSummary }) {
  const [showRecordMovement, setShowRecordMovement] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Warehouse size={20} className="text-brand" /> Warehouses area
        </h2>
        <button
          type="button"
          onClick={() => setShowRecordMovement((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> Record Stock Movement
        </button>
      </div>

      {showRecordMovement && <RecordMovementForm onClose={() => setShowRecordMovement(false)} />}

      {summary.legacyStatsError && <LegacyStatsWarning message={summary.legacyStatsError} />}

      <SectionHeading icon={BarChart2}>Statistics</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Products In Stock" value={summary.totalProductsInStock} icon={Package} color="blue" hero />
        <MetricCard label="Total Stock Quantity" value={summary.totalStockQuantity} icon={Boxes} color="indigo" hero />
        <MetricCard label="Total Stock Value" value={formatMoney(summary.totalStockValue)} icon={Banknote} color="cyan" hero />
        <MetricCard
          label="Warehouses"
          value={`${summary.warehousesActive} / ${summary.warehousesTotal}`}
          caption="Active / Total"
          icon={Warehouse}
          color="green"
          listPath={ROUTES.warehouseList}
          newPath={ROUTES.warehouseCreate}
        />

        <MetricCard
          label="Products Out of Stock"
          value={summary.productsOutOfStock}
          icon={AlertTriangle}
          color="rose"
          alert={summary.productsOutOfStock > 0}
        />
        <MetricCard label="Products Low Stock" value={summary.productsLowStock} icon={BatteryLow} color="cyan" />
        <MetricCard label="Movements Today" value={summary.movementsToday} caption="View All Movements" icon={ArrowLeftRight} color="violet" />
        <ActionGroupCard
          icon={Zap}
          title="Quick Actions"
          actions={[
            { icon: ShoppingCart, label: 'Replenishment' },
            { icon: FilePenLine, label: 'Stock correction' },
            { icon: PackagePlus, label: 'New inventory', path: ROUTES.inventoryCreate },
          ]}
        />

        <MetricCard label="Inventories" value={summary.inventories} icon={ClipboardList} color="rose" listPath={ROUTES.inventoryList} newPath={ROUTES.inventoryCreate} />
        <MetricCard
          label="Shipments"
          value={summary.shipments.total}
          caption={`${summary.shipments.validated} Validated`}
          icon={Truck}
          color="blue"
          listPath={ROUTES.shipmentList}
        />
        <MetricCard label="Receptions" value={summary.receptions.total} caption={`${summary.receptions.validated} Validated`} icon={PackageCheck} color="blue" />
        <ActionGroupCard
          icon={Shuffle}
          title="Stock Transfer & Reports"
          actions={[
            { icon: Shuffle, label: 'Mass Transfer' },
            { icon: ListChecks, label: 'Movement Report' },
            { icon: BarChart2, label: 'Statistics' },
          ]}
        />
      </div>

      <SectionHeading icon={History}>Recent Stock Movements</SectionHeading>
      <RecentMovements />

      <SectionHeading icon={Bookmark}>Stock Reservations</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ReservationCard label="Active Reservations" value={summary.reservations.active} icon={Bookmark} color="amber" />
        <ReservationCard label="Total Reserved Qty" value={summary.reservations.totalReservedQty} icon={Boxes} color="violet" />
        <ReservationCard label="Released" value={summary.reservations.released} icon={CheckCircle2} color="green" />
        <ReservationCard
          label="Consumed"
          value={summary.reservations.consumed}
          icon={CheckCheck}
          color="green"
          links={
            <div className="flex items-center gap-3 text-xs">
              <span className="text-text-faint cursor-default">View All</span>
              <span className="text-text-faint cursor-default">Configure</span>
            </div>
          }
        />
      </div>
    </div>
  )
}
