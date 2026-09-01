import { useMemo, useState } from 'react'
import { TriangleAlert, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { useInvoicesSummary, type InvoiceRow } from '../invoices.queries'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const COLUMN_LABELS = ['Ref', 'Invoice Date', 'Third-Party', 'Amount (Incl. Tax)', 'Status']

type SortKey = 'ref' | 'invoiceDate' | 'thirdParty' | 'amountInclTax'

function matchesSearch(r: InvoiceRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.ref, r.thirdParty].some((field) => field.toLowerCase().includes(q))
}

function sortValue(r: InvoiceRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'invoiceDate':
      return r.invoiceDate
    case 'thirdParty':
      return r.thirdParty
    case 'amountInclTax':
      return r.amountInclTax
  }
}

// Same real GET /api/invoices/ data as the main invoice list (see
// invoices.queries.ts), filtered to Dolibarr's fk_statut=3 ("Abandoned") —
// the same query the legacy page's own "Abandoned" filter link runs
// server-side (list.php?search_status=3), just applied client-side here
// since useInvoicesSummary already fetches every status.
export function AbandonedInvoicesPage() {
  const { data, isLoading, isError } = useInvoicesSummary()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => (data?.rows ?? []).filter((r) => r.rawStatut === 3), [data])
  const filteredRows = useMemo(() => rows.filter((r) => matchesSearch(r, search)), [rows, search])
  const { sorted, sort, toggleSort } = useSortableRows<InvoiceRow, SortKey>(filteredRows, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const exportRows = sorted.map((r) => [r.ref, formatDateTimeAmPm(r.invoiceDate), r.thirdParty, formatMoney(r.amountInclTax), 'Abandoned'])
    return { headers: COLUMN_LABELS, rows: exportRows }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <TriangleAlert size={20} className="text-brand" /> Abandoned Invoices
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
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
            <TableExportButtons title="Abandoned Invoices" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>
                    Ref
                  </Th>
                  <Th sortKey="invoiceDate" sort={sort} onSort={toggleSort}>
                    Invoice Date
                  </Th>
                  <Th sortKey="thirdParty" sort={sort} onSort={toggleSort}>
                    Third-Party
                  </Th>
                  <Th sortKey="amountInclTax" sort={sort} onSort={toggleSort} align="right">
                    Amount (Incl. Tax)
                  </Th>
                  <Th>Status</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-danger">
                      Could not load invoices.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                      No abandoned invoices match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(r.invoiceDate)}</td>
                      <td className="px-4 py-3 text-text!">{r.thirdParty}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amountInclTax)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-danger-bg text-danger-fg">Abandoned</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
