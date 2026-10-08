import { useEffect, useState } from 'react'
import {
  X,
  User,
  LogOut,
  FileText,
  MessageSquareText,
  BadgeCheck,
  Mail,
  Phone,
  ChevronRight,
  Building2,
  Hash,
  MapPin,
  Globe2,
  Wallet,
  Clock3,
  RefreshCw,
  LifeBuoy,
  AtSign,
  CalendarDays,
  Copy,
  Check,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../../routes'
import { useGeneralSettings, useEntities, useCompanyAccountDetails } from '../../../../features/settings/settings.queries'
import { resolveBackendAsset } from '../../../../api/backends'
import type { AuthUser } from '../../../../features/auth/AuthContext'
import { Avatar } from '../../Avatar'
import { ActionTile } from '../../dashboard/DashboardKit'
import { SwitchEntityModal } from './SwitchEntityModal'

const CURRENCY_NAMES: Record<string, string> = { ZMW: 'Zambian Kwacha', USD: 'US Dollar', INR: 'Indian Rupee', GBP: 'British Pound', EUR: 'Euro' }

function CompanyLogo({ src, name, userPhoto }: { src?: string; name: string; userPhoto?: string }) {
  const [failed, setFailed] = useState(false)
  const logoUrl = src ? resolveBackendAsset(src) : ''

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setFailed(true)}
        className="h-[50px] w-[50px] shrink-0 rounded-lg border border-border bg-white object-contain p-1.5"
      />
    )
  }

  return <Avatar photo={userPhoto} name={name} size={50} rounded="lg" className="ring-2 ring-brand/25" />
}

function parseCountryLabel(value?: string) {
  if (!value) return '-'
  const parts = value.split(':')
  return parts[parts.length - 1] || value
}

function DetailRow({
  icon: Icon,
  label,
  value,
  onCopy,
}: {
  icon: typeof Building2
  label: string
  value: string
  onCopy?: () => void
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3 border-b border-border/60 py-1 last:border-0">
      <span className="flex shrink-0 items-center gap-2 text-xs text-text-muted">
        <Icon size={13} className="shrink-0 text-brand" />
        {label}
      </span>
      <span className="flex min-w-0 max-w-[70%] items-center justify-end gap-1.5">
        <span className="min-w-0 break-words whitespace-normal text-right text-xs font-semibold leading-tight text-text!">{value}</span>
        {onCopy && value !== '-' && value !== 'Loading…' && (
          <button type="button" onClick={onCopy} title={`Copy ${label}`} aria-label={`Copy ${label}`} className="shrink-0 rounded p-1 text-text-faint hover:bg-brand/10 hover:text-brand">
            <Copy size={12} />
          </button>
        )}
      </span>
    </div>
  )
}

