import { Link } from 'react-router-dom'
import { HeartHandshake } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { usDate } from '../../../api/fapiRow'
import { formatMoney } from '../../../utils/format'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useDonationsArea } from '../donationsArea.queries'

const money = (n: number, show: boolean) => (show ? formatMoney(n) : '')

// don/index.php — Donations area: the statistics by status and the latest donations. The classic page says
// "Latest 10 Modified Donations"; the endpoint has no modification date, so the ten newest by donation date are shown.
export function DonationsAreaPage() {
  const { data, isLoading, isError, error, refetch } = useDonationsArea()
  if (isLoading) return <LegacyLoadingCard label="Loading the donations area..." />
  if (isError || !data) return <LegacyErrorCard title="Could not load the donations area" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const th = 'px-3 py-2 text-xs font-semibold text-text-faint'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-text!">
          <HeartHandshake size={18} /> Donations area
        </h1>
        <div className="flex gap-2 text-sm">
          <Link to={ROUTES.ledgerDonationCreate} className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-hover">New Donation</Link>
          <Link to={ROUTES.ledgerDonationsList} className="rounded-md border border-border px-3 py-1.5 text-text hover:bg-surface-hover">Donations list</Link>
        </div>
      </div>

      <Card className="!h-auto">
        <h2 className="mb-2 text-sm font-semibold text-text!">Statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Number</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={`${th} text-right`}>Average</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.status} className="border-b border-border">
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.count || ''}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(r.amount, r.count > 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(r.average, r.count > 0)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{data.total.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(data.total.amount)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(data.total.average)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto">
        <h2 className="mb-2 text-sm font-semibold text-text!">Latest 10 donations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {data.latest.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-text-faint">No donations yet.</td></tr>
              ) : (
                data.latest.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{d.ref}</td>
                    <td className="px-3 py-2">{d.company || d.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(d.amount)}</td>
                    <td className="px-3 py-2">{usDate(d.date)}</td>
                    <td className="px-3 py-2">{d.status_label}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
