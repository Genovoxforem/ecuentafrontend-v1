import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Link } from 'react-router-dom'
import { Gauge, Gem, TrendingUp, DoorOpen, Users, AlertTriangle, CalendarPlus } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import { useHotelDashboard, useHotelDashKpi, useHotelTrends, useHotelArrivals, type HotelRackRoom } from '../hotel.queries'

const STATUS_STYLES: Record<string, { label: string; dot: string; chip: string }> = {
  occupied: { label: 'Occupied', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ready: { label: 'Ready', dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  dirty: { label: 'To service', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  arriving: { label: 'Arriving', dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  ooo: { label: 'Out of service', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: typeof Gauge; color: IconColor }) {
  return (
    <Card className="!p-4 flex flex-col gap-2">
      <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
      <p className="text-xs font-semibold text-text-muted">{label}</p>
      <p className="text-2xl font-bold text-text! leading-tight">{value}</p>
      <p className="text-xs text-text-faint">{sub}</p>
    </Card>
  )
}

function RackPreview({ rack }: { rack: HotelRackRoom[] }) {
  const byFloor = new Map<string, HotelRackRoom[]>()
  for (const r of rack) {
    const key = r.floor || '—'
    if (!byFloor.has(key)) byFloor.set(key, [])
    byFloor.get(key)!.push(r)
  }
  const floors = Array.from(byFloor.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))

  if (rack.length === 0) return <p className="text-sm text-text-faint italic py-4">No suites configured yet.</p>

  return (
    <div className="space-y-2">
      {floors.map(([floor, rooms]) => (
        <div key={floor} className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-text-faint">{rooms[0]?.floorname || `Floor ${floor}`}</span>
          <div className="flex flex-wrap gap-1.5">
            {rooms
              .sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true }))
              .map((r) => {
                const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.ready
                return (
                  <span key={r.id} title={`${r.type} · ${r.status}`} className={`w-10 h-9 rounded-md border grid place-items-center text-[11px] font-medium ${s.chip}`}>
                    {r.no}
                  </span>
                )
              })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-2">
        {Object.entries(STATUS_STYLES).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// Real via custom/hotel/api.php?r=dashboard|dashkpi|trends|arrivals — the
// Hotel Suite app's own Dashboard view, ported to this app's design system
// (Card/ICON_STYLES instead of its bespoke gold/emerald theme) rather than
// visually cloned — see hotelApi.ts's own top comment for how this real API
// was found and confirmed.
export function HotelDashboard() {
  const { data: dashboard, isLoading, isError, error, refetch } = useHotelDashboard()
  const { data: kpi } = useHotelDashKpi()
  const { data: trends } = useHotelTrends()
  const { data: arrivals } = useHotelArrivals()

  if (isLoading) return <LegacyLoadingCard label="Loading dashboard…" />
  if (isError) return <LegacyErrorCard title="Couldn't load the Hotel Suite dashboard" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!dashboard) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <Gauge size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Hotel Dashboard</h2>
            <p className="text-xs text-text-faint mt-0.5">Live operational overview — custom/hotel/api.php</p>
          </div>
        </div>
        <Link to={ROUTES.hotelNewBooking} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <CalendarPlus size={14} /> New Booking
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Occupancy" value={`${dashboard.occupancy}%`} sub={`of ${dashboard.total - dashboard.counts.ooo} sellable suites`} icon={Gauge} color="blue" />
        <KpiCard label="ADR" value={`K${dashboard.adr.toLocaleString()}`} sub="average daily rate" icon={Gem} color="violet" />
        <KpiCard label="RevPAR" value={`K${dashboard.revpar.toLocaleString()}`} sub="revenue per available room" icon={TrendingUp} color="green" />
        <KpiCard label="Arrivals · Departures" value={`${dashboard.arrivals} · ${dashboard.departures}`} sub={`${dashboard.inhouse} in residence`} icon={DoorOpen} color="amber" />
      </div>

      {kpi && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          <KpiCard label="ALOS" value={`${kpi.alos}n`} sub="average length of stay" icon={Users} color="cyan" />
          <KpiCard label="Cancellation rate" value={`${kpi.canrate}%`} sub="of all bookings" icon={AlertTriangle} color="rose" />
          <KpiCard label="Repeat guest rate" value={`${kpi.reprate}%`} sub="returning guests" icon={Users} color="indigo" />
          <KpiCard label="Outstanding" value={`K${kpi.outstanding.toLocaleString()}`} sub="unpaid balances" icon={Gem} color="amber" />
          <KpiCard label="This month revenue" value={`K${kpi.monthrev.toLocaleString()}`} sub="month to date" icon={TrendingUp} color="green" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Suite Rack — {dashboard.total} keys</h3>
          <RackPreview rack={dashboard.rack} />
        </Card>

        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Bookings &amp; Revenue — last 6 months</h3>
          {trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="bookings" name="Bookings" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-faint italic py-8 text-center">No booking history yet.</p>
          )}
        </Card>
      </div>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Arrivals Today</h3>
        {arrivals && arrivals.length > 0 ? (
          <div className="divide-y divide-border">
            {arrivals.map((a) => (
              <div key={a.num} className="flex items-center gap-3 py-2.5">
                <span className={`shrink-0 w-8 h-8 rounded-full grid place-items-center text-xs font-bold ${ICON_STYLES[avatarColorFor(a.guest)]}`}>{initialsFor(a.guest)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text!">{a.guest || 'Guest'}</p>
                  <p className="text-xs text-text-faint">
                    {a.btype || '—'} · {a.rooms ? `Suite ${a.rooms}` : 'unassigned'}
                  </p>
                </div>
                <span className="text-xs text-text-muted">ETA {a.eta}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-faint italic py-4 text-center">No arrivals today.</p>
        )}
      </Card>
    </div>
  )
}
