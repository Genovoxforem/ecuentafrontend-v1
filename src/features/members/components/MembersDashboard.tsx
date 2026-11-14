import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Users, CalendarCheck, CalendarX, FileText, UserX, Coins, UserPlus, List, FileCheck2, UserCheck, ChevronDown, IdCard, PlusCircle, Tag, BarChart3, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useMembersDashboard } from '../members.queries'
import { MEMBER_PAGES, useMemberTables, type MemberTable } from '../membersClassic.data'
import { MemberClassicTable } from './MemberClassicTable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const STATUS_COLORS = { outOfDate: '#bc9526', upToDate: '#25a580', resiliated: '#d9534f', draft: '#cbd3d3' }

function KpiCard({ icon: Icon, value, label, color }: { icon: typeof Users; value: string | number; label: string; color: string }) {
  return (
    // members-kpi-card keeps the card's own colour on its icon tile (the Members area of the classic page gives each card one: blue, green, amber,
    // grey, red, olive); the app-wide headline-card style (index.css, .blue-stat-card) would paint every tile the same blue.
    <Card className="members-kpi-card !h-auto flex items-center gap-3">
      <span className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ ['--kpi' as string]: color, background: color }}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xl leading-tight font-bold text-text!">{value}</p>
        <p className="text-xs text-text-faint">{label}</p>
      </div>
    </Card>
  )
}

function QuickLinkTile({ icon: Icon, label, to }: { icon: typeof Users; label: string; to: string }) {
  return (
    <Link to={to} className="flex h-[88px] w-[84px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg bg-surface-hover text-text-muted text-center hover:bg-brand/10 hover:text-brand transition-colors">
      <Icon size={18} />
      <span className="text-[11px] leading-tight px-1">{label}</span>
    </Link>
  )
}

function NoApiNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3">
      <Info size={14} className="text-info-fg mt-0.5 shrink-0" />
      <p className="text-xs text-info-fg">{children}</p>
    </div>
  )
}

// The counts come from the members list (adherents/fapi/list.php, see members.queries.ts's useMembersDashboard). The classic Members area
// (adherents/index.php) also prints the subscriptions per year, the last modified members and the last subscriptions; the backend has no JSON
// for them, so those three tables are read from the classic page (membersClassic.data.ts) and the cards keep the "no API" note when that page
// cannot be read (no classic session).
const tableStarting = (tables: MemberTable[] | undefined, head: string) => tables?.find((t) => t.headers[0] === head)

