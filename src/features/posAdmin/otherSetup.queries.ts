import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { csrfToken, constOn, loadPosConsts, loadPosPage, requirePosSource } from './posAdminShared'

// takepos/admin/other.php — the one tab with a second JSON API:
// takepos/admin/websocket_manage.php (POST, dataType: 'json'), from the
// page's own wsCheckStatus()/wsAction() JS. action='status' returns
// {running, pid}; action='start' / 'stop' / 'restart' return {success,
// message}. Plus 1 toggle (ENABLE_SOCKETIO_NOTIFICATIONS via
// core/ajax/constantonoff.php). No classic form-POST fields exist on this
// tab at all.
export interface OtherSetup {
  socketioNotifications: boolean
  token: string
  // Read from the rows the classic page prints ("Port", "Server File"); empty without a classic page, so nothing is invented.
  port: string
  serverFile: string
}

// The text of the second cell of the table row whose first cell is `label` ('' when the page has no such row).
export function rowValue(doc: Document | null, label: string): string {
  if (!doc) return ''
  for (const tr of Array.from(doc.querySelectorAll('tr'))) {
    const cells = tr.querySelectorAll('td,th')
    if (cells.length >= 2 && (cells[0].textContent ?? '').trim().toLowerCase() === label.toLowerCase()) return (cells[1].textContent ?? '').trim()
  }
  return ''
}

export function useOtherSetup() {
  return useQuery({
    queryKey: ['pos-admin', 'other-setup'],
    queryFn: async (): Promise<OtherSetup> => {
      const [consts, doc] = await Promise.all([loadPosConsts(), loadPosPage('/takepos/admin/other.php')])
      requirePosSource(consts, doc)
      return {
        socketioNotifications: constOn(consts, doc, 'ENABLE_SOCKETIO_NOTIFICATIONS'),
        token: doc ? csrfToken(doc) : '',
        port: rowValue(doc, 'Port'),
        serverFile: rowValue(doc, 'Server File'),
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
