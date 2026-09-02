import { useState } from 'react'
import { Package } from 'lucide-react'
import { useUnuploadedProductsList, type UnuploadedProductRow } from '../zraLists.queries'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ListHeader, ListPagination, SearchBox, EmptyRow } from './ZraListChrome'

// "Queued For Offline Sync" is an expected, informational state (not an
// error) — only messages that actually mention an error/rejection get the
// danger treatment; anything else real but non-error gets a neutral note;
// no message yet gets a plain dash rather than an empty colored pill.
function ZraStatusCell({ message }: { message: string }) {
  if (!message) return <span className="text-text-faint">-</span>
  const isError = /error|reject|fail/i.test(message)
  return (
    <span
      title={message}
      className={`block max-w-[240px] truncate px-2 py-0.5 rounded text-xs font-medium ${
        isError ? 'bg-danger-bg text-danger-fg' : 'bg-warning-bg text-warning-fg'
      }`}
    >
      {message}
    </span>
  )
}

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

type SortKey = 'product' | 'vatCode' | 'price' | 'country' | 'createdDate' | 'zraStatus'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Product', key: 'product' },
  { label: 'VAT Code', key: 'vatCode' },
  { label: 'Price', key: 'price' },
  { label: 'Country', key: 'country' },
  { label: 'Created Date', key: 'createdDate' },
  { label: 'ZRA Status', key: 'zraStatus' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function sortValue(row: UnuploadedProductRow, key: SortKey): string | number {
  switch (key) {
    case 'product':
      return row.name
    case 'vatCode':
      return row.vatCode
    case 'price':
      return row.price
    case 'country':
      return row.country
    case 'createdDate':
      return row.createdDate
    case 'zraStatus':
      return row.zraStatusMessage
  }
}

// Real POST product/allproducts_ajax.php?zrastatus=unupload data (see
// zraLists.queries.ts) — confirmed live against llx_product WHERE
// p.zracode != '000' OR p.zracode IS NULL, matching the real "Un-uploaded
// Products/services" page. This page never had a backend wired at all
// before (not even on the old ecnta10 instance), so this is a fresh build.
// The real "Upload Products" action itself has not been traced/wired —
// only the list is real here.
export function UnuploadProductsList() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PAGE_SIZE_OPTIONS[2])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = useUnuploadedProductsList({ page, perPage, search })
  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<UnuploadedProductRow, SortKey>(rows, sortValue)

  function getExportData() {
    return {
      headers: COLUMN_LABELS,
      rows: sortedRows.map((row) => [
        row.ref ? `${row.name} (Ref: ${row.ref})` : row.name,
        row.vatCode || '',
        row.priceLabel || '',
        row.country || '',
        row.createdDate,
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
        <ListHeader icon={<Package size={20} className="text-brand" />} title="Un-uploaded Products/services" count={total} />
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
            <TableExportButtons title="Un-uploaded Products-services" getExportData={getExportData} />
          </div>
          <div className="w-full sm:w-80">
            <SearchBox
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={() => {
                setPage(1)
                setSearch(searchInput.trim())
              }}
              placeholder="Search ref, label, barcode…"
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
              emptyLabel="No un-uploaded products found."
              feature="Un-uploaded Products/services"
            />
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-warning-bg text-warning-fg">
                      <Package size={15} />
                    </span>
                    <div className="min-w-0">
                      {row.productUrl ? (
                        <a href={row.productUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline font-medium truncate block">
                          {row.name}
                        </a>
                      ) : (
                        <p className="text-text! font-medium truncate">{row.name}</p>
                      )}
                      {row.ref && <p className="text-text-faint text-xs truncate">Ref: {row.ref}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-text-muted">{row.vatCode || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.priceLabel || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.country || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.createdDate}</td>
                <td className="px-3 py-3">
                  <ZraStatusCell message={row.zraStatusMessage} />
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