// Ports the legacy Navbar avatar dropdown's rich "My Account" panel.
// Company/TPIN/Branch Code/Country/Currency/Switch Entity all read from the
// real backend (GET /api/general/ and /api/entities/ — see
// settings.queries.ts) — verified against the live PHP app's own "My
// Account" offcanvas panel, field-for-field. TimeZone is "UTC" because the
// backend itself reports it as a fixed value (not per-user-configurable),
// not because we hardcoded it here. Picking a different entity opens
// SwitchEntityModal rather than switching immediately — see that file for
// why (no token-based entity-switch endpoint exists on the backend).
export function AccountPanel({ user, onClose, onLogout }: { user: AuthUser | null; onClose: () => void; onLogout: () => void }) {
  const { data: settings } = useGeneralSettings()
  const { data: entities } = useEntities()
  const { data: companyDetails, isLoading: companyDetailsLoading } = useCompanyAccountDetails()
  const [now, setNow] = useState(new Date())
  const [pendingEntity, setPendingEntity] = useState<{ id: string; label: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [copyError, setCopyError] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const displayName = [user?.firstname, user?.lastname].filter(Boolean).join(' ') || user?.login || 'User'
  const companyName = settings?.app_name || '-'
  const tpin = settings?.tpin || companyDetails?.tpin || (companyDetailsLoading ? 'Loading…' : '-')
  const branchCode = settings?.branch_code || companyDetails?.branchCode || (companyDetailsLoading ? 'Loading…' : '-')
  const countryValue = settings?.country || companyDetails?.country
  const country = countryValue ? parseCountryLabel(countryValue) : companyDetailsLoading ? 'Loading…' : '-'
  const currencyCode = settings?.currency ?? ''
  const currencyLabel = `${CURRENCY_NAMES[currencyCode] ?? currencyCode} (${currencyCode})`
  const timeZoneLabel = settings?.timezone || 'UTC'
  const dateLabel = now.toLocaleDateString('en-ZM', { dateStyle: 'medium', timeZone: timeZoneLabel })
  // Explicit timeZone here, not just the 'en-ZM' locale — locale only
  // changes formatting conventions (AM/PM style, separators), not which
  // timezone the clock reflects. Without it this silently renders in the
  // *viewer's own* browser/OS timezone instead of the backend's.
  const timeLabel = now.toLocaleTimeString('en-ZM', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: timeZoneLabel })

  function copyValue(field: string, value: string) {
    setCopyError(false)
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field)
      window.setTimeout(() => setCopiedField((current) => current === field ? null : current), 1800)
    }).catch(() => setCopyError(true))
  }

  return (
    <div className="absolute right-0 z-40 mt-1 max-h-[min(44rem,calc(100vh-5rem))] w-[min(94vw,30rem)] overflow-y-auto rounded-xl border border-brand/40 bg-surface shadow-2xl soft-scrollbar">
      <div className="relative overflow-hidden rounded-t-xl border-b border-brand/20 bg-gradient-to-r from-brand/15 via-brand/[0.06] to-transparent">
        <div className="relative flex items-center justify-between gap-2.5 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative shrink-0">
              <CompanyLogo src={settings?.company_logo} name={companyName} userPhoto={user?.photo} />
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-text!">{displayName}</h2>
              <p className="mt-0.5 truncate text-[11px] text-text-muted">{user?.email || user?.login || 'Account profile'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  <BadgeCheck size={10} />
                  {user?.admin ? 'Administrator' : user?.job || 'User'}
                </span>
                {user?.login && <span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-text-muted">@{user.login}</span>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
              <CalendarDays size={16} className="text-brand" />
              <span className="text-[10px] leading-4 text-text-muted">{dateLabel}<br />{timeLabel} ({timeZoneLabel})</span>
            </div>
            <button type="button" onClick={onClose} title="Close account information" aria-label="Close account information" className="rounded-full border border-border p-1.5 text-text-faint hover:border-danger/50 hover:bg-danger/10 hover:text-danger">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {/* The classic "My Account" opens the user's own profile (userprofile/index.php?id=<own id>). */}
        {user ? (
          <Link
            to={ROUTES.userDetail.replace(':id', String(user.id))}
            onClick={onClose}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-brand/70 bg-gradient-to-r from-sky-500 to-blue-600 px-3 text-xs font-bold text-white shadow-[0_0_12px_rgba(22,139,255,0.3)] transition hover:brightness-110"
          >
            <User size={15} />
            My Account
            <ChevronRight size={14} className="ml-auto" />
          </Link>
        ) : (
          <span className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-3 text-xs font-semibold text-brand opacity-50">
            <User size={15} />
            My Account
          </span>
        )}
        <button type="button" onClick={onLogout} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-danger/60 bg-gradient-to-r from-rose-500 to-red-600 px-3 text-xs font-bold text-white shadow-[0_0_12px_rgba(239,68,68,0.25)] transition hover:brightness-110">
          <LogOut size={15} />
          Logout
          <ChevronRight size={14} className="ml-auto" />
        </button>
      </div>

      <section className="mx-2 my-2 rounded-lg border border-brand/25 bg-brand/[0.025] p-2.5">
        <h3 className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-brand">
          <User size={13} /> Account information
        </h3>
        <div className="rounded-md border border-border/80 bg-surface/70 px-2">
          {user?.email && <DetailRow icon={AtSign} label="Email" value={user.email} onCopy={() => copyValue('email', user.email!)} />}
          <DetailRow icon={User} label="Account type" value={user?.admin ? 'Administrator' : user?.job || 'Standard user'} />
        </div>
      </section>

      <section className="mx-2 my-2 rounded-lg border border-brand/25 bg-brand/[0.025] p-2.5">
        <h3 className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-brand">
          <Building2 size={13} /> Company information
        </h3>
        <div className="rounded-md border border-border/80 bg-surface/70 px-2">
          <DetailRow icon={Building2} label="Company" value={companyName} onCopy={() => copyValue('company', companyName)} />
          <DetailRow icon={Hash} label="TPIN" value={tpin} onCopy={() => copyValue('tpin', tpin)} />
          <DetailRow icon={MapPin} label="Branch Code" value={branchCode} onCopy={() => copyValue('branch', branchCode)} />
          <DetailRow icon={Globe2} label="Country" value={country} />
          <DetailRow icon={Wallet} label="Currency" value={currencyLabel} />
          <DetailRow icon={Clock3} label="TimeZone" value={timeZoneLabel} />
          <DetailRow icon={Clock3} label="Current Time" value={timeLabel} onCopy={() => copyValue('time', timeLabel)} />
        </div>
      </section>
      {(copiedField || copyError) && (
        <p role="status" className={`mx-3 text-[10px] ${copyError ? 'text-danger' : 'text-success'}`}>
          {copyError ? 'Could not copy. Clipboard access is unavailable.' : <><Check size={11} className="mr-1 inline" />Copied to clipboard</>}
        </p>
      )}

      <div className="border-b border-border px-3 py-2">
        <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-brand">
          <RefreshCw size={13} /> Switch entity
        </label>
        <select
          className="h-9 w-full rounded-md border border-brand/30 bg-input-bg px-3 text-xs font-medium text-text outline-none focus:ring-2 focus:ring-brand/30"
          value={settings?.entity != null ? String(settings.entity) : ''}
          onChange={(event) => {
            const picked = entities?.find((e) => String(e.id) === event.target.value)
            if (picked && String(picked.id) !== String(settings?.entity)) {
              setPendingEntity({ id: String(picked.id), label: picked.label })
            }
          }}
        >
          {(entities ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {pendingEntity && (
        <SwitchEntityModal
          entityId={pendingEntity.id}
          entityLabel={pendingEntity.label}
          loginName={user?.login ?? ''}
          onClose={() => setPendingEntity(null)}
        />
      )}

      <div className="grid grid-cols-3 gap-1.5 border-b border-border px-2.5 py-2">
        <ActionTile icon={FileText} label="User Guide" color="blue" />
        <ActionTile icon={MessageSquareText} label="FAQs" color="violet" />
        <ActionTile icon={BadgeCheck} label="License Info" color="green" />
      </div>

      <div className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-text! mb-2">
          <LifeBuoy size={14} className="text-brand" />
          Need Assistance?
        </p>
        <a href="mailto:business@ecuenta.online" className="flex items-center justify-between text-sm text-brand py-1.5 px-2 -mx-2 rounded-md hover:bg-surface-hover">
          <span className="flex items-center gap-2">
            <Mail size={14} />
            Send an email
          </span>
          <ChevronRight size={14} />
        </a>
        <div className="flex items-start gap-2 text-sm text-text-muted py-1.5 px-2 -mx-2 rounded-md">
          <Phone size={14} className="mt-0.5 shrink-0 text-text-faint" />
          <span>
            Talk to us (Mon - Fri &middot; 9:00 AM - 7:00 PM &middot; Toll Free)
            <br />
            Zambia -{' '}
            <a href="tel:+260764864419" className="text-brand hover:underline">
              +260-764 864 419
            </a>
            ,{' '}
            <a href="tel:+260972094734" className="text-brand hover:underline">
              +260-972094734
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}
