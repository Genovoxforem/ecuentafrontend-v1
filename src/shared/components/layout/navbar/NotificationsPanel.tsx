import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  ClipboardCheck,
  FileText,
  MessageCircle,
  MoreVertical,
  Package,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Ticket,
  X,
} from 'lucide-react'
import {
  NOTIFICATION_FILTERS,
  useChatCount,
  useChatList,
  useDismissNotification,
  useNotificationCount,
  useNotifications,
} from '../../../../features/notifications/notifications.queries'
import { resolveLegacyRoute } from '../../../legacyRoute'

const NOTIFICATION_STYLES: Record<string, { icon: typeof Bell; iconClass: string; badgeClass: string }> = {
  '1': { icon: ClipboardCheck, iconClass: 'bg-violet-500/15 text-violet-400', badgeClass: 'bg-violet-500/15 text-violet-300' },
  '2': { icon: FileText, iconClass: 'bg-sky-500/15 text-sky-400', badgeClass: 'bg-sky-500/15 text-sky-300' },
  '3': { icon: ShoppingCart, iconClass: 'bg-emerald-500/15 text-emerald-400', badgeClass: 'bg-emerald-500/15 text-emerald-300' },
  '4': { icon: FileText, iconClass: 'bg-blue-500/15 text-blue-400', badgeClass: 'bg-blue-500/15 text-blue-300' },
  '5': { icon: Package, iconClass: 'bg-amber-500/15 text-amber-400', badgeClass: 'bg-amber-500/15 text-amber-300' },
}
const DEFAULT_NOTIFICATION_STYLE = { icon: Bell, iconClass: 'bg-slate-500/15 text-slate-300', badgeClass: 'bg-slate-500/15 text-slate-300' }

function CountBadge({ count, active = false }: { count: number; active?: boolean }) {
  if (count <= 0) return null
  return (
    <span className={`ml-1 min-w-[17px] rounded-full px-1 text-center text-[10px] leading-[17px] ${active ? 'bg-danger text-white' : 'bg-danger/15 text-danger'}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NotificationsTab() {
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data, isLoading, isError, error, refetch } = useNotifications(type)
  const { data: allNotifications = [] } = useNotifications('')
  const dismiss = useDismissNotification()
  const counts = useMemo(
    () => allNotifications.reduce<Record<string, number>>((result, item) => {
      result[item.type] = (result[item.type] ?? 0) + 1
      return result
    }, {}),
    [allNotifications],
  )
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (data ?? []).filter((item) =>
      (!unreadOnly || item.unread) && (!query || item.text.toLowerCase().includes(query)),
    )
  }, [data, search, unreadOnly])

  return (
    <>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-2">
        {NOTIFICATION_FILTERS.map((filter) => {
          const selected = type === filter.type
          const count = filter.type ? counts[filter.type] ?? 0 : allNotifications.length
          return (
            <button
              key={filter.type}
              type="button"
              onClick={() => setType(filter.type)}
              aria-pressed={selected}
              className={`flex h-8 shrink-0 items-center rounded-md border px-2.5 text-xs font-medium transition-colors ${
                selected ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:bg-surface-alt'
              }`}
            >
              {filter.type === '' && <Bell size={12} className="mr-1" />}
              {filter.label}
              <CountBadge count={count} active={selected} />
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-text-faint focus-within:border-brand">
          <Search size={15} className="shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notifications..."
            aria-label="Search notifications"
            className="min-w-0 flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-faint"
          />
        </label>
        <label className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs text-text-muted">
          <SlidersHorizontal size={13} />
          <select
            value={unreadOnly ? 'unread' : 'all'}
            onChange={(event) => setUnreadOnly(event.target.value === 'unread')}
            aria-label="Filter by read status"
            className="max-w-[82px] bg-transparent outline-none"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto soft-scrollbar space-y-1.5 p-2">
        {isLoading && <p className="py-8 text-center text-xs text-text-faint">Loading notifications…</p>}
        {isError && (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Could not load notifications.'}</p>
            <button type="button" onClick={() => void refetch()} className="mt-2 text-xs font-medium text-brand hover:underline">Try again</button>
          </div>
        )}
        {dismiss.isError && <p role="alert" className="px-2 py-1 text-xs text-danger">Could not dismiss that notification.</p>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="py-10 text-center">
            <Bell size={22} className="mx-auto mb-2 text-text-faint" />
            <p className="text-sm font-semibold text-text">{search || unreadOnly ? 'No matching notifications' : 'No notifications'}</p>
            <p className="mt-1 text-xs text-text-faint">{search || unreadOnly ? 'Try changing your search or filter.' : "You're all caught up."}</p>
          </div>
        )}
        {filtered.map((notification) => {
          const style = NOTIFICATION_STYLES[notification.type] ?? DEFAULT_NOTIFICATION_STYLE
          const Icon = style.icon
          const destination = resolveLegacyRoute(notification.href)
          const label = NOTIFICATION_FILTERS.find((filter) => filter.type === notification.type)?.label ?? 'Other'
          return (
            <article
              key={`${notification.type}-${notification.id}`}
              className={`group flex min-w-0 items-center gap-3 rounded-lg border px-2.5 py-2.5 transition-colors ${
                notification.unread ? 'border-brand/35 bg-brand/[0.06]' : 'border-border/70 bg-surface/50 hover:bg-surface-alt'
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.iconClass}`}>
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                {destination ? (
                  <Link to={destination} className="block truncate text-xs font-semibold text-text hover:text-brand hover:underline" title={notification.text}>
                    {notification.text}
                  </Link>
                ) : (
                  <p className="truncate text-xs font-semibold text-text" title={notification.text}>{notification.text}</p>
                )}
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badgeClass}`}>{label}</span>
              </div>
              {notification.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
              <button
                type="button"
                title="Dismiss notification"
                aria-label={`Dismiss: ${notification.text}`}
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate({ id: notification.id, type: notification.type })}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-text-faint opacity-70 hover:bg-surface-hover hover:text-text disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreVertical size={16} />
              </button>
            </article>
          )
        })}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-3 py-2">
        <span className="text-[11px] text-text-faint">Showing {filtered.length} of {data?.length ?? 0} notifications</span>
        <button
          type="button"
          onClick={() => {
            setType('')
            setSearch('')
            setUnreadOnly(false)
          }}
          className="text-xs font-semibold text-brand hover:underline"
        >
          View all notifications →
        </button>
      </footer>
    </>
  )
}

