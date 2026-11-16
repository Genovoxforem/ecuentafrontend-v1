import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useContractsList, type ContractRow } from '../contracts.queries'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useUsersSummary } from '../../users/users.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'
const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function statusOf(c: ContractRow): 'Not Running' | 'In Progress' | 'Expired' | 'Closed' {
  if (c.closed) return 'Closed'
  if (c.expired) return 'Expired'
  if (c.inProgress) return 'In Progress'
  return 'Not Running'
}

const STATUS_CLS: Record<string, string> = {
  'Not Running': 'bg-surface-hover text-text-muted',
  'In Progress': 'bg-info-bg text-info-fg',
  Expired: 'bg-danger-bg text-danger-fg',
  Closed: 'bg-success-bg text-success-fg',
}

type SortKey = 'ref' | 'thirdParty' | 'salesRep' | 'contractDate' | 'endDateOfServices' | 'createdBy' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'Sales Representatives Of Third Party', key: 'salesRep' },
  { label: 'Contract Date', key: 'contractDate' },
  { label: 'End Date Of Active Services', key: 'endDateOfServices' },
  { label: 'Created By', key: 'createdBy' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function matchesSearch(c: ContractRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [c.ref, c.thirdParty, c.salesRep].some((field) => field.toLowerCase().includes(q))
}

function sortValue(c: ContractRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return c.ref
    case 'thirdParty':
      return c.thirdParty
    case 'salesRep':
    case 'createdBy':
      return c.salesRep
    case 'contractDate':
      return c.contractDate
    case 'endDateOfServices':
      return c.endDateOfServices || ''
    case 'status':
      return statusOf(c)
  }
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: 'brand' | 'danger' | 'warning' | 'success' | 'violet' }) {
  const toneCls = {
    brand: 'bg-brand text-white',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-white',
    success: 'bg-success text-white',
    violet: 'bg-violet-500 text-white',
  }[tone ?? 'brand']
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2.5">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={`inline-flex items-center justify-center min-w-8 h-6 px-2 rounded text-xs font-bold ${toneCls}`}>{value}</span>
    </div>
  )
}

// Reads the same real (if session-local) contracts collection Contract
// List already uses — see contracts.queries.ts — just summarized as a
// stat-heavy report view instead of a plain table. Fields the legacy
// report tracks that ContractRow has no equivalent for (Review Completed,
// Re-scheduled, Not Yet Completed, Missed Comments, Sales By
// Price-Category/Product) are shown honestly as zero rather than guessed.
export function ContractReportPage() {
  const { data: contractRows } = useContractsList()
  const [thirdPartyFilter, setThirdPartyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [salesRepFilter, setSalesRepFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  // The third-party and user pickers list every customer and user, as the classic report's selects do, not only those
  // that already appear on a contract (a list built from the contracts is empty on an install without any).
  const { data: customers } = useCustomerOptions()
  const { data: usersSummary } = useUsersSummary()

  const contracts = useMemo(() => contractRows ?? [], [contractRows])
  const thirdParties = useMemo(() => Array.from(new Set(contracts.map((c) => c.thirdParty))).sort(), [contracts])
  const userNames = useMemo(() => (usersSummary?.users ?? []).filter((u) => u.status === 'Enabled').map((u) => u.name).sort((a, b) => a.localeCompare(b)), [usersSummary])

  const filtered = useMemo(
    () =>
      contracts.filter(
        (c) =>
          (!thirdPartyFilter || c.thirdPartyId === thirdPartyFilter) &&
          (!statusFilter || statusOf(c) === statusFilter) &&
          (!salesRepFilter || c.salesRep.split(', ').includes(salesRepFilter)),
      ),
    [contracts, thirdPartyFilter, statusFilter, salesRepFilter],
  )
  const searched = useMemo(() => filtered.filter((c) => matchesSearch(c, search)), [filtered, search])
  const { sorted, sort, toggleSort } = useSortableRows<ContractRow, SortKey>(searched, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  const totalCustomers = thirdParties.length
  const notRunning = contracts.filter((c) => statusOf(c) === 'Not Running').length
  const inProgress = contracts.filter((c) => statusOf(c) === 'In Progress').length
  const expired = contracts.filter((c) => statusOf(c) === 'Expired').length
  const closed = contracts.filter((c) => statusOf(c) === 'Closed').length

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sorted.map((c) => [c.ref, c.thirdParty, c.salesRep, c.contractDate, c.endDateOfServices || '-', c.salesRep, statusOf(c)])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <Card className="!h-auto">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Third Party</label>
              <select value={thirdPartyFilter} onChange={(e) => setThirdPartyFilter(e.target.value)} className={selectCls}>
                <option value="">Select a third party</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
                <option value="">Select a status</option>
                <option value="Not Running">Not Running</option>
                <option value="In Progress">In Progress</option>
                <option value="Expired">Expired</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Sales representatives</label>
              <select value={salesRepFilter} onChange={(e) => setSalesRepFilter(e.target.value)} className={selectCls}>
                <option value="">Select a users</option>
                {userNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Technical representatives</label>
              {/* contrat/fapi/list.php rows carry the sales reps only, so there is nothing to filter a technical rep on yet. */}
              <select className={selectCls} disabled title="The contract list has no technical representative to filter on">
                <option>Select a users</option>
              </select>
            </div>
            <button type="button" className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <Search size={14} /> Search
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <StatTile label="Total Contracts" value={contracts.length} tone="success" />
          <StatTile label="Total Customers" value={totalCustomers} tone="brand" />
          <StatTile label="Total Commands" value={0} tone="success" />
          <StatTile label="Not Running Contract" value={notRunning} tone="danger" />
          <StatTile label="In Progress Contracts" value={inProgress} tone="brand" />
          <StatTile label="Expired Contracts" value={expired} tone="warning" />
          <StatTile label="Closed Contracts" value={closed} tone="violet" />
          <StatTile label="Review Completed" value={0} tone="brand" />
          <StatTile label="Re-scheduled" value={0} tone="warning" />
          <StatTile label="Not Yet Completed" value={0} tone="danger" />
          <StatTile label="Missed Comments" value={0} tone="violet" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2.5">
            <span className="text-sm text-text-muted">Contract Sales By Price Category</span>
            <span className="inline-flex items-center justify-center px-2 h-6 rounded text-xs font-bold bg-violet-500 text-white">0.00 ZMW</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2.5">
            <span className="text-sm text-text-muted">Contract Sales By Product</span>
            <span className="inline-flex items-center justify-center px-2 h-6 rounded text-xs font-bold bg-brand text-white">0</span>
          </div>
        </div>

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
                className={`${inputCls} w-full pl-8`}
              />
            </div>
            <TableExportButtons title="List Of Contracts" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
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
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      {contracts.length === 0 ? 'No Data Available In Table' : 'No contracts match these filters.'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((c) => (
                    <tr key={c.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-brand font-medium">{c.ref}</td>
                      <td className="px-4 py-3 text-text!">{c.thirdParty}</td>
                      <td className="px-4 py-3 text-text-muted">{c.salesRep}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{c.contractDate}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{c.endDateOfServices || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{c.salesRep}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLS[statusOf(c)]}`}>{statusOf(c)}</span>
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
    </div>
  )
}
