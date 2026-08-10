import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileEdit, Plus, FileCheck2, PlayCircle, TriangleAlert, MessagesSquare, Search, CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, TwoValueStatCard } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import type { ContractRow, ContractsSummary } from '../contracts.queries'

const COLUMNS = ['Ref.', 'Ref. Customer', 'Ref. Vendor', 'Third-Party', 'Sales Representatives Of Third Party', 'Contract Date', 'End Date Of Active Services', 'Not Running', 'In Progress', 'Expired', 'Closed']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const dash = (n: number) => (n === 0 ? '-' : String(n))

function matchesSearch(contract: ContractRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [contract.ref, contract.refCustomer, contract.refVendor, contract.thirdParty].some((field) => field.toLowerCase().includes(q))
}

export function ContractsList({ summary }: { summary: ContractsSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredContracts = useMemo(() => summary.contracts.filter((c) => matchesSearch(c, search)), [summary.contracts, search])
  const pageContracts = filteredContracts.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileEdit size={20} className="text-brand" /> Contracts
        </h2>
        <Link to={ROUTES.contractCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Contract
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TwoValueStatCard label="Contract Overview" primary={summary.totalContracts} primaryLabel="Total contracts" secondary={summary.createdThisMonth} secondaryLabel="Created this month" icon={FileCheck2} color="blue" />
        <TwoValueStatCard label="Running Status" primary={summary.runningTotal} primaryLabel="Running total" secondary={summary.startedThisMonth} secondaryLabel="Started this month" icon={PlayCircle} color="green" />
        <TwoValueStatCard label="Expiry Status" primary={summary.expiredCount} primaryLabel="Expired" secondary={summary.expiredThisMonth} secondaryLabel="Expired this month" icon={TriangleAlert} color="amber" />
        <TwoValueStatCard label="Closure And Followup" primary={summary.closedCount} primaryLabel="Closed" secondary={summary.followupsThisMonth} secondaryLabel="This month followups" icon={MessagesSquare} color="violet" />
      </div>

      <Card className="!p-0 overflow-hidden">
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
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search"
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
            />
          </div>
          <button type="button" disabled title="Not built yet" className="p-2 rounded-md border border-input-border bg-input-bg text-text-faint cursor-default ml-auto">
            <CalendarDays size={14} />
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.contracts.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No contracts match "{search}".
                  </td>
                </tr>
              ) : (
                pageContracts.map((c) => (
                  <tr key={c.ref} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{c.ref}</td>
                    <td className="px-4 py-3 text-text-muted">{c.refCustomer}</td>
                    <td className="px-4 py-3 text-text-muted">{c.refVendor}</td>
                    <td className="px-4 py-3 text-text!">{c.thirdParty}</td>
                    <td className="px-4 py-3 text-text-muted">{c.salesRep}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{c.contractDate}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{c.endDateOfServices}</td>
                    <td className="px-4 py-3 text-text-muted">{dash(c.notRunning)}</td>
                    <td className="px-4 py-3 text-text-muted">{dash(c.inProgress)}</td>
                    <td className="px-4 py-3 text-text-muted">{dash(c.expired)}</td>
                    <td className="px-4 py-3 text-text-muted">{dash(c.closed)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={page} perPage={perPage} total={filteredContracts.length} onPageChange={setPage} />
    </div>
  )
}
