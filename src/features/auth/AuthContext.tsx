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

// Upper bound on how long sign-in waits for the legacy session (the backend's
// login answer takes ~0.6 s on 172.16.5.10).
const LEGACY_SESSION_WAIT_MS = 8000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [rights, setRights] = useState<Record<string, Record<string, boolean>>>({})
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>('loading')
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null)

  const logout = useCallback(() => {
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
      })
      .catch(() => {
        setStoredToken(null)
        setStatus('anonymous')
      })
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setSessionExpiredMessage(null)
    const data = await loginRequest(credentials)
    setStoredToken(data.bearer_token ?? data.api_key ?? data.token ?? null)
    // Waited for (alongside fetchMe) before the app opens: the dashboard and most
    // list pages read legacy endpoints, and one that reaches the backend before
    // this login finishes gets the login page back. It never throws, and the
    // wait is capped so a slow backend can't hold up the sign-in itself.
    const legacySession = establishLegacySession(credentials.login, credentials.password)
    const me = await fetchMe()
    await Promise.race([legacySession, new Promise((resolve) => window.setTimeout(resolve, LEGACY_SESSION_WAIT_MS))])
    setUser(me.user)
    setRights(me.permissions)
    setStatus('authenticated')
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
