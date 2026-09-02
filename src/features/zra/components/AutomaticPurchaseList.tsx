import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useAutomaticPurchaseList, type AutomaticPurchaseRow } from '../zraLists.queries'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ListHeader, ListPagination, SearchBox, EmptyRow } from './ZraListChrome'
import { formatMoney } from '../../../utils/format'

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

type SortKey = 'invoiceNo' | 'supplierName' | 'receiptType' | 'confirmationDate' | 'totalAmount'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Invoice No', key: 'invoiceNo' },
  { label: 'Supplier Details', key: 'supplierName' },
  { label: 'Receipt Type', key: 'receiptType' },
  { label: 'Confirmation Date', key: 'confirmationDate' },
  { label: 'Total Amount', key: 'totalAmount', align: 'right' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function sortValue(row: AutomaticPurchaseRow, key: SortKey): string | number {
  switch (key) {
    case 'invoiceNo':
      return row.invoiceNo
    case 'supplierName':
      return row.supplierName
    case 'receiptType':
      return row.receiptTypeCode
    case 'confirmationDate':
      return row.confirmationDate
    case 'totalAmount':
      return row.totalAmount
  }
}

export function AutomaticPurchaseList() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PAGE_SIZE_OPTIONS[2])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = useAutomaticPurchaseList({ page, perPage, search })
  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<AutomaticPurchaseRow, SortKey>(rows, sortValue)

  function getExportData() {
    return {
      headers: COLUMN_LABELS,
      rows: sortedRows.map((row) => [
        `${row.invoiceNo} (Sale Date: ${row.saleDate}, Item Count: ${row.itemCount})`,
        `${row.supplierName} (Tpin: ${row.supplierTpin}, Branch: ${row.supplierBranch})`,
        `${row.receiptTypeCode} (Payment Type: ${row.paymentTypeCode})`,
        row.remark ? `${row.confirmationDate} (Remark: ${row.remark})` : row.confirmationDate,
        `${formatMoney(row.totalAmount)} (Taxable: ${formatMoney(row.taxableAmount)}, Tax: ${formatMoney(row.taxAmount)})`,
      ]),
    }
  }

  return (
    // Full available height — see PendingPurchaseInvoicesList.tsx for the write-up on why
    // the sticky header block and ListPagination are flex-column siblings around the one
    // scrolling middle region, instead of a short fixed-height box.
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <ListHeader icon={<ShoppingCart size={20} className="text-brand" />} title="ZRA Automatic Purchase" count={total} />
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
            <TableExportButtons title="ZRA Automatic Purchase" getExportData={getExportData} />
          </div>
          <div className="w-full sm:w-80">
            <SearchBox
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={() => {
                setPage(1)
                setSearch(searchInput.trim())
              }}
              placeholder="Search invoice no, supplier…"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto my-4 rounded-xl border border-border bg-surface-alt soft-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              {COLUMNS.map((col) => (
                <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
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
              emptyLabel="No pending purchases found."
              feature="ZRA Automatic Purchase"
            />
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-border align-top hover:bg-surface-hover">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-text! font-medium">{row.invoiceNo}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Sale Date:</span> {row.saleDate}
                  </div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Item Count:</span> {row.itemCount}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-text!">{row.supplierName}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Tpin:</span> {row.supplierTpin}
                  </div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Branch:</span> {row.supplierBranch}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-text!">{row.receiptTypeCode}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Payment Type:</span> {row.paymentTypeCode}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-text!">{row.confirmationDate}</div>
                  {row.remark && <div className="text-text-faint">Remark: {row.remark}</div>}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <div className="text-text! font-medium">{formatMoney(row.totalAmount)}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Taxable:</span> {formatMoney(row.taxableAmount)}
                  </div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Tax:</span> {formatMoney(row.taxAmount)}
                  </div>
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
