import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { useAuth } from '../auth/AuthContext'
import { parseNotificationItems, type NotificationItem } from './notificationParser'

export type { NotificationItem }

// The legacy navbar bell's own sub-tabs, with the `type` value each one sends.
export const NOTIFICATION_FILTERS = [
  { type: '', label: 'View All' },
  { type: '1', label: 'Tasks' },
  { type: '2', label: 'Contracts' },
  { type: '3', label: 'Orders' },
  { type: '4', label: 'Invoices' },
  { type: '5', label: 'Other' },
] as const

async function post(path: string, fields: Record<string, string>): Promise<string> {
  return fetchLegacyText(path, { method: 'POST', body: new URLSearchParams(fields) })
}

// notification_count_ajax.php — the number on the bell, as plain text. The legacy
// page re-asks every 5 minutes.
export function useNotificationCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['notifications', 'count', user?.id],
    queryFn: async (): Promise<number> => {
      const text = await post('/notification_count_ajax.php', { action: 'getNotificationcount', user_id: String(user?.id ?? '') })
      const n = Number(text.trim())
      return Number.isFinite(n) ? n : 0
    },
    enabled: !!user,
    refetchInterval: 1000 * 60 * 5,
  })
}

// notification_ajax_modern.php `getnoti` — the panel's own list, for one sub-tab.
export function useNotifications(type: string) {
  return useQuery({
    queryKey: ['notifications', 'list', type],
    queryFn: async (): Promise<NotificationItem[]> => parseNotificationItems(await post('/notification_ajax_modern.php', { action: 'getnoti', type })),
    staleTime: 0,
  })
}

// `dismiss_notification` — permanently hides a notification (the legacy panel's ×).
export function useDismissNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: Pick<NotificationItem, 'id' | 'type'>) => {
      await post('/notification_ajax_modern.php', { action: 'dismiss_notification', notif_type: item.type, notif_id: item.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ── Chat (ticket conversations) — ticket_chat_ajax.php ───────────────────
// Field names are the ones the legacy bell's own renderChatList() reads.

export interface ChatTicket {
  trackId: string
  ref: string
  subject: string
  lastMessage: string
  relativeTime: string
  unreadCount: number
}

export interface ChatCustomer {
  customerId: string
  name: string
  unreadCount: number
  tickets: ChatTicket[]
}

interface RawChatList {
  success: boolean
  error?: string
  customers?: {
    customer_id: string | number
    customer_name: string
    total_messages: number
    tickets: { track_id: string; ticket_ref: string; subject: string; last_message: string; relative_time: string; message_count: number }[]
  }[]
}

export function useChatList() {
  return useQuery({
    queryKey: ['notifications', 'chat', 'list'],
    queryFn: async (): Promise<ChatCustomer[]> => {
      const json = JSON.parse(await post('/ticket_chat_ajax.php', { action: 'get_chat_list' })) as RawChatList
      if (!json.success) throw new Error(json.error || 'Could not load the chat list.')
      return (json.customers ?? []).map((c) => ({
        customerId: String(c.customer_id),
        name: c.customer_name,
        unreadCount: Number(c.total_messages) || 0,
        tickets: (c.tickets ?? []).map((t) => ({
          trackId: t.track_id,
          ref: t.ticket_ref,
          subject: t.subject,
          lastMessage: t.last_message,
          relativeTime: t.relative_time,
          unreadCount: Number(t.message_count) || 0,
        })),
      }))
    },
    staleTime: 0,
  })
}

// `get_chat_count` — the number on the bell panel's Chat tab.
export function useChatCount() {
  return useQuery({
    queryKey: ['notifications', 'chat', 'count'],
    queryFn: async (): Promise<number> => {
      const json = JSON.parse(await post('/ticket_chat_ajax.php', { action: 'get_chat_count' })) as { success: boolean; count?: number }
      return json.success ? Number(json.count) || 0 : 0
    },
    refetchInterval: 1000 * 60 * 5,
    retry: false,
  })
}
