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
} from 'lucide-react'
import { useGeneralSettings, useEntities } from '../../../../features/settings/settings.queries'
import type { AuthUser } from '../../../../features/auth/AuthContext'
import { Avatar } from '../../Avatar'
import { ActionTile } from '../../dashboard/DashboardKit'
import { SwitchEntityModal } from './SwitchEntityModal'

const CURRENCY_NAMES: Record<string, string> = { ZMW: 'Zambian Kwacha', USD: 'US Dollar', INR: 'Indian Rupee', GBP: 'British Pound', EUR: 'Euro' }

function parseCountryLabel(value?: string) {
  if (!value) return '-'
  const parts = value.split(':')
  return parts[parts.length - 1] || value
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-2 text-xs text-text-muted">
        <Icon size={13} className="text-text-faint shrink-0" />
        {label}
      </span>
      <span className="text-sm font-medium text-text! text-right truncate">{value}</span>
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
  const [now, setNow] = useState(new Date())
  const [pendingEntity, setPendingEntity] = useState<{ id: string; label: string } | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const displayName = [user?.firstname, user?.lastname].filter(Boolean).join(' ') || user?.login || 'User'
  const companyName = settings?.app_name || '-'
  const tpin = settings?.tpin || '-'
  const branchCode = settings?.branch_code || '-'
  const country = parseCountryLabel(settings?.country)
  const currencyCode = settings?.currency ?? ''
  const currencyLabel = `${CURRENCY_NAMES[currencyCode] ?? currencyCode} (${currencyCode})`
  const timeZoneLabel = settings?.timezone || 'UTC'
  // Explicit timeZone here, not just the 'en-ZM' locale — locale only
  // changes formatting conventions (AM/PM style, separators), not which
  // timezone the clock reflects. Without it this silently renders in the
  // *viewer's own* browser/OS timezone instead of the backend's.
  const timeLabel = now.toLocaleTimeString('en-ZM', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: timeZoneLabel })

  return (
    <div className="absolute right-0 mt-1 w-[min(90vw,24rem)] max-h-[calc(100vh-4rem)] overflow-y-auto soft-scrollbar bg-surface border border-border rounded-xl shadow-xl z-30">
      <div className="relative overflow-hidden rounded-t-xl bg-brand/5">
        <div className="relative flex items-start justify-between gap-2 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar photo={user?.photo} name={displayName} size={48} rounded="lg" className="ring-2 ring-brand/20" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text! truncate">{displayName}</div>
              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-text-muted truncate">
                {user?.login}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} title="Close" className="p-1.5 rounded-md text-text-faint hover:bg-danger/10 hover:text-danger shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <button type="button" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 text-brand px-3 py-1.5 text-xs font-medium hover:bg-brand/15">
          <User size={13} />
          My Account
        </button>
        <button type="button" onClick={onLogout} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-danger/10 text-danger px-3 py-1.5 text-xs font-medium hover:bg-danger/15">
          <LogOut size={13} />
          Logout
        </button>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-2">Account Details</p>
        <div className="space-y-0.5">
          <DetailRow icon={Building2} label="Company" value={companyName} />
          <DetailRow icon={Hash} label="TPIN" value={tpin} />
          <DetailRow icon={MapPin} label="Branch Code" value={branchCode} />
          <DetailRow icon={Globe2} label="Country" value={country} />
          <DetailRow icon={Wallet} label="Currency" value={currencyLabel} />
          <DetailRow icon={Clock3} label="TimeZone" value={timeZoneLabel} />
          <DetailRow icon={Clock3} label="Time" value={timeLabel} />
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-1.5">
          <RefreshCw size={11} />
          Switch Entity
        </label>
        <select
          className="w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
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

      <div className="px-4 py-3 border-b border-border grid grid-cols-3 gap-2">
        <ActionTile icon={FileText} label="User Guide" color="blue" />
        <ActionTile icon={MessageSquareText} label="FAQs" color="violet" />
        <ActionTile icon={BadgeCheck} label="License Info" color="green" />
      </div>

      <div className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-text! mb-2">
          <LifeBuoy size={14} className="text-brand" />
          Need Assistance?
        </p>
        <div className="flex items-center justify-between text-sm text-brand py-1.5 px-2 -mx-2 rounded-md hover:bg-surface-hover cursor-pointer">
          <span className="flex items-center gap-2">
            <Mail size={14} />
            Send an email
          </span>
          <ChevronRight size={14} />
        </div>
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