export function MembersDashboard() {
  const { data, isLoading, isError, error, refetch } = useMembersDashboard()
  const area = useMemberTables(MEMBER_PAGES.area)
  const perYear = tableStarting(area.data, 'Year')
  const lastMembers = tableStarting(area.data, 'Member')
  const lastSubscriptions = tableStarting(area.data, 'Subscription')
  const amountColumn = perYear?.headers.findIndex((h) => /^total amount$/i.test(h)) ?? -1
  const subscriptionsTotal = amountColumn > 0 ? perYear?.rows.find((r) => r[0] === 'Total')?.[amountColumn] : undefined

  return (
    <div className="space-y-4">
      {isLoading && <LegacyLoadingCard label="Loading members…" />}
      {isError && <LegacyErrorCard title="Couldn't load members" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={Users} value={data.total} label="Total" color="#397db9" />
            <KpiCard icon={CalendarCheck} value={data.upToDate} label="Up-to-date" color="#25a580" />
            <KpiCard icon={CalendarX} value={data.outOfDate} label="Out-of-date" color="#bc9526" />
            <KpiCard icon={FileText} value={data.draft} label="Draft members" color="#8a94a6" />
            <KpiCard icon={UserX} value={data.resiliated} label="Terminated members" color="#d9534f" />
            <KpiCard icon={Coins} value={subscriptionsTotal ?? '—'} label="Subscriptions" color="#88b337" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Statistics</h3>
              </div>
              <div className="p-3" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Out-of-date', value: data.outOfDate },
                        { name: 'Up-to-date', value: data.upToDate },
                        { name: 'Terminated members', value: data.resiliated },
                        { name: 'Draft members', value: data.draft },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      <Cell fill={STATUS_COLORS.outOfDate} />
                      <Cell fill={STATUS_COLORS.upToDate} />
                      <Cell fill={STATUS_COLORS.resiliated} />
                      <Cell fill={STATUS_COLORS.draft} />
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11.55 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Subscriptions / Year — Total amount</h3>
              </div>
              {perYear ? (
                <MemberClassicTable table={perYear} title="" />
              ) : (
                <NoApiNote>The subscription figures are read from the classic Members area page, which could not be read{area.error instanceof Error ? `: ${area.error.message}` : ''}.</NoApiNote>
              )}
            </Card>

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Members types</h3>
              </div>
              <div className="p-3" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="type" tick={{ fontSize: 10.5 }} />
                    <YAxis tick={{ fontSize: 10.5 }} width={24} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="draft" stackId="a" fill={STATUS_COLORS.draft} name="Draft members" />
                    <Bar dataKey="outOfDate" stackId="a" fill={STATUS_COLORS.outOfDate} name="Out-of-date" />
                    <Bar dataKey="upToDate" stackId="a" fill={STATUS_COLORS.upToDate} name="Up-to-date" />
                    <Bar dataKey="resiliated" stackId="a" fill={STATUS_COLORS.resiliated} name="Terminated members" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <h3 className="text-sm font-semibold text-text-faint uppercase tracking-wide flex items-center gap-1.5">
            <ChevronDown size={14} /> Quick links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="text-sm font-semibold text-text!">Members</h4>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                <QuickLinkTile icon={UserPlus} label="New member" to={ROUTES.memberNew} />
                <QuickLinkTile icon={List} label="List" to={ROUTES.memberList} />
                <QuickLinkTile icon={FileText} label="Draft members" to={ROUTES.memberListDraft} />
                <QuickLinkTile icon={UserCheck} label="Validated members" to={ROUTES.memberListValidated} />
                <QuickLinkTile icon={CalendarCheck} label="Up-to-date" to={ROUTES.memberListUpToDate} />
                <QuickLinkTile icon={CalendarX} label="Out-of-date" to={ROUTES.memberListOutOfDate} />
                <QuickLinkTile icon={UserX} label="Terminated members" to={ROUTES.memberListTerminated} />
                <QuickLinkTile icon={FileCheck2} label="Statistics" to={ROUTES.memberStatistics} />
                <QuickLinkTile icon={IdCard} label="Members business cards" to={ROUTES.memberCards} />
              </div>
            </Card>
            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="text-sm font-semibold text-text!">Subscriptions</h4>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                <QuickLinkTile icon={PlusCircle} label="New subscription" to={ROUTES.memberSubscriptions} />
                <QuickLinkTile icon={List} label="List" to={ROUTES.memberSubscriptions} />
                <QuickLinkTile icon={BarChart3} label="Statistics" to={ROUTES.memberStatistics} />
              </div>
            </Card>
            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="text-sm font-semibold text-text!">Tags/Categories</h4>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                <QuickLinkTile icon={Tag} label="New Category" to={ROUTES.memberList} />
              </div>
            </Card>
            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="text-sm font-semibold text-text!">Members types</h4>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                <QuickLinkTile icon={PlusCircle} label="New" to={ROUTES.memberTypes} />
                <QuickLinkTile icon={List} label="List" to={ROUTES.memberTypes} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Members types</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-3 py-2">Members Types</th>
                    <th className="font-medium px-3 py-2 text-right">Draft Members</th>
                    <th className="font-medium px-3 py-2 text-right">Out-Of-Date</th>
                    <th className="font-medium px-3 py-2 text-right">Up-To-Date</th>
                    <th className="font-medium px-3 py-2 text-right">Terminated Members</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byType.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-text-faint italic">
                        No member types with members on this instance yet.
                      </td>
                    </tr>
                  ) : (
                    data.byType.map((t) => (
                      <tr key={t.type} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">{t.type}</td>
                        <td className="px-3 py-2 text-right text-text-muted">{t.draft}</td>
                        <td className="px-3 py-2 text-right text-text-muted">{t.outOfDate}</td>
                        <td className="px-3 py-2 text-right text-text-muted">{t.upToDate}</td>
                        <td className="px-3 py-2 text-right text-text-muted">{t.resiliated}</td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-surface font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{data.draft}</td>
                    <td className="px-3 py-2 text-right">{data.outOfDate}</td>
                    <td className="px-3 py-2 text-right">{data.upToDate}</td>
                    <td className="px-3 py-2 text-right">{data.resiliated}</td>
                  </tr>
                </tbody>
              </table>
            </Card>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lastMembers && <MemberClassicTable table={lastMembers} title="Latest 3 modified members" />}
            {!lastMembers && (
            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text!">Recent members</h3>
                <UserCheck size={14} className="text-text-faint" />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-3 py-2">Member</th>
                    <th className="font-medium px-3 py-2">Type</th>
                    <th className="font-medium px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMembers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-text-faint italic">
                        None
                      </td>
                    </tr>
                  ) : (
                    data.recentMembers.map((m, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">
                          {m.firstname} {m.lastname}
                        </td>
                        <td className="px-3 py-2 text-text-muted">{m.type}</td>
                        <td className="px-3 py-2 text-right text-text-muted">{m.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {data.recentMembers.length > 0 && (
                <p className="px-3 py-2 text-[11px] text-text-faint italic border-t border-border">
                  Real member rows, but not sorted by modification date — that column isn't exposed by the real API.
                </p>
              )}
            </Card>
            )}

            {lastSubscriptions ? (
              <MemberClassicTable table={lastSubscriptions} title="Latest 3 modified subscriptions" />
            ) : (
              <Card className="!h-auto !p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-text!">Latest 3 modified subscriptions</h3>
                </div>
                <NoApiNote>The subscriptions are read from the classic Members area page, which could not be read{area.error instanceof Error ? `: ${area.error.message}` : ''}.</NoApiNote>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
