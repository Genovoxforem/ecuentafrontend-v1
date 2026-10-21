import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HandCoins, Plus, Printer, Save } from 'lucide-react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useCreateReimbursement, useReimbursements } from '../expenseTabs.queries'
import type { ReimbursementRow } from '../expenseTabsParser'
import { TONE_CLS, controlCls } from '../expenseTable'
import { ExpenseTable, type ExpenseColumn } from './ExpenseTable'
import { Field, FormCard, FormProblem } from './expenseParts'
import { PrintPreviewDialog } from './PrintPreviewDialog'

const amount = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

const STATUS_CLS: Record<string, string> = {
  Pending: 'bg-neutral-bg text-neutral-fg',
  Approved: 'bg-info-bg text-info-fg',
  Paid: 'bg-success-bg text-success-fg',
  Closed: 'bg-neutral-bg text-text-muted',
}

// expense/reimbursements.php: what the company still owes a person for an approved expense report.
export function ExpenseReimbursementsPage() {
  const { data, isLoading, isError, error, refetch } = useReimbursements()
  const create = useCreateReimbursement()
  const [reportId, setReportId] = useState('')
  // A recipient is an employee or a customer; their ids are separate, so the type is part of the choice.
  const [recipient, setRecipient] = useState('')
  const [claim, setClaim] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [printing, setPrinting] = useState<string | null>(null)

  const recipientType = recipient.split(':')[0] || 'employee'

  // Choosing a report fills the claim with its total and picks who it is for: the customer when the report
  // is a customer expense, otherwise the employee.
  function pickReport(value: string) {
    setReportId(value)
    const r = data?.reports.find((x) => x.value === value)
    if (!r || !value) return
    if (r.amount) setClaim(r.amount)
    if (r.expenseType === 'customer' && Number(r.socid) > 0) setRecipient(`customer:${r.socid}`)
    else if (Number(r.employeeId) > 0) setRecipient(`employee:${r.employeeId}`)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reportId || !recipient || !(Number(claim) > 0)) return setProblem('Choose the expense report, who it is for, and a claim amount.')
    setProblem(null)
    try {
      await create.mutateAsync({ reportId, recipientId: recipient.split(':')[1] ?? '', recipientType, claimAmount: claim })
      setReportId('')
      setRecipient('')
      setClaim('')
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not create the reimbursement.')
    }
  }

  const columns: ExpenseColumn<ReimbursementRow>[] = [
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
    {
      key: 'recipient',
      header: 'Employee',
      sortValue: (r) => r.recipient,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.recipient}
          {r.recipientType && <span className="rounded bg-neutral-bg px-1.5 py-0.5 text-[11px] text-neutral-fg">{r.recipientType}</span>}
        </span>
      ),
    },
    { key: 'gross', header: 'Gross Expense', align: 'right', sortValue: (r) => amount(r.gross), cell: (r) => <span className="tabular-nums">{r.gross}</span> },
    { key: 'advance', header: 'Advance Deducted', align: 'right', sortValue: (r) => amount(r.advance), cell: (r) => <span className="tabular-nums text-text-muted">{r.advance}</span> },
    { key: 'net', header: 'Net Claim', align: 'right', sortValue: (r) => amount(r.net), cell: (r) => <span className="font-bold tabular-nums text-text!">{r.net}</span> },
    { key: 'paid', header: 'Paid', align: 'right', sortValue: (r) => amount(r.paid), cell: (r) => <span className="tabular-nums">{r.paid}</span> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortValue: (r) => amount(r.balance),
      cell: (r) => <span className={`font-semibold tabular-nums ${TONE_CLS[r.balanceTone]}`}>{r.balance}</span>,
    },
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
      cell: (r) =>
        r.receiptId && (
          <button
            type="button"
            onClick={() => setPrinting(`/expense/reimbursement_receipt.php?id=${r.receiptId}`)}
            className="rounded-md border border-brand p-1.5 text-brand hover:bg-brand/10"
            title="Print Receipt"
            aria-label={`Print receipt for ${r.ref}`}
          >
            <Printer size={13} />
          </button>
        ),
    },
  ]

  const recipientLabel = recipientType === 'customer' ? 'Customer' : 'Employee'

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 p-6 space-y-4">
      <h2 className="shrink-0 flex items-center gap-2 text-lg font-bold text-text!">
        <HandCoins size={20} className="text-brand" /> Expense Reimbursements
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading reimbursements…" />}
      {isError && <LegacyErrorCard title="Couldn't load the reimbursements" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          {data.canCreate && (
            <FormCard icon={<Plus size={15} />} title="Create Reimbursement">
              <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 md:grid-cols-4">
                <Field label="Expense Report">
                  <select value={reportId} onChange={(e) => pickReport(e.target.value)} className={`${controlCls} w-full`}>
                    {data.reports.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={recipientLabel}>
                  <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className={`${controlCls} w-full`}>
                    <option value="">Select {recipientLabel}</option>
                    {data.recipients
                      .filter((o) => o.value)
                      .map((o) => (
                        <option key={`${o.type}:${o.value}`} value={`${o.type}:${o.value}`}>
                          {o.label}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Claim Amount">
                  <input type="number" step="0.01" min="0" value={claim} onChange={(e) => setClaim(e.target.value)} className={`${controlCls} w-full`} />
                </Field>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={create.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Save size={14} /> {create.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
                <div className="md:col-span-4">
                  <FormProblem message={problem} />
                </div>
              </form>
            </FormCard>
          )}

          <ExpenseTable
            rows={data.rows}
            columns={columns}
            rowKey={(r) => `${r.n}-${r.reportId}`}
            searchPlaceholder="Search reimbursements..."
            searchText={(r) => [r.ref, r.recipient, r.recipientType, r.status, r.date, r.net].join(' ')}
            defaultSort={{ key: 'balance', dir: 'desc' }}
            empty="No reimbursements yet."
          />
        </>
      )}

      {printing && <PrintPreviewDialog url={printing} onClose={() => setPrinting(null)} />}
    </div>
  )
}
