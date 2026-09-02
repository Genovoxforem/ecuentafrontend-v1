import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileBadge, Plus, FileText, CalendarPlus, DollarSign, ListChecks, Search, CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, TwoValueStatCard, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney } from '../../../utils/format'
import type { SupplierProposalRow, SupplierProposalsSummary } from '../supplierProposals.queries'

type SortKey = 'ref' | 'thirdParty' | 'validationDate' | 'plannedDelivery' | 'amountExcl' | 'amountIncl' | 'author' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'Validation Date', key: 'validationDate' },
  { label: 'Planned Date Of Delivery', key: 'plannedDelivery' },
  { label: 'Amount (Excl. Tax)', key: 'amountExcl' },
  { label: 'Amount (Inc. Tax)', key: 'amountIncl' },
  { label: 'Author', key: 'author' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(proposal: SupplierProposalRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [proposal.ref, proposal.thirdParty, proposal.author, proposal.status].some((field) => field.toLowerCase().includes(q))
}

function sortValue(p: SupplierProposalRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return p.ref
    case 'thirdParty':
      return p.thirdParty
    case 'validationDate':
      return p.validationDate
    case 'plannedDelivery':
      return p.plannedDelivery
    case 'amountExcl':
      return p.amountExclTax
    case 'amountIncl':
      return p.amountInclTax
    case 'author':
      return p.author
    case 'status':
      return p.status
  }
}

export function SupplierProposalsList({ summary }: { summary: SupplierProposalsSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredProposals = useMemo(() => summary.proposals.filter((p) => matchesSearch(p, search)), [summary.proposals, search])
  const { sorted: sortedProposals, sort, toggleSort } = useSortableRows<SupplierProposalRow, SortKey>(filteredProposals, sortValue)
  const pageProposals = sortedProposals.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedProposals.map((p) => [
      p.ref,
      p.thirdParty,
      p.validationDate,
      p.plannedDelivery,
      `${formatMoney(p.amountExclTax)} ZMW`,
      `${formatMoney(p.amountInclTax)} ZMW`,
      p.author,
      p.status,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBadge size={20} className="text-brand" /> Vendor Quotation
        </h2>
        <Link to={ROUTES.supplierProposalCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Supplier Proposal
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Supplier Proposals</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.totalProposals}</p>
              <p className="text-xs text-text-faint mt-0.5">All supplier proposal records</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <FileText size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Supplier Proposals This Month</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.proposalsThisMonth}</p>
              <p className="text-xs text-text-faint mt-0.5">Created this month</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
              <CalendarPlus size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Supplier Proposal Amount</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(summary.totalProposalAmount)}</p>
              <p className="text-xs text-text-faint mt-0.5">Total supplier proposal value</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
              <DollarSign size={20} />
            </span>
          </Card>
          <TwoValueStatCard label="Status Summary" primary={summary.validatedCount} primaryLabel="Validated" secondary={summary.draftCount} secondaryLabel="Draft" icon={ListChecks} color="indigo" />
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
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Vendor Quotation" getExportData={getExportData} />
            <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-muted cursor-default ml-auto">
              <CalendarDays size={14} /> Select Date Range
            </button>
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
              {summary.proposals.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredProposals.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No supplier proposals match "{search}".
                  </td>
                </tr>
              ) : (
                pageProposals.map((p) => (
                  <tr key={p.ref} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{p.ref}</td>
                    <td className="px-4 py-3 text-text!">{p.thirdParty}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{p.validationDate}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{p.plannedDelivery}</td>
                    <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(p.amountExclTax)} ZMW</td>
                    <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(p.amountInclTax)} ZMW</td>
                    <td className="px-4 py-3 text-text-muted">{p.author}</td>
                    <td className="px-4 py-3 text-text-muted">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredProposals.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
