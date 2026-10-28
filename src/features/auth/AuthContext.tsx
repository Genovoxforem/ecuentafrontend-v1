import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredToken, setStoredToken, registerUnauthorizedHandler } from '../../api/axios'
import { loginRequest, fetchMe, type LoginCredentials } from './auth.api'
import { establishLegacySession } from './legacySession'

export interface AuthUser {
  id: string
  entity: string
  firstname: string
  lastname: string
  login: string
  admin: boolean
  email?: string
  job?: string
  photo?: string
}

interface AuthContextValue {
  user: AuthUser | null
  rights: Record<string, Record<string, boolean>>
  status: 'loading' | 'authenticated' | 'anonymous'
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  logout: () => void
  hasRight: (module: string, action: string) => boolean
  // Set only when a 401 from a protected call force-logged the user out
  // (expired/invalid token) — not on an explicit Log Out click, which calls
  // logout() directly and never touches this. LoginModule reads it to show
  // "your session expired" instead of silently landing back on a blank
  // login form with no explanation.
  sessionExpiredMessage: string | null
  clearSessionExpiredMessage: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// The last verified user and permissions, kept with the token they belong to, so the app opens from this copy and
// re-checks GET /user/ in the background instead of every page waiting about 1 s for it. It is only the screen's view
// of who is signed in: every request is still checked by the server, and a failed re-check signs the user out.
// Cleared on logout and on any token change.
const ME_CACHE_KEY = 'ecuenta_me'
type CachedMe = { token: string; user: AuthUser; rights: Record<string, Record<string, boolean>> }

function readCachedMe(): CachedMe | null {
  try {
    const token = getStoredToken()
    const raw = localStorage.getItem(ME_CACHE_KEY)
    if (!token || !raw) return null
    const cached = JSON.parse(raw) as CachedMe
    return cached.token === token && cached.user?.id ? cached : null
  } catch {
    return null
  }
}

function writeCachedMe(user: AuthUser, rights: Record<string, Record<string, boolean>>) {
  try {
    const token = getStoredToken()
    if (token) localStorage.setItem(ME_CACHE_KEY, JSON.stringify({ token, user, rights } satisfies CachedMe))
  } catch {
    /* storage unavailable: the app just waits for the check next time */
  }
}

function clearCachedMe() {
  try {
    localStorage.removeItem(ME_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

// Upper bound on how long sign-in waits for the legacy session (the backend's
// login answer takes about 0.6 s).
const LEGACY_SESSION_WAIT_MS = 8000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cached] = useState(readCachedMe)
  const [user, setUser] = useState<AuthUser | null>(cached?.user ?? null)
  const [rights, setRights] = useState<Record<string, Record<string, boolean>>>(cached?.rights ?? {})
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>(cached ? 'authenticated' : 'loading')
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null)

  const logout = useCallback(() => {
    clearCachedMe()
    setStoredToken(null)
    setUser(null)
    setRights({})
    setStatus('anonymous')
  }, [])

  const clearSessionExpiredMessage = useCallback(() => setSessionExpiredMessage(null), [])

  useEffect(() => {
    // Distinct from the plain `logout` the Navbar's Log Out button calls
    // directly — this path only runs when the 401 interceptor (api/axios.ts)
    // fires, i.e. a protected call was rejected with an expired/invalid
    // token, not a user-initiated logout.
    registerUnauthorizedHandler(() => {
      setSessionExpiredMessage('Your session expired — please sign in again.')
      logout()
    })
  }, [logout])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setStatus('anonymous')
      return
    }
    fetchMe()
      .then((me) => {
        setUser(me.user)
        setRights(me.permissions)
        setStatus('authenticated')
        writeCachedMe(me.user, me.permissions)
      })
      .catch(() => {
        clearCachedMe()
        setStoredToken(null)
        setUser(null)
        setRights({})
        setStatus('anonymous')
      })
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setSessionExpiredMessage(null)
    const data = await loginRequest(credentials)
    setStoredToken(data.bearer_token)
    // Waited for (alongside fetchMe) before the app opens: the dashboard and most
    // list pages read legacy endpoints, and one that reaches the backend before
    // this login finishes gets the login page back. It never throws, and the
    // wait is capped so a slow backend can't hold up the sign-in itself.
    // Started only after the API login has answered: started together with it (tried 22 Oct 2026) the two logins raced on the PHP
    // session cookie, the legacy login was refused, and every session-only call (menu, users, projects) got the login page back.
    const legacySession = establishLegacySession(credentials.login, credentials.password)
    const me = await fetchMe()
    await Promise.race([legacySession, new Promise((resolve) => window.setTimeout(resolve, LEGACY_SESSION_WAIT_MS))])
    setUser(me.user)
    setRights(me.permissions)
    setStatus('authenticated')
    writeCachedMe(me.user, me.permissions)
    return me.user
  }, [])

  // permissions come back flattened, e.g. rights.invoice.write
  const hasRight = useCallback(
    (module: string, action: string) => {
      if (user?.admin) return true
      return Boolean(rights?.[module]?.[action])
    },
    [rights, user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ user, rights, status, login, logout, hasRight, sessionExpiredMessage, clearSessionExpiredMessage }),
    [user, rights, status, login, logout, hasRight, sessionExpiredMessage, clearSessionExpiredMessage],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
