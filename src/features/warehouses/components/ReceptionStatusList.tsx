import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, Plus, Search, Loader2, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ROUTES } from '../../../routes'
import { useReceptionList, type ReceptionListRow } from '../receptionList.queries'

type SortKey = 'ref' | 'refVendor' | 'thirdParty' | 'city' | 'zip' | 'plannedDelivery' | 'status' | 'billed'
const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Ref. Vendor', key: 'refVendor' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'City', key: 'city' },
  { label: 'Zip Code', key: 'zip' },
  { label: 'Planned Date Of Delivery', key: 'plannedDelivery' },
  { label: 'Status', key: 'status' },
  { label: 'Billed', key: 'billed' },
]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(row: ReceptionListRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'refVendor':
      return row.refVendor
    case 'thirdParty':
      return row.thirdPartyName
    case 'city':
      return row.city
    case 'zip':
      return row.zip
    case 'plannedDelivery':
      return row.plannedDeliveryDate
    case 'status':
      return row.status
    case 'billed':
      return row.billed
  }
}

// reception/list.php (List Of Receptions, and its Draft/Validated/Processed
// nav variants via the same page's own ?viewstatut filter). See
// receptionList.queries.ts's header comment for exactly what's real —
// everything here (including City/Zip) is genuine, single-fetch data, no
// per-record follow-ups needed.
export function ReceptionStatusList({ title = 'List Of Receptions', statusFilter }: { title?: string; statusFilter?: number }) {
  const { data: allRows, isLoading, isError, error } = useReceptionList(statusFilter)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filteredRows = useMemo(() => {
    const rows = allRows ?? []
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.ref.toLowerCase().includes(q) || r.thirdPartyName.toLowerCase().includes(q) || r.refVendor.toLowerCase().includes(q))
  }, [allRows, search])

  const { sorted, sort, toggleSort } = useSortableRows<ReceptionListRow, SortKey>(filteredRows, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: COLUMNS.map((c) => c.label),
      rows: sorted.map((r) => [r.ref, r.refVendor || '—', r.thirdPartyName || '—', r.city || '—', r.zip || '—', r.plannedDeliveryDate || '—', r.status, r.billed]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackageCheck size={20} className="text-brand" /> {title}
        </h2>
        <Link to={ROUTES.receptionCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Reception
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load receptions.'}</p>
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
                placeholder="Search Ref / Third-Party / Ref. Vendor"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title={title} getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} className="whitespace-nowrap">
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin mr-2" /> Loading receptions…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-3 py-2 text-text!">{r.ref}</td>
                      <td className="px-3 py-2 text-text-muted">{r.refVendor || '—'}</td>
                      <td className="px-3 py-2">
                        {r.socid ? (
                          <Link to={ROUTES.customerDetail.replace(':id', String(r.socid))} className="text-brand hover:underline">
                            {r.thirdPartyName || '—'}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{r.thirdPartyName || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.city || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.zip || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.plannedDeliveryDate || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{r.status}</td>
                      <td className="px-3 py-2 text-text-muted">{r.billed}</td>
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