function ChatTab() {
  const { data, isLoading, isError, error, refetch } = useChatList()
  return (
    <div className="min-h-0 flex-1 overflow-y-auto soft-scrollbar py-1">
      {isLoading && <p className="py-6 text-center text-xs text-text-faint">Loading…</p>}
      {isError && (
        <div className="px-3 py-6 text-center">
          <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Could not load chats.'}</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 text-xs font-medium text-brand hover:underline">Try again</button>
        </div>
      )}
      {data && data.length === 0 && <p className="py-8 text-center text-sm text-text-faint">No ticket conversations yet.</p>}
      {data?.map((customer) => (
        <div key={customer.customerId} className="border-b border-border last:border-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-text">
            <span className="truncate">{customer.name}</span>
            {customer.unreadCount > 0 && <CountBadge count={customer.unreadCount} />}
          </div>
          {customer.tickets.map((ticket) => (
            <div key={ticket.trackId} className="flex items-start gap-2 px-3 py-1.5 pl-5 hover:bg-surface-alt">
              <Ticket size={13} className="mt-0.5 shrink-0 text-text-faint" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text">{ticket.ref}</span>
                  <span className="shrink-0 text-[11px] text-text-faint">{ticket.relativeTime}</span>
                </div>
                <p className="truncate text-xs text-text-muted">{ticket.subject}</p>
                <p className="truncate text-[11px] text-text-faint">{ticket.lastMessage}</p>
              </div>
              {ticket.unreadCount > 0 && <CountBadge count={ticket.unreadCount} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'notifications' | 'chat'>('notifications')
  const { data: notificationCount = 0 } = useNotificationCount()
  const { data: chatCount = 0 } = useChatCount()

  return (
    <div className="absolute right-0 z-40 mt-1 flex max-h-[min(42rem,calc(100vh-5rem))] w-[min(92vw,31rem)] flex-col overflow-hidden rounded-xl border border-brand/25 bg-surface shadow-2xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-brand/[0.06] px-3 py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-md shadow-brand/20">
          {tab === 'notifications' ? <Bell size={18} /> : <MessageCircle size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-text!">{tab === 'notifications' ? 'Notifications' : 'Messages'}</h2>
          <p className="truncate text-[11px] text-text-muted">Stay updated with the latest activities</p>
        </div>
        <button type="button" onClick={onClose} title="Close notifications" aria-label="Close notifications" className="grid h-8 w-8 place-items-center rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
          <X size={16} />
        </button>
      </header>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-1.5">
        <button
          type="button"
          onClick={() => setTab('notifications')}
          aria-pressed={tab === 'notifications'}
          className={`flex h-8 flex-1 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors ${
            tab === 'notifications' ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-surface-alt'
          }`}
        >
          <Bell size={13} className="mr-1.5" />
          Notifications
          <CountBadge count={notificationCount} active={tab === 'notifications'} />
        </button>
        <button
          type="button"
          onClick={() => setTab('chat')}
          aria-pressed={tab === 'chat'}
          className={`flex h-8 flex-1 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors ${
            tab === 'chat' ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-surface-alt'
          }`}
        >
          <MessageCircle size={13} className="mr-1.5" />
          Chat
          <CountBadge count={chatCount} active={tab === 'chat'} />
        </button>
      </div>
      {tab === 'notifications' ? <NotificationsTab /> : <ChatTab />}
    </div>
  )
}
