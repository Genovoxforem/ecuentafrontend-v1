import { Lock } from 'lucide-react'
import { ICON_STYLES, type IconColor } from '../../../../shared/components/dashboard/DashboardKit'
import type { CustomerProfile } from '../../customerDetail.queries'

export function SectionIcon({ icon: Icon, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${ICON_STYLES[color]}`}>
      <Icon size={14} />
    </span>
  )
}

// Matches the real legacy page's own titre convention (a thin blue accent
// bar to the left of a bold, brand-colored heading) — used for each tab's
// own top-level title (Transactions, Contacts, Contracts, Agenda), as
// distinct from SectionHeader's icon-badge style used inside the
// Third-Party tab's field cards.
export function TabTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`flex items-center gap-2 font-semibold text-brand ${className}`}>
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
    </h3>
  )
}

export function InfoRow({ label, value, locked = false }: { label: string; value: React.ReactNode; locked?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 border-b border-border last:border-0 ${locked ? 'opacity-60' : ''}`} title={locked ? 'Not editable here — use the full edit form' : undefined}>
      <span className="flex items-center gap-1 text-xs text-text-faint shrink-0">
        {locked && <Lock size={10} className="shrink-0" />}
        {label}
      </span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

// Quick edit's dropdown choices (kept as the dropdowns' own string values).
export interface QuickSelectValues {
  prospectCustomer: 'prospect' | 'customer' | 'none'
  vendor: 'yes' | 'no'
  forme: string
  effectif: string
  country: string
  custcats: number[]
  suppcats: number[]
}

// client===1 -> "Customer", client===2 -> "Prospect", client===3 -> both,
// client===0 -> tab hidden entirely — matches societe/templates/layout.php's
// own $customerNavLabel logic exactly (CustomerProfile.clientLabel is the
// same value the real backend already computes with this rule).
export function natureBadgeLabel(data: CustomerProfile): string {
  return data.isCustomer && data.client === 2 ? 'Prospect' : data.isCustomer ? 'Customer' : data.isVendor ? 'Vendor' : 'Third-party'
}
