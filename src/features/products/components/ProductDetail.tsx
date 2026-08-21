import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  FileText,
  Paperclip,
  CalendarClock,
  Save,
  Info,
  Tag,
  History,
  ChartPie,
  StickyNote,
  Percent,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Users,
  Truck,
  MapPin,
  Factory,
  Calendar,
  Ruler,
  ShoppingCart,
  Link2,
  Shapes,
  Warehouse,
  Landmark,
  CheckCircle2,
  Circle,
  Barcode,
  Wand2,
  AlertTriangle,
  Star,
  Layers,
  Boxes,
  Plus,
  Wrench,
  ArrowLeftRight,
  Search,
  Upload,
  Download,
  TrendingUp,
  Clock,
  UserRound,
  DollarSign,
} from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { resolveBackendAsset, BACKEND_URLS, getActiveBackend } from '../../../api/backends'
import { ROUTES } from '../../../routes'
import { formatMoney, formatNumber, formatDateTimeAmPm } from '../../../utils/format'
import { NATURE_OPTIONS, WEIGHT_UNITS, SIZE_UNITS, SURFACE_UNITS, VOLUME_UNITS } from '../productConstants'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'
import { isBackendUnavailable, isBackendActionUnavailable, BackendUnavailableCard } from '../../../shared/components/BackendUnavailable'
import {
  useProductDetail,
  useProductDocuments,
  useUploadProductDocument,
  useDeleteProductDocument,
  useProductMargins,
  useProductDashboard,
  useDeleteProduct,
  useDuplicateProduct,
  useProductStockOverview,
  useSetStockField,
  useProductUomOverview,
  useSaveProductBarcode,
  useGenerateProductBarcode,
  useDeleteUomConversion,
  useSaveUomConversion,
  useProductSupplierOverview,
  useProductPriceOverview,
  useDeletePriceLog,
  useCorrectStock,
  useTransferStock,
  useProductVariantOverview,
  useCreateCombination,
  useDeleteCombination,
  useProductCompositionOverview,
  useAddSubproduct,
  useDeleteSubproduct,
  useProductSearch,
  useProductStatsOverview,
  useProductNotesOverview,
  useSaveProductNotes,
  useProductAgendaEvents,
  useProductInvoiceStats,
  type ProductUomOverview,
  type ProductVariantOverview,
} from '../products.queries'

// Matches legacy's real primary/overflow tab split exactly (confirmed live
// via product/card.php's own rendered tab bar for product id=123) — not a
// guess at grouping, the actual 7 primary + 6 "More..." tabs shown there.
// Icons are a redesign addition (legacy's own primary tab bar has none —
// only the More... dropdown does) for visual consistency between the two.
// Same set/order/labels as the real reference page's own tab bar
// (productinfo/index.php, backed by productinfo/json/tabs.json on the
// active backend — read directly, not guessed): Product Card, Selling
// Prices, Supplier Prices, Stock, UOM, Variants, Composition, Statistics,
// Invoice Stats, Notes, Documents, Events. Each renamed label maps to the
// SAME underlying data/component as before (confirmed against that json's
// own api file per tab, e.g. variant_api.php uses the same ProductCombination
// class "Product Combinations" already used) — only the label changed.
// "Margins" has no equivalent tab in that reference at all (selling-vs-
// buying margin isn't one of its 12 tabs), so it's kept, appended at the
// end, rather than dropped — real working functionality, not a guess this
// app should lose just because the reference page doesn't happen to have it.
const TABS = [
  { label: 'Product Card', icon: Package },
  { label: 'Selling Prices', icon: Tag },
  { label: 'Supplier Prices', icon: ShoppingCart },
  { label: 'Stock', icon: Warehouse },
  { label: 'UOM', icon: Ruler },
  { label: 'Variants', icon: Shapes },
  { label: 'Composition', icon: Link2 },
  { label: 'Statistics', icon: ChartPie },
  { label: 'Invoice Stats', icon: FileText },
  { label: 'Notes', icon: StickyNote },
  { label: 'Documents', icon: Paperclip },
  { label: 'Events', icon: CalendarClock },
  { label: 'Margins', icon: Percent },
] as const
type Tab = (typeof TABS)[number]['label']

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`font-medium px-3 py-2.5 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}
function Td({ children, right, muted }: { children: React.ReactNode; right?: boolean; muted?: boolean }) {
  return <td className={`px-3 py-2 whitespace-nowrap ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-text-muted' : 'text-text!'}`}>{children}</td>
}
function EmptyRow({ span, label }: { span: number; label: string }) {
  return (
    <tr>
      <td colSpan={span} className="px-3 py-8 text-center text-text-faint italic">
        {label}
      </td>
    </tr>   
  )
}
function TabTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm [&_tbody_tr:hover]:bg-surface-hover">{children}</table>
    </div>
  )
}

// max-w-md caps how far label/value spread apart — without it, `justify-between`
// stretches them to the full row width, and since About/Pricing/Product
// Accountancy sit in a 2-column grid sharing whatever's left after a fixed
// 360px right column, Pricing/Accountancy's half can end up far wider than
// its short label/value pairs need, leaving a large, unintentional-looking
// gap between the value and the card's edge.
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0 max-w-md">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || '—'}</span>
    </div>
  )
}
// Same row layout as Field, for the handful of About rows whose value is a
// badge/icon/graphic instead of plain text.
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0 max-w-md">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-right">{children}</span>
    </div>
  )
}

