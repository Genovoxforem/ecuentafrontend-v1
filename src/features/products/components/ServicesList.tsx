import { useMemo, useState } from 'react'
import { Wrench, Search } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney } from '../../../utils/format'
import type { ProductRow, ServicesSummary } from '../products.queries'

type SortKey = 'ref' | 'label' | 'priceExcl' | 'priceIncl' | 'vat'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Label', key: 'label' },
  { label: 'Price (Excl. Tax)', key: 'priceExcl' },
  { label: 'Price (Incl. Tax)', key: 'priceIncl' },
  { label: 'VAT', key: 'vat' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(service: ProductRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [service.ref, service.label].some((field) => field.toLowerCase().includes(q))
}

function sortValue(s: ProductRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return s.ref
    case 'label':
      return s.label
    case 'priceExcl':
      return s.priceExclTax
    case 'priceIncl':
      return s.priceInclTax
    case 'vat':
      return s.vatRate
  }
}

export function ServicesList({ summary }: { summary: ServicesSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredServices = useMemo(() => summary.services.filter((s) => matchesSearch(s, search)), [summary.services, search])
  const { sorted: sortedServices, sort, toggleSort } = useSortableRows<ProductRow, SortKey>(filteredServices, sortValue)
  const pageServices = sortedServices.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedServices.map((s) => [s.ref, s.label, `${formatMoney(s.priceExclTax)} ${summary.currency}`, `${formatMoney(s.priceInclTax)} ${summary.currency}`, s.vatRate])
    return { headers: COLUMN_LABELS, rows }
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
            <TableExportButtons title="Service List" getExportData={getExportData} />
          </div>
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
                {summary.services.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
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
      <ListPagination page={page} perPage={perPage} total={filteredServices.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
