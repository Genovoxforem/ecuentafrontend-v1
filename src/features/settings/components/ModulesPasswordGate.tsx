import { useState, type FormEvent } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import { verifyModulesPassword } from '../modulesPassword.data'

// The "Login for Modules" dialog of the classic admin/modules.php: one password field, "Back to Home" and "Login", and a close icon (which also leaves the page).
// onUnlock runs when the password is accepted; onBack when the user leaves (Back to Home or the close icon).
export function ModulesPasswordGate({ onUnlock, onBack }: { onUnlock: () => void; onBack: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (await verifyModulesPassword(password)) onUnlock()
      else setError('Wrong password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check the password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <div role="dialog" aria-modal="false" aria-labelledby="modules-login-title" className="w-full max-w-md rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="modules-login-title" className="text-xl font-normal text-text!">Login for Modules</h2>
          <button type="button" aria-label="Close" onClick={onBack} className="text-danger/60 hover:text-danger">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <p className="text-sm text-text">Please enter your password to access modules.</p>
          <div>
            <label htmlFor="modules-password" className="mb-1 block text-sm text-text">Password:</label>
            <input
              id="modules-password"
              name="pas_Name"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onBack} className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-text hover:bg-surface-hover">
              Back to Home
            </button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
              {busy && <LoaderCircle size={14} className="animate-spin" />} Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
