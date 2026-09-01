import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Users, CalendarCheck, CalendarX, FileText, UserX, Coins, UserPlus, List, FileCheck2, UserCheck, ChevronDown, IdCard, PlusCircle, Tag, BarChart3, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useMembersDashboard } from '../members.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const STATUS_COLORS = { outOfDate: '#bc9526', upToDate: '#25a580', resiliated: '#d9534f', draft: '#cbd3d3' }

function KpiCard({ icon: Icon, value, label, color }: { icon: typeof Users; value: string | number; label: string; color: string }) {
  return (
    <Card className="!h-auto flex items-center gap-3">
      <span className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: color }}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xl font-bold text-text!">{value}</p>
        <p className="text-xs text-text-faint">{label}</p>
      </div>
    </Card>
  )
}

function QuickLinkTile({ icon: Icon, label, to }: { icon: typeof Users; label: string; to: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-1.5 w-[104px] h-[88px] rounded-lg bg-surface-hover text-text-muted text-center hover:bg-brand/10 hover:text-brand transition-colors">
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

// Real via adherents/ajax/ajax_adherents_list.php — see
// members.queries.ts's useMembersDashboard for the full evidence trail and
// exactly which parts are real vs. honestly left as "no API" (subscription
// amounts/dates have no JSON source anywhere in this module). This module
// has 0 real members on this instance today, so every real number below is
// legitimately 0 — matching the real adherents/index.php page's own
// current state, not a placeholder artifact.
export function MembersDashboard() {
  const { data, isLoading, isError, error, refetch } = useMembersDashboard()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Users size={20} className="text-brand" /> Members Area
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading members…" />}
      {isError && <LegacyErrorCard title="Couldn't load members" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={Users} value={data.total} label="Total" color="#397db9" />
            <KpiCard icon={CalendarCheck} value={data.upToDate} label="Up to date" color="#25a580" />
            <KpiCard icon={CalendarX} value={data.outOfDate} label="Out of date" color="#bc9526" />
            <KpiCard icon={FileText} value={data.draft} label="To validate" color="#8a94a6" />
            <KpiCard icon={UserX} value={data.resiliated} label="Resiliated" color="#d9534f" />
            <KpiCard icon={Coins} value="—" label="Subscriptions" color="#88b337" />
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
                        { name: 'Out of date', value: data.outOfDate },
                        { name: 'Up to date', value: data.upToDate },
                        { name: 'Resiliated', value: data.resiliated },
                        { name: 'To validate', value: data.draft },
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
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Subscriptions / Year — Total amount</h3>
              </div>
              <NoApiNote>No real API returns subscription amounts/dates on this instance — llx_subscription data isn't exposed by any JSON endpoint this app can reach.</NoApiNote>
            </Card>

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Members types</h3>
              </div>
              <div className="p-3" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={24} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="draft" stackId="a" fill={STATUS_COLORS.draft} name="To validate" />
                    <Bar dataKey="outOfDate" stackId="a" fill={STATUS_COLORS.outOfDate} name="Out of date" />
                    <Bar dataKey="upToDate" stackId="a" fill={STATUS_COLORS.upToDate} name="Up to date" />
                    <Bar dataKey="resiliated" stackId="a" fill={STATUS_COLORS.resiliated} name="Resiliated" />
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
                <QuickLinkTile icon={FileCheck2} label="Statistics" to={ROUTES.memberStatistics} />
                <QuickLinkTile icon={IdCard} label="Members business cards" to={ROUTES.memberList} />
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
                    <th className="font-medium px-3 py-2 text-right">To validate</th>
                    <th className="font-medium px-3 py-2 text-right">Out-of-date</th>
                    <th className="font-medium px-3 py-2 text-right">Up-to-date</th>
                    <th className="font-medium px-3 py-2 text-right">Resiliated</th>
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

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Subscriptions / Year</h3>
              </div>
              <NoApiNote>No real API for subscription-by-year totals — llx_subscription has no JSON endpoint on this instance.</NoApiNote>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text!">Last modified subscriptions</h3>
              </div>
              <NoApiNote>No real API for subscription records — llx_subscription has no JSON endpoint on this instance.</NoApiNote>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
