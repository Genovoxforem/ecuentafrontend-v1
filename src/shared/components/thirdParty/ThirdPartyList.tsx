import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, CalendarRange } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../dashboard/DashboardKit'
import { ListPagination } from '../ListPagination'
import { formatMoney } from '../../../utils/format'

const COLUMNS = ['Third-Party Name', 'Country', 'Outstanding Balance', 'Tpin', 'Sales Representatives', 'Email & Phone', 'Nature Of Third Party', 'Tracking Id', 'Creation Date', 'Status']
const PER_PAGE = 15

export interface ThirdPartyRow {
  name: string
  country: string
  outstandingBalance: number
  tpin: string
  salesRep: string
  email: string
  phone: string
  nature: string
  trackingId: string
  creationDate: string
  status: 'Active' | 'Inactive'
}

export interface ThirdPartyStatSpec {
  label: string
  value: string | number
  caption: string
  icon: ComponentType<{ size?: number }>
  color: IconColor
}

function StatCard({ stat }: { stat: ThirdPartyStatSpec }) {
  const Icon = stat.icon
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{stat.label}</p>
        <p className="text-2xl font-bold text-text! mt-1">{stat.value}</p>
        <p className="text-xs text-text-faint mt-1">{stat.caption}</p>
      </div>
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES[stat.color]}`}>
        <Icon size={18} />
      </span>
    </Card>
  )
}

export function ThirdPartyList({
  icon: HeaderIcon,
  title,
  newPath,
  newLabel,
  stats,
  rows,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  newPath: string
  newLabel: string
  stats: ThirdPartyStatSpec[]
  rows: ThirdPartyRow[]
}) {
  const [page, setPage] = useState(1)
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HeaderIcon size={20} className="text-brand" /> {title}
        </h2>
        <Link to={newPath} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> {newLabel}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
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
          <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-muted cursor-default ml-auto">
            <CalendarRange size={14} /> Select Date Range
          </button>
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
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.name} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{r.name}</td>
                    <td className="px-4 py-3 text-text-muted">{r.country}</td>
                    <td className="px-4 py-3 text-text! tabular-nums">{formatMoney(r.outstandingBalance)} ZMW</td>
                    <td className="px-4 py-3 text-text-muted">{r.tpin}</td>
                    <td className="px-4 py-3 text-text-muted">{r.salesRep}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {r.email}
                      <br />
                      {r.phone}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{r.nature}</td>
                    <td className="px-4 py-3 text-text-muted">{r.trackingId}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.creationDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.status === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={page} perPage={PER_PAGE} total={rows.length} onPageChange={setPage} />
    </div>
  )
}
