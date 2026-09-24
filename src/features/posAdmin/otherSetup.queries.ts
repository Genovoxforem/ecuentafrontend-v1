import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { toggleChecked, csrfToken } from './posAdminShared'

// takepos/admin/other.php — the one tab with a genuine second real JSON
// API: takepos/admin/websocket_manage.php (POST, dataType: 'json'),
// confirmed live by reading the real page's own wsCheckStatus()/wsAction()
// JS directly. action='status' returns {running, pid}; action='start' /
// 'stop' / 'restart' return {success, message}. Plus 1 real toggle
// (ENABLE_SOCKETIO_NOTIFICATIONS via core/ajax/constantonoff.php). No
// classic form-POST fields exist on this tab at all — it's the only one
// that's 100% real already.
export interface OtherSetup {
  socketioNotifications: boolean
  token: string
}

export function useOtherSetup() {
  return useQuery({
    queryKey: ['pos-admin', 'other-setup'],
    queryFn: async (): Promise<OtherSetup> => {
      const doc = await fetchLegacyDocument('/takepos/admin/other.php')
      return {
        socketioNotifications: toggleChecked(doc, 'ENABLE_SOCKETIO_NOTIFICATIONS'),
        token: csrfToken(doc),
      }
    },
    staleTime: 1000 * 15,
  })
}

export interface WebSocketStatus {
  running: boolean
  pid: number
}
export function useWebSocketStatus() {
  return useQuery({
    queryKey: ['pos-admin', 'websocket-status'],
    queryFn: async (): Promise<WebSocketStatus> => {
      const body = new URLSearchParams({ action: 'status' })
      const res = await fetch('/takepos/admin/websocket_manage.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = (await res.json()) as { running?: boolean; pid?: number }
      return { running: !!data.running, pid: Number(data.pid) || 0 }
    },
    staleTime: 1000 * 10,
    refetchInterval: 15000,
  })
}

export function useWebSocketAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (action: 'start' | 'stop' | 'restart') => {
      const body = new URLSearchParams({ action })
      const res = await fetch('/takepos/admin/websocket_manage.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (!data.success) throw new Error(data.message || 'The legacy backend rejected the request.')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'websocket-status'] }),
  })
}
