import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Bell, MessageCircle, Ticket } from 'lucide-react'
import {
  NOTIFICATION_FILTERS,
  useChatCount,
  useChatList,
  useDismissNotification,
  useNotificationCount,
  useNotifications,
} from '../../../../features/notifications/notifications.queries'
import { resolveLegacyRoute } from '../../../legacyRoute'

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return <span className="ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] leading-[18px] text-center">{count}</span>
}

function NotificationsTab() {
  const [type, setType] = useState('')
  const { data, isLoading, isError, error, refetch } = useNotifications(type)
  const dismiss = useDismissNotification()

  return (
    <>
      <div className="flex items-center gap-1 px-2 pt-2 pb-1 overflow-x-auto shrink-0">
        {NOTIFICATION_FILTERS.map((f) => (
          <button
            key={f.type}
            type="button"
            onClick={() => setType(f.type)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${
              type === f.type ? 'bg-brand/10 text-brand border-brand' : 'text-text-muted border-border hover:bg-surface-alt'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto soft-scrollbar py-1">
        {isLoading && <p className="text-xs text-text-faint text-center py-6">Loading…</p>}
        {isError && (
          <div className="text-center py-6 px-3">
            <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Could not load notifications.'}</p>
            <button type="button" onClick={() => refetch()} className="mt-2 text-xs font-medium text-brand hover:underline">
              Try again
            </button>
          </div>
        )}
        {dismiss.isError && <p className="text-xs text-danger text-center py-1">Could not dismiss that notification.</p>}
        {data && data.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm font-medium text-text">No Notifications</p>
            <p className="text-xs text-text-faint">You're all caught up!</p>
          </div>
        )}
        {data?.map((n) => {
          const to = resolveLegacyRoute(n.href)
          return (
            <div key={`${n.type}-${n.id}`} className={`flex items-start gap-2.5 px-3 py-2 hover:bg-surface-alt ${n.unread ? 'bg-brand/5' : ''}`}>
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.unread ? 'bg-brand' : 'bg-transparent'}`} aria-label={n.unread ? 'Unread' : undefined} />
              <div className="min-w-0 flex-1 text-sm text-text">
                {to ? (
                  <Link to={to} className="hover:underline">
                    {n.text}
                  </Link>
                ) : (
                  n.text
                )}
              </div>
              <button
                type="button"
                title="Dismiss"
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate({ id: n.id, type: n.type })}
                className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function ChatTab() {
  const { data, isLoading, isError, error, refetch } = useChatList()
  return (
    <div className="flex-1 overflow-y-auto soft-scrollbar py-1">
      {isLoading && <p className="text-xs text-text-faint text-center py-6">Loading…</p>}
      {isError && (
        <div className="text-center py-6 px-3">
          <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Could not load chats.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-xs font-medium text-brand hover:underline">
            Try again
          </button>
        </div>
      )}
      {data && data.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm font-medium text-text">No Chats</p>
          <p className="text-xs text-text-faint">No ticket conversations yet</p>
        </div>
      )}
      {data?.map((c) => (
        <div key={c.customerId} className="border-b border-border last:border-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-text">
            <span className="truncate">{c.name}</span>
            <CountBadge count={c.unreadCount} />
          </div>
          {c.tickets.map((t) => (
            <div key={t.trackId} className="flex items-start gap-2 px-3 py-1.5 pl-5 hover:bg-surface-alt">
              <Ticket size={13} className="mt-0.5 shrink-0 text-text-faint" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text">{t.ref}</span>
                  <span className="text-[11px] text-text-faint shrink-0">{t.relativeTime}</span>
                </div>
                <p className="text-xs text-text-muted truncate">{t.subject}</p>
                <p className="text-[11px] text-text-faint truncate">{t.lastMessage}</p>
              </div>
              <CountBadge count={t.unreadCount} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// The legacy navbar bell's Notifications / Chat panel, on the same endpoints the
// legacy panel calls (notification_ajax_modern.php, notification_count_ajax.php,
// ticket_chat_ajax.php). Chat conversations are shown as a read-only summary —
// there is no chat page in this app to open one in.
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'notifications' | 'chat'>('notifications')
  const { data: notificationCount = 0 } = useNotificationCount()
  const { data: chatCount = 0 } = useChatCount()

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
          <CountBadge count={notificationCount} />
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
          <CountBadge count={chatCount} />
        </button>
        <button type="button" onClick={onClose} title="Close" className="p-1.5 rounded-md text-text-faint hover:bg-surface-alt">
          <X size={16} />
        </button>
      </div>

      {tab === 'notifications' ? <NotificationsTab /> : <ChatTab />}
    </div>
  )
}
