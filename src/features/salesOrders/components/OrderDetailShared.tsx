import { type ReactNode } from 'react'
import {
  FileText,
  Users,
  Truck,
  PackageMinus,
  StickyNote,
  Paperclip,
  CalendarClock,
  Pencil,
  type LucideIcon,
} from 'lucide-react'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

// Small inline pencil used next to the Ref./Ref. customer/Project labels —
// each has its own real per-field edit link (action=editref,
// action=editref_client, action=classify), distinct from the header's
// whole-order action=modif pencil.
function EditPencil({ url, title }: { url: string; title: string }) {
  return (
    <a href={stripBackendPrefix(url)} target="_blank" rel="noreferrer" title={title} className="text-text-faint hover:text-brand">
      <Pencil size={11} />
    </a>
  )
}

function EventByAvatar({ name }: { name: string }) {
  if (!name) return null
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-semibold shrink-0">{initials}</span>
      {name}
    </span>
  )
}

const TABS = [
  { key: 'details', label: 'Sales Order', icon: FileText },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users },
  { key: 'shipments', label: 'Shipments - Delivery Receipts', icon: Truck },
  { key: 'consumption', label: 'Stock Consumptions', icon: PackageMinus },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
] as const
type TabKey = (typeof TABS)[number]['key']

function StatCard({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: 'purple' | 'green' | 'blue'; label: string; value: string }) {
  const toneCls = { purple: 'bg-violet-500', green: 'bg-emerald-500', blue: 'bg-blue-500' }[tone]
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg text-white shrink-0 ${toneCls}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-faint truncate">{label}</p>
        <p className="text-sm font-bold text-text! mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// The real `.deletefilelink` href only ever lands on document.php's own
// confirmation box (action=deletefile) — reading
// core/actions_linkedfiles.inc.php directly shows the actual file removal
// only happens on action=confirm_deletefile&confirm=yes. Since we render
// our own window.confirm() above in place of that box, we go straight to
// the real final action instead of fetching (and discarding) the
// intermediate confirmation page — the previous version silently never
// deleted anything.
async function deleteOrderDocument(deleteUrl: string, name: string, refetch: () => void) {
  if (!deleteUrl) return
  if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
  const finalUrl = deleteUrl.replace('action=deletefile', 'action=confirm_deletefile') + '&confirm=yes'
  await fetch(stripBackendPrefix(finalUrl), { credentials: 'same-origin' })
  refetch()
}

export { InfoRow, EditPencil, EventByAvatar, StatCard, deleteOrderDocument, TABS }
export type { TabKey }
