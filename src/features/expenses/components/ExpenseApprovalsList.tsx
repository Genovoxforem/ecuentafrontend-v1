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
    case 'type':
      return r.type
    case 'employee':
      return r.employee
    case 'approver':
      return r.approver
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
const searchText = (r: ApprovalRow) => [r.ref, r.type, r.employee, r.approver, r.period, r.linkedTo?.name ?? '', r.totalTtc, r.status].join(' ')

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
            Created by: <span className="text-text!">{row.employee}</span>
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
        {changeStatus.isError && (
          <p className="text-sm text-danger-fg">{changeStatus.error instanceof Error ? changeStatus.error.message : 'Could not update the status.'}</p>
        )}
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

// expense/approvals.php: every report with its status chip; the ones waiting for approval can be reviewed.
export function ExpenseApprovalsList() {
  const { data, isLoading, isError, error, refetch } = useExpenseApprovals()
  const [reviewing, setReviewing] = useState<ApprovalRow | null>(null)
  const [chip, setChip] = useState('')
  const chips = ['Draft', 'Submitted', 'Approved', 'Paid', 'Refused', 'Canceled']
  const countOf = (w: string) => (data ?? []).filter((r) => r.status === w).length
  const shown = (data ?? []).filter((r) => !chip || r.status === chip)
  const t = useDataTable({
    rows: shown,
    searchText,
    sortValue,
    defaultSort: { key: 'n', dir: 'asc' },
  })
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
          {data && (
            <div className="flex flex-wrap items-center gap-2">
              {[{ w: '', label: 'All', n: data.length }, ...chips.map((w) => ({ w, label: w, n: countOf(w) }))]
                .filter((c) => c.w === '' || c.n > 0)
                .map((c) => (
                  <button
                    key={c.w}
                    type="button"
                    onClick={() => {
                      setChip(c.w)
                      t.setPage(1)
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${chip === c.w ? 'border-brand bg-brand text-white' : 'border-border text-text-muted hover:bg-surface-hover'}`}
                  >
                    {c.label} ({c.n})
                  </button>
                ))}
            </div>
          )}
        </>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading approvals…" />}
      {isError && (
        <LegacyErrorCard title="Couldn't load approvals" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      )}

      {data && (
        <>
          <ScrollCard>
            <table className="w-full text-sm">
              <thead className={STICKY_THEAD}>
                <tr className="border-b border-border bg-surface">
                  {th('n', '#')}
                  {th('ref', 'Ref')}
                  {th('type', 'Type')}
                  {th('linked', 'Linked To')}
                  {th('employee', 'Created By')}
                  {th('approver', 'Approver')}
                  {th('period', 'Period')}
                  {th('total', 'Total TTC', 'right')}
                  {th('status', 'Status')}
                  <th className="px-3 py-2.5 text-center text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {t.pageRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center italic text-text-faint">
                      {t.all === 0 ? 'No expense reports.' : 'No matching records found'}
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
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{r.type}</td>
                    <td className="px-3 py-2.5">
                      <PartyLink party={r.linkedTo} showIcon />
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">{r.employee}</td>
                    <td className="px-3 py-2.5 text-text-muted">{r.approver}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{r.period}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-text!">{r.totalTtc}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.status !== 'Submitted' ? (
                        <span className="text-text-faint">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewing(r)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-brand/10"
                        >
                          <Eye size={13} /> Review
                        </button>
                      )}
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
