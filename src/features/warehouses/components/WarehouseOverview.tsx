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
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, SectionHeading, ICON_STYLES, ActionGroupCard, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../utils/format'
import { useStockRows, useRecentMovements, useRecordStockMovement, type WarehouseSummary } from '../warehouses.queries'

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  color,
  listPath,
  newPath,
}: {
  label: string
  value: string | number
  caption?: string
  icon: ComponentType<{ size?: number }>
  color: IconColor
  listPath?: string
  newPath?: string
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-bold text-text! mt-1">{value}</p>
          {caption && <p className="text-xs text-text-faint mt-0.5">{caption}</p>}
        </div>
        <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
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
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-bold text-text! mt-1">{value}</p>
        </div>
        <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
          <Icon size={20} />
        </span>
      </div>
      {links}
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
  return (
    <Card className="!p-0 overflow-hidden">
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
            {movements.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-center text-text-faint italic" colSpan={5}>
                  No stock movements recorded yet
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.ref} className="border-t border-border">
                  <td className="px-4 py-3 text-brand">{m.ref}</td>
                  <td className="px-4 py-3 text-text!">{m.productLabel}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${m.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                    {m.delta >= 0 ? '+' : ''}
                    {m.delta}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{m.reason || '-'}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{timeLabel(m.date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function WarehouseOverview({ summary }: { summary: WarehouseSummary }) {
  const [showRecordMovement, setShowRecordMovement] = useState(false)

  return (
    <div className="space-y-4">
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

      <SectionHeading icon={BarChart2}>Statistics</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Total Products In Stock" value={summary.totalProductsInStock} icon={Package} color="blue" />
        <MetricCard label="Total Stock Quantity" value={summary.totalStockQuantity} icon={Boxes} color="indigo" />
        <MetricCard label="Total Stock Value" value={formatMoney(summary.totalStockValue)} icon={Banknote} color="cyan" />
        <MetricCard
          label="Warehouses"
          value={`${summary.warehousesActive} / ${summary.warehousesTotal}`}
          caption="Active / Total"
          icon={Warehouse}
          color="green"
          listPath={ROUTES.warehouseDashboard}
          newPath={ROUTES.warehouseDashboard}
        />

        <MetricCard label="Products Out of Stock" value={summary.productsOutOfStock} icon={AlertTriangle} color="rose" />
        <MetricCard label="Products Low Stock" value={summary.productsLowStock} icon={BatteryLow} color="cyan" />
        <MetricCard label="Movements Today" value={summary.movementsToday} caption="View All Movements" icon={ArrowLeftRight} color="violet" />
        <ActionGroupCard
          icon={Zap}
          title="Quick Actions"
          actions={[
            { icon: ShoppingCart, label: 'Replenishment' },
            { icon: FilePenLine, label: 'Stock correction' },
            { icon: PackagePlus, label: 'New inventory' },
          ]}
        />

        <MetricCard label="Inventories" value={summary.inventories} icon={ClipboardList} color="rose" />
        <MetricCard label="Shipments" value={summary.shipments.total} caption={`${summary.shipments.validated} Validated`} icon={Truck} color="blue" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
