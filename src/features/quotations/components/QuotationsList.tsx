import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileBadge, Plus, FileText, CalendarPlus, DollarSign, ListChecks, Search, CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, TwoValueStatCard, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatMoney } from '../../../utils/format'
import type { QuotationRow, QuotationsSummary } from '../quotations.queries'

const COLUMNS = ['Ref', 'Ref. Customer', 'Project Ref', 'Third-Party', 'City', 'Zip Code', 'Date', 'End Date', 'Amount (Excl. Tax)', 'Author', 'Sales Representatives Of Third Party', 'Status']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(quotation: QuotationRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [quotation.ref, quotation.refCustomer, quotation.thirdParty, quotation.city].some((field) => field.toLowerCase().includes(q))
}

export function QuotationsList({ summary }: { summary: QuotationsSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredQuotations = useMemo(() => summary.quotations.filter((q) => matchesSearch(q, search)), [summary.quotations, search])
  const pageQuotations = filteredQuotations.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx — see
    // those for the full writeup on why -top-6/-bottom-6 (not top-0/bottom-0) and flex-1 (not
    // min-h-full) are required for a flush sticky header/footer.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBadge size={20} className="text-brand" /> List Of Quotations
        </h2>
        <Link to={ROUTES.quotationCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Proposal
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Proposals</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.totalProposals}</p>
              <p className="text-xs text-text-faint mt-0.5">All proposal records</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <FileText size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Proposals This Month</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.proposalsThisMonth}</p>
              <p className="text-xs text-text-faint mt-0.5">Created this month</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
              <CalendarPlus size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Proposal Amount</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(summary.totalProposalAmount)}</p>
              <p className="text-xs text-text-faint mt-0.5">Total proposal value</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
              <DollarSign size={20} />
            </span>
          </Card>
          <TwoValueStatCard label="Proposal Status" primary={summary.validatedCount} primaryLabel="Validated" secondary={summary.draftCount} secondaryLabel="Drafts" icon={ListChecks} color="indigo" />
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
          <div className="flex-1 min-h-0 overflow-auto">
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
              {summary.quotations.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No quotations match "{search}".
                  </td>
                </tr>
              ) : (
                pageQuotations.map((q) => (
                  <tr key={q.ref} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{q.ref}</td>
                    <td className="px-4 py-3 text-text-muted">{q.refCustomer}</td>
                    <td className="px-4 py-3 text-text-muted">{q.projectRef}</td>
                    <td className="px-4 py-3 text-text!">{q.thirdParty}</td>
                    <td className="px-4 py-3 text-text-muted">{q.city}</td>
                    <td className="px-4 py-3 text-text-muted">{q.zipCode}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{q.date}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{q.endDate}</td>
                    <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(q.amountExclTax)} ZMW</td>
                    <td className="px-4 py-3 text-text-muted">{q.author}</td>
                    <td className="px-4 py-3 text-text-muted">{q.salesRep}</td>
                    <td className="px-4 py-3 text-text-muted">{q.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredQuotations.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
