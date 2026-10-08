import type { ComponentType } from 'react'
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
  Shuffle,
  ListChecks,
  Bookmark,
  CheckCircle2,
  CheckCheck,
  ShoppingCart,
  FilePenLine,
  PackagePlus,
  History,
  AlertOctagon,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, SectionHeading, ICON_STYLES, ActionGroupCard, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllProductsRich, useProductOptions } from '../../products/products.queries'
import { useWarehouseList } from '../warehouseExtras.queries'
import { useRecentMovements, type WarehouseSummary } from '../warehouses.queries'

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

function RecentMovements() {
  const { movements, isLoading, isError, error, refetch } = useRecentMovements()
  if (isLoading) return <LegacyLoadingCard label="Loading recent stock movements…" />
  if (isError) {
    return <LegacyErrorCard title="Couldn't load stock movements" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }
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
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const outgoing = m.qty.trim().startsWith('-')
              const DeltaIcon = outgoing ? ArrowDownRight : ArrowUpRight
              return (
                <tr key={m.id} className="border-t border-border hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-brand">
                      <History size={13} />
                      {m.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text!">
                    {m.productLabel}
                    <p className="text-xs text-text-faint">{m.productRef}</p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{m.warehouseRef || '-'}</td>
                  <td className="px-4 py-3 text-text-muted">{m.typeLabel || '-'}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${outgoing ? 'text-danger' : 'text-success'}`}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      <DeltaIcon size={13} />
                      {m.qty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{m.label || '-'}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{m.dateFormatted}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function RecentActivity() {
  const { movements, isLoading, isError, error, refetch } = useRecentMovements()

  if (isLoading) return <LegacyLoadingCard label="Loading recent warehouse activity…" />
  if (isError) {
    return <LegacyErrorCard title="Couldn't load recent warehouse activity" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }
  if (movements.length === 0) {
    return <p className="py-4 text-center text-xs text-text-faint">No recent warehouse activity.</p>
  }

  return (
    <div className="mt-2 divide-y divide-border">
      {movements.slice(0, 4).map((movement) => (
        <div key={movement.id} className="flex min-w-0 items-start gap-2 py-2 first:pt-0">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <History size={12} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text!" title={movement.label || movement.typeLabel}>
              {movement.label || movement.typeLabel || 'Stock movement'}
            </p>
            <p className="truncate text-[11px] text-text-faint">
              {movement.productLabel}{movement.warehouseRef ? ` · ${movement.warehouseRef}` : ''}
            </p>
          </div>
          <span className="shrink-0 whitespace-nowrap text-[10px] text-text-faint">{movement.dateFormatted}</span>
        </div>
      ))}
    </div>
  )
}

export function WarehouseOverview({ summary }: { summary: WarehouseSummary }) {
  const { data: products = [] } = useProductOptions()
  const { data: richProducts, isLoading: categoriesLoading, isError: categoriesError } = useAllProductsRich(0)
  const { warehouses } = useWarehouseList()
  const stockProducts = products.filter((product) => product.type === 'product')
  const inStock = stockProducts.filter((product) => product.stock >= 5).length
  const lowStock = stockProducts.filter((product) => product.stock > 0 && product.stock < 5).length
  const outOfStock = stockProducts.filter((product) => product.stock <= 0).length
  const stockStatusTotal = Math.max(inStock + lowStock + outOfStock, 1)
  const inStockPercent = (inStock / stockStatusTotal) * 100
  const lowStockPercent = (lowStock / stockStatusTotal) * 100
  const stockStatusStyle = {
    background: `conic-gradient(#13c8a3 0% ${inStockPercent}%, #f5b942 ${inStockPercent}% ${inStockPercent + lowStockPercent}%, #f04e78 ${inStockPercent + lowStockPercent}% 100%)`,
  }
  const warehouseValues = [...warehouses]
    .sort((a, b) => b.inputStockValue - a.inputStockValue)
    .slice(0, 5)
  const maxWarehouseValue = Math.max(...warehouseValues.map((warehouse) => warehouse.inputStockValue), 1)
  const categoryByProductRef = new Map((richProducts ?? []).map((product) => [product.ref, product.category.trim() || 'Uncategorized']))
  const stockValueByCategory = products.reduce<Map<string, number>>((totals, product) => {
    if (product.type !== 'product') return totals
    const category = categoryByProductRef.get(product.ref) ?? 'Uncategorized'
    totals.set(category, (totals.get(category) ?? 0) + product.stock * product.priceExclTax)
    return totals
  }, new Map())
  const categoryValues = [...stockValueByCategory.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const maxCategoryValue = Math.max(...categoryValues.map(({ value }) => value), 1)

  return (
    <div className="space-y-3">

      {summary.legacyStatsError && <LegacyStatsWarning message={summary.legacyStatsError} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Products In Stock" value={summary.totalProductsInStock} icon={Package} color="blue" hero />
        <MetricCard label="Total Stock Quantity" value={summary.totalStockQuantity.toLocaleString()} icon={Boxes} color="indigo" hero />
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
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="!h-auto !p-3">
          <SectionHeading icon={Warehouse}>Stock Value by Warehouse</SectionHeading>
          {warehouseValues.length > 0 ? (
            <div className="mt-3 space-y-3">
              {warehouseValues.map((warehouse) => (
                <div key={warehouse.id} className="grid grid-cols-[minmax(80px,1fr)_2fr_auto] items-center gap-2">
                  <span className="truncate text-xs text-text-muted" title={warehouse.shortName || warehouse.ref}>{warehouse.shortName || warehouse.ref}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max((warehouse.inputStockValue / maxWarehouseValue) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold tabular-nums text-text!">{formatMoney(warehouse.inputStockValue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-faint">Warehouse stock values are not available.</p>
          )}
        </Card>

        <Card className="!h-auto !p-3">
          <SectionHeading icon={BarChart2}>Stock by Category</SectionHeading>
          {categoryValues.length > 0 ? (
            <div className="mt-3 space-y-3">
              {categoryValues.map(({ category, value }, index) => (
                <div key={category} className="grid grid-cols-[minmax(70px,1fr)_1.4fr_auto] items-center gap-2">
                  <span className="truncate text-xs text-text-muted" title={category}>{category}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((value / maxCategoryValue) * 100, 2)}%`,
                        backgroundColor: ['#168bff', '#13c8a3', '#f5b942', '#a76bf5', '#68a9dc'][index],
                      }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold tabular-nums text-text!">{formatMoney(value)}</span>
                </div>
              ))}
              {stockValueByCategory.size > categoryValues.length && (
                <p className="text-right text-[11px] text-text-faint">Top {categoryValues.length} categories by stock value</p>
              )}
            </div>
          ) : categoriesLoading ? (
            <p className="mt-3 text-sm text-text-faint">Loading product categories…</p>
          ) : categoriesError ? (
            <p className="mt-3 text-sm text-warning-fg">Product category stock values could not be loaded.</p>
          ) : (
            <p className="mt-3 text-sm text-text-faint">No categorized stock value is available.</p>
          )}
        </Card>

        <Card className="!h-auto !p-3">
          <SectionHeading icon={Package}>Stock Status</SectionHeading>
          <div className="mt-3 flex items-center justify-center gap-5">
            <div className="relative h-32 w-32 shrink-0 rounded-full" style={stockStatusStyle}>
              <div className="absolute inset-4 grid place-content-center rounded-full bg-surface-alt text-center">
                <span className="text-xl font-bold leading-none text-text!">{stockProducts.length.toLocaleString()}</span>
                <span className="mt-1 text-[10px] text-text-faint">Products</span>
              </div>
            </div>
            <div className="min-w-0 space-y-2 text-xs">
              <StatusLegend color="bg-[#13c8a3]" label="In stock" value={inStock} total={stockProducts.length} />
              <StatusLegend color="bg-[#f5b942]" label="Low stock" value={lowStock} total={stockProducts.length} />
              <StatusLegend color="bg-[#f04e78]" label="Out of stock" value={outOfStock} total={stockProducts.length} />
            </div>
          </div>
        </Card>

      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <OperationValue label="Products low stock" value={summary.productsLowStock} icon={BatteryLow} />
        <OperationValue label="Movements today" value={summary.movementsToday} icon={ArrowLeftRight} />
        <OperationValue label="Active reservations" value={summary.reservations.active} icon={Bookmark} />
        <OperationValue label="Reserved quantity" value={summary.reservations.totalReservedQty} icon={Boxes} />
        <OperationValue label="Released" value={summary.reservations.released} icon={CheckCircle2} />
        <OperationValue label="Consumed" value={summary.reservations.consumed} icon={CheckCheck} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0 space-y-2">
          <SectionHeading icon={History}>Recent Stock Movements</SectionHeading>
          <RecentMovements />
        </div>
        <div className="min-w-0 space-y-2">
          <SectionHeading icon={Zap}>Quick Actions</SectionHeading>
          <ActionGroupCard
            icon={Zap}
            title="Quick Actions"
            columns={2}
            className="!h-auto"
            actions={[
              { icon: ShoppingCart, label: 'Replenishment', path: ROUTES.replenishment },
              { icon: FilePenLine, label: 'Stock correction', path: ROUTES.stockCorrection },
              { icon: PackagePlus, label: 'New inventory', path: ROUTES.inventoryCreate },
              { icon: Shuffle, label: 'Mass transfer', path: ROUTES.massStockTransfer },
              { icon: ListChecks, label: 'Movement report', path: ROUTES.stockMovementReport },
              { icon: ClipboardList, label: 'Inventory list', path: ROUTES.inventoryList },
            ]}
          />
          <Card className="!h-auto !p-3">
            <div className="flex items-center justify-between">
              <SectionHeading icon={History}>Recent Activity</SectionHeading>
              <Link to={ROUTES.stockMovementsList} className="text-xs font-medium text-brand hover:underline">View all</Link>
            </div>
            <RecentActivity />
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusLegend({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="grid grid-cols-[8px_minmax(70px,1fr)_auto] items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="truncate text-text-muted">{label}</span>
      <span className="whitespace-nowrap font-medium text-text!">{value.toLocaleString()} <span className="text-text-faint">({percent}%)</span></span>
    </div>
  )
}

function OperationValue({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2">
      <Icon size={15} className="shrink-0 text-brand" />
      <span className="min-w-0 flex-1 truncate text-xs text-text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-text!">{value.toLocaleString()}</span>
    </div>
  )
}
