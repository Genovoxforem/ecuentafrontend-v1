import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ROUTES } from '../../routes'

export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <div className="p-6 text-sm text-text-muted">Loading…</div>
  }
  if (status === 'anonymous') {
    return <Navigate to={ROUTES.login} replace />
  }
  return <Outlet />
}
