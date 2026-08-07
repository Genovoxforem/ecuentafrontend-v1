import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredToken, setStoredToken, registerUnauthorizedHandler } from '../../api/axios'
import { loginRequest, fetchMe, type LoginCredentials } from './auth.api'

export interface AuthUser {
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
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [rights, setRights] = useState<Record<string, Record<string, boolean>>>({})
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>('loading')

  const logout = useCallback(() => {
    setStoredToken(null)
    setUser(null)
    setRights({})
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    registerUnauthorizedHandler(logout)
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
    const data = await loginRequest(credentials)
    setStoredToken(data.bearer_token ?? data.api_key ?? data.token ?? null)
    const me = await fetchMe()
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
    () => ({ user, rights, status, login, logout, hasRight }),
    [user, rights, status, login, logout, hasRight],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
