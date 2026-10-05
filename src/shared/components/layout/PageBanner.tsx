import { useMemo } from 'react'
import { LayoutGrid, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NavItem, NavSection } from '../../../features/navTypes'
import { ROUTES } from '../../../routes'
import { useTheme } from '../../../context/ThemeContext'
import { buildBreadcrumb, isDetailPagePath } from './Breadcrumb'

type BannerRoute = { key: string; path: string; kind: 'list' | 'detail' }

const BANNER_ROUTES: BannerRoute[] = Object.entries(ROUTES)
  .reduce<BannerRoute[]>((routes, [key, path]) => {
    const normalizedKey = key.toLowerCase()
    if (normalizedKey.includes('create') || normalizedKey.includes('edit')) return routes
    if (normalizedKey.includes('list') || key === 'bankingAccounts' || key === 'loanProducts') routes.push({ key, path, kind: 'list' })
    return routes
  }, [])
  .sort((a, b) => b.path.split('/').length - a.path.split('/').length)

const DETAIL_BANNER_ROUTES: BannerRoute[] = Object.entries(ROUTES)
  .filter(([key]) => /(?:Detail|Card)$/i.test(key))
  .map(([key, path]) => ({ key, path, kind: 'detail' as const }))
  .sort((a, b) => b.path.split('/').length - a.path.split('/').length)

const CREATE_PATH_OVERRIDES: Record<string, string> = {
  customerList: ROUTES.customersCreate,
  prospectList: ROUTES.prospectsCreate,
  memberList: ROUTES.memberNew,
  ticketList: ROUTES.ticketNew,
  bankingAccounts: ROUTES.bankingNewAccount,
  bankingLoanList: ROUTES.bankingNewLoan,
}

// Lists whose classic page has more than one "New …" button: the banner shows
// them all, in the classic order, instead of one generic "New X".
const BANNER_ACTIONS: Record<string, Array<{ label: string; path: string }>> = {
  // compta/facture/list.php's title bar: "New Quick Invoice", "New Detailed Invoice".
  invoiceList: [
    { label: 'New Quick Invoice', path: ROUTES.invoiceCreateQuick },
    { label: 'New Detailed Invoice', path: ROUTES.invoiceCreate },
  ],
  // fourn/facture/list.php's title bar: the same pair for purchase invoices.
  vendorInvoiceList: [
    { label: 'New Quick Invoice', path: ROUTES.vendorInvoiceCreateQuick },
    { label: 'New Detailed Invoice', path: ROUTES.vendorInvoiceCreate },
  ],
}

function routeMatches(pattern: string, pathname: string) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  return patternParts.length === pathParts.length && patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index])
}

function routeTitle(key: string, kind: BannerRoute['kind']) {
  const base = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/(?:List|Detail|Card)$/i, '')
    .trim()
  const title = base.charAt(0).toUpperCase() + base.slice(1)
  return `${title} ${kind === 'detail' ? 'Details' : 'List'}`
}

function routeCreatePath(key: string) {
  return CREATE_PATH_OVERRIDES[key] ?? (ROUTES as Record<string, string>)[key.replace(/List$/i, 'Create')]
}

