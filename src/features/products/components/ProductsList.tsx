import { useMemo, useState } from 'react'
import { Box, Package, Wrench, Search } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatMoney } from '../../../utils/format'
import type { ProductRow, ProductsSummary } from '../products.queries'

const COLUMNS = ['Ref', 'Label', 'Price (Excl. Tax)', 'Price (Incl. Tax)', 'VAT', 'Stock', 'Type', 'Barcode']
const PER_PAGE = 15

function matchesSearch(product: ProductRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [product.ref, product.label, product.barcode].some((field) => field.toLowerCase().includes(q))
}

export function ProductsList({ summary }: { summary: ProductsSummary }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const filteredProducts = useMemo(() => summary.products.filter((p) => matchesSearch(p, search)), [summary.products, search])
  const pageProducts = filteredProducts.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Box size={20} className="text-brand" /> Product List
        </h2>
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
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {COLUMNS.map((col) => (
                    <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.products.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No products match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageProducts.map((p) => (
                    <tr key={p.ref} className="border-b border-border">
                      <td className="px-4 py-3 text-brand">{p.ref}</td>
                      <td className="px-4 py-3 text-text!">{p.label}</td>
                      <td className="px-4 py-3 text-text-muted text-right tabular-nums">{formatMoney(p.priceExclTax)} {summary.currency}</td>
                      <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(p.priceInclTax)} {summary.currency}</td>
                      <td className="px-4 py-3 text-text-muted">{p.vatRate}</td>
                      <td className="px-4 py-3 text-text-muted text-right tabular-nums">{p.stock}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.type === 'service' ? 'bg-info-bg text-info-fg' : 'bg-success-bg text-success-fg'}`}>
                          {p.type === 'service' ? 'Service' : 'Product'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{p.barcode}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={PER_PAGE} total={filteredProducts.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
