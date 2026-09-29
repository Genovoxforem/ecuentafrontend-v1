import { useState } from 'react'
import { Plus, Printer, Save, Undo2, Wallet } from 'lucide-react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { usePaymentTypes } from '../expenses.queries'
import { useAdvances, useCreateAdvance, useRepayAdvance } from '../expenseTabs.queries'
import type { AdvanceRow } from '../expenseTabsParser'
import { TONE_CLS, controlCls } from '../expenseTable'
import { ExpenseTable, type ExpenseColumn } from './ExpenseTable'
import { Field, FormCard, FormProblem } from './expenseParts'
import { MoneyBackDialog } from './MoneyBackDialog'
import { PrintPreviewDialog } from './PrintPreviewDialog'

const amount = (s: string) => parseFloat(s.replace(/,/g, '')) || 0
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const STATUS_CLS: Record<string, string> = { Open: 'bg-info-bg text-info-fg', Reconciled: 'bg-success-bg text-success-fg', Paid: 'bg-success-bg text-success-fg' }

// expense/advances.php: money advanced to employees. Create one, see what has been returned or reconciled,
// record money coming back, print the voucher.
export function ExpenseAdvancesPage() {
  const { data, isLoading, isError, error, refetch } = useAdvances()
  const { data: paymentTypes } = usePaymentTypes()
  const create = useCreateAdvance()
  const repay = useRepayAdvance()

  const [userId, setUserId] = useState('')
  const [amountText, setAmountText] = useState('')
  const [method, setMethod] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(() => iso(new Date()))
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [repaying, setRepaying] = useState<AdvanceRow | null>(null)
  const [printing, setPrinting] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // The backend's own checks: an employee and an amount, a method, and a bank account unless it is deducted from salary.
    if (!userId || !(Number(amountText) > 0)) return setProblem('Employee and a positive amount are required.')
    if (!method) return setProblem('Payment method is required.')
    if (method !== 'salary' && !accountId) return setProblem('Bank account is required.')
    setProblem(null)
    try {
      await create.mutateAsync({ userId, amount: amountText, method, accountId: method === 'salary' ? '' : accountId, date, note })
      setUserId('')
      setAmountText('')
      setNote('')
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not create the advance payment.')
    }
  }

  const columns: ExpenseColumn<AdvanceRow>[] = [
    { key: 'n', header: '#', sortValue: (r) => Number(r.n) || 0, cell: (r) => <span className="text-text-muted">{r.n}</span> },
    {
      key: 'ref',
      header: 'Ref',
      sortValue: (r) => r.ref,
      cell: (r) => (
        <button type="button" onClick={() => setPrinting(`/expense/advances_receipt.php?id=${r.id}`)} className="font-semibold text-brand hover:underline">
          {r.ref}
        </button>
      ),
    },
    { key: 'employee', header: 'Employee', sortValue: (r) => r.employee, cell: (r) => <span className="font-semibold text-text!">{r.employee}</span> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => amount(r.amount), cell: (r) => <span className="tabular-nums">{r.amount}</span> },
    { key: 'repaid', header: 'Repaid', align: 'right', sortValue: (r) => amount(r.repaid), cell: (r) => <span className="tabular-nums">{r.repaid}</span> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortValue: (r) => amount(r.balance),
      cell: (r) => <span className={`font-semibold tabular-nums ${TONE_CLS[r.balanceTone]}`}>{r.balance}</span>,
    },
    { key: 'method', header: 'Method', sortValue: (r) => r.method, cell: (r) => r.method },
    { key: 'date', header: 'Date', sortValue: (r) => r.date, cell: (r) => r.date },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      cell: (r) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[r.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{r.status}</span>,
    },
    { key: 'bank', header: 'Bank Entry', sortValue: (r) => r.bankEntry, cell: (r) => r.bankEntry },
    { key: 'repayDate', header: 'Repay Date', sortValue: (r) => r.repayDate, cell: (r) => r.repayDate },
    { key: 'repayEntry', header: 'Repay Entry', sortValue: (r) => r.repayEntry, cell: (r) => r.repayEntry },
    { key: 'repaidBy', header: 'Repaid By', sortValue: (r) => r.repaidBy, cell: (r) => r.repaidBy },
    { key: 'reconciled', header: 'Reconciled To', sortValue: (r) => r.reconciledTo, cell: (r) => r.reconciledTo },
    {
      key: 'settlement',
      header: 'Settlement',
      sortValue: (r) => r.settlement,
      cell: (r) => (
        <span className={r.settlement === 'Repayment' ? 'text-warning-fg' : r.settlement === 'Reimbursement' ? 'text-info-fg' : r.settlement === 'Settled' ? 'text-success-fg' : ''}>
          {r.settlement}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'center',
      cell: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setPrinting(`/expense/advances_receipt.php?id=${r.id}`)}
            className="rounded-md border border-brand p-1.5 text-brand hover:bg-brand/10"
            title="Print Voucher"
            aria-label={`Print voucher ${r.ref}`}
          >
            <Printer size={13} />
          </button>
          {r.repay && (
            <button
              type="button"
              onClick={() => setRepaying(r)}
              title="Record money returned by employee before reconcile"
              className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-black hover:bg-amber-400"
            >
              <Undo2 size={12} /> Repay
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet size={20} className="text-brand" /> Expense Advances
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading advances…" />}
      {isError && <LegacyErrorCard title="Couldn't load the advances" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          {data.canCreate && (
            <FormCard icon={<Plus size={15} />} title="Create Advance Payment">
              <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-6">
                <Field label="Employee" className="md:col-span-2">
                  <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`${controlCls} w-full`}>
                    {data.employees.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount">
                  <input type="number" step="0.01" min="0" value={amountText} onChange={(e) => setAmountText(e.target.value)} className={`${controlCls} w-full`} />
                </Field>
                <Field label="Method">
                  <select
                    value={method}
                    onChange={(e) => {
                      setMethod(e.target.value)
                      if (e.target.value === 'salary' || !e.target.value) setAccountId('')
                    }}
                    className={`${controlCls} w-full`}
                  >
                    <option value="">Select Payment Mode</option>
                    <option value="salary">Salary Deduction</option>
                    {paymentTypes?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.text}
                      </option>
                    ))}
                  </select>
                </Field>
                {method !== 'salary' && (
                  <Field label="Bank Account">
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${controlCls} w-full`}>
                      {data.banks.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Date">
                  <div className="flex gap-2">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${controlCls} min-w-0 flex-1`} />
                    <button type="button" onClick={() => setDate(iso(new Date()))} className="h-9 shrink-0 rounded-md border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
                      Now
                    </button>
                  </div>
                </Field>
                <Field label="Note" className="md:col-span-2">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={`${controlCls} w-full`} />
                </Field>
                <div className="flex items-center gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={create.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Save size={14} /> {create.isPending ? 'Creating…' : 'Create Advance'}
                  </button>
                  <FormProblem message={problem} />
                </div>
              </form>
            </FormCard>
          )}

          <ExpenseTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => r.id}
            searchPlaceholder="Search advances…"
            searchText={(r) =>
              Object.values(r)
                .filter((v) => typeof v === 'string')
                .join(' ')
            }
            defaultSort={{ key: 'repaid', dir: 'desc' }}
            empty="No advance payments yet."
          />
        </>
      )}

      {repaying?.repay && data && (
        <MoneyBackDialog
          title="Repay Advance"
          id={repaying.id}
          facts={[
            { label: 'Advance Ref', value: repaying.repay.ref },
            { label: 'Employee', value: repaying.repay.employee },
            { label: 'Outstanding Balance', value: repaying.repay.balance },
          ]}
          balance={amount(repaying.repay.balance)}
          banks={data.banks}
          mutation={repay}
          onClose={() => setRepaying(null)}
        />
      )}
      {printing && <PrintPreviewDialog url={printing} onClose={() => setPrinting(null)} />}
    </div>
  )
}
