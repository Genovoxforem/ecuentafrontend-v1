import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronDown, ChevronUp, ChevronsUpDown, Search, Truck, User } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { resolveLegacyRoute } from '../../../shared/legacyRoute'
import { ROUTES } from '../../../routes'
import { parseParty, type ExpenseParty } from '../expensePagesParser'
import { PAGE_SIZES, controlCls } from '../expenseTable'

// ── Who a report belongs to / is linked to ───────────────────────────────────────────────────────────
// The backend shows a small card when the pointer rests on a user's name: photo, status, name, login,
// email, type. It is `position: fixed` so the table's scroll area cannot clip it.
function HoverCard({ party, at }: { party: ExpenseParty; at: { x: number; y: number } }) {
  return (
    <div role="tooltip" className="pointer-events-none fixed z-50 w-72 rounded-lg border border-border bg-white p-3 text-xs text-gray-800 shadow-xl" style={{ left: at.x, top: at.y }}>
      {party.photo && <img src={party.photo} alt="" className="mb-2 h-12 w-12 rounded-md object-cover" />}
      <p className="mb-1 flex items-center gap-2 font-semibold">
        <User size={12} /> <span className="underline">User</span>
        {party.enabled !== null && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${party.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {party.enabled ? 'Enabled' : 'Disabled'}
          </span>
        )}
      </p>
      {party.facts.map((f) => (
        <p key={f.label} className="break-words">
          <b>{f.label}:</b> {f.value}
        </p>
      ))}
    </div>
  )
}

// A person or company as the backend prints it: icon, photo, name — linked to the React page for that
// person/company (never the backend page), plain text when there is none.
export function PartyLink({ party, avatar = false, showIcon = false }: { party: ExpenseParty | null; avatar?: boolean; showIcon?: boolean }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  if (!party) return <span className="text-text-faint">—</span>
  const to = party.kind === 'user' ? (party.id ? ROUTES.userDetail.replace(':id', party.id) : null) : resolveLegacyRoute(party.href)
  const Icon = party.icon === 'truck' ? Truck : party.icon === 'building' ? Building2 : User
  const label = <span className="capitalize">{party.name}</span>
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      onMouseEnter={(e) => {
        if (party.facts.length === 0) return
        const r = e.currentTarget.getBoundingClientRect()
        setTip({ x: Math.min(r.left, window.innerWidth - 300), y: r.bottom + 4 })
      }}
      onMouseLeave={() => setTip(null)}
    >
      {showIcon && <Icon size={13} className={party.icon === 'user' ? 'text-info-fg' : 'text-brand'} />}
      {avatar && <Avatar photo={party.photo} name={party.name} size={24} />}
      {to ? (
        <Link to={to} className="text-brand hover:underline">
          {label}
        </Link>
      ) : (
        label
      )}
      {tip && <HoverCard party={party} at={tip} />}
    </span>
  )
}

// A user or company from the raw markup the list endpoint returns.
export function PartyHtml({ html, avatar = false, showIcon = false }: { html: string; avatar?: boolean; showIcon?: boolean }) {
  const party = useMemo(() => parseParty(html), [html])
  return <PartyLink party={party} avatar={avatar} showIcon={showIcon} />
}

// ── Badges ───────────────────────────────────────────────────────────────────────────────────────────
const STATUS_CLS: Record<string, string> = {
  Draft: 'bg-neutral-bg text-neutral-fg',
  Submitted: 'bg-info-bg text-info-fg',
  Approved: 'bg-success-bg text-success-fg',
  Paid: 'bg-neutral-bg text-text',
  Cancelled: 'bg-warning-bg text-warning-fg',
  Refused: 'bg-danger-bg text-danger-fg',
}
export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{status}</span>
}
export function PaidBadge({ paid }: { paid: boolean }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${paid ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  )
}

// ── DataTables-style controls ────────────────────────────────────────────────────────────────────────
export function PerPageSelect({ value, onChange, label = 'entries per page' }: { value: number; onChange: (n: number) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-muted">
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${controlCls} w-20`} aria-label="Rows per page">
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      {label}
    </label>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-56 flex-1">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${controlCls} w-full pl-9`} aria-label={placeholder} />
    </label>
  )
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }

// A column header that sorts the table when clicked, like the backend's.
export function SortTh({ children, active, dir, onSort, align = 'left' }: { children: ReactNode; active: boolean; dir: 'asc' | 'desc'; onSort: () => void; align?: 'left' | 'right' | 'center' }) {
  const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ChevronUp : ChevronDown
  return (
    <th className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap ${ALIGN[align]}`} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={onSort} className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''} hover:underline`}>
        {children}
        <Icon size={12} className={active ? 'text-brand' : 'text-text-faint'} />
      </button>
    </th>
  )
}

// ── Create-form pieces shared by the tab pages ─────────────────────────────────────────────────────
export function FormCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-text!">
        <span className="text-text-faint">{icon}</span> {title}
      </h3>
      <div className="p-4">{children}</div>
    </Card>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  )
}

// A refusal or a validation message above a form's button.
export function FormProblem({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm text-danger-fg">
      {message}
    </p>
  ) : null
}
