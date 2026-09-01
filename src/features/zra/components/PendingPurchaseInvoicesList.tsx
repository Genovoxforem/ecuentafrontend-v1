import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { usePendingPurchasesList, type PendingPurchaseInvoiceRow } from '../zraLists.queries'
import { formatMoney } from '../../../utils/format'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ListHeader, ListPagination, SearchBox, EmptyRow, ZraStatusBadge, PER_PAGE } from './ZraListChrome'

// Real getLibStatut() labels this backend actually returns for supplier
// invoices (confirmed live: Draft/Paid/Started/Not Paid all appear in real
// rows) — anything else falls back to a neutral pill rather than guessing
// a color for a label that hasn't been seen.
const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-surface-hover text-text-muted',
  Paid: 'bg-info-bg text-info-fg',
  Started: 'bg-success-bg text-success-fg',
  'Not Paid': 'bg-warning-bg text-warning-fg',
}
function StatusPill({ label }: { label: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_STYLES[label] ?? 'bg-surface-hover text-text-muted'}`}>{label}</span>
}

// Deterministic color per third party (same name always gets the same
// color) purely for visual scanning — not tied to any real per-company
// color from the backend, which has none.
const AVATAR_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6', 'bg-chart-7']
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '-'
}

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

type SortKey = 'ref' | 'refVendor' | 'invoiceDate' | 'dueDate' | 'thirdParty' | 'paymentType' | 'amountExclTax' | 'status' | 'zraStatus'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Ref. Vendor', key: 'refVendor' },
  { label: 'Invoice Date', key: 'invoiceDate' },
  { label: 'Due Date', key: 'dueDate' },
  { label: 'Third-party', key: 'thirdParty' },
  { label: 'Payment Type', key: 'paymentType' },
  { label: 'Amount (excl. tax)', key: 'amountExclTax' },
  { label: 'Status', key: 'status' },
  { label: 'Zra Status', key: 'zraStatus' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function sortValue(row: PendingPurchaseInvoiceRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'refVendor':
      return row.refVendor ?? ''
    case 'invoiceDate':
      return row.invoiceDate
    case 'dueDate':
      return row.dueDate ?? ''
    case 'thirdParty':
      return row.thirdParty
    case 'paymentType':
      return row.paymentType ?? ''
    case 'amountExclTax':
      return row.amountExclTax
    case 'status':
      return row.status
    case 'zraStatus':
      return row.zraStatusMessage
  }
}

export function PendingPurchaseInvoicesList() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PER_PAGE)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = usePendingPurchasesList({ page, perPage, search })
  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<PendingPurchaseInvoiceRow, SortKey>(rows, sortValue)

  function getExportData() {
    return {
      headers: COLUMN_LABELS,
      rows: sortedRows.map((row) => [
        row.ref,
        row.refVendor ?? '',
        row.invoiceDate,
        row.dueDate ?? '',
        row.thirdParty,
        row.paymentType ?? '',
        formatMoney(row.amountExclTax),
        row.status,
        row.zraStatusMessage,
      ]),
    }
  }

  return (
    // Full available height, not just however tall the content happens to
    // be — the header/footer below stay pinned via sticky *and* by simply
    // being flex-column siblings outside the one scrolling region, matching
    // the same pattern already used on AsycudaPurchaseInvoiceCreate.tsx.
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <ListHeader icon={<ShoppingCart size={20} className="text-brand" />} title="ZRA Pending Purchase Invoices" count={total} />
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
            <TableExportButtons title="ZRA Pending Purchase Invoices" getExportData={getExportData} />
          </div>
          <div className="w-full sm:w-80">
            <SearchBox
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={() => {
                setPage(1)
                setSearch(searchInput.trim())
              }}
              placeholder="Search ref, vendor…"
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
              emptyLabel="No pending purchase invoices found."
              feature="ZRA Pending Purchase Invoices"
            />
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-brand font-medium whitespace-nowrap">{row.ref}</td>
                <td className="px-3 py-3 text-text-muted">{row.refVendor || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.invoiceDate}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.dueDate || '-'}</td>
                <td className="px-3 py-3 text-text!">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-[11px] font-semibold text-white ${avatarColor(row.thirdParty)}`}>
                      {initials(row.thirdParty)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate">{row.thirdParty}</p>
                      {row.thirdPartyAlias && <p className="text-text-faint text-xs truncate">{row.thirdPartyAlias}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.paymentType || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">
                  <span className="text-text! font-medium">{formatMoney(row.amountInclTax)}</span>
                  <div className="text-text-faint text-xs">
                    HT: {formatMoney(row.amountExclTax)} | VAT: {formatMoney(row.vat)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <StatusPill label={row.status} />
                </td>
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
