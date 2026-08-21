import { useMemo, useState } from 'react'
import { Flag } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { usePayments } from '../payments.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonthIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

// Real GET /api/payments/ data (see payments.queries.ts), against
// llx_paiement. "Bank Entry"/"Account" columns aren't returned by this
// endpoint (no bank-reconciliation join) — shown honestly as "-" rather
// than guessed.
export function PaymentsListPage() {
  const { data, isLoading, isError } = usePayments()
  const [from, setFrom] = useState(firstOfMonthIso())
  const [to, setTo] = useState(todayIso())
  const [applied, setApplied] = useState({ from: firstOfMonthIso(), to: todayIso() })

  const rows = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(() => {
    const fromDate = new Date(applied.from)
    const toDate = new Date(applied.to)
    toDate.setHours(23, 59, 59, 999)
    return rows.filter((r) => {
      const d = new Date(r.paymentDate)
      return !Number.isNaN(d.getTime()) && d >= fromDate && d <= toDate
    })
  }, [rows, applied])

  const total = filtered.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Flag size={20} className="text-brand" /> Report Area
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-faint mb-1">Report period</label>
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <span className="text-text-faint">-</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
          </div>
          <button type="button" onClick={() => setApplied({ from, to })} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            View Report
          </button>
        </div>
      </Card>

      <h3 className="text-base font-semibold text-text!">Payments Received From Customers</h3>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref.Payment</th>
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5">Type</th>
              <th className="font-medium px-4 py-2.5">Number</th>
              <th className="font-medium px-4 py-2.5">Bank Entry</th>
              <th className="font-medium px-4 py-2.5">Account</th>
              <th className="font-medium px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-danger">
                  Could not load payments.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              <>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(r.paymentDate)}</td>
                    <td className="px-4 py-3 text-text!">{r.customerName || '-'}</td>
                    <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                    <td className="px-4 py-3 text-text-muted">{r.paymentReference || '-'}</td>
                    <td className="px-4 py-3 text-text-faint">-</td>
                    <td className="px-4 py-3 text-text-faint">-</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-text!">
                  <td className="px-4 py-3" colSpan={7}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(total)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
