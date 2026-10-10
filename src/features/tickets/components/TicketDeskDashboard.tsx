import { Link } from 'react-router-dom'
import { Headset, Inbox, CalendarDays, UserCheck, PenLine, Plus, List, BarChart3, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useTicketStats, useTicketsList } from '../tickets.queries'

const EMPTY_FILTERS = { status: '', mine: false }

export function TicketDeskDashboard() {
  const { data: stats, isLoading, isError, error, refetch } = useTicketStats()
  const recent = useTicketsList(EMPTY_FILTERS, 0, 8)

  const tiles = stats
    ? [
        { label: 'Total tickets', value: stats.total, sub: `${stats.today} created today`, icon: Inbox, to: ROUTES.ticketList },
        { label: 'Assigned to me', value: stats.assignedToMe, sub: `${stats.assignedToMeToday} today`, icon: UserCheck, to: ROUTES.ticketMyAssigned },
        { label: 'Created by me', value: stats.createdByMe, sub: `${stats.createdByMeToday} today`, icon: PenLine, to: ROUTES.ticketList },
        { label: 'Created today', value: stats.today, sub: 'All users', icon: CalendarDays, to: ROUTES.ticketList },
      ]
    : []

  const actions = [
    { label: 'New ticket', icon: Plus, to: ROUTES.ticketNew },
    { label: 'All tickets', icon: List, to: ROUTES.ticketList },
    { label: 'My assigned', icon: UserCheck, to: ROUTES.ticketMyAssigned },
    { label: 'Statistics', icon: BarChart3, to: ROUTES.ticketStatistics },
  ]

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Headset size={20} className="text-brand" /> Ticket Desk
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading ticket desk…" />}
      {isError && <LegacyErrorCard title="Couldn't load ticket desk" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.label} to={t.to} className="block">
                <Card className="!h-auto !flex-row items-center justify-between transition-colors hover:border-brand">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t.label}</p>
                    <p className="text-xl font-bold text-text!">{t.value}</p>
                    <p className="text-xs text-text-faint">{t.sub}</p>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                    <t.icon size={20} />
                  </span>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="!h-auto xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-text!">Recent tickets</p>
                <Link to={ROUTES.ticketList} className="text-sm font-medium text-brand hover:underline">
                  View all
                </Link>
              </div>
              {recent.isLoading ? (
                <p className="py-6 text-center text-sm text-text-faint">Loading…</p>
              ) : !recent.data || recent.data.rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-faint">No tickets yet.</p>
              ) : (
                <div className="max-h-[22rem] divide-y divide-border overflow-y-auto soft-scrollbar">
                  {recent.data.rows.map((t) => (
                    <Link key={t.id} to={ROUTES.ticketDetail.replace(':id', String(t.id))} className="flex items-center gap-3 py-2.5 hover:bg-surface-alt">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text!">{t.subject || t.ref}</p>
                        <p className="truncate text-xs text-text-faint">
                          {t.ref} · {t.author} · {t.dateCreate}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-muted">{t.status}</span>
                      <ChevronRight size={16} className="shrink-0 text-text-faint" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="!h-auto">
                <p className="mb-3 font-semibold text-text!">By status</p>
                <div className="max-h-56 space-y-2 overflow-y-auto soft-scrollbar">
                  {stats.byStatus
                    .filter((s) => s.code !== 'all')
                    .map((s) => (
                      <div key={s.code} className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="flex-1 text-sm text-text!">{s.label}</span>
                        <span className="text-sm font-semibold text-text-muted">{s.count}</span>
                      </div>
                    ))}
                </div>
              </Card>
              <Card className="!h-auto">
                <p className="mb-3 font-semibold text-text!">Quick actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {actions.map((a) => (
                    <Link key={a.label} to={a.to} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text! hover:border-brand hover:bg-surface-alt">
                      <a.icon size={15} className="text-brand" /> {a.label}
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