// Small colored icon badge used ahead of section headings throughout this
// page (Overview tab's About/Pricing/Accountancy/Overview sections, and the
// Activity Timeline/Connections/Teams panels) — reuses DashboardKit's own
// ICON_STYLES palette rather than inventing new colors.
function SectionIcon({ icon: Icon, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${ICON_STYLES[color]}`}>
      <Icon size={14} />
    </span>
  )
}
function SectionHeader({ icon, color, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-text! mb-2.5">
      <SectionIcon icon={icon} color={color} /> {children}
    </h3>
  )
}

// Dot + label status pill for the hero header's On Sell / On Buy badges —
// both real fields (product.forSale/forPurchase), always shown so the
// absence of a status reads as explicitly "off" rather than just missing.
function StatusPill({ active, activeLabel, inactiveLabel, tone = 'success' }: { active: boolean; activeLabel: string; inactiveLabel: string; tone?: 'success' | 'info' }) {
  const activeCls = tone === 'info' ? 'bg-info-bg text-info-fg' : 'bg-success-bg text-success-fg'
  const dotCls = tone === 'info' ? 'bg-info' : 'bg-success'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${active ? activeCls : 'bg-neutral-bg text-neutral-fg'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? dotCls : 'bg-text-faint'}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

// Real scannable barcode, rendered client-side from the product's actual
// barcode value via jsbarcode (CODE128 — matches product.barcodeType,
// "Code 128", on every product checked live this session). lineColor:
// 'currentColor' lets the SVG inherit the wrapper's text color so it stays
// legible in both themes without a second color prop to keep in sync.
// width is the bar-thickness multiplier, not a pixel target — jsbarcode
// derives the SVG's actual rendered width from the encoded value's real
// module count × this. Thinner bars (a lower value) read as a genuine
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
      // Value has a character CODE128 can't encode — leave the SVG empty
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
  
// Bigger stat tile for the Stock/UOM/Supplier Prices tabs (base unit,
// conversions count, supplier count, etc.) — same {label above, value, caption
// below} shape as the Customers list's own stat cards, just a tab-local
// component since nothing else on this page needs it.
function MetricTile({ icon: Icon, color, label, value, caption }: { icon: React.ComponentType<{ size?: number }>; color: IconColor; label: string; value: string | number; caption?: string }) {
  return (
    <Card className="!h-auto !p-3 flex-row items-center gap-3">
      <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-text! truncate">{value}</p>
        {caption && <p className="text-xs text-text-faint truncate">{caption}</p>}
      </div>
    </Card>
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
  // there — same query, react-query just
  // reuses the cached result when the tab itself is opened, no duplicate call.
  const { data: documents } = useProductDocuments(id)

  // English country name from the real ISO code (llx_c_country.code) via the
  // browser's own Intl.DisplayNames — the DB's own `label` column is French
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
        // Invalid/unsupported region code — fall through to the raw DB label.
      }
    }
    return product.originCountry
  }, [product])

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading…</p>
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
    <div className="-m-6 flex-1 flex flex-col min-h-0">
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
              gap between them — the hero's own bottom border is what separates
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
                  instead of the real page in a new tab — see that
                  component's own header comment. Duplicate/Delete are real
                  productinfo/api/product_api.php calls (see
                  products.queries.ts) — Duplicate is currently confirmed
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
                <Copy size={14} /> {duplicateProduct.isPending ? 'Duplicating…' : 'Duplicate'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteProduct.isPending}
                title="Delete"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger/40 text-danger text-sm font-medium hover:bg-danger-bg disabled:opacity-60"
              >
                <Trash2 size={14} /> {deleteProduct.isPending ? 'Deleting…' : 'Delete'}
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
            Product Card/Notes/Statistics render directly, no shared wrapper —
            each already carries its own card styling internally (Product
            Card's About/Pricing/Product Accountancy/Overview/Timeline/
            Connections/Teams; Notes' own Card; Statistics' grid of
            per-metric Cards).
            Wrapping any of those in another Card here would nest a card
            inside a card, which is exactly what silently disappeared for
            Activity Timeline earlier (same bg-surface-alt as its parent,
            border and fill both blending in) — this avoids repeating that.
            Every remaining tab is a bare table with no card of its own, so
            it still gets one shared Card, same as before the hero/tab-bar
            merge. */}
        {tab === 'Product Card' && <ProductTab product={product} id={id} onViewAllActivity={() => setTab('Invoice Stats')} />}
        {tab === 'Statistics' && <StatisticsTab id={id} />}
        {tab === 'Notes' && <NotesTab id={id} />}
        {/* Selling Prices/Stock/UOM/Supplier Prices/Variants/Composition/
            Documents/Events all render directly (own multi-card layout, real
            data — see productinfo/api/{price,stock,uom,supplier,variant,
            subproduct,document,agenda}_api.php) rather than inside the
            shared flat-table Card below — same nested-card reasoning as the
            note above. */}
        {tab === 'Selling Prices' && <SellingPricesTab id={id} />}
        {tab === 'Stock' && <StockTab id={id} />}
        {tab === 'UOM' && <UomSettingsTab id={id} />}
        {tab === 'Supplier Prices' && <BuyingPricesTab id={id} />}
        {tab === 'Variants' && <ProductCombinationsTab id={id} />}
        {tab === 'Composition' && <AssociatedProductsTab id={id} />}
        {tab === 'Invoice Stats' && <InvoiceStatsTab id={id} />}
        {tab === 'Documents' && <LinkedFilesTab id={id} />}
        {tab === 'Events' && <EventsTab id={id} />}
        {tab === 'Margins' && (
          <Card className="!h-auto">
            <MarginsTab id={id} />
          </Card>
        )}
      </div>
    </div>
  )
}

// About + Pricing sections match legacy's product/card.php field-for-field
// (verified live against product id=123, the same "Zktecho" product the
// reference screenshots show — every value here cross-checked to match
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
            now — previously all three shared one card with only spacing
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
                  '—'
                )}
              </FieldRow>
              <FieldRow label="Base Unit">
                {product.baseUnit ? (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-info-bg text-info-fg">{product.baseUnit}</span>
                ) : (
                  '—'
                )}
              </FieldRow>
              <FieldRow label="Packing Unit">
                {product.packingUnit ? (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{product.packingUnit}</span>
                ) : (
                  '—'
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
                  '—'
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
                reference design's grouping exactly — same 4 real accountancy-code
                fields as before, just labeled as their own section. Grows to fill
                the rest of this column (flex-1, no !h-auto override) so its bottom
                edge lines up with About's on the left — this column sits in a grid
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
            Origin, Categories, in that order) — a distinct card from About/Pricing above, not
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

      {/* !bg-surface (not the default bg-surface-alt) — these three cards sit
          nested inside the tab-content Card, which is ALSO bg-surface-alt.
          In dark mode --color-border and --color-surface-alt resolve to the
          exact same value, so a surface-alt card directly inside another
          surface-alt card has no visible edge at all (border and fill both
          disappear into the parent). bg-surface is a genuinely different
          shade, so these read as distinct cards the way About/Pricing/
          Product Accountancy already do against the page background. */}
      {/* flex column (not space-y-4) so the last card below can flex-1 and
          absorb the leftover height — this column sits in the same outer
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

// Real order/invoice history, customers, and vendors for this product — all
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
      {isLoading && <p className="text-xs text-text-faint">Loading…</p>}
      {isError && <LegacyErrorCard title="Couldn't load activity" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && data.timeline.length === 0 && <p className="text-xs text-text-faint italic">No invoices found for this product.</p>}
      {data && data.timeline.length > 0 && (
        <>
          {/* Capped to roughly match the Pricing card's height (its sibling
              across the two-column layout) instead of the previous 420px,
              which let a full page of invoices make this card much taller
              than everything next to it — scrolls internally past that. */}
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
                    {t.customer} — {t.amount}
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
          {/* Matches legacy's own "X–Y of Z" pager exactly (product/card.php's inline JS,
              loadTimeline()) — only rendered when there's more than one page, same as there. */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <span className="text-xs text-text-faint">
                {rangeStart}–{rangeEnd} of {data.timelineTotal}
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
              everything" target — no dedicated standalone activity page exists. */}
          <button type="button" onClick={onViewAll} className="mt-2 text-xs font-medium text-brand hover:underline">
            View all activities →
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
// supply it) — both from the same product_dashboard.php call as the
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

function SellingPricesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductPriceOverview(id)
  const deleteLog = useDeletePriceLog()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  if (isLoading) return <LegacyLoadingCard label="Loading selling prices…" />
  if (isError) return <LegacyErrorCard title="Couldn't load selling prices" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  function handleDeleteLog(rowid: number) {
    if (!window.confirm('Delete this price log entry?')) return
    deleteLog.mutate({ id: id!, lineId: rowid })
  }

  const totalRecords = data.priceLog.length
  const totalPages = Math.ceil(totalRecords / pageSize)
  const pageStart = page * pageSize + 1
  const pageEnd = Math.min((page + 1) * pageSize, totalRecords)
  const paginatedData = data.priceLog.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-4">
      <Card className="!h-auto !py-2 sticky top-0 z-10 !bg-white dark:!bg-gray-950 border-b border-border">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-text-faint">Default Tax Rate</span>
            <span className="text-sm font-medium">{data.vatDisplay || '0%'}</span>
          </div>
          {data.zra.map((z) => (
            <div key={z.label} className="flex items-baseline gap-2">
              <span className="text-xs text-text-faint">{z.label}</span>
              <span className="text-sm font-medium">{z.amount} ({z.code})</span>
            </div>
          ))}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-text-faint">Selling Price</span>
            <span className="text-sm font-medium">{formatMoney(data.sellingPrice)} {data.priceBaseType}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-text-faint">Min Price</span>
            <span className="text-sm font-medium">{formatMoney(data.minPrice)} {data.priceBaseType}</span>
          </div>
          <button type="button" disabled title="Not built yet — needs a VAT/ZRA-category picker, same scope as this session's other deferred write actions" className="ml-auto px-3 py-1.5 rounded-md bg-brand/40 text-white text-sm font-medium cursor-default">
            Update Default Price
          </button>
        </div>
      </Card>

      <Card className="!h-auto flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="sticky top-[50px] z-20 bg-white dark:bg-gray-950 -mx-4 px-4 py-1.5 flex items-center justify-between border-b border-border">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
              <SectionIcon icon={Tag} color="green" /> Selling Prices
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Page Size</label>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setPage(0) }} className={modalInputCls + ' py-1.5 w-24'}>
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
              </select>
            </div>
          </div>

          <div className="flex-1 flex flex-col -mx-4 border border-border rounded overflow-hidden">
            <div className={`overflow-y-auto ${pageSize === 50 ? 'max-h-[900px]' : pageSize === 20 ? 'max-h-[550px]' : 'max-h-[400px]'}`}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <Th>Applied Prices From</Th>
                    <Th>Price Base</Th>
                    <Th right>Default Tax Rate</Th>
                    <Th right>HT</Th>
                    <Th right>TTC</Th>
                    <Th right>Min Price HT</Th>
                    <Th right>Min Price TTC</Th>
                    <Th>Changed By</Th>
                    {data.canDelete && <Th right>Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <EmptyRow span={data.canDelete ? 9 : 8} label={totalRecords === 0 ? 'No price history.' : 'No results for current page.'} />
                  ) : (
                    paginatedData.map((row) => (
                      <tr key={row.rowid} className="border-b border-border last:border-0">
                        <Td muted>{row.dateStr}</Td>
                        <Td muted>{row.priceBaseType}</Td>
                        <Td right muted>
                          {row.vatDisplay}
                        </Td>
                        <Td right>{formatMoney(row.price)}</Td>
                        <Td right>{formatMoney(row.priceTtc)}</Td>
                        <Td right muted>
                          {formatMoney(row.priceMin)}
                        </Td>
                        <Td right muted>
                          {formatMoney(row.priceMinTtc)}
                        </Td>
                        <Td muted>{row.userName}</Td>
                        {data.canDelete && (
                          <Td right>
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(row.rowid)}
                              disabled={deleteLog.isPending}
                              title="Delete log entry"
                              className="p-1 rounded text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalRecords > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-faint bg-white dark:bg-gray-950">
                <span>
                  {pageStart}–{pageEnd} of {totalRecords}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="px-1">
                    {page + 1} / {totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Editable number field for Stock Alert Threshold / Desired Stock — mirrors
// the real page's own onchange-save inputs (productinfo_stock.js), saving
// on blur only when the value actually changed.
function StockNumberField({ label, value, editable, onSave }: { label: string; value: string; editable: boolean; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <FieldRow label={label}>
      {editable ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onSave(draft)
          }}
          className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-right text-text!"
        />
      ) : (
        value || '—'
      )}
    </FieldRow>
  )
}

function CorrectStockModal({ id, warehouseOptions, onClose }: { id: string; warehouseOptions: { value: string; label: string }[]; onClose: () => void }) {
  const correctStock = useCorrectStock()
  const [warehouseId, setWarehouseId] = useState('')
  const [mouvement, setMouvement] = useState<'0' | '1'>('0')
  const [qty, setQty] = useState('')
  const [label, setLabel] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!warehouseId) return setError('Warehouse is required!')
    if (!qty || Number(qty) <= 0) return setError('Quantity must be a positive number!')
    correctStock.mutate(
      { id, warehouseId, qty, mouvement, label, unitPrice },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title="Correct Stock"
      onClose={onClose}
      footer={
        <button type="button" onClick={handleSave} disabled={correctStock.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60">
          {correctStock.isPending ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <ModalField label="Warehouse">
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={modalInputCls}>
          <option value="">Select…</option>
          {warehouseOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </ModalField>
      <div className="grid grid-cols-2 gap-3">
        <ModalField label="Movement">
          <select value={mouvement} onChange={(e) => setMouvement(e.target.value as '0' | '1')} className={modalInputCls}>
            <option value="0">Add stock</option>
            <option value="1">Remove stock</option>
          </select>
        </ModalField>
        <ModalField label="Quantity">
          <input value={qty} onChange={(e) => setQty(e.target.value)} className={modalInputCls} />
        </ModalField>
      </div>
      <ModalField label="Unit Price">
        <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={modalInputCls} />
      </ModalField>
      <ModalField label="Label">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={modalInputCls} />
      </ModalField>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

function TransferStockModal({ id, warehouseOptions, onClose }: { id: string; warehouseOptions: { value: string; label: string }[]; onClose: () => void }) {
  const transferStock = useTransferStock()
  const [warehouseFrom, setWarehouseFrom] = useState('')
  const [warehouseTo, setWarehouseTo] = useState('')
  const [qty, setQty] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!warehouseFrom || !warehouseTo) return setError('Both warehouses are required!')
    if (warehouseFrom === warehouseTo) return setError('Source and destination warehouses must differ!')
    if (!qty || Number(qty) <= 0) return setError('Quantity must be a positive number!')
    transferStock.mutate(
      { id, warehouseFrom, warehouseTo, qty, label },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title="Transfer Stock"
      onClose={onClose}
      footer={
        <button type="button" onClick={handleSave} disabled={transferStock.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60">
          {transferStock.isPending ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalField label="From Warehouse">
          <select value={warehouseFrom} onChange={(e) => setWarehouseFrom(e.target.value)} className={modalInputCls}>
            <option value="">Select…</option>
            {warehouseOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="To Warehouse">
          <select value={warehouseTo} onChange={(e) => setWarehouseTo(e.target.value)} className={modalInputCls}>
            <option value="">Select…</option>
            {warehouseOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
      </div>
      <ModalField label="Quantity">
        <input value={qty} onChange={(e) => setQty(e.target.value)} className={modalInputCls} />
      </ModalField>
      <ModalField label="Label">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={modalInputCls} />
      </ModalField>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

function StockTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductStockOverview(id)
  const setStockField = useSetStockField()
  const [stockModal, setStockModal] = useState<'correct' | 'transfer' | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading stock overview…" />
  if (isError) return <LegacyErrorCard title="Couldn't load stock" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  const diff = data.stockDiff
  const diffRows: { label: string; value: number; secondaryLabel: string; secondaryValue: number | undefined }[] = [
    { label: 'Customer Orders Running', value: diff.customer_orders_running, secondaryLabel: 'Draft', secondaryValue: diff.customer_orders_draft },
    { label: 'Shipment Already Sent', value: diff.shipment_already_sent, secondaryLabel: '', secondaryValue: undefined },
    { label: 'Supplier Orders Running', value: diff.supplier_orders_running, secondaryLabel: 'Draft', secondaryValue: diff.supplier_orders_draft },
    { label: 'MRP To Consume', value: diff.mrp_to_consume, secondaryLabel: 'To Produce', secondaryValue: diff.mrp_to_produce },
  ].filter((row): row is typeof row & { value: number } => row.value !== undefined)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <SectionHeader icon={Info} color="blue">
            Pricing & Cost
          </SectionHeader>
          <div>
            <Field label="Cost Price" value={data.pricing.costPrice} />
            <Field label="Avg Unit Price (PMP)" value={data.pricing.pmp} />
            <Field label="Buying Price Min" value={data.pricing.buyingPriceMin} />
            <Field label="Selling Price" value={data.pricing.sellingPrice} />
            <Field label="Min Price" value={data.pricing.minPrice} />
          </div>
        </Card>

        <Card className="!h-auto">
          <SectionHeader icon={Warehouse} color="green">
            Stock Information
          </SectionHeader>
          <div>
            <StockNumberField label="Stock Alert Threshold" value={data.stockAlertThreshold} editable={data.canEdit} onSave={(value) => setStockField.mutate({ id: id!, field: 'seuil_stock_alerte', value })} />
            <StockNumberField label="Desired Stock" value={data.desiredStock} editable={data.canEdit} onSave={(value) => setStockField.mutate({ id: id!, field: 'desiredstock', value })} />
            <FieldRow label="Physical Stock">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-semibold text-text!">{formatNumber(data.physicalStock)}</span>
                {data.physicalBelowLimit && <AlertTriangle size={14} className="text-warning" />}
                {/* Stock At Date / Virtual At Date / Full List are their own
                    real legacy reports (product/stock/stockatdate.php,
                    movement_list.php) with no native page here — linking out
                    to the real backend rather than a partial native rebuild
                    of a secondary drill-down view. */}
                <a href={`${BACKEND_URLS[getActiveBackend()]}/product/stock/stockatdate.php?productid=${id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline">
                  Stock At Date
                </a>
              </span>
            </FieldRow>
            <FieldRow label="Virtual Stock">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-semibold text-text!">{formatNumber(data.virtualStock)}</span>
                {data.virtualBelowLimit && <AlertTriangle size={14} className="text-warning" />}
                <a href={`${BACKEND_URLS[getActiveBackend()]}/product/stock/stockatdate.php?mode=future&productid=${id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline">
                  Virtual At Date
                </a>
              </span>
            </FieldRow>
            {data.lastMovement && (
              <FieldRow label="Last Movement">
                <span className="inline-flex items-center gap-1.5">
                  {data.lastMovement}
                  <a href={`${BACKEND_URLS[getActiveBackend()]}/product/stock/movement_list.php?idproduct=${id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline">
                    Full List
                  </a>
                </span>
              </FieldRow>
            )}
          </div>
          {diffRows.length > 0 && (
            <div className="mt-1 pt-2 border-t border-border space-y-1">
              <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">Virtual Stock Breakdown</p>
              {diffRows.map((row) => (
                <p key={row.label} className="text-xs text-text-muted">
                  {row.label}: {formatNumber(row.value)}
                  {row.secondaryValue !== undefined && ` (${row.secondaryLabel}: ${formatNumber(row.secondaryValue)})`}
                </p>
              ))}
            </div>
          )}
        </Card>
      </div>

      {data.canStock && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStockModal('correct')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10">
            <Wrench size={14} /> Correct Stock
          </button>
          <button type="button" onClick={() => setStockModal('transfer')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10">
            <ArrowLeftRight size={14} /> Transfer Stock
          </button>
        </div>
      )}

      {stockModal === 'correct' && <CorrectStockModal id={id!} warehouseOptions={data.warehouseOptions} onClose={() => setStockModal(null)} />}
      {stockModal === 'transfer' && <TransferStockModal id={id!} warehouseOptions={data.warehouseOptions} onClose={() => setStockModal(null)} />}

      <Card className="!h-auto">
        <SectionHeader icon={Warehouse} color="violet">
          Warehouse Details
        </SectionHeader>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Warehouse</Th>
                <Th right>Units</Th>
                <Th right>PMP</Th>
                <Th right>Stock Value (Purchase)</Th>
                <Th right>Sell Price Min</Th>
                <Th right>Stock Value (Sell)</Th>
              </tr>
            </thead>
            <tbody>
              {data.warehouses.length === 0 ? (
                <EmptyRow span={6} label="No warehouse stock." />
              ) : (
                data.warehouses.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <Td>
                      {w.ref}
                      {w.place && <span className="text-text-faint"> — {w.place}</span>}
                    </Td>
                    <Td right>{formatNumber(w.units)}</Td>
                    <Td right muted>
                      {w.pmp || '—'}
                    </Td>
                    <Td right muted>
                      {w.valuePurchase || '—'}
                    </Td>
                    <Td right muted>
                      {w.sellPriceMin || '—'}
                    </Td>
                    <Td right muted>
                      {w.valueSell || '—'}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
            {data.warehouses.length > 0 && (
              <tfoot>
                <tr className="border-t border-border">
                  <Td>Total:</Td>
                  <Td right>{formatNumber(data.totals.totalQty)}</Td>
                  <Td right muted>
                    {data.totals.avgPmp || '—'}
                  </Td>
                  <Td right muted>
                    {data.totals.totalValuePurchase || '—'}
                  </Td>
                  <Td right muted>
                    {data.totals.avgSellPrice || '—'}
                  </Td>
                  <Td right muted>
                    {data.totals.totalValueSell || '—'}
                  </Td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={History} color="amber">
          Recent Stock Movements
        </SectionHeader>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Date</Th>
                <Th>Label</Th>
                <Th right>Qty</Th>
                <Th>Warehouse</Th>
                <Th>User</Th>
              </tr>
            </thead>
            <tbody>
              {data.movements.length === 0 ? (
                <EmptyRow span={5} label="No recent movements." />
              ) : (
                data.movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <Td muted>{m.dateFormatted}</Td>
                    <Td>{m.label}</Td>
                    <Td right>{formatNumber(m.qty)}</Td>
                    <Td muted>{m.warehouse}</Td>
                    <Td muted>{m.user}</Td>
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

// New Combination modal (variant_api.php?action=create_combination) — one
// value select per existing attribute (attributes themselves aren't created
// here, only combined; matches what the real endpoint accepts).
function NewCombinationModal({ id, attributes, onClose }: { id: string; attributes: ProductVariantOverview['attributes']; onClose: () => void }) {
  const createCombination = useCreateCombination()
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [reference, setReference] = useState('')
  const [priceImpact, setPriceImpact] = useState('')
  const [priceImpactPercent, setPriceImpactPercent] = useState(false)
  const [weightImpact, setWeightImpact] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    const features = attributes.map((a) => (selected[a.id] ? `${a.id}-${selected[a.id]}` : ''))
    if (features.some((f) => !f)) return setError('Select a value for every attribute.')
    createCombination.mutate(
      { id, features, reference, priceImpact: priceImpact || '0', priceImpactPercent, weightImpact: weightImpact || '0' },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create combination.') },
    )
  }

  return (
    <ModalShell
      title="New Combination"
      onClose={onClose}
      footer={
        <button type="button" onClick={handleSave} disabled={createCombination.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60">
          {createCombination.isPending ? 'Creating…' : 'Create'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {attributes.map((a) => (
          <ModalField key={a.id} label={a.label}>
            <select value={selected[a.id] ?? ''} onChange={(e) => setSelected((s) => ({ ...s, [a.id]: e.target.value }))} className={modalInputCls}>
              <option value="">Select…</option>
              {a.values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.value}
                </option>
              ))}
            </select>
          </ModalField>
        ))}
        <ModalField label="Reference">
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Weight Impact">
          <input value={weightImpact} onChange={(e) => setWeightImpact(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Price Impact">
          <input value={priceImpact} onChange={(e) => setPriceImpact(e.target.value)} className={modalInputCls} />
        </ModalField>
        <label className="flex items-center gap-2 text-sm text-text mt-5">
          <input type="checkbox" checked={priceImpactPercent} onChange={(e) => setPriceImpactPercent(e.target.checked)} className="rounded border-border" />
          Price impact is a %
        </label>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

// Variants tab (variant_api.php) — real attribute values + real
// combinations, replaces variants/combinations.php natively (New/Delete
// Combination both write through the real endpoint, no legacy link-out).
function ProductCombinationsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductVariantOverview(id)
  const deleteCombination = useDeleteCombination()
  const [showNew, setShowNew] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading variants…" />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Product Combinations" />
  if (isError) return <LegacyErrorCard title="Couldn't load variants" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  function handleDelete(combinationId: number, label: string) {
    if (!window.confirm(`Delete combination "${label}"? This can't be undone.`)) return
    deleteCombination.mutate({ id: id!, combinationId })
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <SectionHeader icon={Shapes} color="violet">
          Attributes ({data.totalValues} values)
        </SectionHeader>
        {data.attributes.length === 0 ? (
          <p className="text-sm text-text-faint">No variant attributes defined for this product.</p>
        ) : (
          <div className="space-y-3">
            {data.attributes.map((a) => (
              <div key={a.id}>
                <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-1.5">{a.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {a.values.map((v) => (
                    <span key={v.id} className="px-2 py-0.5 rounded-md border border-border bg-surface-alt text-xs text-text!">
                      {v.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.canEdit && data.attributes.length > 0 && (
        <button type="button" onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10">
          <Plus size={14} /> New Combination
        </button>
      )}
      {showNew && <NewCombinationModal id={id!} attributes={data.attributes} onClose={() => setShowNew(false)} />}

      <Card className="!h-auto">
        <SectionHeader icon={Layers} color="blue">
          Combinations ({data.combinations.length})
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Ref</Th>
              <Th>Label</Th>
              <Th>Attributes</Th>
              <Th right>Price</Th>
              <Th right>Variation</Th>
              <Th right>Stock</Th>
              <Th>Status</Th>
              {data.canDelete && <Th right>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {data.combinations.length === 0 ? (
              <EmptyRow span={data.canDelete ? 8 : 7} label="No variant combinations for this product." />
            ) : (
              data.combinations.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <Td muted>{c.ref}</Td>
                  <Td>{c.label}</Td>
                  <Td muted>{c.attributes.map((a) => `${a.label}: ${a.value}`).join(', ')}</Td>
                  <Td right>{formatMoney(c.priceTtc)}</Td>
                  <Td right muted>
                    {c.variationPrice >= 0 ? '+' : ''}
                    {formatMoney(c.variationPrice)}
                  </Td>
                  <Td right muted>
                    {formatNumber(c.stock)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <StatusPill active={c.forSale} activeLabel="Sell" inactiveLabel="Sell" tone="success" />
                      <StatusPill active={c.forPurchase} activeLabel="Buy" inactiveLabel="Buy" tone="info" />
                    </div>
                  </Td>
                  {data.canDelete && (
                    <Td right>
                      <button type="button" onClick={() => handleDelete(c.id, c.label)} className="p-1.5 rounded-md text-danger hover:bg-danger-bg" title="Delete combination">
                        <Trash2 size={14} />
                      </button>
                    </Td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>
    </div>
  )
}

// Statistics tab (stats_api.php) — real sales/purchase figures computed
// server-side from llx_facturedet/llx_commande_fournisseurdet, replaces the
// old legacy-scrape usage report.
function StatisticsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductStatsOverview(id)
  if (isLoading) return <LegacyLoadingCard label="Loading statistics…" />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Statistics" />
  if (isError) return <LegacyErrorCard title="Couldn't load statistics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile icon={DollarSign} color="green" label="Total Sales" value={formatMoney(data.totalSales)} caption="Last 12 months" />
        <MetricTile icon={ShoppingCart} color="amber" label="Total Purchase" value={formatMoney(data.totalPurchase)} caption="Last 12 months" />
        <MetricTile icon={Boxes} color="blue" label="Qty Sold" value={formatNumber(data.qtySold)} caption="Last 12 months" />
        <MetricTile icon={TrendingUp} color="violet" label="Margin" value={`${data.marginPct.toFixed(1)}%`} caption="Sales vs. purchase" />
      </div>

      <Card className="!h-auto">
        <SectionHeader icon={ChartPie} color="indigo">
          Monthly Breakdown
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Month</Th>
              <Th right>Qty Sold</Th>
              <Th right>Sales</Th>
              <Th right>Purchases</Th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.length === 0 ? (
              <EmptyRow span={4} label="No sales or purchase activity yet." />
            ) : (
              data.monthly.map((m) => (
                <tr key={m.month} className="border-b border-border last:border-0">
                  <Td muted>{m.month}</Td>
                  <Td right muted>
                    {formatNumber(m.qty)}
                  </Td>
                  <Td right>{formatMoney(m.sales)}</Td>
                  <Td right muted>
                    {formatMoney(m.purchase)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={UserRound} color="cyan">
          Top Customers
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Customer</Th>
              <Th right>Qty</Th>
              <Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.topCustomers.length === 0 ? (
              <EmptyRow span={3} label="No customers have purchased this product yet." />
            ) : (
              data.topCustomers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <Td>{c.name}</Td>
                  <Td right muted>
                    {formatNumber(c.qty)}
                  </Td>
                  <Td right>{formatMoney(c.total)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>
    </div>
  )
}

// Notes tab (note_api.php) — real llx_product.note_public/note fields,
// replaces the old (unrouted on this backend) api/products/?action=update-note.
function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductNotesOverview(id)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const saveNotes = useSaveProductNotes()
  const inputCls = 'w-full rounded-md border border-input-border bg-input-bg text-text text-sm p-3 outline-none focus:ring-2 focus:ring-brand/30'

  useEffect(() => {
    setNotePublic(data?.notePublic ?? '')
    setNotePrivate(data?.notePrivate ?? '')
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Notes" />
  if (isError) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="!h-auto">
        <SectionHeader icon={StickyNote} color="blue">
          Public Note
        </SectionHeader>
        <textarea value={notePublic} onChange={(e) => setNotePublic(e.target.value)} rows={8} className={inputCls} placeholder="Visible to customers on documents…" />
      </Card>
      <Card className="!h-auto">
        <SectionHeader icon={StickyNote} color="amber">
          Private Note
        </SectionHeader>
        <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} rows={8} className={inputCls} placeholder="Internal only…" />
      </Card>
      <div className="lg:col-span-2 flex items-center gap-3">
        <button
          type="button"
          disabled={!id || saveNotes.isPending}
          onClick={() => id && saveNotes.mutate({ id, notePublic, notePrivate })}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          <Save size={14} /> {saveNotes.isPending ? 'Saving…' : 'Save notes'}
        </button>
        {saveNotes.isSuccess && <p className="text-xs text-success">Saved.</p>}
        {saveNotes.isError && <p className="text-xs text-danger">Could not save — please try again.</p>}
      </div>
    </div>
  )
}

// Small local modal shell shared by the Add/Edit UOM Conversion, Correct
// Stock, and Transfer Stock modals below — same overlay/panel pattern as
// ProductServiceCreateForm.tsx's CreateCategoryModal, not reused directly
// since that file's own Field/Select are display-form components whose
// names collide with this file's own read-only Field/FieldRow.
function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-text!">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}
function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-faint mb-1">{label}</label>
      {children}
    </div>
  )
}
const modalInputCls = 'w-full h-9 px-3 rounded-md border border-border bg-surface text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function UomConversionModal({
  id,
  conversion,
  packingOptions,
  uomOptions,
  onClose,
}: {
  id: string
  conversion: ProductUomOverview['conversions'][number] | null
  packingOptions: { value: string; label: string }[]
  uomOptions: { value: string; label: string }[]
  onClose: () => void
}) {
  const saveConversion = useSaveUomConversion()
  const [packingUnit, setPackingUnit] = useState(conversion ? String(conversion.packingUnitId) : '')
  const [uomUnit, setUomUnit] = useState(conversion ? String(conversion.uomUnitId) : '')
  const [factor, setFactor] = useState(conversion ? String(conversion.factor) : '')
  const [isDefault, setIsDefault] = useState(conversion?.isDefault ?? false)
  const [priceTtc, setPriceTtc] = useState(conversion?.priceOverrideTtc ? String(conversion.priceOverrideTtc) : '')
  const [barcode, setBarcode] = useState(conversion?.barcode ?? '')
  const [note, setNote] = useState(conversion?.note ?? '')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!packingUnit) return setError('Packing Unit is required!')
    if (!uomUnit) return setError('Base UOM is required!')
    if (!factor || Number(factor) <= 0) return setError('Factor must be a positive number!')
    saveConversion.mutate(
      { id, convId: conversion?.id ?? 0, packingUnit, uomUnit, factor, isDefault, priceTtc, barcode, note },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title={conversion ? 'Edit UOM Conversion' : 'Add UOM Conversion'}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={saveConversion.isPending}
          className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
        >
          {saveConversion.isPending ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalField label="Packing Unit">
          <select value={packingUnit} onChange={(e) => setPackingUnit(e.target.value)} className={modalInputCls}>
            <option value="">Select…</option>
            {packingOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Base UOM">
          <select value={uomUnit} onChange={(e) => setUomUnit(e.target.value)} className={modalInputCls}>
            <option value="">Select…</option>
            {uomOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Factor">
          <input value={factor} onChange={(e) => setFactor(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Price Override TTC">
          <input value={priceTtc} onChange={(e) => setPriceTtc(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Barcode">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={modalInputCls} />
        </ModalField>
        <label className="flex items-center gap-2 text-sm text-text mt-5">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-border" />
          Default
        </label>
      </div>
      <ModalField label="Note">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={modalInputCls} />
      </ModalField>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

function UomSettingsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductUomOverview(id)
  const deleteConversion = useDeleteUomConversion()
  const saveBarcode = useSaveProductBarcode()
  const generateBarcode = useGenerateProductBarcode()
  const [barcodeDraft, setBarcodeDraft] = useState('')
  const [barcodeError, setBarcodeError] = useState('')
  const [conversionModal, setConversionModal] = useState<{ mode: 'add' } | { mode: 'edit'; conversion: NonNullable<typeof data>['conversions'][number] } | null>(null)

  useEffect(() => setBarcodeDraft(data?.productBarcode ?? ''), [data?.productBarcode])

  if (isLoading) return <LegacyLoadingCard label="Loading UOM settings…" />
  if (isError) return <LegacyErrorCard title="Couldn't load UOM settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  function handleDeleteConversion(convId: number) {
    if (!window.confirm('Delete this UOM conversion?')) return
    deleteConversion.mutate({ id: id!, convId })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={Ruler} color="blue" label="Base Unit" value={data.baseUnitLabel} caption="Base Unit" />
        <MetricTile icon={Layers} color="green" label="Conversions" value={data.conversionsCount} caption="Total Conversions" />
        <MetricTile icon={Boxes} color="indigo" label="Available Units" value={data.availableUnitsCount} caption="Unit types in system" />
      </div>

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-2.5">
          <SectionHeader icon={Ruler} color="violet">
            UOM Conversions
          </SectionHeader>
          {data.canEdit && (
            <button
              type="button"
              onClick={() => setConversionModal({ mode: 'add' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-xs font-medium hover:bg-brand-hover"
            >
              <Plus size={14} /> Add UOM Conversion
            </button>
          )}
        </div>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Packing Unit</Th>
                <Th>Base UOM</Th>
                <Th right>Factor</Th>
                <Th right>Price Override TTC</Th>
                <Th>Barcode</Th>
                <Th>Note</Th>
                <Th>Default</Th>
                {data.canEdit && <Th right>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {data.conversions.length === 0 ? (
                <EmptyRow span={data.canEdit ? 8 : 7} label="No UOM conversions configured." />
              ) : (
                data.conversions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <Td>{c.packingLabel}</Td>
                    <Td muted>{c.uomLabel}</Td>
                    <Td right>{c.factor}</Td>
                    <Td right muted>
                      {c.priceOverrideTtc ? formatMoney(c.priceOverrideTtc) : '—'}
                    </Td>
                    <Td muted>{c.barcode || '—'}</Td>
                    <Td muted>{c.note || '—'}</Td>
                    <Td muted>{c.isDefault ? <CheckCircle2 size={14} className="text-success" /> : ''}</Td>
                    {data.canEdit && (
                      <Td right>
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setConversionModal({ mode: 'edit', conversion: c })}
                            title="Edit conversion"
                            className="p-1 rounded text-text-faint hover:bg-info-bg hover:text-info disabled:opacity-60"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConversion(c.id)}
                            disabled={deleteConversion.isPending}
                            title="Delete conversion"
                            className="p-1 rounded text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </Td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {conversionModal && (
        <UomConversionModal
          id={id!}
          conversion={conversionModal.mode === 'edit' ? conversionModal.conversion : null}
          packingOptions={data.packingUnitOptions}
          uomOptions={data.uomUnitOptions}
          onClose={() => setConversionModal(null)}
        />
      )}

      <Card className="!h-auto">
        <SectionHeader icon={Barcode} color="amber">
          Barcode Management
        </SectionHeader>
        <div className="space-y-2">
          <label className="text-xs text-text-faint">Set Barcode</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={barcodeDraft}
              onChange={(e) => setBarcodeDraft(e.target.value)}
              placeholder="Enter barcode value"
              disabled={!data.canEdit}
              className="flex-1 min-w-[180px] rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text! disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!data.canEdit || saveBarcode.isPending}
              onClick={() => {
                setBarcodeError('')
                saveBarcode.mutate(
                  { id: id!, barcode: barcodeDraft },
                  { onError: (err) => setBarcodeError(err instanceof Error ? err.message : 'Failed to save barcode.') },
                )
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-60"
            >
              <Save size={14} /> {saveBarcode.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={!data.canEdit || generateBarcode.isPending}
              onClick={() => {
                setBarcodeError('')
                generateBarcode.mutate(id!, {
                  onSuccess: (result) => setBarcodeDraft(result.barcode),
                  onError: (err) => setBarcodeError(err instanceof Error ? err.message : 'Failed to generate barcode.'),
                })
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text disabled:opacity-60"
            >
              <Wand2 size={14} /> {generateBarcode.isPending ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {barcodeError && <p className="text-xs text-danger">{barcodeError}</p>}
        </div>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={Tag} color="rose">
          Lot/Batch Tracking
        </SectionHeader>
        <FieldRow label="Lot/Batch Tracking Enabled">
          <span className={`inline-flex items-center gap-1.5 font-medium ${data.hasBatchTracking ? 'text-success' : 'text-text-muted'}`}>
            {data.hasBatchTracking ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            {data.hasBatchTracking ? 'Yes' : 'No'}
          </span>
        </FieldRow>
      </Card>
    </div>
  )
}

function BuyingPricesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductSupplierOverview(id)
  if (isLoading) return <LegacyLoadingCard label="Loading supplier prices…" />
  if (isError) return <LegacyErrorCard title="Couldn't load supplier prices" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={Truck} color="blue" label="Suppliers" value={data.suppliersCount} caption="Total suppliers linked" />
        <MetricTile icon={Tag} color="green" label="Best Unit Price" value={data.bestUnitPrice !== null ? formatMoney(data.bestUnitPrice) : '—'} caption={data.bestPriceSupplierName || 'Not available'} />
        <MetricTile icon={Star} color="violet" label="Avg Price" value={data.avgUnitPrice !== null ? formatMoney(data.avgUnitPrice) : '—'} caption={data.avgUnitPrice !== null ? 'Across all suppliers' : 'Not available'} />
      </div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-3 mb-1 border-b border-border">
          <div>
            <p className="text-xs text-text-faint">Cost Price</p>
            <p className="text-sm font-semibold text-brand">{formatMoney(data.costPrice)} ZMW</p>
          </div>
          <div>
            <p className="text-xs text-text-faint">PMP (Avg Unit Price)</p>
            <p className="text-sm text-text-faint">{data.pmp ? `${formatMoney(data.pmp)} ZMW` : 'Not defined'}</p>
          </div>
          <div>
            <p className="text-xs text-text-faint">Best Buying Price</p>
            <p className="text-sm text-text-faint">{data.bestUnitPrice !== null ? `${formatMoney(data.bestUnitPrice)} ZMW` : 'Not defined'}</p>
          </div>
        </div>

        <SectionHeader icon={Truck} color="indigo">
          Supplier Prices
        </SectionHeader>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Supplier</Th>
                <Th>Ref Supplier</Th>
                <Th right>Qty Min</Th>
                <Th right>VAT</Th>
                <Th right>Unit Price</Th>
                <Th>Delivery (Days)</Th>
                <Th>Reputation</Th>
              </tr>
            </thead>
            <tbody>
              {data.suppliers.length === 0 ? (
                <EmptyRow span={7} label="No Supplier Prices Found — add supplier prices to see them listed here." />
              ) : (
                data.suppliers.map((row) => (
                  <tr key={row.rowid} className="border-b border-border last:border-0">
                    <Td>{row.supplierName}</Td>
                    <Td muted>{row.refFourn || '—'}</Td>
                    <Td right muted>
                      {formatNumber(row.quantity)}
                    </Td>
                    <Td right muted>
                      {row.vatRate}
                    </Td>
                    <Td right>{formatMoney(row.unitPrice)}</Td>
                    <Td muted>{row.deliveryDays ?? '—'}</Td>
                    <Td muted>{row.reputation || '—'}</Td>
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

// Add Sub-Product panel (subproduct_api.php?action=add_subproduct) — search
// reuses the existing useProductSearch hook (api/products/?action=list&search=,
// already wired for the ZRA product picker) rather than subproduct_api.php's
// own search_products action, same real catalog either way.
function AddSubproductPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])
  const { data: results } = useProductSearch(debounced)
  const [selected, setSelected] = useState<{ id: string; ref: string; label: string } | null>(null)
  const [qty, setQty] = useState('1')
  const [incdec, setIncdec] = useState(true)
  const [error, setError] = useState('')
  const addSubproduct = useAddSubproduct()

  function handleAdd() {
    setError('')
    if (!selected) return setError('Search and select a product first.')
    if (!qty || Number(qty) <= 0) return setError('Quantity must be a positive number.')
    addSubproduct.mutate(
      { id, childId: selected.id, qty, incdec },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add sub-product.') },
    )
  }

  return (
    <Card className="!h-auto">
      <SectionHeader icon={Search} color="blue">
        Add Sub-Product
      </SectionHeader>
      <div className="space-y-3">
        <div className="relative">
          <input
            value={selected ? `${selected.ref} — ${selected.label}` : query}
            onChange={(e) => {
              setSelected(null)
              setQuery(e.target.value)
            }}
            placeholder="Search product by ref or label…"
            className={modalInputCls}
          />
          {!selected && debounced.trim().length > 1 && results && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelected(r)
                    setQuery('')
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span className="font-medium text-text!">{r.ref}</span> <span className="text-text-faint">— {r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-faint">Qty</label>
          <input value={qty} onChange={(e) => setQty(e.target.value)} className={`${modalInputCls} w-24`} />
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={incdec} onChange={(e) => setIncdec(e.target.checked)} className="rounded border-border" />
            Affects stock
          </label>
        </div>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={addSubproduct.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
          >
            <Plus size={14} /> {addSubproduct.isPending ? 'Adding…' : 'Add'}
          </button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm hover:bg-surface-alt">
            Cancel
          </button>
        </div>
      </div>
    </Card>
  )
}

// Composition tab (subproduct_api.php) — real kit/bundle sub-products,
// replaces product/composition/card.php natively (search-to-add and
// remove both write through the real endpoint, no legacy link-out).
function AssociatedProductsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductCompositionOverview(id)
  const deleteSubproduct = useDeleteSubproduct()
  const [showAdd, setShowAdd] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading composition…" />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Composition" />
  if (isError) return <LegacyErrorCard title="Couldn't load composition" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  function handleDelete(childId: number, label: string) {
    if (!window.confirm(`Remove "${label}" from this composition?`)) return
    deleteSubproduct.mutate({ id: id!, childId })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={Layers} color="blue" label="Nature" value={data.natureLabel || '—'} />
        <MetricTile icon={DollarSign} color="green" label="Total Buy" value={formatMoney(data.totalBuy)} />
        <MetricTile icon={Tag} color="violet" label="Total Sell" value={formatMoney(data.totalSell)} />
      </div>

      {data.parents.length > 0 && (
        <Card className="!h-auto">
          <SectionHeader icon={Link2} color="amber">
            Used As Component In
          </SectionHeader>
          <div className="flex flex-wrap gap-1.5">
            {data.parents.map((p) => (
              <span key={p.id} className="px-2 py-1 rounded-md border border-border bg-surface-alt text-xs text-text!">
                {p.ref} — {p.label} (× {formatNumber(p.qty)})
              </span>
            ))}
          </div>
        </Card>
      )}

      {data.canEdit && !showAdd && (
        <button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10">
          <Plus size={14} /> Add Sub-Product
        </button>
      )}
      {showAdd && <AddSubproductPanel id={id!} onClose={() => setShowAdd(false)} />}

      <Card className="!h-auto">
        <SectionHeader icon={Boxes} color="indigo">
          Composition ({data.compositions.length})
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Ref</Th>
              <Th>Label</Th>
              <Th right>Qty</Th>
              <Th right>Stock</Th>
              <Th right>Buy Price</Th>
              <Th right>Sell Price</Th>
              {data.canEdit && <Th right>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {data.compositions.length === 0 ? (
              <EmptyRow span={data.canEdit ? 7 : 6} label="No sub-products (this product isn't a kit/bundle)." />
            ) : (
              data.compositions.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <Td muted>{c.ref}</Td>
                  <Td>{c.label}</Td>
                  <Td right>{formatNumber(c.qty)}</Td>
                  <Td right muted>
                    {formatNumber(c.stock)}
                  </Td>
                  <Td right muted>
                    {c.buyDefined ? formatMoney(c.buyPrice) : '—'}
                  </Td>
                  <Td right muted>
                    {c.sellPrice !== null ? formatMoney(c.sellPrice) : '—'}
                  </Td>
                  {data.canEdit && (
                    <Td right>
                      <button type="button" onClick={() => handleDelete(c.id, c.label)} className="p-1.5 rounded-md text-danger hover:bg-danger-bg" title="Remove sub-product">
                        <Trash2 size={14} />
                      </button>
                    </Td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>
    </div>
  )
}

// Legacy's Related Items rows link out to that document type's own list
// page (propal.php, commande.php, facture.php, ...), each pre-filtered to
// this product — this app has no per-product filter on those list pages
// yet, so these route to the real, live list module for that document type
// instead (same destination a user would reach from the sidebar), rather
// than routing back to the legacy PHP page per the standing rule. Matched
// by keyword rather than exact string since the API's referer labels aren't
// a fixed enum (confirmed live: "Purchase orders" is lowercase "orders"
// unlike its siblings).
function refererListRoute(label: string): string | null {
  const l = label.toLowerCase()
  if (l.includes('quotation')) return ROUTES.quotationList
  if (l.includes('supplierproposal') || l.includes('supplier proposal')) return ROUTES.supplierProposalList
  if (l.includes('sales order')) return ROUTES.orderList
  if (l.includes('purchase order')) return ROUTES.purchaseOrderList
  if (l.includes('customer') && l.includes('invoice')) return ROUTES.invoiceList
  if (l.includes('vendor') && l.includes('invoice')) return ROUTES.vendorInvoiceList
  if (l.includes('contract')) return ROUTES.contractList
  return null
}

// Invoice Stats tab (invoice_stats_api.php) — customer invoices with this
// product, paginated + filterable by month/year. Mirrors legacy's "Related items"
// table exactly (product/stats/facture.php), with Period/Year/PageSize filters
// and invoices detail table.
function InvoiceStatsTab({ id }: { id: string | undefined }) {
  const [page, setPage] = useState(0)
  const [month, setMonth] = useState(0)
  const [year, setYear] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const { data, isLoading, isError, error, refetch } = useProductInvoiceStats(id, page, month, year, pageSize)

  if (isLoading) return <LegacyLoadingCard label="Loading invoice stats…" />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Invoice Stats" />
  if (isError) return <LegacyErrorCard title="Couldn't load invoice stats" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  const pageStart = page * pageSize + 1
  const pageEnd = Math.min((page + 1) * pageSize, data.totalRecords)
  const referersTotalQty = data.referers.reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricTile icon={DollarSign} color="green" label="Invoiced Total" value={formatMoney(data.totalHT)} caption="Excl. tax, all customer invoices" />
        <MetricTile icon={Boxes} color="blue" label="Total Qty Invoiced" value={formatNumber(data.totalQty)} caption="Units across all invoices" />
        <MetricTile icon={FileText} color="violet" label="Invoice Lines" value={formatNumber(data.totalRecords)} caption="Matching current filter" />
      </div>

      <Card className="!h-auto">
        <SectionHeader icon={Link2} color="indigo">
          Related Items
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Related Items</Th>
              <Th right>Number Of Third Parties</Th>
              <Th right>Number Of Related Items</Th>
              <Th right>Total Quantity</Th>
            </tr>
          </thead>
          <tbody>
            {data.referers.length === 0 ? (
              <EmptyRow span={4} label="No related items for this product." />
            ) : (
              data.referers.map((r) => {
                const route = refererListRoute(r.label)
                return (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <Td>
                      {route ? (
                        <Link to={route} className="text-brand hover:underline">
                          {r.label}
                        </Link>
                      ) : (
                        r.label
                      )}
                    </Td>
                    <Td right muted>
                      {formatNumber(r.nbThirdparties)}
                    </Td>
                    <Td right muted>
                      {r.nbObjects}
                    </Td>
                    <Td right>{r.qty}</Td>
                  </tr>
                )
              })
            )}
          </tbody>
          {data.referers.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <Td>Total</Td>
                <Td right muted>—</Td>
                <Td right muted>—</Td>
                <Td right>{formatNumber(referersTotalQty)}</Td>
              </tr>
            </tfoot>
          )}
        </TabTable>
      </Card>

      <Card className="!h-auto flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <SectionHeader icon={FileText} color="green">
              Customer Invoices
            </SectionHeader>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-surface text-xs font-medium text-text-faint">
              {formatNumber(data.totalRecords)} Records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 -mx-4 px-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Period</label>
              <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value) || 0); setPage(0) }} className={modalInputCls + ' py-1.5'}>
                <option value="0">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Year</label>
              <select value={year} onChange={(e) => { setYear(parseInt(e.target.value) || 0); setPage(0) }} className={modalInputCls + ' py-1.5'}>
                <option value="0">All Years</option>
                {data.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-text-faint">Page Size</label>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setPage(0) }} className={modalInputCls + ' py-1.5 w-24'}>
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
              </select>
            </div>
          </div>

          <div className="flex-1 flex flex-col -mx-4 border border-border rounded overflow-hidden">
            <div className="overflow-y-auto max-h-[550px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <Th>Invoice</Th>
                    <Th>Date</Th>
                    <Th>Customer</Th>
                    <Th>Code</Th>
                    <Th right>Qty</Th>
                    <Th right>Total (Excl.)</Th>
                    <Th right>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {!data.invoices || data.invoices.length === 0 ? (
                    <EmptyRow span={7} label="No invoices found for this product." />
                  ) : (
                    data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <Td muted>
                          {/* No per-invoice detail page exists in this rebuild yet
                              (routes.ts has no invoiceDetail route) — routes to the
                              real Invoices module rather than back to the legacy
                              facture.php card, consistent with the Related Items
                              links above. */}
                          <Link to={ROUTES.invoiceList} className="text-brand hover:underline">
                            {inv.ref}
                          </Link>
                        </Td>
                        <Td muted>{formatDateTimeAmPm(inv.date)}</Td>
                        <Td>
                          <Link to={ROUTES.customerList} className="text-brand hover:underline">
                            {inv.company}
                          </Link>
                        </Td>
                        <Td muted>{inv.customerCode}</Td>
                        <Td right muted>
                          {formatNumber(inv.qty)}
                        </Td>
                        <Td right>{formatMoney(inv.totalHT)}</Td>
                        <Td right>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${inv.statusClass === 'success' ? 'bg-success-bg text-success-fg' : inv.statusClass === 'warning' ? 'bg-warning-bg text-warning-fg' : 'bg-secondary-bg text-secondary-fg'}`}>
                            {inv.status}
                          </span>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {data.totalRecords > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-faint bg-white dark:bg-gray-950">
                <span>
                  {pageStart}–{pageEnd} of {data.totalRecords}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="px-1">
                    {page + 1} / {data.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={page >= data.totalPages - 1}
                    onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Documents tab (document_api.php) — real filesystem listing under
// documents/produit/<ref>/, replaces the old product/document.php scrape.
// Upload/delete both write through the real endpoint, no legacy link-out.
function LinkedFilesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductDocuments(id)
  const uploadDocument = useUploadProductDocument()
  const deleteDocument = useDeleteProductDocument()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !id) return
    setUploadError('')
    uploadDocument.mutate({ id, file }, { onError: (err) => setUploadError(err instanceof Error ? err.message : 'Upload failed.') })
  }

  function handleDelete(filename: string) {
    if (!id) return
    if (!window.confirm(`Delete "${filename}"? This can't be undone.`)) return
    deleteDocument.mutate({ id, filename })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-faint">{data?.count ?? 0} file(s)</p>
        <div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadDocument.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10 disabled:opacity-60"
          >
            <Upload size={14} /> {uploadDocument.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
      {uploadError && <p className="text-sm font-medium text-danger">{uploadError}</p>}
      <TabTable>
        <thead>
          <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <Th>File</Th>
            <Th right>Size</Th>
            <Th>Date</Th>
            <Th right>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {!data || data.documents.length === 0 ? (
            <EmptyRow span={4} label="No attached files or documents." />
          ) : (
            data.documents.map((d, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <Td>
                  {d.fileUrl ? (
                    <a href={resolveBackendAsset(d.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand hover:underline">
                      <Download size={14} /> {d.fileName}
                    </a>
                  ) : (
                    d.fileName
                  )}
                </Td>
                <Td right muted>
                  {d.size}
                </Td>
                <Td muted>{d.date}</Td>
                <Td right>
                  <button type="button" onClick={() => handleDelete(d.fileName)} className="p-1.5 rounded-md text-danger hover:bg-danger-bg" title="Delete file">
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TabTable>
    </div>
  )
}

// Events tab (agenda_api.php's `events` field) — real llx_actioncomm rows
// for this product (fk_element/elementtype = 'product'), rendered as a
// timeline. Distinct from the Product Card tab's own Activity Timeline
// (useProductDashboard, invoice-based) — this is the product's own agenda.
function EventsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductAgendaEvents(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Events/Agenda" />
  if (isError) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const statusTone: Record<string, 'success' | 'info'> = { success: 'success', info: 'info', warning: 'info', secondary: 'info' }

  return (
    <Card className="!h-auto">
      <SectionHeader icon={CalendarClock} color="indigo">
        Events ({data?.length ?? 0})
      </SectionHeader>
      {!data || data.length === 0 ? (
        <p className="text-sm text-text-faint text-center py-6">No events logged for this product.</p>
      ) : (
        <ul>
          {data.map((e, i) => (
            <li key={e.id} className={`flex items-start gap-3 py-3 ${i !== data.length - 1 ? 'border-b border-border' : ''}`}>
              <span className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${ICON_STYLES.indigo}`}>
                <Clock size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text! truncate">{e.label}</p>
                  <StatusPill active activeLabel={e.typeLabel} inactiveLabel={e.typeLabel} tone={statusTone[e.status] ?? 'info'} />
                </div>
                <p className="text-xs text-text-faint mt-0.5">
                  {e.date}
                  {e.dateEnd && e.dateEnd !== e.date ? ` — ${e.dateEnd}` : ''}
                  {e.userName && ` · ${e.userName}`}
                  {e.percent > 0 && ` · ${e.percent}%`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// Margins tab (margin/tabs/productMargins.php) — per-invoice selling vs
// buying price breakdown. No Margin Rate/Mark Rate columns: both
// DISPLAY_MARGIN_RATES and DISPLAY_MARK_RATES are unset on this install
// (confirmed live), matching what legacy itself shows here.
function MarginsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductMargins(id)
  if (isLoading) return <LegacyLoadingCard label="Loading margins…" />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Margins" />
  if (isError) return <LegacyErrorCard title="Couldn't load margins" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return (
    <div>
      <p className="text-sm mb-4">
        <span className="text-text-faint">Total Margin</span> <span className="text-text! font-medium">{formatMoney(data?.totals.margin ?? 0)}</span>
      </p>
      <TabTable>
        <thead>
          <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <Th>Invoice</Th>
            <Th>Company</Th>
            <Th>Customer code</Th>
            <Th>Date</Th>
            <Th right>Selling price</Th>
            <Th right>Buying price</Th>
            <Th right>Qty</Th>
            <Th right>Margin</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {!data || data.lines.length === 0 ? (
            <EmptyRow span={9} label="No margin data for this product." />
          ) : (
            data.lines.map((l) => (
              <tr key={l.invoiceId} className="border-b border-border last:border-0">
                <Td muted>{l.ref}</Td>
                <Td>{l.customerName}</Td>
                <Td muted>{l.customerCode}</Td>
                <Td muted>{l.date}</Td>
                <Td right muted>
                  {formatMoney(l.sellingPrice)}
                </Td>
                <Td right muted>
                  {formatMoney(l.buyingPrice)}
                </Td>
                <Td right muted>
                  {formatNumber(l.qty)}
                </Td>
                <Td right>{formatMoney(l.margin)}</Td>
                <Td muted>{l.paid ? 'Paid' : 'Unpaid'}</Td>
              </tr>
            ))
          )}
        </tbody>
        {data && data.lines.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} className="px-3 py-2 font-semibold text-text! text-right">
                Total:
              </td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{formatMoney(data.totals.sellingPrice)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{formatMoney(data.totals.buyingPrice)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{formatNumber(data.totals.qty)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{formatMoney(data.totals.margin)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </TabTable>
    </div>
  )
}
