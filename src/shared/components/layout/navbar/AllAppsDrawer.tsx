import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Search,
  PlusCircle,
  List,
  ClipboardList,
  BarChart3,
  LayoutGrid,
  FileText,
  FileEdit,
  CheckCircle2,
  PackageCheck,
  Tag,
  Users,
  User,
  Landmark,
  Wallet,
  HandCoins,
  CalendarDays,
  Clock,
  ArrowLeftRight,
  Award,
  LogOut,
  Plane,
  MessageSquareWarning,
  AlertTriangle,
  Gauge,
  Star,
  PiggyBank,
  BookText,
  Scale,
  ListTree,
  FileSignature,
  Handshake,
  Truck,
  Boxes,
  MapPin,
  Receipt,
  Factory,
  Archive,
  ShieldCheck,
  Send,
  Lock,
  Download,
  Upload,
  Hourglass,
  Zap,
  Package,
  Users2,
  type LucideIcon,
} from 'lucide-react'
import type { NavItem, NavLeafItem, NavSection } from '../../../../features/navTypes'
import { PATH_SOURCE_SECTIONS } from '../../../nav/pathSourceSections'
import { ICON_STYLES, type IconColor } from '../../dashboard/DashboardKit'

// Ports the legacy Navbar's "All Apps" launcher (the icon-grid-by-category
// overlay opened from the search box) as a right-side drawer. Reuses
// PATH_SOURCE_SECTIONS — the same flat list of all 17 *.nav.ts files
// Sidebar.tsx renders — as the source of truth, so a page shown here is
// exactly a page the sidebar itself would also link to (same `path`
// convention: only leaf items with a path are treated as real
// destinations).
const SECTION_COLORS: IconColor[] = ['blue', 'green', 'violet', 'amber', 'cyan', 'rose', 'indigo']

// No per-item icons exist in the nav data (only one icon per whole
// section), so individual tile icons are picked from the label text —
// checked in order, most specific first, so e.g. "Create Purchase Order"
// matches Create before it could ever match Order-ish patterns. Falls back
// to the section's own icon only when nothing here matches, which the
// legacy reference app rarely needed given its much richer per-item icon
// set — this list is the practical middle ground without hand-authoring
// 300+ one-off icons.
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/^(create|new|add)\b/i, PlusCircle],
  [/\bdraft\b/i, FileEdit],
  [/\bvalidated\b/i, CheckCircle2],
  [/\bprocessed\b/i, PackageCheck],
  [/^import\b|\bunuploaded\b|\bun-uploaded\b/i, Download],
  [/\buploaded?\b/i, Upload],
  [/\bpending\b/i, Hourglass],
  [/\bautomatic\b/i, Zap],
  [/\bstock\b/i, Package],
  [/\bcustomers?\b/i, Users2],
  [/\b(statistics?|reports?|reporting)\b/i, BarChart3],
  [/\bdetails?\b/i, FileText],
  [/\btags?\s*\/?\s*categor/i, Tag],
  [/\bgroups?\b/i, Users],
  [/\busers?\b/i, User],
  [/\bbanks?\b|bank account/i, Landmark],
  [/\bfinancial account/i, Wallet],
  [/\bloans?\b/i, HandCoins],
  [/\bleave|holiday/i, CalendarDays],
  [/\battendance/i, Clock],
  [/\bsalary|salaries|payment|payroll|allowance|deduction/i, Wallet],
  [/\btransfers?\b/i, ArrowLeftRight],
  [/\baward/i, Award],
  [/\bresignation/i, LogOut],
  [/\btravel/i, Plane],
  [/\bcomplaint/i, MessageSquareWarning],
  [/\bwarning/i, AlertTriangle],
  [/\bcalendar|events?\b/i, CalendarDays],
  [/\bindicator/i, Gauge],
  [/\bappraisal/i, Star],
  [/\bdeposit/i, PiggyBank],
  [/\bjournal/i, BookText],
  [/\bopening balance|\bbalance\b/i, Scale],
  [/\bchart of (individual )?accounts/i, ListTree],
  [/\bcontract/i, FileSignature],
  [/\bproposal/i, Handshake],
  [/\bvendors?\b/i, Truck],
  [/\bshipments?\b/i, Truck],
  [/\breceptions?\b/i, PackageCheck],
  [/\binventory|inventories/i, Boxes],
  [/\btrip/i, MapPin],
  [/\bfleet|expense/i, Receipt],
  [/\bmanufactur|production|\bmrp\b|bill of material/i, Factory],
  [/\bassets?\b/i, Archive],
  [/\binsurance/i, ShieldCheck],
  [/\bdispatch|binding/i, Send],
  [/\bclosure/i, Lock],
  [/\blists?\b/i, List],
  [/\barea\b/i, LayoutGrid],
  [/\bstatements?\b/i, ClipboardList],
]

function pickItemIcon(label: string, fallback: LucideIcon): LucideIcon {
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(label)) return icon
  }
  return fallback
}

function isGroup(item: NavItem): item is Extract<NavItem, { items: NavItem[] }> {
  return 'items' in item
}

function flattenLeaves(items: NavItem[]): NavLeafItem[] {
  const out: NavLeafItem[] = []
  for (const item of items) {
    if (isGroup(item)) out.push(...flattenLeaves(item.items))
    else if (item.path) out.push(item)
  }
  return out
}

interface AppGroup {
  key: string
  label: string
  color: IconColor
  icon: LucideIcon
  items: NavLeafItem[]
}

function buildGroups(query: string): AppGroup[] {
  const q = query.trim().toLowerCase()
  const groups: AppGroup[] = []
  PATH_SOURCE_SECTIONS.forEach((section: NavSection, i) => {
    const leaves = flattenLeaves(section.items).filter((leaf) => !q || leaf.label.toLowerCase().includes(q))
    if (leaves.length === 0) return
    groups.push({ key: section.key, label: section.label, color: SECTION_COLORS[i % SECTION_COLORS.length], icon: section.icon, items: leaves })
  })
  return groups
}

export function AllAppsDrawer({
  query,
  onQueryChange,
  onClose,
}: {
  query: string
  onQueryChange: (value: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const groups = buildGroups(query)

  return (
    <>
      <div className="fixed inset-0 top-14 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="All apps"
        className="fixed top-14 right-0 bottom-0 z-40 w-full max-w-md sm:max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col animate-[allAppsSlideIn_0.22s_ease-out]"
      >
        <style>{'@keyframes allAppsSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }'}</style>

        <div className="flex items-center justify-between gap-3 p-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-text!">All Apps</h2>
          <button type="button" onClick={onClose} title="Close" className="p-1.5 rounded-md text-text-faint hover:bg-danger/10 hover:text-danger">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 h-9 px-3 rounded-full bg-surface-alt text-text-faint">
            <Search size={15} className="shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search anythings"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-text placeholder-text-faint"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto soft-scrollbar px-4 pb-6">
          {groups.length === 0 ? (
            <p className="text-sm text-text-faint text-center py-10">No pages match &ldquo;{query}&rdquo;.</p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-faint mb-2">{group.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => {
                    const Icon = pickItemIcon(item.label, group.icon)
                    return (
                      <Link
                        key={item.path}
                        to={item.path!}
                        onClick={onClose}
                        className="group flex flex-col items-center justify-center gap-1.5 rounded-lg p-2.5 text-center hover:bg-surface-hover transition-colors"
                      >
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${ICON_STYLES[group.color]}`}>
                          <Icon size={18} />
                        </span>
                        <span className="text-[11px] leading-tight text-text-muted line-clamp-2">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
