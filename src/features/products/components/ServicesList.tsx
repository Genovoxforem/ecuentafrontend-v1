import { useMemo, useState } from 'react'
import { Wrench, Search } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatMoney } from '../../../utils/format'
import type { ProductRow, ServicesSummary } from '../products.queries'

const COLUMNS = ['Ref', 'Label', 'Price (Excl. Tax)', 'Price (Incl. Tax)', 'VAT']
const PER_PAGE = 15

function matchesSearch(service: ProductRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [service.ref, service.label].some((field) => field.toLowerCase().includes(q))
}

export function ServicesList({ summary }: { summary: ServicesSummary }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const filteredServices = useMemo(() => summary.services.filter((s) => matchesSearch(s, search)), [summary.services, search])
  const pageServices = filteredServices.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Wrench size={20} className="text-brand" /> Service List
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {summary.services.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No services match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageServices.map((s) => (
                    <tr key={s.ref} className="border-b border-border">
                      <td className="px-4 py-3 text-brand">{s.ref}</td>
                      <td className="px-4 py-3 text-text!">{s.label}</td>
                      <td className="px-4 py-3 text-text-muted text-right tabular-nums">{formatMoney(s.priceExclTax)} {summary.currency}</td>
                      <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(s.priceInclTax)} {summary.currency}</td>
                      <td className="px-4 py-3 text-text-muted">{s.vatRate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={PER_PAGE} total={filteredServices.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
