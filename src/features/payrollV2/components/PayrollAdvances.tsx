import { useState } from 'react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatMoney } from '../../../utils/format'
import { num } from '../payrollV2.api'
import { useAdvancePendingApprovals, useAdvances, usePayRunAction, type AdvanceRow } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, StatusBadge, TablePanel, Td, Th } from './PayrollV2Chrome'

const FIELD = 'rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

const who = (row: AdvanceRow) => `${row.firstname ?? ''} ${row.lastname ?? ''}`.trim() || `#${row.employee_id}`

// advance.php: salary advances and loans share one list and one approval queue,
// told apart by `type`, exactly as the classic page does.
export function PayrollAdvances() {
  const list = useAdvances()
  const pending = useAdvancePendingApprovals()
  const action = usePayRunAction()
  const confirm = useConfirm()

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [principal, setPrincipal] = useState('')
  const [installment, setInstallment] = useState('')

  const requestAdvance = (event: React.FormEvent) => {
    event.preventDefault()
    action.mutate(
      { endpoint: 'advance.php', action: 'request_advance', params: { amount, reason } },
      {
        onSuccess: () => {
          setAmount('')
          setReason('')
        },
      },
    )
  }

  const requestLoan = (event: React.FormEvent) => {
    event.preventDefault()
    action.mutate(
      { endpoint: 'advance.php', action: 'request_loan', params: { principal_amount: principal, installment_amount: installment } },
      {
        onSuccess: () => {
          setPrincipal('')
          setInstallment('')
        },
      },
    )
  }

  const review = async (row: AdvanceRow, decision: 'approve' | 'reject') => {
    if (!(await confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} this request?`))) return
    action.mutate({ endpoint: 'advance.php', action: decision, params: { id: row.id, type: row.type ?? 'advance' } })
  }

  return (
    <div className="space-y-4">
      {list.isError && <ErrorCard error={list.error} onRetry={() => list.refetch()} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard title="Request Salary Advance">
          <form onSubmit={requestAdvance} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Amount</span>
              <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-40 ${FIELD}`} />
            </label>
            <label className="flex min-w-48 flex-1 flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Reason</span>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
            </label>
            <button type="submit" disabled={action.isPending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              Submit
            </button>
          </form>
        </PanelCard>

        <PanelCard title="Request Loan">
          <form onSubmit={requestLoan} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Principal</span>
              <input required type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} className={`w-40 ${FIELD}`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Monthly Installment</span>
              <input required type="number" step="0.01" value={installment} onChange={(e) => setInstallment(e.target.value)} className={`w-44 ${FIELD}`} />
            </label>
            <button type="submit" disabled={action.isPending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              Submit
            </button>
          </form>
          {action.isError && <p className="mt-2 text-sm text-danger">{action.error instanceof Error ? action.error.message : 'Request failed.'}</p>}
        </PanelCard>
      </div>

      <TablePanel title="Pending Approvals">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Type</Th>
              <Th>Employee</Th>
              <Th className="text-right">Amount</Th>
              <Th>Requested</Th>
              <Th className="text-right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {pending.isLoading && <LoadingRows cols={5} />}
            {!pending.isLoading && (pending.data ?? []).length === 0 && <EmptyRow colSpan={5} label="Nothing waiting for approval." />}
            {(pending.data ?? []).map((row) => (
              <tr key={`${row.type}-${row.id}`} className="border-t border-border">
                <Td className="capitalize">{row.type ?? 'advance'}</Td>
                <Td>{who(row)}</Td>
                <Td className="text-right tabular-nums">{formatMoney(num(row.amount))}</Td>
                <Td>{row.requested_at ?? row.created_at ?? '—'}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" disabled={action.isPending} onClick={() => review(row, 'approve')} className="rounded-md bg-success-bg px-2.5 py-1 text-xs font-semibold text-success-fg hover:opacity-90 disabled:opacity-60">
                      Approve
                    </button>
                    <button type="button" disabled={action.isPending} onClick={() => review(row, 'reject')} className="rounded-md bg-danger-bg px-2.5 py-1 text-xs font-semibold text-danger-fg hover:opacity-90 disabled:opacity-60">
                      Reject
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      <TablePanel title="All Advances & Loans">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Type</Th>
              <Th>Employee</Th>
              <Th className="text-right">Amount</Th>
              <Th>Requested</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <LoadingRows cols={5} />}
            {!list.isLoading && (list.data ?? []).length === 0 && <EmptyRow colSpan={5} label="No advances or loans yet." />}
            {(list.data ?? []).map((row) => (
              <tr key={`${row.type}-${row.id}`} className="border-t border-border">
                <Td className="capitalize">{row.type ?? 'advance'}</Td>
                <Td>{who(row)}</Td>
                <Td className="text-right tabular-nums">{formatMoney(num(row.amount))}</Td>
                <Td>{row.requested_at ?? row.created_at ?? '—'}</Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  )
}
