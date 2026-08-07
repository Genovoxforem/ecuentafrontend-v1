import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileBadge, Plus, FileText, CalendarPlus, DollarSign, ListChecks, Search, CalendarDays } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, TwoValueStatCard, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatMoney } from '../../../utils/format'
import type { SupplierProposalsSummary } from '../supplierProposals.queries'

const COLUMNS = ['Ref.', 'Third-Party', 'Validation Date', 'Planned Date Of Delivery', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Author', 'Status']
const PER_PAGE = 15

export function SupplierProposalsList({ summary }: { summary: SupplierProposalsSummary }) {
  const [page, setPage] = useState(1)
  const pageProposals = summary.proposals.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBadge size={20} className="text-brand" /> Vendor Quotation
        </h2>
        <Link to={ROUTES.supplierProposalCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Supplier Proposal
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Supplier Proposals</p>
            <p className="text-2xl font-bold text-text! mt-1">{summary.totalProposals}</p>
            <p className="text-xs text-text-faint mt-1">All supplier proposal records</p>
          </div>
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
            <FileText size={18} />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Supplier Proposals This Month</p>
            <p className="text-2xl font-bold text-text! mt-1">{summary.proposalsThisMonth}</p>
            <p className="text-xs text-text-faint mt-1">Created this month</p>
          </div>
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
            <CalendarPlus size={18} />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Supplier Proposal Amount</p>
            <p className="text-2xl font-bold text-text! mt-1">{fmtZMW(summary.totalProposalAmount)}</p>
            <p className="text-xs text-text-faint mt-1">Total supplier proposal value</p>
          </div>
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
            <DollarSign size={18} />
          </span>
        </Card>
        <TwoValueStatCard label="Status Summary" primary={summary.validatedCount} primaryLabel="Validated" secondary={summary.draftCount} secondaryLabel="Draft" icon={ListChecks} color="indigo" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <select disabled defaultValue="15" className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
            <option value="15">15</option>
          </select>
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input disabled type="text" placeholder="Search" className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5" />
          </div>
          <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-muted cursor-default ml-auto">
            <CalendarDays size={14} /> Select Date Range
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
              {summary.proposals.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
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
      <ListPagination page={page} perPage={PER_PAGE} total={summary.proposals.length} onPageChange={setPage} />
    </div>
  )
}
