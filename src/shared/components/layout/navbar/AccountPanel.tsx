import { useEffect, useState } from 'react'
import { X, User, LogOut, FileText, MessageSquareText, BadgeCheck, Mail, Phone, ChevronRight } from 'lucide-react'
import { useGeneralSettings, useEntities } from '../../../../features/settings/settings.queries'
import type { AuthUser } from '../../../../features/auth/AuthContext'
import { Avatar } from '../../Avatar'
import { SwitchEntityModal } from './SwitchEntityModal'

const CURRENCY_NAMES: Record<string, string> = { ZMW: 'Zambian Kwacha', USD: 'US Dollar', INR: 'Indian Rupee', GBP: 'British Pound', EUR: 'Euro' }

function parseCountryLabel(value?: string) {
  if (!value) return '-'
  const parts = value.split(':')
  return parts[parts.length - 1] || value
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
  const branchCode = settings?.branch_code || ''
  const country = parseCountryLabel(settings?.country)
  const currencyCode = settings?.currency || 'ZMW'
  const currencyLabel = `${CURRENCY_NAMES[currencyCode] ?? currencyCode} (${currencyCode})`
  const timeZoneLabel = settings?.timezone || 'UTC'
  // Explicit timeZone here, not just the 'en-ZM' locale — locale only
  // changes formatting conventions (AM/PM style, separators), not which
  // timezone the clock reflects. Without it this silently renders in the
  // *viewer's own* browser/OS timezone instead of the backend's.
  const timeLabel = now.toLocaleTimeString('en-ZM', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: timeZoneLabel })

  return (
    <div className="absolute right-0 mt-1 w-[min(90vw,24rem)] max-h-[calc(100vh-4rem)] overflow-y-auto soft-scrollbar bg-surface border border-border rounded-lg shadow-xl z-30">
      <div className="flex items-start justify-between gap-2 p-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar photo={user?.photo} name={displayName} size={48} rounded="lg" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text truncate">{displayName}</div>
            <div className="text-xs text-text-faint truncate">({user?.login})</div>
          </div>
        </div>
        <button type="button" onClick={onClose} title="Close" className="p-1 rounded-md text-danger hover:bg-surface-alt shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-border flex items-center gap-4">
        <button type="button" className="flex items-center gap-1.5 text-sm text-brand hover:underline py-1.5">
          <User size={14} />
          My Account
        </button>
        <button type="button" onClick={onLogout} className="flex items-center gap-1.5 text-sm text-danger hover:underline py-1.5">
          <LogOut size={14} />
          Logout
        </button>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-text-muted">Company</dt>
          <dd className="text-right text-brand font-medium">{companyName}</dd>
          <dt className="text-text-muted">TPIN</dt>
          <dd className="text-right text-text">{tpin}</dd>
          <dt className="text-text-muted">Branch Code</dt>
          <dd className="text-right text-text">{branchCode}</dd>
          <dt className="text-text-muted">Country</dt>
          <dd className="text-right text-text">{country}</dd>
          <dt className="text-text-muted">Currency</dt>
          <dd className="text-right text-text">{currencyLabel}</dd>
          <dt className="text-text-muted">TimeZone</dt>
          <dd className="text-right text-text">{timeZoneLabel}</dd>
          <dt className="text-text-muted">Time</dt>
          <dd className="text-right text-text tabular-nums">{timeLabel}</dd>
        </dl>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <label className="block text-xs font-semibold uppercase tracking-wide text-text-faint mb-1">Switch Entity</label>
        <select
          className="w-full h-9 px-3 rounded-md border border-input-border bg-blue-50 dark:bg-blue-950 text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
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

      <div className="px-4 py-3 border-b border-border grid grid-cols-3 gap-2 text-center">
        {[
          { icon: FileText, label: 'User Guide' },
          { icon: MessageSquareText, label: 'FAQs' },
          { icon: BadgeCheck, label: 'License Info' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 py-2 rounded-md text-text cursor-default">
            <Icon size={26} strokeWidth={2} />
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>

      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-text mb-2">Need Assistance?</div>
        <div className="flex items-center justify-between text-sm text-brand py-1">
          <span className="flex items-center gap-2">
            <Mail size={14} />
            Send an email
          </span>
          <ChevronRight size={14} />
        </div>
        <div className="flex items-start gap-2 text-sm text-text-muted py-1">
          <Phone size={14} className="mt-0.5 shrink-0" />
          <span>
            Talk to us (Mon - Fri · 9:00 AM - 7:00 PM · Toll Free)
            <br />
            Zambia - <span className="text-brand">+260-764 864 419</span>, <span className="text-brand">+260-972094734</span>
          </span>
        </div>
      </div>
    </div>
  )
}
