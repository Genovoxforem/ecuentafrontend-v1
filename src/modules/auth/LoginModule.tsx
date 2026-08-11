import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useAuth } from '../../features/auth/AuthContext'
import { useEntities } from '../../features/settings/settings.queries'
import logo from '../../assets/Ecuenta_logo.png'

/* ---------------------------------- icons --------------------------------- */

function IconUser({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className={className}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
    </svg>
  )
}

function IconKey({ className = 'h-4 w-4' }: { className?: string }) {
  return (  
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className={className}>
      <circle cx="7" cy="14" r="3.2" />
      <path d="M9.3 11.8 18 3.1M15.4 5.7l2 2M13 8.1l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UserTypeIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className={className}>
      <path d="M7 10a3 3 0 1 1 6 0 3 3 0 0 1-6 0" />
      <path d="M4 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M15 9h5M15 13h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* --------------------------------- artwork --------------------------------- */

function CircuitPattern({ className = '' }: { className?: string }) {
  const dots: [number, number][] = [
    [0, 40], [50, 40], [50, 80], [110, 80], [110, 30], [170, 30], [20, 100], [20, 170], [90, 130], [150, 130], [150, 170],
  ]
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth={1.2}>
      <path d="M0 40h50M50 40v40M50 80h60M110 80v-50M110 30h60M20 100v70M20 100h40M90 130h60M150 130v40" strokeLinecap="round" />
      {dots.map(([cx, cy], index) => (
        <circle key={index} cx={cx} cy={cy} r={3} fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

/* ---------------------------------- form ---------------------------------- */

type AuthTone = 'cream' | 'plain' | 'brand'

function toneClasses(tone: AuthTone) {
  return tone === 'cream'
    ? 'border-amber-300 bg-amber-50 focus:border-amber-500 focus:ring-amber-200'
    : tone === 'brand'
      ? 'border-blue-300 bg-gradient-to-r from-sky-50 to-blue-100 focus:border-blue-500 focus:ring-blue-200'
      : 'border-blue-100 bg-blue-50 focus:border-blue-400 focus:ring-blue-200'
}

interface AuthInputProps {
  placeholder: string
  type?: string
  icon: ReactNode
  tone?: AuthTone
  value: string
  onChange: (value: string) => void
  name: string
}

interface DropdownOption {
  value: string
  label: string
}

function AuthDropdown({
  placeholder,
  icon,
  tone = 'plain',
  value,
  onChange,
  name,
  options,
}: {
  placeholder: string
  icon: ReactNode
  tone?: AuthTone
  value: string
  onChange: (value: string) => void
  name: string
  options: DropdownOption[]
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  return (
    <div className="relative" ref={containerRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-full border px-5 py-3 text-sm font-medium outline-none transition focus:ring-4 ${toneClasses(tone)} ${value ? 'text-slate-800' : 'text-slate-500'}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <span className="ml-2 flex shrink-0 items-center text-slate-900">{icon}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
          {options.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-slate-400">No entities available yet</p>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`block w-full px-4 py-2.5 text-left text-sm transition ${
                  option.value === value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function AuthInput({ placeholder, type = 'text', icon, tone = 'plain', value, onChange, name }: AuthInputProps) {
  const toneClass = toneClasses(tone)

  return (
    <div className="relative">
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className={`w-full rounded-full border px-5 py-3 pr-11 text-sm font-medium text-slate-800 placeholder:text-slate-500 outline-none transition focus:ring-4 ${toneClass}`}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-900">{icon}</span>
    </div>
  )
}

export function LoginModule() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { data: entities } = useEntities()
  const entityOptions: DropdownOption[] = (entities ?? []).map((e) => ({ value: String(e.id), label: e.label }))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [masterEntity, setMasterEntity] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ login: username, password, entity: masterEntity })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // An AxiosError with no `response` means the browser never got a
      // response back at all (CORS block, DNS failure, backend down, ...) —
      // not the backend actually rejecting the credentials. Reporting that
      // as "Invalid login or password" is actively misleading (confirmed
      // live: login itself was succeeding, but the very next call, GET
      // /api/user/, was CORS-blocked, and this catch-all made that look
      // like a wrong password). Login/fetchMe throwing a plain Error (with
      // a message) means the backend did respond and reject it — surface
      // its actual message when there is one.
      if (isAxiosError(err) && !err.response) {
        setError('Unable to reach the server. This may be a network or server configuration issue — please try again shortly.')
      } else {
        setError(err instanceof Error && err.message ? err.message : 'Invalid login or password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-100 via-indigo-50 to-violet-200">
      <CircuitPattern className="absolute -left-6 -top-6 h-48 w-48 text-slate-400/30" />
      <CircuitPattern className="absolute -right-6 -top-6 h-48 w-48 -scale-x-100 text-slate-400/30" />
      <CircuitPattern className="absolute -left-6 -bottom-6 h-48 w-48 -scale-y-100 text-slate-400/30" />
      <CircuitPattern className="absolute -right-6 -bottom-6 h-48 w-48 -scale-x-100 -scale-y-100 text-slate-400/30" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-md">
          <div className="flex w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            {/* form panel */}
            <div className="flex flex-col justify-center px-8 py-8 sm:px-10 lg:py-10">
              <div className="mb-2 flex -translate-y-[20%] justify-center">
                <img src={logo} alt="ECUENTA - Financial Accounting CRM" className="h-10 w-auto sm:h-12 lg:h-14" />
              </div>

              <h1 className="mb-6 text-center text-xl font-semibold text-slate-800">Sign In to your Account</h1>

              <form onSubmit={handleSubmit} className="space-y-3">
                <AuthInput
                  name="username"
                  placeholder="username"
                  icon={<IconUser className="h-7 w-7" />}
                  value={username}
                  onChange={setUsername}
                />
                <AuthInput
                  name="password"
                  type="password"
                  placeholder="Password"
                  icon={<IconKey className="h-7 w-7" />}
                  value={password}
                  onChange={setPassword}
                />
                <AuthDropdown
                  name="masterEntity"
                  placeholder="Master entity"
                  icon={<UserTypeIcon className="h-7 w-7" />}
                  tone="brand"
                  value={masterEntity}
                  onChange={setMasterEntity}
                  options={entityOptions}
                />

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                <label className="flex items-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                  />
                  Remember me
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-gradient-to-r from-sky-400 via-sky-600 to-blue-900 py-3 text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-900/30 transition hover:from-sky-300 hover:via-sky-500 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'SIGNING IN…' : 'SIGN IN'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
