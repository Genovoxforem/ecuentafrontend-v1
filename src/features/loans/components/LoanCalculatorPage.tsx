import { useState, type SubmitEvent } from 'react'
import { Calculator, Info } from 'lucide-react'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatDate } from '../../../utils/format'
import { calculateLoanSchedule, type LoanCalculatorResult, type LoanInterestType, type LoanTermPeriod } from '../loans.queries'

const PAGE_SIZE = 15

const INTEREST_TYPE_OPTIONS: { value: LoanInterestType; label: string }[] = [
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'fixed_rate', label: 'Fixed Rate' },
  { value: 'mortgage', label: 'Mortgage amortization' },
  { value: 'reducing_amount', label: 'Reducing Amount' },
  { value: 'one_time', label: 'One-time payment' },
]

const TERM_PERIOD_OPTIONS: { value: LoanTermPeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Real: loan_calculator.php's own math (read directly from the backend
// PHP), ported verbatim — same 5 interest_type variants loan_product.php's
// own Interest Type dropdown offers. Pure client-side computation, no
// backend call needed since the legacy page itself has no other data
// dependency for this math.
//
// Header/footer shell matches BankEntryDetail.tsx's own sticky-header +
// sticky-footer pattern (-m-6 wrapper, ListPagination as a sibling AFTER
// the scrollable content, never nested inside it — see ListPagination's own
// comment on why) rather than letting a long schedule (e.g. a 30-year
// mortgage) grow the whole page.
export function LoanCalculatorPage() {
  const [applyAmount, setApplyAmount] = useState('10000')
  const [interestRate, setInterestRate] = useState('12')
  const [interestType, setInterestType] = useState<LoanInterestType>('reducing_amount')
  const [term, setTerm] = useState('12')
  const [termPeriod, setTermPeriod] = useState<LoanTermPeriod>('month')
  const [latePaymentPenalties, setLatePaymentPenalties] = useState('2')
  const [firstPaymentDate, setFirstPaymentDate] = useState(todayIso())
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LoanCalculatorResult | null>(null)

  // Real: loan_calculator.php only computes on an explicit "Calculate"
  // submit (a plain GET form, action=calculate_loan) — it doesn't recompute
  // live on every keystroke like this page previously did.
  function handleCalculate(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const amount = Number(applyAmount) || 0
    if (amount <= 0) {
      setResult(null)
      return
    }
    setResult(
      calculateLoanSchedule({
        applyAmount: amount,
        interestRate: Number(interestRate) || 0,
        interestType,
        term: Math.max(1, Math.round(Number(term) || 1)),
        termPeriod,
        latePaymentPenalties: Number(latePaymentPenalties) || 0,
        firstPaymentDate: firstPaymentDate || todayIso(),
      }),
    )
    setPage(1)
  }

  const pagedSchedule = result?.schedule.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? []

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Calculator size={20} className="text-brand" /> Loan Calculator
        </h2>
        <div className="flex items-start gap-2 rounded-lg border border-info-bg bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>Real — reproduces loan_calculator.php's own interest math client-side (all 5 interest types), so results match the legacy calculator exactly.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Loan Details</h3>
          <form onSubmit={handleCalculate}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">Apply Amount</span>
                <input type="number" value={applyAmount} onChange={(e) => setApplyAmount(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">Interest Rate Per Year (%)</span>
                <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">Interest Type</span>
                <select value={interestType} onChange={(e) => setInterestType(e.target.value as LoanInterestType)} className={inputCls}>
                  {INTEREST_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">Term</span>
                <input type="number" value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">Term Period</span>
                <select value={termPeriod} onChange={(e) => setTermPeriod(e.target.value as LoanTermPeriod)} className={inputCls}>
                  {TERM_PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">Late Payment Penalties (%)</span>
                <input type="number" value={latePaymentPenalties} onChange={(e) => setLatePaymentPenalties(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">First Payment Date</span>
                <input type="date" value={firstPaymentDate} onChange={(e) => setFirstPaymentDate(e.target.value)} className={inputCls} />
              </label>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                Calculate
              </button>
            </div>
          </form>
        </Card>

        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5 whitespace-nowrap">Date</th>
                <th className="font-medium px-4 py-2.5 whitespace-nowrap">Principal Amount</th>
                <th className="font-medium px-4 py-2.5 whitespace-nowrap">Interest</th>
                <th className="font-medium px-4 py-2.5 whitespace-nowrap">Penalty</th>
                <th className="font-medium px-4 py-2.5 whitespace-nowrap">Amount to Pay</th>
                <th className="font-medium px-4 py-2.5 whitespace-nowrap">Balance</th>
              </tr>
            </thead>
            <tbody>
              {!result ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={6}>
                    Enter the loan details above and click Calculate to see the repayment schedule.
                  </td>
                </tr>
              ) : (
                pagedSchedule.map((row) => (
                  <tr key={row.period} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-2.5 text-text! tabular-nums whitespace-nowrap">{fmtZMW(row.principal)}</td>
                    <td className="px-4 py-2.5 text-text! tabular-nums whitespace-nowrap">{fmtZMW(row.interest)}</td>
                    <td className="px-4 py-2.5 text-text-muted tabular-nums whitespace-nowrap">{fmtZMW(row.penalty)}</td>
                    <td className="px-4 py-2.5 text-text! tabular-nums font-medium whitespace-nowrap">{fmtZMW(row.amountToPay)}</td>
                    <td className="px-4 py-2.5 text-text-muted tabular-nums whitespace-nowrap">{fmtZMW(row.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {result && <ListPagination page={page} perPage={PAGE_SIZE} total={result.schedule.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
