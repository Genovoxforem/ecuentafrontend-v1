import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Search } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import type { ContractServiceRow } from '../contractPagesParser'
import { useContractServices } from '../contracts.queries'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// The backend's own status labels: "Not running", "Not expired" (running), "Expired", "Closed".
function statusClass(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('not running')) return 'bg-info-bg text-info-fg'
  if (s.includes('not expired') || s.includes('running')) return 'bg-success-bg text-success-fg'
  if (s.includes('expired')) return 'bg-warning-bg text-warning-fg'
  return 'bg-surface-hover text-text-muted'
}

type SortKey = 'contractRef' | 'service' | 'thirdParty' | 'plannedStart' | 'realStart' | 'plannedEnd' | 'realEnd' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Contract', key: 'contractRef' },
  { label: 'Service', key: 'service' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'Planned Start Date', key: 'plannedStart' },
  { label: 'Real Start Date', key: 'realStart' },
  { label: 'Planned End Date', key: 'plannedEnd' },
  { label: 'Real End Date', key: 'realEnd' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = ['#', ...COLUMNS.map((c) => c.label)]

function matchesSearch(s: ContractServiceRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [s.contractRef, s.serviceRef, s.service, s.thirdParty, s.status].some((field) => field.toLowerCase().includes(q))
}

// "MM/DD/YYYY hh:mm AM" -> "YYYY-MM-DD hh:mm" so dates sort chronologically; '' stays ''.
function dateSortKey(value: string): string {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}${m[4]}` : ''
}

function sortValue(s: ContractServiceRow, key: SortKey): string {
  switch (key) {
    case 'contractRef':
      return s.contractRef
    case 'service':
      return s.service
    case 'thirdParty':
      return s.thirdParty
    case 'plannedStart':
      return dateSortKey(s.plannedStart)
    case 'realStart':
      return dateSortKey(s.realStart)
    case 'plannedEnd':
      return dateSortKey(s.plannedEnd)
    case 'realEnd':
      return dateSortKey(s.realEnd)
    case 'status':
      return s.status
  }
}

// contrat/services_list.php — the real, read-only list of every contract's service
// lines. Services are added on a contract's own card, so there is no "new" action here.
export function ServicesDetailsPage() {
  const { data: services, isLoading, isError, error, refetch } = useContractServices()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filteredServices = useMemo(() => (services ?? []).filter((s) => matchesSearch(s, search)), [services, search])
  const { sorted, sort, toggleSort } = useSortableRows<ContractServiceRow, SortKey>(filteredServices, sortValue)
  const pageServices = sorted.slice((page - 1) * perPage, page * perPage)

  if (isLoading) return <LegacyLoadingCard label="Loading services…" />
  if (isError || !services) {
    return <LegacyErrorCard title="Couldn't load services" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sorted.map((s, i) => [String(i + 1), s.contractRef, s.service, s.thirdParty, s.plannedStart || '-', s.realStart || '-', s.plannedEnd || '-', s.realEnd || '-', s.status])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ClipboardList size={20} className="text-brand" /> List Of Services
        </h2>
        <Link to={ROUTES.contractList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          Contract list
        </Link>
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
            <TableExportButtons title="List Of Services" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th>#</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No services match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageServices.map((s, i) => (
                    <tr key={`${s.contractRef}-${s.serviceRef}-${(page - 1) * perPage + i}`} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 font-medium">
                        {s.contractId ? (
                          <Link to={ROUTES.contractDetail.replace(':id', String(s.contractId))} className="text-brand hover:underline">
                            {s.contractRef}
                          </Link>
                        ) : (
                          <span className="text-text!">{s.contractRef}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text!">
                        {s.serviceRef && <span className="text-xs text-text-faint block">{s.serviceRef}</span>}
                        {s.service || '-'}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {s.vendorOrCustomerId ? (
                          <Link to={ROUTES.customerDetail.replace(':id', String(s.vendorOrCustomerId))} className="text-brand hover:underline">
                            {s.thirdParty}
                          </Link>
                        ) : (
                          s.thirdParty
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.plannedStart || '-'}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.realStart || '-'}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.plannedEnd || '-'}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{s.realEnd || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClass(s.status)}`}>{s.status}</span>
                      </td>
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
