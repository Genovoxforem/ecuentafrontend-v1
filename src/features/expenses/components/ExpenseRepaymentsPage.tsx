import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Check, Plus, Printer, Save, Undo2 } from 'lucide-react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { usePaymentTypes } from '../expenses.queries'
import { useApproveRepayment, useCreateRepayment, useRepayments, useSettleRepayment } from '../expenseTabs.queries'
import type { RepaymentRow } from '../expenseTabsParser'
import { TONE_CLS, controlCls } from '../expenseTable'
import { ExpenseTable, type ExpenseColumn } from './ExpenseTable'
import { Field, FormCard, FormProblem } from './expenseParts'
import { MoneyBackDialog } from './MoneyBackDialog'
import { PrintPreviewDialog } from './PrintPreviewDialog'

const amount = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

const STATUS_CLS: Record<string, string> = { Pending: 'bg-neutral-bg text-neutral-fg', Approved: 'bg-info-bg text-info-fg', Paid: 'bg-success-bg text-success-fg' }

// expense/repayments.php: expense reports whose advance was more than the expense, so the employee owes
// money back. Create one, approve it (it then shows in Payments), collect what comes back.
export function ExpenseRepaymentsPage() {
  const { data, isLoading, isError, error, refetch } = useRepayments()
  const { data: paymentTypes } = usePaymentTypes()
  const create = useCreateRepayment()
  const approve = useApproveRepayment()
  const settle = useSettleRepayment()

  const [reportId, setReportId] = useState('')
  const [advance, setAdvance] = useState('')
  const [method, setMethod] = useState('')
  const [settleNow, setSettleNow] = useState('0')
  const [problem, setProblem] = useState<string | null>(null)
  const [collecting, setCollecting] = useState<RepaymentRow | null>(null)
  const [printing, setPrinting] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reportId || !(Number(advance) >= 0) || advance === '') return setProblem('Choose the expense report and enter the advance amount.')
    setProblem(null)
    try {
      await create.mutateAsync({ reportId, advanceAmount: advance, method, settleAmount: settleNow || '0' })
      setReportId('')
      setAdvance('')
      setSettleNow('0')
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not save the repayment.')
    }
  }

  const columns: ExpenseColumn<RepaymentRow>[] = [
    { key: 'n', header: '#', sortValue: (r) => Number(r.n) || 0, cell: (r) => <span className="text-text-muted">{r.n}</span> },
    {
      key: 'ref',
      header: 'Expense Ref',
      sortValue: (r) => r.ref,
      cell: (r) => (
        <Link to={ROUTES.expenseCard.replace(':id', r.reportId)} className="font-semibold text-brand hover:underline">
          {r.ref}
        </Link>
      ),
    },
    { key: 'employee', header: 'Employee', sortValue: (r) => r.employee, cell: (r) => r.employee },
    { key: 'gross', header: 'Gross Expense', align: 'right', sortValue: (r) => amount(r.gross), cell: (r) => <span className="tabular-nums">{r.gross}</span> },
    { key: 'advance', header: 'Advance Used', align: 'right', sortValue: (r) => amount(r.advance), cell: (r) => <span className="tabular-nums text-text-muted">{r.advance}</span> },
    { key: 'owes', header: 'Employee Owes', align: 'right', sortValue: (r) => amount(r.owes), cell: (r) => <span className="font-bold tabular-nums text-warning-fg">{r.owes}</span> },
    { key: 'collected', header: 'Collected', align: 'right', sortValue: (r) => amount(r.collected), cell: (r) => <span className="tabular-nums">{r.collected}</span> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortValue: (r) => amount(r.balance),
      cell: (r) => <span className={`font-semibold tabular-nums ${TONE_CLS[r.balanceTone]}`}>{r.balance}</span>,
    },
    { key: 'method', header: 'Method', sortValue: (r) => r.method, cell: (r) => r.method },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      cell: (r) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[r.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{r.status}</span>,
    },
    { key: 'date', header: 'Date', sortValue: (r) => r.date, cell: (r) => r.date },
    {
      key: 'actions',
      header: 'Action',
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          {r.canApprove && (
            <button
              type="button"
              onClick={() => approve.mutate(r.reportId)}
              disabled={approve.isPending}
              title="Approve — sends to Payments for collection"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check size={12} /> Approve
            </button>
          )}
          {r.collect && (
            <button
              type="button"
              onClick={() => setCollecting(r)}
              title="Record money returned by employee"
              className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-black hover:bg-amber-400"
            >
              <Undo2 size={12} /> Collect
            </button>
          )}
          {r.receiptId && (
            <button
              type="button"
              onClick={() => setPrinting(`/expense/repayment_receipt.php?id=${r.receiptId}`)}
              className="rounded-md border border-brand p-1.5 text-brand hover:bg-brand/10"
              title="Print Receipt"
              aria-label={`Print receipt for ${r.ref}`}
            >
              <Printer size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ArrowLeftRight size={20} className="text-brand" /> Expense Repayments
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading repayments…" />}
      {isError && <LegacyErrorCard title="Couldn't load the repayments" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {approve.isError && <FormProblem message={approve.error instanceof Error ? approve.error.message : 'Could not approve the repayment.'} />}

      {data && (
        <>
          {data.canCreate && (
            <FormCard icon={<Plus size={15} />} title="Create Repayment">
              <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-4">
                <Field label="Expense Report" className="md:col-span-2">
                  <select value={reportId} onChange={(e) => setReportId(e.target.value)} className={`${controlCls} w-full`}>
                    {data.reports.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Advance Amount">
                  <input type="number" step="0.01" min="0" value={advance} onChange={(e) => setAdvance(e.target.value)} className={`${controlCls} w-full`} />
                </Field>
                <Field label="Method">
                  <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${controlCls} w-full`}>
                    <option value="">Select Payment Mode</option>
                    {paymentTypes?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.text}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Settle Now">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settleNow}
                    onChange={(e) => setSettleNow(e.target.value)}
                    title="Optional: amount returned/settled now (adds to cumulative)"
                    className={`${controlCls} w-full`}
                  />
                </Field>
                <div className="flex items-center gap-3 md:col-span-3">
                  <button
                    type="submit"
                    disabled={create.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Save size={14} /> {create.isPending ? 'Saving…' : 'Create Repayment'}
                  </button>
                  <FormProblem message={problem} />
                </div>
              </form>
            </FormCard>
          )}

          <ExpenseTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => `${r.n}-${r.reportId}`}
            searchPlaceholder="Search repayments..."
            searchText={(r) => [r.ref, r.employee, r.method, r.status, r.date].join(' ')}
            defaultSort={{ key: 'balance', dir: 'desc' }}
            empty="No repayments yet."
          />
        </>
      )}

      {collecting?.collect && data && (
        <MoneyBackDialog
          title="Collect Repayment Return"
          id={collecting.reportId}
          facts={[
            { label: 'Expense Report', value: collecting.collect.ref },
            { label: 'Outstanding Balance', value: collecting.collect.balance },
          ]}
          balance={amount(collecting.collect.balance)}
          method={collecting.collect.method}
          banks={data.banks}
          mutation={settle}
          onClose={() => setCollecting(null)}
        />
      )}
      {printing && <PrintPreviewDialog url={printing} onClose={() => setPrinting(null)} />}
    </div>
  )
}
