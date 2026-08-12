import { useMemo, useState } from 'react'
import {
  Box,
  PackagePlus,
  List,
  Warehouse,
  Layers,
  Hash,
  SlidersHorizontal,
  BarChart2,
  Tag,
  Upload,
  Tags,
  Settings2,
  PlusCircle,
  PackageOpen,
  FileEdit,
  CheckCircle2,
  RefreshCw,
  PieChart as PieChartIcon,
  History,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ROUTES } from '../../../routes'
import { ActionGroupCard, Card, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import { useProductsSummary, useServicesSummary, useProductRows, useAllProductsRich } from '../products.queries'
import { ProductAvatar } from './ProductAvatar'
import type { RichProductRow } from '../productAjax'

const REPORTS = ['Profit Per Product', 'Best Selling Products', 'Products/Services by popularity', 'Profit per Service', 'Best selling services']
const DONUT_COLORS = ['var(--color-chart-1)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-6)']

function ReportsTab() {
  const [selected, setSelected] = useState('')
  return (
    <Card>
      <h3 className="text-sm font-semibold text-text! mb-1">Reports</h3>
      <p className="text-xs text-text-faint mb-3">No reporting endpoint exists on this app's backend yet for any of these — shown for reference, not selectable.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm text-text-faint cursor-not-allowed">
            <input type="radio" name="product-report" disabled checked={selected === r} onChange={() => setSelected(r)} className="text-brand" />
            {r}
          </label>
        ))}
      </div>
    </Card>
  )
}