function routeCreateLabel(key: string) {
  const base = key
    .replace(/List$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  const label = base.charAt(0).toUpperCase() + base.slice(1)
  return `New ${label}`
}

// Detail pages whose own sticky header card (avatar/title, badges, KPI strip,
// tabs) is the page banner in the blue-metal theme, like Customer Details: the
// generic "LIST VIEW / X Details" strip above them is not shown, and the title
// is drawn inside their banner instead (see data-detail-title in AppShell and
// the matching rule in index.css). Other detail pages keep the generic strip
// until they get the same header card.
const INTEGRATED_DETAIL_KEYS = new Set([
  'customerDetail',
  'orderDetail',
  'invoiceDetail',
  'productDetail',
  'projectDetail',
  'vendorInvoiceDetail',
  'contractDetail',
  'warehouseDetail',
  'inventoryDetail',
  'userDetail',
  'bankingAccountDetail',
])

function findDetailRoute(pathname: string) {
  return DETAIL_BANNER_ROUTES.find((entry) => routeMatches(entry.path, pathname))
}

// Title for the banner of an integrated detail page, or undefined when this
// page isn't one (or is Customer Details, which draws its own title).
export function getIntegratedDetailTitle(sections: NavSection[], pathname: string, theme: string): string | undefined {
  if (theme !== 'blue-metal' || !isDetailPagePath(pathname)) return undefined
  const route = findDetailRoute(pathname)
  if (!route || route.key === 'customerDetail' || !INTEGRATED_DETAIL_KEYS.has(route.key)) return undefined
  return buildBreadcrumb(sections, pathname)?.crumbs.at(-1) || routeTitle(route.key, 'detail')
}

export function isBannerListPage(pathname: string, theme: string): boolean {
  return theme === 'blue-metal' && pathname !== ROUTES.customerList && BANNER_ROUTES.some((route) => routeMatches(route.path, pathname))
}

function itemContainsPath(item: NavItem, pathname: string): boolean {
  if (item.path && (pathname === item.path || pathname.startsWith(`${item.path.replace(/\/$/, '')}/`))) return true
  return 'items' in item && item.items.some((child) => itemContainsPath(child, pathname))
}

export function PageBanner({ sections, pathname }: { sections: NavSection[]; pathname: string }) {
  const { theme } = useTheme()
  const isDetail = isDetailPagePath(pathname)
  const route = useMemo(() => (isDetail ? DETAIL_BANNER_ROUTES : BANNER_ROUTES).find((entry) => routeMatches(entry.path, pathname)), [isDetail, pathname])
  const breadcrumb = useMemo(() => buildBreadcrumb(sections, pathname), [sections, pathname])

  if ((theme !== 'blue-metal' || (!isBannerListPage(pathname, theme) && !isDetail)) || !route || INTEGRATED_DETAIL_KEYS.has(route.key)) return null

  const section = sections.find((item) => item.key === breadcrumb?.sectionKey || item.items.some((navItem) => itemContainsPath(navItem, pathname)))
  const PageIcon = section?.icon ?? LayoutGrid
  // A bare "List" crumb says nothing about which list this is — use the route's own name then ("Order List").
  const crumb = breadcrumb?.crumbs.at(-1)
  const title = crumb && !/^list$/i.test(crumb) ? crumb : routeTitle(route.key, route.kind)
  const createPath = route.kind === 'list' ? routeCreatePath(route.key) : undefined
  const actions = route.kind !== 'list' ? [] : (BANNER_ACTIONS[route.key] ?? (createPath ? [{ label: routeCreateLabel(route.key), path: createPath }] : []))

  // Same banner as Customer List (ThirdPartyList's own): icon tile, title,
  // one-line subtitle and the "New …" button, full-bleed across the page.
  const baseTitle = routeTitle(route.key, route.kind).replace(/\s+(List|Details)$/i, '').toLowerCase()
  const subtitle = route.kind === 'detail' ? 'Record details' : `Browse, search and manage ${baseTitle} records`

  return (
    <div className="relative -mx-6 flex min-h-[86px] flex-wrap items-center justify-between gap-5 overflow-hidden border-b border-border px-6 py-3 sm:min-h-24 sm:px-8">
      <img src="/blue-metal-dashboard.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,14,28,0.96)_0%,rgba(3,14,28,0.82)_43%,rgba(3,14,28,0.34)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,121,206,0.22),transparent_54%,rgba(4,15,29,0.24))]" />
      <div className="relative z-10 flex min-w-0 items-center gap-4 text-white">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cyan-200/50 bg-blue-500/20 text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_22px_rgba(0,158,255,0.3)] backdrop-blur-sm sm:h-16 sm:w-16">
          <PageIcon size={34} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-blue-100/85 sm:text-base">{subtitle}</p>
        </div>
      </div>
      {actions.length > 0 && (
        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-200/50 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,125,255,0.34)] transition hover:brightness-110"
            >
              <Plus size={16} /> {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
