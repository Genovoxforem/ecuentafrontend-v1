import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ArrowRight, BarChart3, Boxes, CircleDollarSign, ShieldCheck, ShoppingCart } from 'lucide-react'
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
    ? 'border-amber-200 bg-amber-50/70 focus:border-amber-500 focus:ring-amber-100'
    : tone === 'brand'
      ? 'border-slate-200 bg-white focus:border-cyan-500 focus:ring-cyan-100'
      : 'border-slate-200 bg-white focus:border-cyan-500 focus:ring-cyan-100'
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
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-medium shadow-sm outline-none transition focus:ring-4 ${toneClasses(tone)} ${value ? 'text-slate-800' : 'text-slate-400'}`}
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
        className={`w-full rounded-xl border px-4 py-3.5 pr-11 text-sm font-medium text-slate-800 shadow-sm placeholder:text-slate-400 outline-none transition focus:ring-4 ${toneClass}`}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-900">{icon}</span>
    </div>
  )
}

export function LoginModule() {
  const navigate = useNavigate()
  const { login, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth()
  const { data: entities } = useEntities()
  const entityOptions: DropdownOption[] = (entities ?? []).map((e) => ({ value: String(e.id), label: e.label }))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [masterEntity, setMasterEntity] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Default-select the master entity (id=1, Dolibarr's standard master
  // entity) once the entities list loads, so the user doesn't have to
  // manually pick one before submitting — the vast majority of logins go
  // to the master entity on a single-entity install like this one.
  useEffect(() => {
    if (masterEntity || !entities?.length) return
    const master = entities.find((e) => e.id === 1) ?? entities[0]
    setMasterEntity(String(master.id))
  }, [entities, masterEntity])

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
    <div className="relative min-h-screen overflow-hidden bg-[#07162d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(37,99,235,0.18),transparent_35%)]" />
      <CircuitPattern className="absolute -left-6 -top-6 h-56 w-56 text-cyan-300/10" />
      <CircuitPattern className="absolute -bottom-8 -right-8 h-64 w-64 -scale-x-100 -scale-y-100 text-blue-300/10" />

      <main className="relative flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative hidden min-h-[680px] overflow-hidden bg-gradient-to-br from-[#0b2347] via-[#0b3561] to-[#087f8c] p-12 text-white lg:flex lg:flex-col">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[55px] border-white/5" />
            <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <BarChart3 className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-wide">ECUENTA ERP</p>
                <p className="text-xs text-cyan-100/60">Business, beautifully connected</p>
              </div>
            </div>

            <div className="relative my-auto max-w-lg py-12">
              <span className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                One platform. Total control.
              </span>
              <h1 className="text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">
                Run every part of your business with confidence.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-blue-100/70">
                Turn daily operations into clear decisions with sales, purchasing, inventory and accounting working together in real time.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-3">
                {[
                  { label: 'Sales', detail: 'Sell smarter', icon: ShoppingCart },
                  { label: 'Purchasing', detail: 'Source efficiently', icon: CircleDollarSign },
                  { label: 'Inventory', detail: 'Stay in control', icon: Boxes },
                  { label: 'Accounts', detail: 'Know your numbers', icon: BarChart3 },
                ].map(({ label, detail, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-blue-100/50">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center gap-2 text-xs text-blue-100/50">
              <ShieldCheck size={15} className="text-cyan-300" />
              Secure access to your business workspace
            </div>
          </section>

          {/* form panel */}
          <section className="flex min-h-[620px] flex-col justify-center bg-slate-50 px-6 py-10 sm:px-12 lg:min-h-[680px] lg:px-14">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-9 flex items-center justify-between">
                <img src={logo} alt="ECUENTA - Financial Accounting CRM" className="h-11 w-auto" />
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">ERP Cloud</span>
              </div>

              <div className="mb-7">
                <p className="mb-2 text-sm font-semibold text-cyan-700">Welcome back</p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in to your workspace</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Enter your credentials to continue managing your business.</p>
              </div>

              {sessionExpiredMessage && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {sessionExpiredMessage}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <AuthInput
                  name="username"
                  placeholder="Username"
                  icon={<IconUser className="h-5 w-5" />}
                  value={username}
                  onChange={(value) => {
                    setUsername(value)
                    if (sessionExpiredMessage) clearSessionExpiredMessage()
                  }}
                />
                <AuthInput
                  name="password"
                  type="password"
                  placeholder="Password"
                  icon={<IconKey className="h-5 w-5" />}
                  value={password}
                  onChange={setPassword}
                />
                <AuthDropdown
                  name="masterEntity"
                  placeholder="Select business entity"
                  icon={<UserTypeIcon className="h-5 w-5" />}
                  tone="brand"
                  value={masterEntity}
                  onChange={setMasterEntity}
                  options={entityOptions}
                />

                {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-400"
                  />
                  Keep me signed in
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? 'Signing in…' : 'Access your workspace'}
                  {!submitting && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <div className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
                Protected enterprise access · ECUENTA ERP
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
