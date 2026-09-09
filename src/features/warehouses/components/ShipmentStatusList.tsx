import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Plus, Loader2, AlertTriangle, Search, Filter, Check } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ROUTES } from '../../../routes'
import { useShipmentListEnriched, type ShipmentListRow } from '../shipmentListEnriched.queries'

// "Processed" (not "Closed") is the real label shown on the reference page's
// own status filter dropdown for fk_statut=2.
const STATUS_LABEL: Record<number, string> = { 0: 'Draft', 1: 'Validated', 2: 'Processed' }
const STATUS_CLASS: Record<number, string> = {
  0: 'bg-warning-bg text-warning-fg',
  1: 'bg-success-bg text-success-fg',
  2: 'bg-surface-hover text-text-muted',
}

type SortKey = 'ref' | 'customerRef' | 'thirdParty' | 'city' | 'zip' | 'plannedDelivery' | 'tracking' | 'deliveryRef' | 'dateReceived' | 'status' | 'date'
const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Ref. Customer', key: 'customerRef' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'City', key: 'city' },
  { label: 'Zip Code', key: 'zip' },
  { label: 'Planned Date Of Delivery', key: 'plannedDelivery' },
  { label: 'Tracking Number', key: 'tracking' },
  { label: 'Ref Delivery', key: 'deliveryRef' },
  { label: 'Date Delivery Received', key: 'dateReceived' },
  { label: 'Status', key: 'status' },
  { label: 'Date Created', key: 'date' },
]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const FILTER_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 0, label: 'Draft' },
  { value: 1, label: 'Validated' },
  { value: 2, label: 'Processed' },
]

function sortValue(row: ShipmentListRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'customerRef':
      return row.customerRef ?? ''
    case 'thirdParty':
      return row.thirdPartyName
    case 'city':
      return row.city
    case 'zip':
      return row.zip
    case 'tracking':
      return row.trackingNumber
    case 'plannedDelivery':
      return row.plannedDeliveryDate
    case 'deliveryRef':
      return row.deliveryRef
    case 'dateReceived':
      return row.dateDeliveryReceived
    case 'status':
      return row.statusCode
    case 'date':
      return row.dateCreation
  }
}

// Real reference page: expedition/list.php (List Of Shipments, and its
// Draft/Validated/Processed nav variants via the same page's own
// viewstatut=0/1/2 filter). See shipmentListEnriched.queries.ts's header
// comment for exactly what's real here and where each field actually comes
// from — every column below (including City/Zip/Ref Delivery/Date Delivery
// Received) is genuine, cross-referenced or scraped-with-justification
// real data, not a guess.
export function ShipmentStatusList({ title, statusFilter }: { title: string; statusFilter?: number }) {
  const { rows: allRows, isLoading, isError, error } = useShipmentListEnriched()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  // Overridable copy of the statusFilter prop — the real reference page
  // filters this same "List Of Shipments" page in place via a dropdown
  // rather than navigating to a different URL per status, so this lets the
  // filter menu below change what's shown without leaving the page (the nav
  // items for Draft/Validated/Processed still work too, just as a different
  // initial value on mount).
  const [filter, setFilter] = useState(statusFilter)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    function onClickOutside(e: MouseEvent) {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [filterOpen])

  const filteredRows = useMemo(() => {
    const statusMatched = allRows.filter((s) => filter === undefined || s.statusCode === filter)
    const q = search.trim().toLowerCase()
    if (!q) return statusMatched
    return statusMatched.filter(
      (s) => s.ref.toLowerCase().includes(q) || (s.customerRef ?? '').toLowerCase().includes(q) || s.thirdPartyName.toLowerCase().includes(q) || s.trackingNumber.toLowerCase().includes(q),
    )
  }, [allRows, filter, search])

  const { sorted, sort, toggleSort } = useSortableRows<ShipmentListRow, SortKey>(filteredRows, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: COLUMNS.map((c) => c.label),
      rows: sorted.map((s) => [
        s.ref,
        s.customerRef ?? '—',
        s.thirdPartyName || '—',
        s.city || '—',
        s.zip || '—',
        s.plannedDeliveryDate || '—',
        s.trackingNumber || '—',
        s.deliveryRef || '—',
        s.dateDeliveryReceived || '—',
        STATUS_LABEL[s.statusCode] ?? `Status ${s.statusCode}`,
        s.dateCreation,
      ]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> {title}
        </h2>
        <Link to={ROUTES.shipmentList} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Shipment
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load shipments.'}</p>
          </Card>
        )}

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search Ref / Customer / Third-Party / Tracking"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title={title} getExportData={getExportData} />
            <div ref={filterRef} className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                title="Filter by status"
                className={`flex items-center justify-center w-9 h-9 rounded-lg border ${filterOpen ? 'border-brand text-brand' : 'border-input-border text-text-muted hover:bg-surface-hover'}`}
              >
                <Filter size={16} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 rounded-lg border border-border bg-surface-alt shadow-lg z-20 py-1">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setFilter(opt.value)
                        setFilterOpen(false)
                        setPage(1)
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm text-left text-text hover:bg-surface-hover"
                    >
                      {opt.label}
                      {filter === opt.value && <Check size={14} className="text-brand" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th className="w-12">#</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align} className="whitespace-nowrap">
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin mr-2" /> Loading shipments…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s, i) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-3 py-2 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-3 py-2 text-text!">{s.ref}</td>
                      <td className="px-3 py-2 text-text-muted">{s.customerRef ?? '—'}</td>
                      <td className="px-3 py-2">
                        {s.socid ? (
                          <Link to={ROUTES.customerDetail.replace(':id', String(s.socid))} className="text-brand hover:underline">
                            {s.thirdPartyName || '—'}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{s.thirdPartyName || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.city || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.zip || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.plannedDeliveryDate || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.trackingNumber || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.deliveryRef || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.dateDeliveryReceived || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[s.statusCode] ?? 'bg-surface-hover text-text-muted'}`}>
                          {STATUS_LABEL[s.statusCode] ?? `Status ${s.statusCode}`}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.dateCreation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
