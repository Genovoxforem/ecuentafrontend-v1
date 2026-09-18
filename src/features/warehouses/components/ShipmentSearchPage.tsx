import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Search, Loader2, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ROUTES } from '../../../routes'
import { useSalesOrdersSummary } from '../../salesOrders/salesOrders.queries'
import { useOrdersPendingShipment, type PendingShipmentRow } from '../ordersPendingShipment.queries'
import { useShipmentCreatedList, type ShipmentCreatedRow } from '../shipmentCreatedList.queries'
import { formatMoney } from '../../../utils/format'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

type CreatedSortKey = 'orderRef' | 'shipmentRef' | 'customer' | 'amount' | 'shipDate' | 'deliveryDate'
const CREATED_COLUMNS: { label: string; key: CreatedSortKey; align?: 'right' }[] = [
  { label: 'Order Ref', key: 'orderRef' },
  { label: 'Shipment Ref', key: 'shipmentRef' },
  { label: 'Customer Name', key: 'customer' },
  { label: 'Price', key: 'amount', align: 'right' },
  { label: 'Shipment Date', key: 'shipDate' },
  { label: 'Delivery Date', key: 'deliveryDate' },
]

type PendingSortKey = 'ref' | 'customer' | 'status' | 'amount' | 'date'
const PENDING_COLUMNS: { label: string; key?: PendingSortKey; align?: 'right' }[] = [
  { label: 'Ref.Id', key: 'ref' },
  { label: 'Customer Name', key: 'customer' },
  { label: 'Order Status', key: 'status' },
  { label: 'Order Price', key: 'amount', align: 'right' },
  { label: 'Order Date', key: 'date' },
  { label: 'Action' },
]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function firstOfMonthIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function lastOfMonthIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

function pendingSortValue(row: PendingShipmentRow, key: PendingSortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'customer':
      return row.thirdParty
    case 'status':
      return row.status
    case 'amount':
      return row.amountExclTax
    case 'date':
      return row.orderDate
  }
}