function DashboardTab() {
  const { data: productsSummary } = useProductsSummary()
  const { data: servicesSummary } = useServicesSummary()
  const { data: allRows } = useProductRows()
  const { data: richProducts } = useAllProductsRich(0)
  const { data: richServices } = useAllProductsRich(1)

  const totalProducts = productsSummary?.totalProducts ?? 0
  const totalServices = servicesSummary?.totalServices ?? 0

  // Real `tosell` field (see products.queries.ts's ProductRow.forSale) —
  // there's no matching `tobuy` field on this backend's /api/products/
  // (confirmed live), so this splits by sale-status only rather than
  // faking the legacy page's full for-sale/for-purchase/neither breakdown.
  const productRows = (allRows?.rows ?? []).filter((r) => r.type === 'product')
  const serviceRows = (allRows?.rows ?? []).filter((r) => r.type === 'service')
  const donutData = [
    { name: 'Products for sale', value: productRows.filter((r) => r.forSale).length },
    { name: 'Products not for sale', value: productRows.filter((r) => !r.forSale).length },
    { name: 'Services for sale', value: serviceRows.filter((r) => r.forSale).length },
    { name: 'Services not for sale', value: serviceRows.filter((r) => !r.forSale).length },
  ]
  const donutTotal = totalProducts + totalServices

  // Real creation dates from the AJAX report (see productAjax.ts's
  // createdAt) — combines both Products and Services, sorted by actual
  // date rather than the previous id-sort proxy.
  const latest = useMemoLatest(richProducts, richServices)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
      <Card>
        <SectionHeading icon={PieChartIcon}>Statistics</SectionHeading>
        <div className="flex flex-col items-center gap-3 mt-3">
          <div className="w-32 h-32 relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={42} outerRadius={58} paddingAngle={2}>
                  {donutData.map((entry, i) => (
                    <Cell key={entry.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] text-text-muted">Total</p>
              <p className="text-lg font-bold text-text!">{donutTotal}</p>
            </div>
          </div>
          <div className="w-full space-y-1.5 text-sm">
            {donutData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} /> {entry.name}
                </span>
                <span className="text-text! font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-faint text-center">For-purchase status has no equivalent field on this backend's product API, so only the for-sale split is shown.</p>
        </div>
      </Card>

      <Card className="!p-0 !h-auto overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-0">
          <SectionHeading icon={History}>Latest Recorded Products</SectionHeading>
          <Link to={ROUTES.productList} className="text-xs font-medium text-brand hover:underline">
            Full List
          </Link>
        </div>
        <div className="overflow-auto max-h-[50vh] mt-3">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Product</th>
                <th className="font-medium px-4 py-2.5">Type</th>
                <th className="font-medium px-4 py-2.5">Created</th>
                <th className="font-medium px-4 py-2.5 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {latest.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-text-faint italic" colSpan={4}>
                    No products recorded yet.
                  </td>
                </tr>
              ) : (
                latest.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-t border-border hover:bg-surface-hover">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <ProductAvatar bg={row.avatarBg} color={row.avatarColor} />
                        <span>
                          <span className="text-text! block">{row.name}</span>
                          <span className="text-xs text-text-faint">Ref: {row.ref}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted capitalize">{row.kind}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.createdDate || '-'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text!">{row.price}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function useMemoLatest(products: RichProductRow[] | undefined, services: RichProductRow[] | undefined) {
  return useMemo(() => {
    const combined = [...(products ?? []).map((r) => ({ ...r, kind: 'product' as const })), ...(services ?? []).map((r) => ({ ...r, kind: 'service' as const }))]
    return combined.sort((a, b) => b.createdAt - a.createdAt || Number(b.id) - Number(a.id)).slice(0, 15)
  }, [products, services])
}

export function ProductArea() {
  const [tab, setTab] = useState<'area' | 'reports' | 'dashboard'>('area')

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Box size={20} className="text-brand" /> Product area
      </h2>

      <div className="flex items-center gap-2 border-b border-border">
        {(['area', 'reports', 'dashboard'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t === 'area' ? 'Products Area' : t === 'reports' ? 'Reports' : 'Dashboard'}
          </button>
        ))}
      </div>

      {tab === 'area' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActionGroupCard
            icon={Box}
            title="Products"
            columns={3}
            actions={[
              { icon: PackagePlus, label: 'New product', path: ROUTES.productCreate, color: 'green' },
              { icon: List, label: 'Product List', path: ROUTES.productList, color: 'blue' },
              { icon: Warehouse, label: 'Stocks and location of products', path: ROUTES.productStocks, color: 'amber' },
              { icon: Layers, label: 'Stocks by lot/serial', path: ROUTES.productStocksByLot, color: 'violet' },
              { icon: Hash, label: 'Lots/Serials', path: ROUTES.lotsSerials, color: 'indigo' },
              { icon: SlidersHorizontal, label: 'Variant attributes', path: ROUTES.variantAttributes, color: 'rose' },
              { icon: BarChart2, label: 'Product Statistics', path: ROUTES.productStats, color: 'cyan' },
              { icon: Tag, label: 'Product Price', path: ROUTES.productPriceList, color: 'green' },
              { icon: Upload, label: 'Product Import Wizard', color: 'blue' },
              { icon: Tags, label: 'tags/categories', path: ROUTES.productTags, color: 'amber' },
            ]}
          />
          <ActionGroupCard
            icon={Settings2}
            title="Services"
            columns={3}
            actions={[
              { icon: Settings2, label: 'Services area', color: 'indigo' },
              { icon: PlusCircle, label: 'New service', path: ROUTES.serviceCreate, color: 'green' },
              { icon: List, label: 'Service List', path: ROUTES.serviceList, color: 'blue' },
              { icon: BarChart2, label: 'Service Statistics', path: ROUTES.serviceStats, color: 'cyan' },
              { icon: Tags, label: 'Tags/Categories', path: ROUTES.productTags, color: 'amber' },
            ]}
          />
          <ActionGroupCard
            icon={PackageOpen}
            title="Receptions"
            columns={3}
            actions={[
              { icon: PackageOpen, label: 'Receptions area', color: 'amber' },
              { icon: PlusCircle, label: 'New reception', color: 'green' },
              { icon: List, label: 'Reception List', color: 'blue' },
              { icon: FileEdit, label: 'Draft Reception', color: 'violet' },
              { icon: CheckCircle2, label: 'Validated Reception', color: 'green' },
              { icon: RefreshCw, label: 'Processed', color: 'indigo' },
              { icon: BarChart2, label: 'Statistics Reception', color: 'cyan' },
            ]}
          />
        </div>
      )}

      {tab === 'reports' && <ReportsTab />}
      {tab === 'dashboard' && <DashboardTab />}
    </div>
  )
}
