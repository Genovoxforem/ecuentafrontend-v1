import { useMemo, useState } from 'react'
import { useNavigate, useLocation, type NavigateFunction, type Location } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import {
  House,
  Shield,
  ShoppingCart,
  ShoppingBag,
  Package,
  Warehouse,
  Briefcase,
  Bank,
  CurrencyCircleDollar,
  Users,
  Wallet,
  ForkKnife,
  Buildings,
  BookOpenText,
  Ticket,
  Gear,
  UsersThree,
  FileText,
  ChatCircle,
  CaretDown,
  CaretRight,
  SignOut,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import { nav as homeNav } from '../../../features/home/home.nav'
import { nav as zraNav } from '../../../features/zra/zra.nav'
import { nav as billingNav } from '../../../features/billing/billing.nav'
import { nav as purchasesNav } from '../../../features/purchases/purchases.nav'
import { nav as productsNav } from '../../../features/products/products.nav'
import { nav as warehousesNav } from '../../../features/warehouses/warehouses.nav'
import { nav as projectsNav } from '../../../features/projects/projects.nav'
import { nav as bankingNav } from '../../../features/banking/banking.nav'
import { nav as loansNav } from '../../../features/loans/loans.nav'
import { nav as usersNav } from '../../../features/users/users.nav'
import { nav as payrollNav } from '../../../features/payroll/payroll.nav'
import { nav as kitchenNav } from '../../../features/kitchen/kitchen.nav'
import { nav as fixedAssetNav } from '../../../features/fixedAsset/fixedAsset.nav'
import { nav as generalLedgerNav } from '../../../features/generalLedger/generalLedger.nav'
import { nav as ticketNav } from '../../../features/ticket/ticket.nav'
import { nav as settingsNav } from '../../../features/settings/settings.nav'
import { nav as reportsNav } from '../../../features/reports/reports.nav'
import type { NavItem, NavLeafItem, NavSection } from '../../../features/navTypes'
import { useAppMenu } from '../../nav/appMenu.queries'
import { buildNavSections } from '../../nav/buildNavSections'
import { MODERN_GLASS_BG, MODERN_GLASS_SHEEN, MODERN_CONTENT_SHADOW, MODERN_ICON_REST_COLOR } from './modernGlass'

// Used only as a label->path lookup by buildNavSections now (see there) —
// the actual section list, order, and item hierarchy come from GET
// /api/menu/ (the real backend's own llx_menu data for this user), the
// exact same real navigation data the legacy rail (Sidebar.tsx) renders,
// just a different visual/interaction skin over it.
const PATH_SOURCE_SECTIONS: NavSection[] = [
  homeNav,
  zraNav,
  billingNav,
  purchasesNav,
  productsNav,
  warehousesNav,
  projectsNav,
  bankingNav,
  loansNav,
  usersNav,
  payrollNav,
  kitchenNav,
  fixedAssetNav,
  generalLedgerNav,
  ticketNav,
  settingsNav,
  reportsNav,
]

// Duotone-style icon per section (keyed by section.key, not section.icon) —
// a separate set from the plain-outline lucide icons above, which stay on
// the SECTIONS array only because NavSection requires an `icon` field and
// the legacy Sidebar.tsx still renders those directly. Matched by real
// meaning to each section's actual lucide icon (see the *.nav.ts files):
// House<->LayoutGrid, Shield<->Shield, ShoppingCart<->ShoppingCart (billing),
// ShoppingBag<->ShoppingBag (purchases), Package<->Box, Warehouse<->Warehouse,
// Briefcase<->Briefcase (projects), Bank<->Landmark, CurrencyCircleDollar<->
// CircleDollarSign, Users<->Users, Wallet<->Wallet, Receipt/Archive kept as
// lucide fallback (no real duotone-lookup mismatch risk for these two
// inline-only sections), ForkKnife<->Utensils, Buildings<->BriefcaseBusiness
// (fixed asset), BookOpenText<->BookText, Ticket<->Ticket, Gear<->Settings,
// UsersThree<->UsersRound (members), FileText<->FileText, ChatCircle<->MessageCircle.
const PHOSPHOR_ICON: Record<string, PhosphorIcon> = {
  home: House,
  zra: Shield,
  sales: ShoppingCart,
  purchases: ShoppingBag,
  products: Package,
  warehouses: Warehouse,
  projects: Briefcase,
  banking: Bank,
  loans: CurrencyCircleDollar,
  users: Users,
  payroll: Wallet,
  kitchen: ForkKnife,
  'fixed-asset': Buildings,
  'general-ledger': BookOpenText,
  ticket: Ticket,
  administrator: Gear,
  members: UsersThree,
  reports: FileText,
  chat: ChatCircle,
}

function sectionContainsCurrent(section: NavSection, pathname: string): boolean {
  return section.items.some((item) => itemContainsCurrent(item, pathname))
}
function isGroupItem(item: NavItem): item is { label: string; items: NavItem[] } {
  return 'items' in item
}
function itemContainsCurrent(item: NavItem, pathname: string): boolean {
  if (isGroupItem(item)) return item.items.some((sub) => itemContainsCurrent(sub, pathname))
  return item.path === pathname
}

function NavLeaf({ item, depth = 0, navigate, location }: { item: NavLeafItem; depth?: number; navigate: NavigateFunction; location: Location }) {
  const isLink = Boolean(item.path)
  const isCurrent = isLink && location.pathname === item.path
  return (
    <button
      type="button"
      disabled={!isLink}
      onClick={isLink ? () => navigate(item.path!) : undefined}
      style={{ paddingLeft: `${1.5 + depth * 0.5}rem` }}
      className={`w-full flex items-center gap-2 text-left pr-2.5 py-1.5 rounded-lg text-sm transition-colors ${
        isCurrent ? 'bg-white/15 text-white font-semibold' : isLink ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-white/30 cursor-default'
      }`}
    >
      <span className={`w-1 h-1 rounded-full shrink-0 ${isCurrent ? 'bg-(--color-accent-cyan-2)' : 'bg-transparent'}`} />
      <span className="truncate">{item.label}</span>
    </button>
  )
}

// Recursive: a group can itself contain groups (real depth varies by module
// — most are 2 levels, a few like Employee/General Ledger go to 3).
function NavGroup({ item, depth, navigate, location }: { item: { label: string; items: NavItem[] }; depth: number; navigate: NavigateFunction; location: Location }) {
  const [open, setOpen] = useState(() => itemContainsCurrent(item, location.pathname))
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${1.5 + depth * 0.75}rem` }}
        className={`w-full flex items-center justify-between gap-2 pr-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
          open ? 'text-white' : 'text-white/45 hover:text-white/80'
        }`}
      >
        <span className="truncate">{item.label}</span>
        <CaretDown size={12} weight="bold" className={`shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {item.items.map((sub) =>
            isGroupItem(sub) ? (
              <NavGroup key={sub.label} item={sub} depth={depth + 1} navigate={navigate} location={location} />
            ) : (
              <NavLeaf key={sub.label} item={sub} depth={depth + 1} navigate={navigate} location={location} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

// Real "MENU" section — flat top-level list of the same real SECTIONS this
// app already has (Home, ZRA, Sales, Purchases, ... Administrator/Settings),
// each expanding inline (click to open/close, exclusive per section) into
// its real leaf items/groups instead of a hover flyout — the interaction
// model a single-column "modern" sidebar like the reference actually uses,
// vs. the legacy rail+flyout split.
function MenuList({ sections, navigate, location }: { sections: NavSection[]; navigate: NavigateFunction; location: Location }) {
  const [openSection, setOpenSection] = useState<string | null>(() => sections.find((s) => sectionContainsCurrent(s, location.pathname))?.key ?? null)

  return (
    <div className="space-y-0.5">
      {sections.map((section) => {
        const Icon = PHOSPHOR_ICON[section.key] ?? section.icon
        const isOpen = openSection === section.key
        const isCurrent = sectionContainsCurrent(section, location.pathname)
        return (
          <div key={section.key}>
            <button
              type="button"
              onClick={() => setOpenSection((cur) => (cur === section.key ? null : section.key))}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                isOpen || isCurrent ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={19} weight="duotone" className={`shrink-0 ${isOpen || isCurrent ? 'text-white' : MODERN_ICON_REST_COLOR}`} />
              <span className="flex-1 text-left truncate">{section.label}</span>
              {section.items.length > 0 &&
                (isOpen ? (
                  <CaretDown size={14} weight="bold" className="shrink-0 text-white/50" />
                ) : (
                  <CaretRight size={14} weight="bold" className="shrink-0 text-white/50" />
                ))}
            </button>
            {isOpen && (
              <div className="mt-0.5 mb-1 space-y-0.5">
                {section.items.length === 0 && <p className="text-xs italic text-white/30 pl-6 py-1">Nothing here yet.</p>}
                {section.items.map((item) =>
                  isGroupItem(item) ? (
                    <NavGroup key={item.label} item={item} depth={0} navigate={navigate} location={location} />
                  ) : (
                    <NavLeaf key={item.label} item={item} navigate={navigate} location={location} />
                  ),
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// "Modern" sidebar style — a single-column gradient panel (alternative to
// the legacy rail+flyout Sidebar.tsx), switched via the Navbar toggle and
// persisted in SidebarStyleContext. Always dark regardless of the app's own
// light/dark theme, matching the always-dark reference design this was
// built from — the real navigation data, active-route highlighting, and
// logout action underneath are identical to the legacy sidebar, only the
// visual shell and interaction model differ. No account/profile row here —
// that's still reachable from the Navbar's own avatar menu.
export function ModernSidebar({ open = true, onLogout }: { open?: boolean; onLogout: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: menu } = useAppMenu()
  // GET /api/menu/'s real backend response drives the section list itself;
  // PATH_SOURCE_SECTIONS only supplies each real label's already-verified
  // React path (see buildNavSections) and covers the one frame before the
  // request resolves.
  const SECTIONS = useMemo(() => (menu ? buildNavSections(menu, PATH_SOURCE_SECTIONS, LayoutGrid) : PATH_SOURCE_SECTIONS), [menu])
  const [hovering, setHovering] = useState(false)
  const expanded = open || hovering

  return (
    <div
      className={`relative h-full shrink-0 transition-[width] duration-300 ease-in-out ${open ? 'w-64' : 'w-16'}`}
      onMouseEnter={() => !open && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <aside
        className={`h-full flex flex-col overflow-hidden border-r border-white/10 transition-[width] duration-300 ease-in-out ${
          open ? 'relative w-64' : `absolute left-0 top-0 z-30 shadow-2xl ${expanded ? 'w-64' : 'w-16'}`
        }`}
      >
        {/* Flat translucent tint, no blur — plain glass rather than frosted glass. Kept on its own childless layer,
            separate from the content below, purely so the drop-shadow on the content layer never touches this tint. */}
        <div className="absolute inset-0" style={{ backgroundColor: MODERN_GLASS_BG, backgroundImage: MODERN_GLASS_SHEEN }} />
        {/* No top glass-highlight line here — this top edge sits directly against the navbar's bottom edge (not a real
            outer edge), so a highlight line here would just recreate the seam. Navbar keeps the one at its own true top. */}

        {/* Content sits on its own layer with a drop-shadow (covers icons too, unlike text-shadow) so it stays
            legible against a genuinely transparent glass panel regardless of what's behind it. */}
        <div className="relative z-10 flex flex-col h-full" style={{ filter: MODERN_CONTENT_SHADOW }}>
          {expanded && <p className="px-4 pt-5 pb-2 text-[11px] font-bold tracking-widest text-white/35">MENU</p>}

          <div className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2.5 pb-2 ${expanded ? '' : 'pt-5'}`}>
            {expanded ? (
              <MenuList sections={SECTIONS} navigate={navigate} location={location} />
            ) : (
              <div className="space-y-1">
                {SECTIONS.map((section) => {
                  const Icon = PHOSPHOR_ICON[section.key] ?? section.icon
                  const isCurrent = sectionContainsCurrent(section, location.pathname)
                  return (
                    <div key={section.key} className="group/rail relative">
                      <button
                        type="button"
                        title={section.label}
                        className={`w-full flex items-center justify-center h-10 rounded-xl transition-colors ${
                          isCurrent ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon size={20} weight="duotone" className={isCurrent ? 'text-white' : MODERN_ICON_REST_COLOR} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className={`px-2.5 py-3 border-t border-white/10 ${expanded ? '' : 'flex justify-center'}`}>
            <button
              type="button"
              onClick={onLogout}
              title="Log Out"
              className={`flex items-center gap-2.5 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors ${
                expanded ? 'w-full px-3 py-2' : 'w-10 h-10 justify-center'
              }`}
            >
              <SignOut size={19} weight="duotone" />
              {expanded && <span className="text-sm font-medium">Log Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
