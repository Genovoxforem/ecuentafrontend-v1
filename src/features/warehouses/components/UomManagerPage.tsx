import { lazy, Suspense, useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Loader2, PackageSearch, Ruler, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useBoxBreakProducts } from '../boxBreak.queries'
import { useUomManagerAccess } from '../uomManager.queries'

// The per-product editor is the same UOM Settings tab the product card shows —
// both are product/stock/uom/uom_manager.php's job on the backend, and both
// read and write through productinfo/api/uom_api.php.
const LazyTabRenderer = lazy(() => import('../../products/components/ProductDetailTabs').then((m) => ({ default: m.LazyTabRenderer })))

const inputCls = 'h-9 w-full rounded-md border border-input-border bg-input-bg pl-9 pr-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

function Title() {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
      <Ruler size={20} className="text-brand" /> UOM Manager
    </h2>
  )
}

// uom_manager.php's opening screen: "Select a product from the list".
function ProductPicker({ onPick }: { onPick: (id: number) => void }) {
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search.trim())
  const { data, isLoading, isError, error, refetch } = useBoxBreakProducts(deferred)

  return (
    <Card className="!h-auto space-y-3">
      <div>
        <h3 className="text-base font-semibold text-text!">Select a product</h3>
        <p className="text-xs text-text-muted mt-0.5">Choose a product to open its UOM conversions.</p>
      </div>
      <div className="relative max-w-md">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reference or label…" className={inputCls} />
      </div>
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-text-faint">
          <Loader2 size={14} className="animate-spin" /> Loading products…
        </p>
      ) : isError ? (
        <LegacyErrorCard title="Couldn't load products" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-faint">
          <PackageSearch size={15} /> No products match.
        </p>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-md border border-border">
          {data.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-hover">
                <span className="min-w-0">
                  <span className="font-semibold text-text!">{p.ref}</span>
                  <span className="ml-2 truncate text-text-muted">{p.label}</span>
                </span>
                <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">
                  {p.uom_count} {p.uom_count === 1 ? 'conversion' : 'conversions'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function UomManagerPage() {
  const [params, setParams] = useSearchParams()
  const productId = params.get('id') ?? ''
  const access = useUomManagerAccess()
  // Only used to show the chosen product's ref/label above its editor.
  const { data: products } = useBoxBreakProducts('')
  const chosen = products?.find((p) => String(p.id) === productId)

  if (access.isLoading) return <LegacyLoadingCard label="Loading UOM Manager…" />

  // The backend refuses to open the manager (and redirects home) when UOM
  // management is switched off in Stock Settings — say the same thing rather
  // than show an editor that cannot work.
  if (access.data && access.data.blockedBy.length > 0) {
    return (
      <div className="space-y-4">
        <Title />
        <Card className="!h-auto">
          <div className="flex items-start gap-2 text-sm text-warning-fg">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              {access.data.blockedBy.map((m) => (
                <p key={m}>{m}</p>
              ))}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Title />
      {!productId ? (
        <ProductPicker onPick={(id) => setParams({ id: String(id) })} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-text-muted">
              Managing conversions for{' '}
              <span className="font-semibold text-text!">{chosen ? `${chosen.ref} — ${chosen.label}` : `product #${productId}`}</span>
            </p>
            <button
              type="button"
              onClick={() => setParams({})}
              className="flex items-center gap-1.5 rounded-md border border-input-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface"
            >
              <ArrowLeft size={13} /> Change product
            </button>
          </div>
          <Suspense fallback={<LegacyLoadingCard label="Loading…" />}>
            <LazyTabRenderer tab="UOM" id={productId} />
          </Suspense>
        </>
      )}
    </div>
  )
}
