import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Package, Wrench, Search, Plus, Filter } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { useAllProductsRich, type ProductRow, type ProductsSummary, type RichProductRow } from '../products.queries'
import { useProductFormOptions } from '../../zra/createProduct.queries'
import { ProductAvatar } from './ProductAvatar'
import { ProductFilterModal } from './ProductFilterModal'
import { ProductDetailPanel } from './ProductDetailPanel'
import { DEFAULT_PRODUCT_FILTERS, activeFilterCount, matchesProductFilters, type ProductFilters } from '../productFilters'

type SortKey = 'product' | 'category' | 'vatCode' | 'priceExcl' | 'priceIncl' | 'stock' | 'classification' | 'zraStatus' | 'lotStatus' | 'country' | 'created'

// Extra columns beyond the base /api/products/ fields mirror the legacy
// "All Products" report (product/allproducts.php) — see useAllProductsRich.
// Best-effort enrichment: falls back to "—" per row when that fetch hasn't
// resolved yet or a ref isn't found in it, rather than blocking the table.
const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Product', key: 'product' },
  { label: 'Category', key: 'category' },
  { label: 'VAT Code', key: 'vatCode' },
  { label: 'Price (Excl. Tax)', key: 'priceExcl' },
  { label: 'Price (Incl. Tax)', key: 'priceIncl' },
  { label: 'Stock', key: 'stock' },
  { label: 'Classification', key: 'classification' },
  { label: 'ZRA Status', key: 'zraStatus' },
  { label: 'Lot Status', key: 'lotStatus' },
  { label: 'Country', key: 'country' },
  { label: 'Created', key: 'created' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(product: ProductRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [product.ref, product.label, product.barcode].some((field) => field.toLowerCase().includes(q))
}

function RichCell({ value }: { value: string | undefined }) {
  return <span className={value ? undefined : 'text-text-faint'}>{value || '—'}</span>
}

function StatusBadge({ value }: { value: string | undefined }) {
  if (!value) return <span className="text-text-faint">—</span>
  const isPositive = /succeeded|lot/i.test(value) && !/disabled/i.test(value)
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${isPositive ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{value}</span>
  )
}

export function ProductsList({ summary }: { summary: ProductsSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_PRODUCT_FILTERS)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: richRows } = useAllProductsRich(0)
  const { data: formOptions } = useProductFormOptions()

  const richByRef = useMemo(() => {
    const map = new Map<string, RichProductRow>()
    richRows?.forEach((r) => map.set(r.ref, r))
    return map
  }, [richRows])

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>()
    formOptions?.categories.forEach((c) => map.set(c.value, c.label))
    return map
  }, [formOptions])

  const filteredProducts = useMemo(
    () =>
      summary.products.filter(
        (p) => matchesSearch(p, search) && matchesProductFilters(p, richByRef.get(p.ref), filters, categoryLabelById),
      ),
    [summary.products, search, filters, richByRef, categoryLabelById],
  )

  const sortValue = useMemo(() => {
    return (p: ProductRow, key: SortKey): string | number => {
      const rich = richByRef.get(p.ref)
      switch (key) {
        case 'product':
          return p.label
        case 'category':
          return rich?.category ?? ''
        case 'vatCode':
          return rich?.vatCode ?? ''
        case 'priceExcl':
          return p.priceExclTax
        case 'priceIncl':
          return p.priceInclTax
        case 'stock':
          return rich?.stockPhysical ?? p.stock
        case 'classification':
          return rich?.classification ?? ''
        case 'zraStatus':
          return rich?.zraStatus ?? ''
        case 'lotStatus':
          return rich?.lotStatus ?? ''
        case 'country':
          return rich?.country ?? ''
        case 'created':
          return rich?.createdDate ?? ''
      }
    }
  }, [richByRef])
  const { sorted: sortedProducts, sort, toggleSort } = useSortableRows<ProductRow, SortKey>(filteredProducts, sortValue)
  const pageProducts = sortedProducts.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function handleApplyFilters(next: ProductFilters) {
    setFilters(next)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedProducts.map((p) => {
      const rich = richByRef.get(p.ref)
      return [
        `${p.label} (Ref: ${p.ref})`,
        rich?.category ?? '',
        rich?.vatCode ?? '',
        `${formatMoney(p.priceExclTax)} ${summary.currency}`,
        `${formatMoney(p.priceInclTax)} ${summary.currency}`,
        String(p.stock),
        rich?.classification ?? '',
        rich?.zraStatus ?? '',
        rich?.lotStatus ?? '',
        rich?.country ?? '',
        rich?.createdDate ?? '',
      ]
    })
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Box size={20} className="text-brand" /> Product List
        </h2>
        <Link to={ROUTES.productCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Products</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.totalProducts}</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <Package size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Services</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.totalServices}</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
              <Wrench size={20} />
            </span>
          </Card>
        </div>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 text-sm font-medium rounded-md border border-input-border bg-input-bg text-text px-3 py-1.5 hover:bg-surface-hover"
            >
              <Filter size={14} /> Filter
              {activeFilterCount(filters) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-brand text-white text-[11px] font-semibold">
                  {activeFilterCount(filters)}
                </span>
              )}
            </button>
            <TableExportButtons title="Product List" getExportData={getExportData} />
          </div>
          {expandedId && <div className="p-4 pb-0"><ProductDetailPanel productId={expandedId} onClose={() => setExpandedId(null)} /></div>}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {summary.products.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      No products match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageProducts.map((p) => {
                    const rich = richByRef.get(p.ref)
                    return (
                      <tr
                        key={p.ref}
                        onClick={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
                        className="border-b border-border cursor-pointer hover:bg-surface-hover"
                      >
                        {/* Matches allproducts_ajax.php's own 'product' cell markup exactly: avatar,
                            label, "Ref: X" as a small muted sub-line, the whole thing clickable — one
                            combined cell, not two separate Ref/Label columns. In real legacy this link
                            goes to product/card.php?id=X; here it goes to the React Product Detail page
                            (/products/:id) instead, since that's now a real page covering the same
                            tabs. stopPropagation so clicking the link doesn't also toggle this row's
                            own inline detail panel underneath it. */}
                        <td className="px-4 py-3">
                          <Link to={ROUTES.productDetail.replace(':id', p.id)} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 group">
                            <ProductAvatar bg={rich?.avatarBg} color={rich?.avatarColor} />
                            <span className="flex flex-col">
                              <span className="text-brand group-hover:underline font-medium">{p.label}</span>
                              <span className="text-xs text-text-faint">Ref: {p.ref}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          <RichCell value={rich?.category} />
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          <RichCell value={rich?.vatCode} />
                        </td>
                        <td className="px-4 py-3 text-text-muted text-right tabular-nums">{formatMoney(p.priceExclTax)} {summary.currency}</td>
                        <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(p.priceInclTax)} {summary.currency}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {rich ? (
                            // Matches allproducts_ajax.php's own stockInfo markup exactly: Desired/Reserved
                            // line always shown first (small, muted), Physical second (bold), 3-way color —
                            // red if negative, warning if physical <= desired (covers the common 0<=0 case
                            // too), success only once physical genuinely exceeds desired.
                            <div className="flex flex-col">
                              <span className="text-xs text-text-faint">
                                Desired: {rich.stockDesired} | Reserved: {rich.stockReserved}
                              </span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  rich.stockPhysical < 0 ? 'text-danger' : rich.stockPhysical <= rich.stockDesired ? 'text-warning-fg' : 'text-success'
                                }`}
                              >
                                Physical: {rich.stockPhysical}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-muted tabular-nums">{p.stock}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                          <RichCell value={rich?.classification ?? undefined} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={rich?.zraStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={rich?.lotStatus} />
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                          <RichCell value={rich?.country} />
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                          <RichCell value={rich?.createdDate} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredProducts.length} onPageChange={setPage} edgeToEdge />
      <ProductFilterModal open={filterModalOpen} onClose={() => setFilterModalOpen(false)} filters={filters} onApply={handleApplyFilters} />
    </div>
  )
}
