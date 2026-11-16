export type ErrorKind = 'offline' | 'unreachable' | 'server' | 'session' | 'notfound' | 'generic'

// Exported for tests: decides the kind from the error text the data layer produces ("Backend returned 502.", "Network Error", ...).
export function classifyError(message: string, online: boolean = typeof navigator === 'undefined' ? true : navigator.onLine): ErrorKind {
  const m = message.toLowerCase()
  if (!online || m.includes('network error') || m.includes('no response') || m.includes('failed to fetch') || m.includes('err_internet_disconnected')) return 'offline'
  if (m.includes('signed in') || m.includes('session') || /\b(401|403)\b/.test(m)) return 'session'
  const code = /returned (\d{3})/.exec(m)?.[1]
  if (code === '404') return 'notfound'
  if (code === '502' || code === '503' || code === '504' || m.includes('timeout') || m.includes('timed out')) return 'unreachable'
  if (code && code.startsWith('5')) return 'server'
  return 'generic'
}
