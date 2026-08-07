import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { UserRound, Plus, Filter, Users, ShieldCheck, Crown, UserCheck, CalendarCheck, Search } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import type { UsersSummary } from '../users.queries'

const COLUMNS = ['Login', 'Name', 'Employee', 'Phone', 'Email', 'Gender', 'Designation', 'Last Login', 'Status', 'Type']
const PER_PAGE = 15

function StatCard({ label, value, caption, icon: Icon, color }: { label: string; value: string | number; caption: string; icon: ComponentType<{ size?: number }>; color: IconColor }) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-text! mt-1 truncate">{value}</p>
        <p className="text-xs text-text-faint mt-1 truncate">{caption}</p>
      </div>
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
    </Card>
  )
}

// Admins breaks its POS/KOT sub-counts onto their own line instead of one
// long "N | POS: N | KOT: N" string — that string overflowed StatCard's
// text-2xl value line on anything narrower than a full desktop column.
function AdminsStatCard({ admins, adminsPos, adminsKot }: { admins: number; adminsPos: number; adminsKot: number }) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Admins</p>
        <p className="text-2xl font-bold text-text! mt-1">{admins}</p>
        <p className="text-xs text-text-faint mt-1 truncate">
          Admin users · POS {adminsPos} · KOT {adminsKot}
        </p>
      </div>
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.indigo}`}>
        <ShieldCheck size={18} />
      </span>
    </Card>
  )
}

export function UsersOverview({ summary }: { summary: UsersSummary }) {
  const [page, setPage] = useState(1)
  const pageUsers = summary.users.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UserRound size={20} className="text-brand" /> List Of Users
        </h2>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.userCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New User
          </Link>
          <button type="button" disabled title="Not built yet" className="p-2 rounded-lg border border-border text-text-faint cursor-default">
            <Filter size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={summary.totalUsers} caption="All user records" icon={Users} color="blue" />
        <AdminsStatCard admins={summary.admins} adminsPos={summary.adminsPos} adminsKot={summary.adminsKot} />
        <StatCard label="Super Admin" value={summary.superAdmins} caption="Top-level admins" icon={Crown} color="amber" />
        <StatCard label="Active Users" value={summary.activeUsers} caption="Enabled accounts" icon={UserCheck} color="green" />
        <StatCard label="Today Login Users" value={summary.todayLoginUsers} caption="Logged in today" icon={CalendarCheck} color="cyan" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <select disabled defaultValue="15" className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
            <option value="15">15</option>
          </select>
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input disabled type="text" placeholder="Search" className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5" />
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.users.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No users found.
                  </td>
                </tr>
              ) : (
                pageUsers.map((u) => (
                  <tr key={u.login} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{u.login}</td>
                    <td className="px-4 py-3 text-text!">{u.name}</td>
                    <td className="px-4 py-3 text-text-muted">{u.employee ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-text-muted">{u.phone}</td>
                    <td className="px-4 py-3 text-text-muted">{u.email}</td>
                    <td className="px-4 py-3 text-text-muted">{u.gender}</td>
                    <td className="px-4 py-3 text-text-muted">{u.designation}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{u.lastLogin}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${u.status === 'Enabled' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{u.isAdmin && <Crown size={14} className="text-danger" />}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={page} perPage={PER_PAGE} total={summary.users.length} onPageChange={setPage} />
    </div>
  )
}
