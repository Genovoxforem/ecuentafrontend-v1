import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  Info,
  History,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Users,
  Truck,
  MapPin,
  Factory,
  Calendar,
  Warehouse,
  Landmark,
  CheckCircle2,
  Circle,
  Barcode,
} from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { resolveBackendAsset } from '../../../api/backends'
import { ROUTES } from '../../../routes'
import { formatMoney, formatNumber, formatDateTimeAmPm } from '../../../utils/format'
import { NATURE_OPTIONS, WEIGHT_UNITS, SIZE_UNITS, SURFACE_UNITS, VOLUME_UNITS } from '../productConstants'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'
import { isBackendUnavailable, isBackendActionUnavailable, BackendUnavailableCard } from '../../../shared/components/BackendUnavailable'
import {
  useProductDetail,
  useProductDocuments,
  useProductDashboard,
  useDeleteProduct,
  useDuplicateProduct,
} from '../products.queries'
import {
  Th,
  Td,
  EmptyRow,
  TabTable,
  Field,
  FieldRow,
  SectionIcon,
  SectionHeader,
  StatusPill,
  TABS,
  type Tab,
} from './ProductDetailShared'

// Non-default tabs (Selling Prices, Stock, UOM, Supplier Prices, Variants,
// Composition, Statistics, Invoice Stats, Notes, Documents, Events, Margins)
// are lazy-loaded from a separate chunk — only the active tab's code
// downloads, cutting the initial ProductDetail chunk significantly.
// ProductTab stays inline (it's the default, always visible).
const LazyTabRenderer = lazy(() => import('./ProductDetailTabs').then((m) => ({ default: m.LazyTabRenderer })))

// Matches legacy's real primary/overflow tab split exactly (confirmed live
// via product/card.php's own rendered tab bar for product id=123) â€” not a
// guess at grouping, the actual 7 primary + 6 "More..." tabs shown there.
// Icons are a redesign addition (legacy's own primary tab bar has none â€”
// only the More... dropdown does) for visual consistency between the two.
// Same set/order/labels as the real reference page's own tab bar
// (productinfo/index.php, backed by productinfo/json/tabs.json on the
// active backend â€” read directly, not guessed): Product Card, Selling
// Prices, Supplier Prices, Stock, UOM, Variants, Composition, Statistics,
// Invoice Stats, Notes, Documents, Events. Each renamed label maps to the
// SAME underlying data/component as before (confirmed against that json's
// own api file per tab, e.g. variant_api.php uses the same ProductCombination
// class "Product Combinations" already used) â€” only the label changed.
// "Margins" has no equivalent tab in that reference at all (selling-vs-
// buying margin isn't one of its 12 tabs), so it's kept, appended at the
// end, rather than dropped â€” real working functionality, not a guess this
// app should lose just because the reference page doesn't happen to have it.

// Real scannable barcode, rendered client-side from the product's actual
// barcode value via jsbarcode (CODE128 â€” matches product.barcodeType,
// "Code 128", on every product checked live this session). lineColor:
// 'currentColor' lets the SVG inherit the wrapper's text color so it stays
// legible in both themes without a second color prop to keep in sync.
// width is the bar-thickness multiplier, not a pixel target â€” jsbarcode
// derives the SVG's actual rendered width from the encoded value's real
// module count Ã— this. Thinner bars (a lower value) read as a genuine
// barcode at small sizes; the previous fixed 1.4 made bars chunky/blocky
// relative to a compact height, closer to a stylized icon than a real one.
function ProductBarcodeGraphic({ value, height = 28, width = 1 }: { value: string; height?: number; width?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        displayValue: false,
        height,
        width,
        margin: 0,
        background: 'transparent',
        lineColor: 'currentColor',
      })
    } catch {
      // Value has a character CODE128 can't encode â€” leave the SVG empty
      // rather than crash the whole detail page over a cosmetic element.
    }
  }, [value, height, width])
  if (!value) return null
  return <svg ref={ref} className="text-text! shrink-0" />
}

