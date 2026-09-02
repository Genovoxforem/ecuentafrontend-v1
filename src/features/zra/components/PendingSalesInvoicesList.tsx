import { useState } from 'react'
import { FileText } from 'lucide-react'
import { usePendingSalesList, type PendingSalesInvoiceRow } from '../zraLists.queries'
import { formatMoney } from '../../../utils/format'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ListHeader, ListPagination, SearchBox, EmptyRow, ZraStatusBadge } from './ZraListChrome'

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

type SortKey = 'ref' | 'invoiceDate' | 'dueDate' | 'thirdParty' | 'city' | 'paymentType' | 'amount' | 'author' | 'status' | 'zraStatus'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Invoice Date', key: 'invoiceDate' },
  { label: 'Due Date', key: 'dueDate' },
  { label: 'Third-party', key: 'thirdParty' },
  { label: 'City', key: 'city' },
  { label: 'Payment Type', key: 'paymentType' },
  { label: 'Amount (excl. tax)', key: 'amount' },
  { label: 'Author', key: 'author' },
  { label: 'Status', key: 'status' },
  { label: 'Zra Status', key: 'zraStatus' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function sortValue(row: PendingSalesInvoiceRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'invoiceDate':
      return row.invoiceDate
    case 'dueDate':
      return row.dueDate ?? ''
    case 'thirdParty':
      return row.thirdParty
    case 'city':
      return row.city ?? ''
    case 'paymentType':
      return row.paymentType ?? ''
    case 'amount':
      return row.amountInclTax
    case 'author':
      return row.author
    case 'status':
      return row.status
    case 'zraStatus':
      return row.zraStatusMessage
  }
}

export function PendingSalesInvoicesList() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PAGE_SIZE_OPTIONS[2])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = usePendingSalesList({ page, perPage, search })
  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<PendingSalesInvoiceRow, SortKey>(rows, sortValue)

  function getExportData() {
    return {
      headers: COLUMN_LABELS,
      rows: sortedRows.map((row) => [
        row.ref,
        row.invoiceDate,
        row.dueDate ?? '',
        row.thirdParty,
        row.city ?? '',
        row.paymentType ?? '',
        formatMoney(row.amountInclTax),
        row.author,
        row.status,
        row.zraStatusMessage,
      ]),
    }
  }

  return (
    // Full available height — see PendingPurchaseInvoicesList.tsx for the write-up on why
    // the sticky header block and ListPagination are flex-column siblings around the one
    // scrolling middle region, instead of a short fixed-height box.
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <ListHeader icon={<FileText size={20} className="text-brand" />} title="ZRA Pending Sales Invoices" count={total} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              entries per page
            </label>
            <TableExportButtons title="ZRA Pending Sales Invoices" getExportData={getExportData} />
          </div>
          <div className="w-full sm:w-80">
            <SearchBox
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={() => {
                setPage(1)
                setSearch(searchInput.trim())
              }}
              placeholder="Search ref, customer…"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto my-4 rounded-xl border border-border bg-surface-alt soft-scrollbar">
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
            <EmptyRow
              colSpan={COLUMN_LABELS.length}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={rows.length === 0}
              emptyLabel="No pending sales invoices found."
              feature="ZRA Pending Sales Invoices"
            />
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-brand font-medium">{row.ref}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.invoiceDate}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.dueDate || '-'}</td>
                <td className="px-3 py-3 text-text!">{row.thirdParty}</td>
                <td className="px-3 py-3 text-text-muted">{row.city || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.paymentType || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">
                  {formatMoney(row.amountInclTax)}
                  <div className="text-text-faint text-xs">
                    HT: {formatMoney(row.amountExclTax)} | VAT: {formatMoney(row.vat)}
                  </div>
                </td>
                <td className="px-3 py-3 text-text-muted">{row.author}</td>
                <td className="px-3 py-3 text-text-muted">{row.status}</td>
                <td className="px-3 py-3">
                  <ZraStatusBadge synced={row.zraSucceeded} label={row.zraStatusMessage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} perPage={perPage} total={total} onPageChange={setPage} />
    </div>
  )
}
