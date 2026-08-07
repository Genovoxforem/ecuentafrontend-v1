import { useState } from 'react'
import { CalendarDays, FileText, ShoppingCart, FileSignature, Layers, Inbox, type LucideIcon } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useRecentActivity } from '../agenda.queries'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'orders', label: 'Orders' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'other', label: 'Other' },
]

const CATEGORY_ICON: Record<string, LucideIcon> = { invoices: FileText, orders: ShoppingCart, contracts: FileSignature, other: Layers }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Same source as the Navbar bell's NotificationsPanel — a local activity
// log other features' create actions append to (see agenda.queries.ts),
// since this app's backend has no agenda/activity endpoint (llx_actioncomm
// equivalent). This page just gives that same real log a full, filterable
// view instead of the compact dropdown one, rather than a second,
// different data source.
export function AgendaOverview() {
  const [filter, setFilter] = useState('all')
  const { data: events } = useRecentActivity({ category: filter, limit: 100 })

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CalendarDays size={20} className="text-brand" /> Agenda / Events
      </h2>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
              filter === f.key ? 'bg-brand/10 text-brand border-brand' : 'text-text-muted border-border hover:bg-surface-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-faint">
              <Inbox size={32} />
              <p className="text-sm">No events yet — creating a quotation, contract, order, or invoice payment will show up here.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5">Date</th>
                  <th className="font-medium px-4 py-2.5">Category</th>
                  <th className="font-medium px-4 py-2.5">Description</th>
                  <th className="font-medium px-4 py-2.5">Author</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const Icon = CATEGORY_ICON[ev.category] ?? Layers
                  return (
                    <tr key={ev.id} className="border-b border-border">
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDateTime(ev.date)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-text-muted capitalize">
                          <Icon size={13} /> {ev.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text!">{ev.label}</td>
                      <td className="px-4 py-3 text-text-muted">{ev.authorName}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
