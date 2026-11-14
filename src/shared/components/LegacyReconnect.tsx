import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOptionalAuth } from '../../features/auth/AuthContext'
import { establishLegacySession } from '../../features/auth/legacySession'
import { NOT_SIGNED_IN_MESSAGE } from '../legacyHtmlFetch'

// A page that reads a classic Dolibarr page or ajax file needs the PHP session cookie, and that cookie is only created when the sign-in form is submitted
// (legacySession.ts): after a reload the app resumes from its stored token and the cookie may be gone, so those pages answer "Not signed into the legacy
// backend". The password is never stored, so it is asked for here once; the session is created again and every failed read is retried.
export function LegacyReconnectForm() {
  const auth = useOptionalAuth()
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const login = auth?.user?.login
  if (!login) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!login || !password) return
    setBusy(true)
    setFailed(false)
    await establishLegacySession(login, password)
    setPassword('')
    await queryClient.refetchQueries({ predicate: (q) => q.state.status === 'error' })
    setFailed(queryClient.getQueryCache().findAll({ predicate: (q) => (q.state.error as Error | null)?.message === NOT_SIGNED_IN_MESSAGE }).length > 0)
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2" aria-label="Reconnect to the legacy backend">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={`Password of ${login}`}
        autoComplete="current-password"
        aria-label="Password"
        className="h-8 rounded-md border border-input-border bg-input-bg px-2 text-xs text-text outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button type="submit" disabled={busy || !password} className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60">
        {busy ? 'Reconnecting…' : 'Reconnect'}
      </button>
      {failed && <span className="text-xs text-danger-fg">Still not signed in: check the password and try again.</span>}
    </form>
  )
}
