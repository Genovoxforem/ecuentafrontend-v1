import { useState } from 'react'
import { X, Bell, MessageCircle, FileText, ShoppingCart, FileSignature, Layers, type LucideIcon } from 'lucide-react'
import { useRecentActivity } from '../../../../features/agenda/agenda.queries'

const FILTERS = [
  { key: 'all', label: 'View All' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'orders', label: 'Orders' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'other', label: 'Other' },
]

const CATEGORY_ICON: Record<string, LucideIcon> = { invoices: FileText, orders: ShoppingCart, contracts: FileSignature, other: Layers }

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

// Ports the legacy Navbar bell icon's Notifications/Chat panel.
// Notifications reads from useRecentActivity (see agenda.queries.ts) — a
// local activity log other features' create actions append to, since this
// app's backend has no agenda/activity endpoint. Starts empty and fills in
// as real actions happen in this session. Chat has no backing feature in
// this app at all, so it stays an honest empty state rather than fake
// conversation data.
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'notifications' | 'chat'>('notifications')
  const [filter, setFilter] = useState('all')
  const { data, isLoading } = useRecentActivity({ category: filter, limit: 30 })

  return (
    <div className="absolute right-0 mt-1 w-[min(90vw,24rem)] max-h-[calc(100vh-4rem)] flex flex-col bg-surface border border-border rounded-lg shadow-xl z-30">
      <div className="flex items-center gap-2 p-2 border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => setTab('notifications')}
          className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-sm font-medium ${
            tab === 'notifications' ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-alt'
          }`}
        >
          <Bell size={14} />
          Notifications
        </button>
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-sm font-medium ${
            tab === 'chat' ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-alt'
          }`}
        >
          <MessageCircle size={14} />
          Chat
        </button>
        <button type="button" onClick={onClose} title="Close" className="p-1.5 rounded-md text-text-faint hover:bg-surface-alt">
          <X size={16} />
        </button>
      </div>

      {tab === 'notifications' ? (
        <>
          <div className="flex items-center gap-1 px-2 pt-2 pb-1 overflow-x-auto shrink-0">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  filter === f.key ? 'bg-brand/10 text-brand border-brand' : 'text-text-muted border-border hover:bg-surface-alt'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto soft-scrollbar py-1">
            {isLoading && <p className="text-xs text-text-faint text-center py-6">Loading…</p>}
            {!isLoading && data.length === 0 && <p className="text-xs text-text-faint text-center py-6">No notifications.</p>}
            {data.map((ev) => {
              const Icon = CATEGORY_ICON[ev.category] ?? Layers
              return (
                <div key={ev.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-surface-alt">
                  <span className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-text truncate">{ev.label}</div>
                    <div className="text-xs text-text-faint">
                      {ev.authorName} · {timeAgo(ev.date)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center py-10">
          <p className="text-xs text-text-faint text-center max-w-[220px]">No chat feature is wired up in this install yet.</p>
        </div>
      )}
    </div>
  )
}
