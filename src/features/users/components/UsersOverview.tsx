import { useEffect, useMemo, useRef, useState, type ComponentType, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { UserRound, Plus, Filter, ChevronDown, Users, Crown, UserCheck, CalendarCheck, Search } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Avatar } from '../../../shared/components/Avatar'
import type { UserRow, UsersSummary } from '../users.queries'

const COLUMNS = ['Login', 'Name', 'Employee', 'Phone', 'Email', 'Gender', 'Designation', 'Last Login', 'Status', 'Type']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type FilterValue = 'All' | 'Enabled' | 'Disabled' | 'Admins' | 'SuperAdmins'
const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Enabled', label: 'Enabled' },
  { value: 'Disabled', label: 'Disabled' },
  { value: 'Admins', label: 'Admins' },
  { value: 'SuperAdmins', label: 'Super Admins' },
]

function matchesFilter(user: UserRow, filter: FilterValue) {
  switch (filter) {
    case 'All':
      return true
    case 'Enabled':
      return user.status === 'Enabled'
    case 'Disabled':
      return user.status === 'Disabled'
    case 'Admins':
      return user.isAdmin
    case 'SuperAdmins':
      return user.isSuperAdmin
  }
}

function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [active, onOutside, ref])
}

// Deterministic (hash of login, not random) so the same user always gets the
// same color across renders/reloads, cycling through a fixed palette rather
// than every avatar being the same flat teal.
const AVATAR_COLORS = ['bg-purple-500', 'bg-teal-500', 'bg-rose-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500']
function avatarColorFor(login: string) {
  let hash = 0
  for (let i = 0; i < login.length; i++) hash = (hash * 31 + login.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function matchesSearch(user: UserRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [user.login, user.name, user.email, user.designation].some((field) => field.toLowerCase().includes(q))
}

function StatCard({ label, value, caption, icon: Icon, color }: { label: string; value: string | number; caption: string; icon: ComponentType<{ size?: number }>; color: IconColor }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1 truncate">{value}</p>
        <p className="text-xs text-text-faint mt-0.5 truncate">{caption}</p>
      </div>
      <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={20} />
      </span>
    </Card>
  )
}

export function UsersOverview({ summary }: { summary: UsersSummary }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const [filterValue, setFilterValue] = useState<FilterValue>('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen)

  const filteredUsers = useMemo(
    () => summary.users.filter((u) => matchesSearch(u, search) && matchesFilter(u, filterValue)),
    [summary.users, search, filterValue],
  )
  const pageUsers = filteredUsers.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [filterValue])

  function getExportData() {
    const rows = filteredUsers.map((u) => [
      u.login,
      u.name,
      u.employee ? 'Yes' : 'No',
      u.phone,
      u.email,
      u.gender,
      u.designation,
      u.lastLogin,
      u.status,
      u.isSuperAdmin ? 'Super Admin' : u.isAdmin ? 'Admin' : 'Standard',
    ])
    return { headers: COLUMNS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-[4%] py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <UserRound size={20} className="text-brand" /> List Of Users
        </h2>
        <Link to={ROUTES.userCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New User
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={summary.totalUsers} caption="All user records" icon={Users} color="blue" />
          <StatCard label="Admins" value={summary.admins} caption="Admin users" icon={Crown} color="indigo" />
          <StatCard label="Super Admin" value={summary.superAdmins} caption="Top-level admins" icon={Crown} color="amber" />
          <StatCard label="Active Users" value={summary.activeUsers} caption="Enabled accounts" icon={UserCheck} color="green" />
          <StatCard label="Today Login Users" value={summary.todayLoginUsers} caption="Logged in today" icon={CalendarCheck} color="cyan" />
        </div>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="List Of Users" getExportData={getExportData} />
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={`relative flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
                  filterValue !== 'All' ? 'border-brand/40 bg-brand/10 text-brand' : 'border-input-border bg-input-bg text-text-muted hover:bg-surface-hover'
                }`}
              >
                <Filter size={14} /> Filter
                <ChevronDown size={14} className={filterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-40 max-h-60 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-lg dark:bg-gray-900">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFilterValue(opt.value)
                        setFilterOpen(false)
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm ${filterValue === opt.value ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
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
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      {search ? `No users match "${search}".` : 'No users match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  pageUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-surface-hover/60">
                      <td className="px-4 py-3">
                        <Link to={ROUTES.userDetail.replace(':id', String(u.id))} className="flex items-center gap-2">
                          <Avatar name={u.name || u.login} color={avatarColorFor(u.login)} size={28} className="text-xs" />
                          <span className="text-brand hover:underline">{u.login}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text!">{u.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${u.employee ? 'bg-info-bg text-info-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                          {u.employee ? 'Yes' : 'No'}
                        </span>
                      </td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.isSuperAdmin ? (
                            <span title="Super Admin" className="flex h-6 w-6 items-center justify-center rounded-md bg-warning-bg text-warning-fg">
                              <Crown size={13} />
                            </span>
                          ) : u.isAdmin ? (
                            <span title="Admin" className="flex h-6 w-6 items-center justify-center rounded-md bg-danger-bg text-danger-fg">
                              <Crown size={13} />
                            </span>
                          ) : (
                            <span title="Standard user">
                              <UserCheck size={14} className="text-text-faint" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredUsers.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
