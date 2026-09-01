import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllExpenseReports, useChangeExpenseStatus, type ExpenseReportRow } from '../expenses.queries'
import { ROUTES } from '../../../routes'

function ReviewModal({ row, onClose }: { row: ExpenseReportRow; onClose: () => void }) {
  const [comment, setComment] = useState('')
  const changeStatus = useChangeExpenseStatus()

  async function act(status: 'approve' | 'refuse') {
    await changeStatus.mutateAsync({ id: row.id, status, comment })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-border w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Review {row.ref}</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="text-sm text-text-muted space-y-1">
          <p>
            Employee: <span className="text-text!">{row.user}</span>
          </p>
          <p>
            Period: <span className="text-text!">{row.dateStart} – {row.dateEnd}</span>
          </p>
          <p>
            Total TTC: <span className="text-text!">{row.totalTtc}</span>
          </p>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-text-muted mb-1">Comment (optional)</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none" />
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
          <button type="button" onClick={() => act('approve')} disabled={changeStatus.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}

// Real via expense/ajax/expense_list.php filtered to fk_statut=2
// ("Submitted") — the real approvals.php page's own list has no JSON of its
// own (server-rendered inline SQL), so this reuses the List tab's real
// endpoint instead of scraping that page. The real reference query also
// includes fk_statut IN (1,3), two status codes this module's own List
// endpoint has no word for (never actually populated in practice — see
// expenses.queries.ts's header comment) and are therefore not requested
// here. Approve/Refuse is genuinely real (expense/api/expense.php
// action=changeStatus).
export function ExpenseApprovalsList() {
  const { data, isLoading, isError, error, refetch } = useAllExpenseReports('2')
  const rows = data?.rows ?? []
  const [reviewing, setReviewing] = useState<ExpenseReportRow | null>(null)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CheckSquare size={20} className="text-brand" /> Expense Approvals
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading approvals…" />}
      {isError && <LegacyErrorCard title="Couldn't load approvals" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">#</th>
                <th className="font-medium px-4 py-2.5">Ref</th>
                <th className="font-medium px-4 py-2.5">Employee</th>
                <th className="font-medium px-4 py-2.5">Period</th>
                <th className="font-medium px-4 py-2.5">Linked To</th>
                <th className="font-medium px-4 py-2.5 text-right">Total TTC</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-text-faint italic text-center">
                    No expense reports awaiting approval.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-faint">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <Link to={ROUTES.expenseReportDetail.replace(':id', String(r.id))} className="text-brand hover:underline">
                        {r.ref}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{r.user}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                      {r.dateStart} – {r.dateEnd}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{r.linkedTo}</td>
                    <td className="px-4 py-2.5 text-right text-text!">{r.totalTtc}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-info-bg text-info-fg">{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => setReviewing(r)} className="rounded-md border border-input-border px-3 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover">
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {reviewing && <ReviewModal row={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  )
}