// expedition/shippingcard.php?action=create2's "Yet To Create Shipment" tab.
// See ordersPendingShipment.queries.ts's header comment for the full real
// SQL this reproduces and exactly what is/isn't confirmed real: the visible
// order list + filters come from the same real commande/salesoredr_ajax_list.php
// endpoint already used by Sales Orders, and "already has a shipment" is a
// genuine per-order check (reusing Order Detail's own Shipments-tab lookup),
// not a scrape of this specific page or a guess.
function PendingShipmentTab() {
  const [dateFrom, setDateFrom] = useState(firstOfMonthIso())
  const [dateTo, setDateTo] = useState(lastOfMonthIso())
  const [socid, setSocid] = useState('')
  const [author, setAuthor] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: firstOfMonthIso(), dateTo: lastOfMonthIso(), socid: null as number | null, author: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const summary = useSalesOrdersSummary()
  const pending = useOrdersPendingShipment(appliedFilters)

  const customerOptions = useMemo(() => {
    const seen = new Map<number, string>()
    for (const o of summary.data?.orders ?? []) {
      if (o.socid && !seen.has(o.socid)) seen.set(o.socid, o.thirdParty)
    }
    return Array.from(seen, ([value, label]) => ({ value: String(value), label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [summary.data?.orders])

  const authorOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const o of summary.data?.orders ?? []) if (o.author) seen.add(o.author)
    return Array.from(seen).sort()
  }, [summary.data?.orders])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pending.rows
    return pending.rows.filter((r) => r.ref.toLowerCase().includes(q) || r.thirdParty.toLowerCase().includes(q))
  }, [pending.rows, search])

  const { sorted, sort, toggleSort } = useSortableRows<PendingShipmentRow, PendingSortKey>(filteredRows, pendingSortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function handleSearch() {
    setAppliedFilters({ dateFrom, dateTo, socid: socid ? Number(socid) : null, author })
    setPage(1)
  }

  function getExportData() {
    return {
      headers: PENDING_COLUMNS.map((c) => c.label),
      rows: sorted.map((r) => [r.ref, r.thirdParty, r.status, formatMoney(r.amountExclTax), r.orderDate, '']),
    }
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-faint mb-1">Order Created On</label>
              <div className="flex items-center gap-1.5">
                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={inputCls + ' flex-1'} />
                <span className="text-text-faint text-xs shrink-0">to</span>
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={inputCls + ' flex-1'} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Customer Details</label>
              <SearchableSelect value={socid} onChange={setSocid} options={customerOptions} placeholder="-- Select Customer --" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-text-faint mb-1">Created By</label>
                <select value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls + ' w-full appearance-none'}>
                  <option value="">-- All Users --</option>
                  {authorOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={handleSearch} className="flex items-center gap-1.5 rounded-md bg-brand px-4 h-9 text-sm font-medium text-white hover:bg-brand-hover shrink-0">
                <Search size={14} /> Search
              </button>
            </div>
          </div>
        </Card>

        {(summary.isError || pending.isError) && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{pending.error instanceof Error ? pending.error.message : 'Failed to load orders pending shipment.'}</p>
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
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Yet To Create Shipment" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {PENDING_COLUMNS.map((col) => (
                    <Th key={col.label} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {pending.isLoading ? (
                  <tr>
                    <td colSpan={PENDING_COLUMNS.length} className="px-4 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin mr-2" /> Checking which orders still need shipping…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={PENDING_COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                      No orders match these filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-text!">{r.ref}</td>
                      <td className="px-4 py-3">
                        {r.socid ? (
                          <Link to={ROUTES.customerDetail.replace(':id', String(r.socid))} className="text-brand hover:underline">
                            {r.thirdParty}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{r.thirdParty}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success-bg text-success-fg">{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted tabular-nums">{formatMoney(r.amountExclTax)}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.orderDate}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`${ROUTES.orderDetail.replace(':id', String(r.id))}?tab=shipments`}
                          className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
                        >
                          Create Shipment
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} edgeToEdge />
    </>
  )
}

// expedition/shippingcard.php?action=create2's "Shipment Created List" tab.
// See shipmentCreatedList.queries.ts's header comment for exactly what's
// real here (Order Ref/Customer/Price/Delivery Date, all genuinely
// cross-referenced real data) vs. what was deliberately dropped (the "Order
// Status" Shipment/Delivery/Packing badge — no real source exists for it
// outside this exact page's own HTML, so per an explicit product decision
// it's left off rather than scraped from the page being redesigned).
function createdSortValue(row: ShipmentCreatedRow, key: CreatedSortKey): string | number {
  switch (key) {
    case 'orderRef':
      return row.orderRef
    case 'shipmentRef':
      return row.ref
    case 'customer':
      return row.customerName
    case 'amount':
      return row.amountExclTax ?? -Infinity
    case 'shipDate':
      return row.dateCreation
    case 'deliveryDate':
      return row.deliveryDate
  }
}

function ShipmentCreatedTab() {
  const { rows: allRows, isLoading, isError, error } = useShipmentCreatedList()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((s) => s.ref.toLowerCase().includes(q) || s.orderRef.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q))
  }, [allRows, search])

  const { sorted, sort, toggleSort } = useSortableRows<ShipmentCreatedRow, CreatedSortKey>(filteredRows, createdSortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: CREATED_COLUMNS.map((c) => c.label),
      rows: sorted.map((s) => [s.orderRef, s.ref, s.customerName, s.amountExclTax !== null ? formatMoney(s.amountExclTax) : '—', s.dateCreation, s.deliveryDate || '—']),
    }
  }

  return (
    <>
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
                placeholder="Search Order Ref / Shipment Ref / Customer"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Shipment Created List" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {CREATED_COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={CREATED_COLUMNS.length} className="px-4 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin mr-2" /> Loading shipments…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={CREATED_COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-3 py-2">
                        {s.orderId ? (
                          <Link to={`${ROUTES.orderDetail.replace(':id', String(s.orderId))}?tab=shipments`} className="text-brand hover:underline">
                            {s.orderRef}
                          </Link>
                        ) : (
                          <span className="text-text-faint">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text!">{s.ref}</td>
                      <td className="px-3 py-2">
                        {s.socid ? (
                          <Link to={ROUTES.customerDetail.replace(':id', String(s.socid))} className="text-brand hover:underline">
                            {s.customerName}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{s.customerName || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-text-muted tabular-nums">{s.amountExclTax !== null ? formatMoney(s.amountExclTax) : '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.dateCreation}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.deliveryDate || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} edgeToEdge />
    </>
  )
}

// -m-6 + flex-1 flex-col + sticky header/footer: same shell every other list
// page in this app uses (see InventoryListPage.tsx) — title left, primary
// action(s) right in one sticky bar, content fills the remaining height, and
// ListPagination sits as the sticky footer. Previously this page didn't use
// that shell at all (a plain space-y-4 stack with the tab switch on its own
// row and a fixed-height table), which is why it looked inconsistent with
// every other list page in the app.
export function ShipmentSearchPage() {
  const [tab, setTab] = useState<'pending' | 'created'>('pending')

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> Shipment
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === 'pending' ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
          >
            Yet To Create Shipment
          </button>
          <button
            type="button"
            onClick={() => setTab('created')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === 'created' ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
          >
            Shipment Created List
          </button>
        </div>
      </div>

      {tab === 'pending' ? <PendingShipmentTab /> : <ShipmentCreatedTab />}
    </div>
  )
}
