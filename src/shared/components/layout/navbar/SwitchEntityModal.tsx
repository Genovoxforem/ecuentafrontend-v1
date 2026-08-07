import { useState, type FormEvent } from 'react'
import { useAuth } from '../../../../features/auth/AuthContext'

// Confirms a password before switching entities. Necessary because, unlike
// the live PHP app (which mutates a server-side session), this app
// authenticates with a stateless JWT/API-key token that has the entity
// baked in at login (see auth_helper.php's authenticate_jwt()) — there's no
// token-based "switch entity for my current session" endpoint, so changing
// entity means re-authenticating with a token scoped to the new one. A full
// reload afterward mirrors the live app's own `location.href = url` after
// its switchEntity AJAX call, so every entity-scoped view (company name,
// currency, dashboard data) comes back fresh and consistent.
export function SwitchEntityModal({
  entityId,
  entityLabel,
  loginName,
  onClose,
}: {
  entityId: string
  entityLabel: string
  loginName: string
  onClose: () => void
}) {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ login: loginName, password, entity: entityId })
      window.location.reload()
    } catch {
      setError('Incorrect password.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-sm font-semibold text-text mb-1">Switch to {entityLabel}?</h3>
        <p className="text-xs text-text-muted mb-4">Confirm your password to switch entities. The app will refresh.</p>
        <form onSubmit={handleConfirm} className="space-y-3">
          <input
            type="password"
            autoFocus
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md text-sm text-text-muted hover:bg-surface-alt">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !password}
              className="px-3 py-1.5 rounded-md text-sm bg-brand text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Switching…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
