import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ChartLine, LoaderCircle, FileSpreadsheet, Printer } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelReportsSummary, useHotelLedger, useHotelNightAudit, useHotelToken, type LedgerType, type HotelLedgerRow } from '../hotel.queries'

const TABS: { key: LedgerType; label: string }[] = [
  { key: 'history', label: 'Room history' },
  { key: 'cancelled', label: 'Cancelled / no-show' },
  { key: 'groups', label: 'Group bookings' },
  { key: 'cleaning', label: 'Cleaning log' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'activity', label: 'Activity log' },
  { key: 'police', label: 'Foreign guests' },
]

const COLUMNS: Record<LedgerType, { key: keyof HotelLedgerRow; label: string; align?: 'right' }[]> = {
  history: [
    { key: 'num', label: 'Booking' },
    { key: 'guest', label: 'Guest' },
    { key: 'rooms', label: 'Suites' },
    { key: 'ci', label: 'Check-in' },
    { key: 'co', label: 'Check-out' },
    { key: 'status', label: 'Status' },
  ],
  cancelled: [
    { key: 'num', label: 'Booking' },
    { key: 'guest', label: 'Guest' },
    { key: 'ci', label: 'Check-in' },
    { key: 'co', label: 'Check-out' },
    { key: 'status', label: 'Status' },
  ],
  groups: [
    { key: 'num', label: 'Booking' },
    { key: 'guest', label: 'Guest' },
    { key: 'rooms', label: 'Suites' },
    { key: 'ci', label: 'Check-in' },
    { key: 'co', label: 'Check-out' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Value', align: 'right' },
  ],
  nationality: [
    { key: 'country', label: 'Nationality' },
    { key: 'guests', label: 'Guests', align: 'right' },
    { key: 'bookings', label: 'Bookings', align: 'right' },
  ],
  activity: [
    { key: 'tsf', label: 'When' },
    { key: 'typ', label: 'Action' },
    { key: 'ref', label: 'Reference' },
    { key: 'who', label: 'User' },
  ],
  police: [
    { key: 'num', label: 'Booking' },
    { key: 'guest', label: 'Guest' },
    { key: 'country', label: 'Nationality' },
    { key: 'idno', label: 'Passport / ID' },
    { key: 'rooms', label: 'Room' },
    { key: 'ci', label: 'Check-in' },
    { key: 'co', label: 'Check-out' },
    { key: 'arrival', label: 'From' },
    { key: 'purpose', label: 'Purpose' },
  ],
  cleaning: [
    { key: 'room', label: 'Suite' },
    { key: 'hk', label: 'Housekeeper' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'completed', label: 'Completed' },
    { key: 'status', label: 'Status' },
  ],
}

function KpiTile({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof ChartLine; color: IconColor }) {
  return (
    <Card className="!p-4 flex items-center gap-3">
      <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
      <div>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text!">{value}</p>
      </div>
    </Card>
  )
}

// Real via custom/hotel/api.php?r=reports (KPIs + 7-day trend + revenue by
// source) and r=report&type=<ledger> (7 operational ledgers, grouped under
// "Operational Ledgers" matching the real page's own section heading),
// plus a=nightaudit — the Hotel Suite app's own Reports view. Night Audit's
// own status line starts as "End-of-day close · processes no-shows" on a
// fresh page load (confirmed live: that's the real element's own initial
// HTML, not a placeholder) and only becomes "Closed <date> · <n> no-shows
// processed" ephemerally, client-side, right after Run Night Audit
// actually succeeds — reproduced here the same way using the real
// mutation's own response fields.
export function HotelReports() {
  const { data: token } = useHotelToken()
  const { data: summary, isLoading, isError, error, refetch } = useHotelReportsSummary()
  const [tab, setTab] = useState<LedgerType>('history')
  const ledger = useHotelLedger(tab)
  const audit = useHotelNightAudit()
  const [auditResult, setAuditResult] = useState<{ date: string; noshows: number } | null>(null)

  function exportCsv() {
    const cols = COLUMNS[tab]
    const rows = ledger.data ?? []
    const csv = [cols.map((c) => c.label).join(','), ...rows.map((r) => cols.map((c) => String(r[c.key] ?? '')).join(','))].join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
      a.remove()
    }, 500)
  }

  const totalSourceRevenue = (summary?.sources ?? []).reduce((s, x) => s + x.v, 0) || 1

  return (
    <div className="space-y-4 flex-1 min-h-0 flex flex-col">

      {isLoading && <LegacyLoadingCard label="Loading reports…" />}
      {isError && <LegacyErrorCard title="Couldn't load reports" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {summary && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiTile label="Occupancy (today)" value={`${summary.occupancy}%`} icon={ChartLine} color="blue" />
            <KpiTile label="ADR" value={`K${summary.adr.toLocaleString()}`} icon={ChartLine} color="violet" />
            <KpiTile label="RevPAR" value={`K${summary.revpar.toLocaleString()}`} icon={ChartLine} color="green" />
            <KpiTile label="In-house revenue" value={`K${summary.revenue.toLocaleString()}`} icon={ChartLine} color="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="!h-auto">
              <h3 className="font-semibold text-text! mb-3">Occupancy — last 7 days</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={summary.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="d" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip />
                  <Line type="monotone" dataKey="occ" name="Occupancy" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="!h-auto">
              <h3 className="font-semibold text-text! mb-3">Revenue by Source</h3>
              {summary.sources.length === 0 ? (
                <p className="text-sm text-text-faint italic py-8 text-center">No revenue yet.</p>
              ) : (
                <div className="space-y-3">
                  {summary.sources.map((s) => {
                    const pct = Math.round((s.v / totalSourceRevenue) * 100)
                    return (
                      <div key={s.src}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-muted">{s.src || 'Other'}</span>
                          <span className="font-semibold text-text!">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-neutral-bg overflow-hidden">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          <Card className="!h-auto flex items-center gap-4">
            <div>
              <h3 className="font-semibold text-text!">Night Audit</h3>
              <p className="text-xs text-text-faint">
                {auditResult ? `Closed ${auditResult.date} · ${auditResult.noshows} no-shows processed` : `End-of-day close · processes no-shows · ${summary.noshows} pending`}
              </p>
            </div>
            <button
              type="button"
              disabled={!token || audit.isPending}
              onClick={() =>
                token &&
                audit.mutate(
                  { token },
                  { onSuccess: (res) => setAuditResult({ date: String(res.date ?? ''), noshows: Number(res.noshows ?? 0) }) },
                )
              }
              className="ml-auto flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {audit.isPending && <LoaderCircle size={13} className="animate-spin" />} Run night audit
            </button>
          </Card>

          <Card className="flex-1 min-h-0">
            <h3 className="font-semibold text-text! mb-3">Operational Ledgers</h3>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${tab === t.key ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={exportCsv} className="flex items-center gap-1 text-xs text-text-muted hover:text-text px-2 py-1 rounded-md hover:bg-surface-hover">
                  <FileSpreadsheet size={13} /> CSV
                </button>
                <button type="button" onClick={() => window.print()} className="flex items-center gap-1 text-xs text-text-muted hover:text-text px-2 py-1 rounded-md hover:bg-surface-hover">
                  <Printer size={13} /> Print
                </button>
              </div>
            </div>

            {ledger.isLoading && <p className="text-sm text-text-faint py-4 text-center">Loading…</p>}
            {ledger.data && ledger.data.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No records.</p>
            ) : (
              ledger.data && (
                <div className="flex-1 min-h-0 overflow-auto no-scrollbar">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                        {COLUMNS[tab].map((c) => (
                          <th key={String(c.key)} className={`font-medium px-2 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.data.map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {COLUMNS[tab].map((c) => (
                            <td key={String(c.key)} className={`px-2 py-2 text-text-muted ${c.align === 'right' ? 'text-right' : ''}`}>
                              {c.key === 'total' ? `K${Number(r.total ?? 0).toLocaleString()}` : String(r[c.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </Card>
        </>
      )}
    </div>
  )
}
