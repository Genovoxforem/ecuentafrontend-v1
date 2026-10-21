import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCheck, Eye, X } from 'lucide-react'
import { StickyListLayout, ScrollCard, STICKY_THEAD } from '../../../shared/components/layout/StickyListLayout'
import { ListPagination } from '../../../shared/components/ListPagination'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useChangeExpenseStatus } from '../expenses.queries'
import { useExpenseApprovals } from '../expensePages.queries'
import type { ApprovalRow } from '../expensePagesParser'
import { useDataTable } from '../expenseTable'
import { PartyLink, PerPageSelect, SearchBox, SortTh, StatusBadge } from './expenseParts'
import { ROUTES } from '../../../routes'

const amount = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

function sortValue(r: ApprovalRow, key: string): string | number {
  switch (key) {
    case 'n':
      return r.n
    case 'ref':
      return r.ref
    case 'employee':
      return r.employee
    case 'period':
      return r.period
    case 'linked':
      return r.linkedTo?.name ?? ''
    case 'total':
      return amount(r.totalTtc)
    default:
      return r.status
  }
}
const searchText = (r: ApprovalRow) => [r.ref, r.employee, r.period, r.linkedTo?.name ?? '', r.totalTtc, r.status].join(' ')

// Approve or refuse a submitted report (expense/api/expense.php action=changeStatus).
function ReviewModal({ row, onClose }: { row: ApprovalRow; onClose: () => void }) {
  const [comment, setComment] = useState('')
  const changeStatus = useChangeExpenseStatus()

  async function act(status: 'approve' | 'refuse') {
    try {
      await changeStatus.mutateAsync({ id: Number(row.id), status, comment })
      onClose()
    } catch {
      // The refusal is shown in the dialog (changeStatus.error).
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Review {row.ref}</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-1 text-sm text-text-muted">
          <p>
            Employee: <span className="text-text!">{row.employee}</span>
          </p>
          <p>
            Period: <span className="text-text!">{row.period}</span>
          </p>
          <p>
            Total TTC: <span className="text-text!">{row.totalTtc}</span>
          </p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-muted">Comment (optional)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none"
          />
        </label>
        {changeStatus.isError && <p className="text-sm text-danger-fg">{changeStatus.error instanceof Error ? changeStatus.error.message : 'Could not update the status.'}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => act('refuse')}
            disabled={changeStatus.isPending}
            className="rounded-lg border border-danger-fg/40 px-4 py-2 text-sm font-medium text-danger-fg hover:bg-danger-bg disabled:opacity-50"
          >
            Refuse
          </button>
          <button
            type="button"
            onClick={() => act('approve')}
            disabled={changeStatus.isPending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}

// expense/approvals.php: every report waiting for approval, with who it is linked to.
export function ExpenseApprovalsList() {
  const { data, isLoading, isError, error, refetch } = useExpenseApprovals()
  const [reviewing, setReviewing] = useState<ApprovalRow | null>(null)
  const t = useDataTable({ rows: data ?? [], searchText, sortValue, defaultSort: { key: 'ref', dir: 'desc' } })
  const th = (key: string, label: string, align?: 'right') => (
    <SortTh active={t.sort.key === key} dir={t.sort.dir} onSort={() => t.toggleSort(key)} align={align}>
      {label}
    </SortTh>
  )

  return (
    <StickyListLayout
      header={
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <CheckCheck size={20} className="text-brand" /> Expense Approvals
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <PerPageSelect value={t.perPage} onChange={t.setPerPage} />
            <SearchBox value={t.search} onChange={t.setSearch} placeholder="Search approvals..." />
          </div>
        </>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading approvals…" />}
      {isError && <LegacyErrorCard title="Couldn't load approvals" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <ScrollCard>
            <table className="w-full text-sm">
              <thead className={STICKY_THEAD}>
                <tr className="border-b border-border bg-surface">
                  {th('n', '#')}
                  {th('ref', 'Ref')}
                  {th('employee', 'Employee')}
                  {th('period', 'Period')}
                  {th('linked', 'Linked To')}
                  {th('total', 'Total TTC', 'right')}
                  {th('status', 'Status')}
                  <th className="px-3 py-2.5 text-center text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {t.pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center italic text-text-faint">
                      {t.all === 0 ? 'No expense reports awaiting approval.' : 'No matching records found'}
                    </td>
                  </tr>
                )}
                {t.pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-text-muted">{r.n}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      <Link to={ROUTES.expenseCard.replace(':id', r.id)} className="text-brand hover:underline">
                        {r.ref}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{r.employee}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{r.period}</td>
                    <td className="px-3 py-2.5">
                      <PartyLink party={r.linkedTo} showIcon />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-text!">{r.totalTtc}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setReviewing(r)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-brand/10"
                      >
                        <Eye size={13} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollCard>
          <ListPagination page={t.page} perPage={t.perPage} total={t.total} onPageChange={t.setPage} />
        </>
      )}

      {reviewing && <ReviewModal row={reviewing} onClose={() => setReviewing(null)} />}
    </StickyListLayout>
  )
}