// Small quick-fact chip for the hero header (replaces the old sidebar's
// separate price/stock tile grid).
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1">
      <span className="text-xs font-semibold text-text!">{value}</span>
      <span className="text-[10px] text-text-faint uppercase tracking-wide">{label}</span>
    </span>
  )
}
  

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading, isError, error } = useProductDetail(id)
  const deleteProduct = useDeleteProduct()
  const duplicateProduct = useDuplicateProduct()
  const [actionError, setActionError] = useState('')
  const [tab, setTab] = useState<Tab>('Product Card')
  // Fetched here (not just inside LinkedFilesTab) so its real file count can
  // badge the "Documents" tab button, matching legacy's own file-count badge
  // there â€” same query, react-query just
  // reuses the cached result when the tab itself is opened, no duplicate call.
  const { data: documents } = useProductDocuments(id)

  // English country name from the real ISO code (llx_c_country.code) via the
  // browser's own Intl.DisplayNames â€” the DB's own `label` column is French
  // ("Zambie"), so this isn't a guess, just a locale-correct rendering of a
  // real stored code. Falls back to the raw DB label if the code is missing
  // or unrecognized. Declared before the loading/error early returns below
  // to keep hook-call order stable across renders (Rules of Hooks).
  const originLabel = useMemo(() => {
    if (!product) return ''
    if (product.originCountryCode) {
      try {
        const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(product.originCountryCode)
        if (name) return name
      } catch {
        // Invalid/unsupported region code â€” fall through to the raw DB label.
      }
    }
    return product.originCountry
  }, [product])

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex items-center justify-center">
        <p className="text-sm text-text-muted">Loadingâ€¦</p>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="-m-6 flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-muted">{isError && error instanceof Error ? error.message : `No product found for id "${id}".`}</p>
        <Link to={ROUTES.productList} className="text-sm text-brand hover:underline">
          Back to Products list
        </Link>
      </div>
    )
  }

  function handleDelete() {
    const confirmed = window.confirm(`Delete "${product!.label}" (${product!.ref})? This can't be undone.`)
    if (!confirmed) return
    setActionError('')
    deleteProduct.mutate(id!, {
      onSuccess: () => navigate(ROUTES.productList),
      onError: (err) => setActionError(err instanceof Error ? err.message : 'Delete failed.'),
    })
  }

  function handleDuplicate() {
    const confirmed = window.confirm(`Duplicate "${product!.label}" (${product!.ref})? A new product will be created from a copy of its fields.`)
    if (!confirmed) return
    setActionError('')
    duplicateProduct.mutate(id!, {
      onSuccess: (result) => navigate(ROUTES.productDetail.replace(':id', String(result.id))),
      onError: (err) => setActionError(err instanceof Error ? err.message : 'Duplicate failed.'),
    })
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.productList} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> Products
        </Link>
        <Link to={ROUTES.productList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          {/* Hero + tab bar are ONE card now, not two stacked with a
              gap between them â€” the hero's own bottom border is what separates
              it from the tab bar, matching a single continuous panel instead
              of two separate boxes. Card itself goes !p-0 so the tab bar/
              content (which already assumed edge-to-edge placement) aren't
              double-padded; the hero section gets its own p-4 wrapper instead. */}
          <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
          <div className="flex items-start gap-4 min-w-[240px] flex-1">
            <Avatar
              photo={product.hasImage ? resolveBackendAsset(product.imageUrl) : undefined}
              name={product.label}
              size={120}
              rounded="lg"
              color="bg-brand"
            />
            <div className="space-y-2 pt-0.5">
              <div className="flex items-start gap-2">
                <h2 className="text-lg font-bold text-text!">{product.label}</h2>
                <StatusPill active={product.forSale} activeLabel="For sale" inactiveLabel="Not for sale" tone="success" />
              </div>
              <span className="inline-block rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-text-muted">
                SKU <span className="font-medium text-text!">{product.ref}</span>
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-faint">
                <span className="flex items-center gap-1">
                  <Package size={12} /> {product.type === 'service' ? 'Service' : 'Product'}
                </span>
                {originLabel && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {product.originCountryCode ? `${product.originCountryCode} - ${originLabel}` : originLabel}
                  </span>
                )}
                {product.manufacturer && (
                  <span className="flex items-center gap-1">
                    <Factory size={12} /> {product.manufacturer}
                  </span>
                )}
                {product.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Created {formatDateTimeAmPm(product.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-2 pt-0.5">
                <StatChip label="Price Inc." value={formatMoney(product.priceInclTax)} />
                <StatChip label="Stock" value={formatNumber(product.stock)} />
                {product.barcode && (
                  <div className="flex flex-col items-center gap-0.5 shrink-0 ml-3">
                    <ProductBarcodeGraphic value={product.barcode} height={36} width={1.0} />
                    <span className="text-[9px] text-text-faint whitespace-nowrap">{product.barcode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1">
              {/* Edit now opens ProductEditForm.tsx, a native rebuild of
                  productinfo/api/edit_wizard.php's real 4-step wizard,
                  instead of the real page in a new tab â€” see that
                  component's own header comment. Duplicate/Delete are real
                  productinfo/api/product_api.php calls (see
                  products.queries.ts) â€” Duplicate is currently confirmed
                  broken on this backend (a real Product::create() bug, not
                  fixable from here) and will surface that as an error
                  rather than fake success. Edit is styled as the primary
                  (filled) action now, matching the real reference header. */}
              <Link
                to={ROUTES.productEdit.replace(':id', id ?? '')}
                title="Edit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover"
              >
                <Pencil size={14} /> Edit
              </Link>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={duplicateProduct.isPending}
                title="Duplicate"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text disabled:opacity-60"
              >
                <Copy size={14} /> {duplicateProduct.isPending ? 'Duplicatingâ€¦' : 'Duplicate'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteProduct.isPending}
                title="Delete"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger/40 text-danger text-sm font-medium hover:bg-danger-bg disabled:opacity-60"
              >
                <Trash2 size={14} /> {deleteProduct.isPending ? 'Deletingâ€¦' : 'Delete'}
              </button>
              <Link to={ROUTES.productList} title="Close" className="p-1.5 rounded-md border border-border text-text-faint hover:bg-surface-hover hover:text-text">
                <X size={16} />
              </Link>
            </div>
            <StatusPill active={product.forPurchase} activeLabel="For purchase" inactiveLabel="Not for purchase" tone="info" />
          </div>
          </div>

          <div className="border-t border-border">
            <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6" style={{ scrollBehavior: 'smooth' }}>
              {TABS.map(({ label: t, icon: Icon }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                  }`}
                >
                  <Icon size={14} className="shrink-0" /> {t}
                  {t === 'Documents' && !!documents?.count && (
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-danger text-white text-[10px] font-semibold">
                      {documents.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {actionError && <p className="text-sm text-danger mt-2">{actionError}</p>}

        {/* Content is its own section now, separate from the hero+tab-bar
            card above (space-y-4 on the parent gives the real visible gap
            between them) rather than packed into the same card.
            Product Card/Notes/Statistics render directly, no shared wrapper â€”
            each already carries its own card styling internally (Product
            Card's About/Pricing/Product Accountancy/Overview/Timeline/
            Connections/Teams; Notes' own Card; Statistics' grid of
            per-metric Cards).
            Wrapping any of those in another Card here would nest a card
            inside a card, which is exactly what silently disappeared for
            Activity Timeline earlier (same bg-surface-alt as its parent,
            border and fill both blending in) â€” this avoids repeating that.
            Every remaining tab is a bare table with no card of its own, so
            it still gets one shared Card, same as before the hero/tab-bar
            merge. */}
        {tab === 'Product Card' && <ProductTab product={product} id={id} onViewAllActivity={() => setTab('Invoice Stats')} />}
        {tab !== 'Product Card' && (
          <Suspense fallback={<LegacyLoadingCard label='Loading…' />}>
            <LazyTabRenderer tab={tab} id={id} product={product} onViewAllActivity={() => setTab('Invoice Stats')} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

// About + Pricing sections match legacy's product/card.php field-for-field
// (verified live against product id=123, the same "Zktecho" product the
// reference screenshots show â€” every value here cross-checked to match
// exactly, including Total Sold Qty/Amount and the resolved
// manufacturer/base-unit/packing-unit/barcode-type labels).
function ProductTab({
  product,
  id,
  onViewAllActivity,
}: {
  product: ReturnType<typeof useProductDetail>['data'] & object
  id: string | undefined
  onViewAllActivity: () => void
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        {/* About/Pricing/Product Accountancy each get their own bordered card
            now â€” previously all three shared one card with only spacing
            between them, which read as one big block instead of distinct
            sections, unlike the right column's Timeline/Connections/Teams
            (already three separate cards). Same field content/order/
            positioning as before (About on the left, Pricing above
            Accountancy on the right), just genuinely separated. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="!h-auto">
            <SectionHeader icon={Info} color="blue">
              About
            </SectionHeader>
            <div>
              <Field label="Type" value={product.type === 'service' ? 'Service' : 'Product'} />
              <Field label="Item Code" value={product.classification} />
              <Field label="ZRA Updated Product Code" value={product.zraId} />
              <FieldRow label="ZRA Updated Status">
                {product.zraStatus ? (
                  <span className={`font-medium ${/succeed|success|sent|valid|ok/i.test(product.zraStatus) ? 'text-success' : 'text-text-muted'}`}>{product.zraStatus}</span>
                ) : (
                  'â€”'
                )}
              </FieldRow>
              <FieldRow label="Base Unit">
                {product.baseUnit ? (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-info-bg text-info-fg">{product.baseUnit}</span>
                ) : (
                  'â€”'
                )}
              </FieldRow>
              <FieldRow label="Packing Unit">
                {product.packingUnit ? (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{product.packingUnit}</span>
                ) : (
                  'â€”'
                )}
              </FieldRow>
              <Field label="Barcode Type" value={product.barcodeType} />
              <FieldRow label="Barcode Value">
                {product.barcode ? (
                  <span className="inline-flex items-center gap-2">
                    {product.barcode}
                    <ProductBarcodeGraphic value={product.barcode} height={34} width={1.1} />
                  </span>
                ) : (
                  'â€”'
                )}
              </FieldRow>
              <FieldRow label="Use Lot/Serial Number">
                <span className={`inline-flex items-center gap-1.5 font-medium ${product.useLotSerial ? 'text-info' : 'text-text-muted'}`}>
                  {product.useLotSerial ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {product.useLotSerial ? 'Yes (Lot/Serial Required)' : 'No (Lot/Serial Not Used)'}
                </span>
              </FieldRow>
              <Field label="Description" value={product.description} />
              <Field label="Public URL" value={product.publicUrl} />
              <Field label="Default Warehouse" value={product.defaultWarehouse} />
              <Field label="RRP" value={formatMoney(product.rrp)} />
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="!h-auto">
              <SectionHeader icon={Tag} color="green">
                Pricing
              </SectionHeader>
              <div>
                <Field label="Price (HT)" value={formatMoney(product.priceExclTax)} />
                <Field label="Price (TTC)" value={formatMoney(product.priceInclTax)} />
                <Field label="Tax Rate" value={product.vatRate} />
                <Field label="Total Sold Qty" value={formatNumber(product.totalSoldQty)} />
                <Field label="Total Sold Amount" value={formatMoney(product.totalSoldAmount)} />
                <Field label="Manufacturer / Vendor" value={product.manufacturer} />
              </div>
            </Card>

            {/* Split out of the About list into its own sub-panel, matching the
                reference design's grouping exactly â€” same 4 real accountancy-code
                fields as before, just labeled as their own section. Grows to fill
                the rest of this column (flex-1, no !h-auto override) so its bottom
                edge lines up with About's on the left â€” this column sits in a grid
                row stretched to About's height, so the extra space is real, not the
                unbounded-ancestor case the shared Card's h-full otherwise misbehaves
                in (see the h-full inflation note on that component). */}
            <Card className="flex-1">
              <SectionHeader icon={Landmark} color="violet">
                Product Accountancy
              </SectionHeader>
              <div>
                <Field label="Sell Code" value={product.accountancySell} />
                <Field label="Sell Export Code" value={product.accountancySellExport} />
                <Field label="Buy Code" value={product.accountancyBuy} />
                <Field label="Buy Export Code" value={product.accountancyBuyExport} />
              </div>
            </Card>
          </div>
        </div>

        {/* Matches product/card.php's separate "Overview" card exactly (confirmed by reading
            the source: Nature, Weight, Length x Width x Height, Area, Volume, Custom Code,
            Origin, Categories, in that order) â€” a distinct card from About/Pricing above, not
            a guess at grouping. Origin itself now lives in the hero header instead of being
            shown twice. */}
        <Card className="!h-auto">
          <SectionHeader icon={Eye} color="amber">
            Overview
          </SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <Field label="Nature Of Product" value={NATURE_OPTIONS.find((o) => o.value === String(product.finished))?.label ?? ''} />
            <Field label="Weight" value={formatDimension(product.weight, product.weightUnits, WEIGHT_UNITS)} />
            <Field
              label="Length X Width X Height"
              value={[product.length, product.width, product.height].some((v) => v !== null) ? formatDimension3(product.length, product.width, product.height, product.lengthUnits) : ''}
            />
            <Field label="Area" value={formatDimension(product.surface, product.surfaceUnits, SURFACE_UNITS)} />
            <Field label="Volume" value={formatDimension(product.volume, product.volumeUnits, VOLUME_UNITS)} />
            <Field label="Customs/Commodity/HS Code" value={product.customCode} />
            <Field label="Tags/Categories" value={product.categories.map((c) => c.label).join(', ')} />
          </div>
        </Card>
      </div>

      {/* !bg-surface (not the default bg-surface-alt) â€” these three cards sit
          nested inside the tab-content Card, which is ALSO bg-surface-alt.
          In dark mode --color-border and --color-surface-alt resolve to the
          exact same value, so a surface-alt card directly inside another
          surface-alt card has no visible edge at all (border and fill both
          disappear into the parent). bg-surface is a genuinely different
          shade, so these read as distinct cards the way About/Pricing/
          Product Accountancy already do against the page background. */}
      {/* flex column (not space-y-4) so the last card below can flex-1 and
          absorb the leftover height â€” this column sits in the same outer
          grid row as the left "About/Pricing + Overview" column, which is
          usually taller, so without this the right column's own bottom
          (Teams) fell short of the left column's bottom (Overview) instead
          of lining up with it. */}
      <div className="flex flex-col gap-4">
        <Card className="!h-auto !p-0 !bg-surface">
          <ActivityTimeline id={id} onViewAll={onViewAllActivity} />
        </Card>
        <Card className="!h-auto !p-0 !bg-surface">
          <ConnectionsPanel id={id} />
        </Card>
        <Card className="flex-1 !p-0 !bg-surface">
          <TeamsPanel id={id} />
        </Card>
      </div>
    </div>
  )
}

function formatDimension(value: number | null, unitCode: number, table: { value: string; label: string }[]): string {
  if (value === null) return ''
  const unit = table.find((u) => u.value === String(unitCode))?.label ?? ''
  return unit ? `${value} ${unit}` : String(value)
}
function formatDimension3(length: number | null, width: number | null, height: number | null, unitCode: number): string {
  const parts = [length, width, height].filter((v) => v !== null)
  const unit = SIZE_UNITS.find((u) => u.value === String(unitCode))?.label ?? ''
  return `${parts.join(' x ')}${unit ? ' ' + unit : ''}`
}

// Real order/invoice history, customers, and vendors for this product â€” all
// from product/ajax/product_dashboard.php (see useProductDashboard), the
// SAME AJAX endpoint legacy's own Product tab dashboard cards call. Paid
// dot uses status_id (2 = Paid in that endpoint's own status map), matching
// its "Unpaid"/"Paid"/"Draft"/"Cancelled" labels directly rather than
// re-deriving from a different source.
function ActivityTimeline({ id, onViewAll }: { id: string | undefined; onViewAll: () => void }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error, refetch } = useProductDashboard(id, page)
  const totalPages = data ? Math.max(1, Math.ceil(data.timelineTotal / data.timelinePerPage)) : 1
  const rangeStart = data ? (data.timelinePage - 1) * data.timelinePerPage + 1 : 0
  const rangeEnd = data ? Math.min(data.timelinePage * data.timelinePerPage, data.timelineTotal) : 0

  return (
    <div className="p-4">
      <SectionHeader icon={History} color="indigo">
        Activity Timeline
      </SectionHeader>
      {isLoading && <p className="text-xs text-text-faint">Loadingâ€¦</p>}
      {isError && <LegacyErrorCard title="Couldn't load activity" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && data.timeline.length === 0 && <p className="text-xs text-text-faint italic">No invoices found for this product.</p>}
      {data && data.timeline.length > 0 && (
        <>
          {/* Capped to roughly match the Pricing card's height (its sibling
              across the two-column layout) instead of the previous 420px,
              which let a full page of invoices make this card much taller
              than everything next to it â€” scrolls internally past that. */}
          <ul className="space-y-3 max-h-[190px] overflow-auto">
            {data.timeline.map((t) => (
              <li key={t.invoiceId} className="flex items-start gap-2">
                <span className={`mt-1.5 inline-flex w-2 h-2 rounded-full shrink-0 ${t.statusId === 2 ? 'bg-success' : 'bg-warning'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text! truncate">{t.ref}</span>
                    <span className="text-xs text-text-faint whitespace-nowrap">{t.date}</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {t.customer} â€” {t.amount}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${t.statusId === 2 ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}
                  >
                    {t.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {/* Matches legacy's own "Xâ€“Y of Z" pager exactly (product/card.php's inline JS,
              loadTimeline()) â€” only rendered when there's more than one page, same as there. */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <span className="text-xs text-text-faint">
                {rangeStart}â€“{rangeEnd} of {data.timelineTotal}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="text-xs text-text-faint px-1">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
          {/* Real destination: the Related Items tab is this same product's full
              invoice history (useProductReferers), the closest genuine "see
              everything" target â€” no dedicated standalone activity page exists. */}
          <button type="button" onClick={onViewAll} className="mt-2 text-xs font-medium text-brand hover:underline">
            View all activities â†’
          </button>
        </>
      )}
    </div>
  )
}

function InitialAvatar({ initials }: { initials: string }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand/10 text-brand text-sm font-semibold shrink-0">{initials}</span>
  )
}

// Connections (Customers who bought this product) and Teams (Vendors who
// supply it) â€” both from the same product_dashboard.php call as the
// timeline above; react-query dedupes the fetch since it's the same
// queryKey/hook, no duplicate request.
function ConnectionsPanel({ id }: { id: string | undefined }) {
  const { data, isLoading } = useProductDashboard(id)
  if (isLoading) return null
  return (
    <div className="p-4">
      <SectionHeader icon={Users} color="cyan">
        Connections <span className="text-text-faint font-normal">(Customers)</span>
      </SectionHeader>
      {(!data || data.connections.length === 0) && <p className="text-xs text-text-faint italic">No customers yet.</p>}
      {data && data.connections.length > 0 && (
        <ul className="space-y-2">
          {data.connections.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <InitialAvatar initials={c.initials} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text! truncate">{c.name}</p>
                <p className="text-xs text-text-faint">{c.connectionsLabel}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TeamsPanel({ id }: { id: string | undefined }) {
  const { data, isLoading } = useProductDashboard(id)
  if (isLoading) return null
  return (
    <div className="p-4">
      <SectionHeader icon={Truck} color="rose">
        Teams <span className="text-text-faint font-normal">(Vendors)</span>
      </SectionHeader>
      {(!data || data.teams.length === 0) && <p className="text-xs text-text-faint italic">No vendors yet.</p>}
      {data && data.teams.length > 0 && (
        <ul className="space-y-2">
          {data.teams.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <InitialAvatar initials={t.initials} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text! truncate">{t.name}</p>
                <p className="text-xs text-text-faint">{t.connectionsLabel}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

