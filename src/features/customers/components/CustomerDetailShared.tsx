import {
  Info,
  ShoppingCart,
  CalendarClock,
  Users2,
  FileStack,
  BadgeDollarSign,
  Truck,
  Briefcase,
  Ticket,
  Wallet,
  Landmark,
  Bell,
  StickyNote,
  Paperclip,
  Tags,
  BookOpen,
} from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { type CustomerProfile } from '../customerDetail.queries'

function SectionIcon({ icon: Icon, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${ICON_STYLES[color]}`}>
      <Icon size={14} />
    </span>
  )
}

function SectionHeader({ icon, color, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <SectionIcon icon={icon} color={color} />
      <h3 className="font-semibold text-text!">{children}</h3>
    </div>
  )
}

// Matches the real legacy page's own titre convention (a thin blue accent
// bar to the left of a bold, brand-colored heading) — used for each tab's
// own top-level title (Transactions, Contacts, Contracts, Agenda), as
// distinct from SectionHeader's icon-badge style used inside the
// Third-Party tab's field cards.
function TabTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`flex items-center gap-2 font-semibold text-brand ${className}`}>
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
    </h3>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

// Same row, but becomes a real text input while the page is in edit mode —
// used only for the plain-string fields CustomerEditableFields covers.
// Falls back to the read-only InfoRow display outside edit mode so callers
// don't need two separate components per field.
function EditableRow({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  if (!editing) return <InfoRow label={label} value={value} />
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm text-text! text-right bg-input-bg border border-input-border rounded-md px-2 py-1 w-full max-w-[220px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      />
    </div>
  )
}

function StatTile({ label, value, count }: { label: string; value: string; count?: number }) {
  return (
    <div className="flex-1 min-w-[120px]">
      <p className="text-xs text-text-faint uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-text! mt-0.5">
        {value}
        {count !== undefined && <span className="text-xs font-normal text-text-faint ml-1.5">{count}</span>}
      </p>
    </div>
  )
}

function NotBuiltCard({ label }: { label: string }) {
  return (
    <Card className="!h-auto">
      <p className="text-sm text-text-faint italic py-8 text-center">{label} — not built yet. No real data source exists on this backend for this tab.</p>
    </Card>
  )
}

// Labels below are read straight from the real backend's own tab-bar
// template (societe/templates/layout.php's $navItems array — the
// authoritative source for what this exact page renders, not a guess from
// a screenshot): each is either $langs->trans('<TransKey>') resolved
// against the real English strings, or (for the four SPA-only additions
// with no translation key) the literal hardcoded label in that same file.
// Two real, load-bearing findings that weren't obvious from the UI alone:
//   - 'rib' and 'paymentmodes' are NOT two different tabs — same file,
//     same array entry (route 'paymentmodes', internal type 'rib', one
//     label "Payment Information") — confirmed by the explicit `rib:
//     'paymentmodes'` alias map in societe/assets/js/app.js. The previous
//     version of this list had them as two separate tabs by mistake.
//   - 'customer' has no static label at all in that file — its real label
//     is computed per-record ("Prospect" / "Customer" / "Prospect |
//     Customer", or hidden entirely when neither) — see CUSTOMER_TAB_LABEL
//     below, driven by the same real client_label the backend already
//     computes (CustomerProfile.clientLabel).
const TABS = [
  { key: 'societe', label: 'Third-party', icon: Info },
  { key: 'transactions', label: 'Transactions', icon: ShoppingCart },
  { key: 'activities', label: 'Activities', icon: CalendarClock },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'contracts', label: 'Contract-Follow', icon: FileStack },
  { key: 'customer', label: '', icon: BadgeDollarSign },
  { key: 'vendor', label: 'Vendor', icon: Truck },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
  { key: 'projects', label: 'Projects', icon: Briefcase },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'expenses', label: 'Expenses', icon: Wallet },
  { key: 'consumption', label: 'Related Items', icon: BadgeDollarSign },
  { key: 'paymentmodes', label: 'Payment Information', icon: Landmark },
  { key: 'notify', label: 'Notifications', icon: Bell },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'pricing_groups', label: 'Pricing Groups', icon: Tags },
  { key: 'accounting_ar', label: 'Accounts Receivable', icon: BookOpen },
  { key: 'accounting_ap', label: 'Accounts Payable', icon: BookOpen },
  { key: 'general_ledger', label: 'General Ledger', icon: BookOpen },
] as const

type TabKey = (typeof TABS)[number]['key']

// client===1 -> "Customer", client===2 -> "Prospect", client===3 -> both,
// client===0 -> tab hidden entirely — matches societe/templates/layout.php's
// own $customerNavLabel logic exactly (CustomerProfile.clientLabel is the
// same value the real backend already computes with this rule).
function natureBadgeLabel(data: CustomerProfile): string {
  return data.isCustomer && data.client === 2 ? 'Prospect' : data.isCustomer ? 'Customer' : data.isVendor ? 'Vendor' : 'Third-party'
}

function customerTabLabel(data: CustomerProfile): string {
  return data.clientLabel
}

// Valid TABS keys, for sanitizing an externally-supplied ?tab= query param
// (e.g. the Vendor List's "Nature Of Third Party" column linking straight
// to the Vendor tab) — an unknown/stale value silently falls back to the
// default 'societe' tab rather than rendering a broken NotBuiltCard.
const TAB_KEYS = new Set(TABS.map((t) => t.key))

export {
  SectionIcon,
  SectionHeader,
  TabTitle,
  InfoRow,
  EditableRow,
  StatTile,
  NotBuiltCard,
  natureBadgeLabel,
  customerTabLabel,
  TABS,
  TAB_KEYS,
}
export type { TabKey }
