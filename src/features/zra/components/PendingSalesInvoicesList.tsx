import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CloudUpload, FileText, Loader2, RefreshCw } from 'lucide-react'
import { usePendingSalesList, type PendingSalesInvoiceRow } from '../zraLists.queries'
import { useRefreshZraInvoiceResponse, useSyncPendingSalesToZra, type PendingSalesSyncResult } from '../zraActions.queries'
import { formatMoney } from '../../../utils/format'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ListHeader, ListPagination, SearchBox, EmptyRow, ZraStatusBadge } from './ZraListChrome'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { LegacyTooltipCard } from '../../../shared/components/LegacyTooltipCard'
import { resolveLegacyRoute } from '../../../shared/legacyRoute'
import type { LegacyTooltip } from '../../../shared/legacyTooltip'

// A linked cell as the classic list draws it: the backend's link mapped to the React page (plain text when there is
// none), with its hover card.
function CellLink({ href, tip, className, children }: { href: string | null; tip: LegacyTooltip | null; className?: string; children: ReactNode }) {
  const to = resolveLegacyRoute(href)
  return (
    <LegacyTooltipCard tip={tip}>
      {to ? (
        <Link to={to} className={`hover:underline ${className ?? ''}`}>
          {children}
        </Link>
      ) : (
        <span className={className}>{children}</span>
      )}
    </LegacyTooltipCard>
  )
}

const Initials = ({ text }: { text: string }) =>
  text ? <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">{text}</span> : null

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

type SortKey = 'ref' | 'invoiceDate' | 'dueDate' | 'thirdParty' | 'city' | 'paymentType' | 'paymentTerms' | 'amount' | 'author' | 'status' | 'zraStatus'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Invoice Date', key: 'invoiceDate' },
  { label: 'Due Date', key: 'dueDate' },
  { label: 'Third-party', key: 'thirdParty' },
  { label: 'City', key: 'city' },
  { label: 'Payment Type', key: 'paymentType' },
  { label: 'Payment Terms', key: 'paymentTerms' },
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
    case 'paymentTerms':
      return row.paymentTerms ?? ''
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

  // The classic page's multi-sync: tick rows, "Sync to ZRA" sends them to the gateway (no confirmation there either).
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [syncResult, setSyncResult] = useState<PendingSalesSyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const sync = useSyncPendingSalesToZra()
  const refresh = useRefreshZraInvoiceResponse()
  const pageIds = rows.map((r) => r.id).filter((id): id is number => id != null && id > 0)
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const toggleRow = (id: number) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(pageIds))
  const runSync = () => {
    setSyncResult(null)
    setSyncError(null)
    if (selected.size === 0) return setSyncError('Please select at least one invoice to sync to ZRA.')
    sync.mutate([...selected], {
      onSuccess: (r) => {
        setSyncResult(r)
        setSelected(new Set())
      },
      onError: (e) => setSyncError(e instanceof Error ? e.message : 'Request failed.'),
    })
  }

  function getExportData() {
    return {
      headers: COLUMN_LABELS,
      rows: sortedRows.map((row) => [
        row.refNote ? `${row.ref} (${row.refNote})` : row.ref,
        row.invoiceDate,
        row.dueDate ?? '',
        row.thirdParty,
        row.city ?? '',
        row.paymentType ?? '',
        row.paymentTerms ?? '',
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <InBanner>
          <button
            type="button"
            onClick={runSync}
            disabled={sync.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {sync.isPending ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />} {sync.isPending ? 'Syncing...' : 'Sync to ZRA'}
          </button>
        </InBanner>
        <div className="flex flex-wrap items-center gap-3 empty:hidden">
          {sync.isPending && <span className="text-sm text-text-muted">Syncing {selected.size} invoice(s) to ZRA...</span>}
          {syncError && <span role="alert" className="text-sm text-danger">{syncError}</span>}
          {syncResult &&
            (syncResult.ok ? (
              <span className="text-sm text-success-fg">
                {syncResult.success} of {syncResult.total} invoice(s) synced successfully.
              </span>
            ) : (
              <div role="alert" className="text-sm text-danger">
                {syncResult.success} succeeded, {syncResult.failed} failed out of {syncResult.total}.
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {syncResult.results
                    .filter((r) => !r.ok)
                    .map((r) => (
                      <li key={r.id}>
                        <strong>{r.ref || `#${r.id}`}</strong>: {r.msg || 'Failed'}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ListHeader icon={<FileText size={16} className="text-brand" />} count={total} />
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

      <div className="min-h-0 min-w-0 flex-1 overflow-auto my-4 rounded-xl border border-border bg-surface-alt soft-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              <th className="w-8 px-3 py-2">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" title="Select All" />
              </th>
              {COLUMNS.map((col) => (
                <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                  {col.label}
                </Th>
              ))}
            </TheadRow>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={COLUMN_LABELS.length + 1}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={rows.length === 0}
              emptyLabel="No pending sales invoices found."
              feature="ZRA Pending Sales Invoices"
            />
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3">
                  {row.id != null && <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id!)} aria-label={`Select ${row.ref}`} />}
                </td>
                <td className="px-3 py-3">
                  <CellLink href={row.refHref} tip={row.refTip} className="text-brand font-medium">
                    {row.ref}
                  </CellLink>
                  {row.refNote && <div className="text-text-faint text-xs">{row.refNote}</div>}
                </td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.invoiceDate}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.dueDate || '-'}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Initials text={row.thirdPartyInitials} />
                    <div className="min-w-0">
                      <CellLink href={row.thirdPartyHref} tip={row.thirdPartyTip} className="text-brand">
                        {row.thirdParty}
                      </CellLink>
                      {row.thirdPartyCode && <div className="text-text-faint text-xs">{row.thirdPartyCode}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-text-muted">{row.city || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.paymentType || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.paymentTerms || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">
                  {formatMoney(row.amountInclTax)}
                  <div className="text-text-faint text-xs">
                    HT: {formatMoney(row.amountExclTax)} | VAT: {formatMoney(row.vat)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Initials text={row.authorInitials} />
                    <CellLink href={row.authorHref} tip={row.authorTip} className="text-brand">
                      {row.author}
                    </CellLink>
                  </div>
                </td>
                <td className="px-3 py-3 text-text-muted">
                  {row.status}
                  {row.currency && <div className="text-text-faint text-xs">Currency: {row.currency}</div>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <ZraStatusBadge synced={row.zraSucceeded} label={row.zraStatusMessage} />
                    {row.zraRefreshRef && (
                      <button
                        type="button"
                        onClick={() => refresh.mutate(row.zraRefreshRef!)}
                        disabled={refresh.isPending}
                        title="Refresh the ZRA response"
                        aria-label={`Refresh the ZRA response of ${row.ref}`}
                        className="grid h-7 w-7 place-items-center rounded-md bg-success text-white hover:opacity-90 disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={refresh.isPending && refresh.variables === row.zraRefreshRef ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="-mx-6 -mb-6">


        <ListPagination page={page} perPage={perPage} total={total} onPageChange={setPage} />


      </div>
    </div>
  )
}
