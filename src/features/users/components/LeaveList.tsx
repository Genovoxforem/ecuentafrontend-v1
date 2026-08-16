import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CalendarCheck2, CalendarX2, Plus, Search, Users } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatDate } from '../../../utils/format'
import { useLeaveSummary, type LeaveRequest } from '../leave.queries'

const COLUMNS = ['Ref', 'Employee', 'Validator', 'Type', 'Duration', 'Start Date', 'End Date', 'Create Date', 'Update Date', 'Status']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function StatTile({ label, value, caption, icon: Icon, color }: { label: string; value: number; caption: string; icon: typeof Users; color: IconColor }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
        <p className="text-xs text-text-faint mt-0.5">{caption}</p>
      </div>
      <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={20} />
      </span>
    </Card>
  )
}

function statusBadge(status: LeaveRequest['status']) {
  const styles: Record<LeaveRequest['status'], string> = {
    Draft: 'bg-neutral-bg text-neutral-fg',
    Validated: 'bg-info-bg text-info-fg',
    Approved: 'bg-success-bg text-success-fg',
    Cancelled: 'bg-danger-bg text-danger-fg',
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>{status}</span>
}

function matchesSearch(row: LeaveRequest, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.ref, row.employeeName, row.validatorName, row.typeLabel, row.status].some((f) => f.toLowerCase().includes(q))
}

export function LeaveList() {
  const summary = useLeaveSummary()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [to, setTo] = useState(`${new Date().getFullYear()}-12-31`)

  const filtered = useMemo(() => {
    return summary.requests.filter((r) => matchesSearch(r, search) && r.startDate >= from && r.startDate <= to)
  }, [summary.requests, search, from, to])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <CalendarDays size={20} className="text-brand" /> Holiday Management
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-input-border bg-input-bg px-2 py-1.5 text-xs text-text-muted">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent outline-none" />
            <span>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent outline-none" />
          </div>
          <Link to={ROUTES.leaveRequest} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Leave Request
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatTile label="Employees" value={summary.employeesWithRecords} caption="With leave records" icon={Users} color="blue" />
        <StatTile label="Leave Records" value={summary.totalRequests} caption="Total requests" icon={CalendarDays} color="cyan" />
        <StatTile label="This Month" value={summary.thisMonth} caption="Leave requests" icon={CalendarDays} color="violet" />
        <StatTile label="Approved" value={summary.approved} caption="Approved leave" icon={CalendarCheck2} color="green" />
        <StatTile label="Cancelled" value={summary.cancelled} caption="Cancelled/Refused" icon={CalendarX2} color="rose" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search"
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.ref} className="border-b border-border hover:bg-surface-hover/60">
                    <td className="px-4 py-3 text-brand">{r.ref}</td>
                    <td className="px-4 py-3 text-text!">{r.employeeName}</td>
                    <td className="px-4 py-3 text-text-muted">{r.validatorName}</td>
                    <td className="px-4 py-3 text-text-muted">{r.typeLabel}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.days} day(s)</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(r.startDate)}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(r.endDate)}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(r.createDate)}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(r.updateDate)}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-text-faint border-t border-border">
          Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length} entries
        </p>
      </Card>
      <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} />
    </div>
  )
}
