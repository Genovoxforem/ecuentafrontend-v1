import { useMemo, useState } from 'react'
import { Calculator, Info } from 'lucide-react'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { formatDate } from '../../../utils/format'
import { calculateLoanSchedule, type LoanInterestType } from '../loans.queries'

const INTEREST_TYPE_OPTIONS: { value: LoanInterestType; label: string }[] = [
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'fixed_rate', label: 'Fixed Rate' },
  { value: 'mortgage', label: 'Mortgage amortization' },
  { value: 'reducing_amount', label: 'Reducing Amount' },
  { value: 'one_time', label: 'One-time payment' },
]

const TERM_PERIOD_OPTIONS = [
  { days: 1, label: 'Day' },
  { days: 7, label: 'Week' },
  { days: 30, label: 'Month' },
  { days: 365, label: 'Year' },
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
export function LoanCalculatorPage() {
  const [applyAmount, setApplyAmount] = useState('10000')
  const [interestRate, setInterestRate] = useState('12')
  const [interestType, setInterestType] = useState<LoanInterestType>('reducing_amount')
  const [term, setTerm] = useState('12')
  const [termPeriodDays, setTermPeriodDays] = useState(30)
  const [latePaymentPenalties, setLatePaymentPenalties] = useState('2')
  const [firstPaymentDate, setFirstPaymentDate] = useState(todayIso())

  const result = useMemo(() => {
    const amount = Number(applyAmount) || 0
    const rate = Number(interestRate) || 0
    const termCount = Math.max(1, Math.round(Number(term) || 1))
    const penalty = Number(latePaymentPenalties) || 0
    if (amount <= 0) return null
    return calculateLoanSchedule({
      applyAmount: amount,
      interestRate: rate,
      interestType,
      term: termCount,
      termPeriodDays,
      latePaymentPenalties: penalty,
      firstPaymentDate: firstPaymentDate || todayIso(),
    })
  }, [applyAmount, interestRate, interestType, term, termPeriodDays, latePaymentPenalties, firstPaymentDate])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Calculator size={20} className="text-brand" /> Loan Calculator
      </h2>

      <div className="flex items-start gap-2 rounded-lg border border-info-bg bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>Real — reproduces loan_calculator.php's own interest math client-side (all 5 interest types), so results match the legacy calculator exactly.</p>
      </div>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Loan Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Applied Amount</span>
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
            <span className="text-xs font-medium text-text-muted">Max Term</span>
            <input type="number" value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Term Period</span>
            <select value={termPeriodDays} onChange={(e) => setTermPeriodDays(Number(e.target.value))} className={inputCls}>
              {TERM_PERIOD_OPTIONS.map((o) => (
                <option key={o.label} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Late Payment Penalties In %</span>
            <input type="number" value={latePaymentPenalties} onChange={(e) => setLatePaymentPenalties(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">First Payment Date</span>
            <input type="date" value={firstPaymentDate} onChange={(e) => setFirstPaymentDate(e.target.value)} className={inputCls} />
          </label>
        </div>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="!p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Payable Amount</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(result.payableAmount)}</p>
            </Card>
            <Card className="!p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Interest</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(result.payableAmount - (Number(applyAmount) || 0))}</p>
            </Card>
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5">#</th>
                  <th className="font-medium px-4 py-2.5">Date</th>
                  <th className="font-medium px-4 py-2.5">Principal</th>
                  <th className="font-medium px-4 py-2.5">Interest</th>
                  <th className="font-medium px-4 py-2.5">Penalty</th>
                  <th className="font-medium px-4 py-2.5">Amount to Pay</th>
                  <th className="font-medium px-4 py-2.5">Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((row) => (
                  <tr key={row.period} className="border-b border-border">
                    <td className="px-4 py-2.5 text-text-muted">{row.period}</td>
                    <td className="px-4 py-2.5 text-text-muted">{formatDate(row.date)}</td>
                    <td className="px-4 py-2.5 text-text! tabular-nums">{fmtZMW(row.principal)}</td>
                    <td className="px-4 py-2.5 text-text! tabular-nums">{fmtZMW(row.interest)}</td>
                    <td className="px-4 py-2.5 text-text-muted tabular-nums">{fmtZMW(row.penalty)}</td>
                    <td className="px-4 py-2.5 text-text! tabular-nums font-medium">{fmtZMW(row.amountToPay)}</td>
                    <td className="px-4 py-2.5 text-text-muted tabular-nums">{fmtZMW(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
