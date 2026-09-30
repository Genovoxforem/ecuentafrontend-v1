import { BarChart3, FileSpreadsheet, Printer } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useVatReportByMonth } from '../../vatReportByMonth.queries'
import type { VatReportByMonth } from '../../vatReportByMonthParser'

const th = 'font-medium px-3 py-2 text-xs uppercase tracking-wide text-text-faint'
const num = 'px-3 py-2 text-right tabular-nums'

function toCsv(d: VatReportByMonth): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows: string[][] = [
    ['Tax monthly'],
    ['Year', 'Tax sales', 'Tax purchases', 'Balance'],
    ...d.months.map((m) => [m.label, m.sales, m.purchases, m.balance]),
    ...(d.subtotal ? [['Subtotal', d.subtotal.sales, d.subtotal.purchases, d.subtotal.balance]] : []),
    ['Total to pay', '', '', d.totalToPay],
    [],
    ['Tax paid'],
    ['Month', 'Claimed for the period', 'Paid during this period'],
    ...d.paidRows.map((r) => [r.month, r.claimed, r.paid]),
    ...(d.paidTotal ? [['Total', d.paidTotal.claimed, d.paidTotal.paid]] : []),
    [],
    ['Tax Balance'],
    ...d.balance.map((b) => [b.label, b.value]),
  ]
  return rows.map((r) => r.map(q).join(',')).join('\r\n')
}

function exportCsv(d: VatReportByMonth) {
  const url = URL.createObjectURL(new Blob([toCsv(d)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'tax-report-by-month.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const btn = 'flex items-center justify-center h-9 w-9 rounded-md bg-brand text-white hover:bg-brand-hover'

// compta/tva/index.php — the real "TAX REPORT BY MONTH" (see
// vatReportByMonthParser.ts). Read-only; Export downloads the three tables
// as CSV and Print opens the browser print dialog.
export function VatReportByMonthPage() {
  const { data, isLoading, isError, error, refetch } = useVatReportByMonth()
  if (isLoading) return <LegacyLoadingCard label="Loading tax report…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the tax report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <BarChart3 size={20} className="text-brand" /> {data.title}
          </h2>
          <p className="mt-1 text-sm text-text-muted">For the period of {data.period || '-'}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button type="button" onClick={() => exportCsv(data)} title="Export to CSV" className={btn}>
            <FileSpreadsheet size={16} />
          </button>
          <button type="button" onClick={() => window.print()} title="Print" className={btn}>
            <Printer size={16} />
          </button>
        </div>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Tax monthly</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border bg-surface">
                <th className={th}>Year</th>
                <th className={`${th} text-right`}>Tax sales</th>
                <th className={`${th} text-right`}>Tax purchases</th>
                <th className={`${th} text-right`}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.months.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-5 text-center italic text-text-faint">
                    No months to report.
                  </td>
                </tr>
              )}
              {data.months.map((m) => (
                <tr key={m.label} className="border-b border-border">
                  <td className="px-3 py-2 text-brand font-medium">{m.label}</td>
                  <td className={num}>{m.sales}</td>
                  <td className={num}>{m.purchases}</td>
                  <td className={num}>{m.balance}</td>
                </tr>
              ))}
              {data.subtotal && (
                <tr className="border-b border-border bg-surface font-semibold text-text!">
                  <td className="px-3 py-2 text-right">Subtotal:</td>
                  <td className={num}>{data.subtotal.sales}</td>
                  <td className={num}>{data.subtotal.purchases}</td>
                  <td className={num}>{data.subtotal.balance}</td>
                </tr>
              )}
              <tr className="bg-surface font-semibold text-text!">
                <td colSpan={3} className="px-3 py-2 text-right">
                  Total to pay:
                </td>
                <td className={num}>{data.totalToPay}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Tax paid</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border bg-surface">
                <th className={th}>Month</th>
                <th className={`${th} text-right`}>Claimed for the period</th>
                <th className={`${th} text-right`}>Paid during this period</th>
              </tr>
            </thead>
            <tbody>
              {data.paidRows.map((r) => (
                <tr key={r.month} className="border-b border-border">
                  <td className="px-3 py-2">{r.month}</td>
                  <td className={num}>{r.claimed}</td>
                  <td className={num}>{r.paid}</td>
                </tr>
              ))}
              {data.paidTotal && (
                <tr className="bg-surface font-semibold text-text!">
                  <td className="px-3 py-2 text-right">Total</td>
                  <td className={num}>{data.paidTotal.claimed}</td>
                  <td className={num}>{data.paidTotal.paid}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Tax Balance</div>
        <table className="w-full text-sm">
          <tbody>
            {data.balance.map((b, i) => (
              <tr key={b.label} className="border-b border-border last:border-0">
                <td className={`px-3 py-2 ${i === 0 ? 'font-semibold text-text!' : 'text-text-muted'}`}>{b.label}</td>
                <td className={`${num} ${i === 0 ? 'font-semibold text-text!' : ''}`}>{b.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
