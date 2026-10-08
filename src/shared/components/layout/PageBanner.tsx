import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NavItem, NavSection } from '../../../features/navTypes'
import { ROUTES } from '../../../routes'
import { useTheme } from '../../../context/ThemeContext'
import { Breadcrumb, buildBreadcrumb, isDetailPagePath } from './Breadcrumb'
import { collapsible, findHeaderBlocks, findStatCards, findTitleRow, HIDDEN_CLASS, MERGED_CLASS, onlyActions, STAT_CLASS } from './bannerHeading'
import { setBannerSlot } from './bannerSlot'

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

function normalizeHeading(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^zra\s+/, '')
    .replace(/\s+list$/, '')
}

export function isBannerListPage(pathname: string, theme: string): boolean {
  return theme === 'blue-metal' && BANNER_ROUTES.some((route) => routeMatches(route.path, pathname))
}

function itemContainsPath(item: NavItem, pathname: string): boolean {
  if (item.path && (pathname === item.path || pathname.startsWith(`${item.path.replace(/\/$/, '')}/`))) return true
  return 'items' in item && item.items.some((child) => itemContainsPath(child, pathname))
}

// Two headings name the same page when they read the same once punctuation and a
// trailing "area"/"list" are ignored — "Vendors tags & categories" is the banner's
// name for the page whose own row says "Vendors tags/categories area".
function titlesMatch(a: string, b: string) {
  const strip = (value: string) => normalizeHeading(value).replace(/\s+(area|list|details)$/, '').trim()
  const left = strip(a)
  const right = strip(b)
  if (!left || !right) return false
  // Containment, not just a shared start: the banner's "Dashboard" and the
  // page's own "Expense Dashboard" are two names for the same page.
  return left.includes(right) || right.includes(left)
}

// A banner title the route only generically describes — the page's own heading
// says what it actually is, so that heading becomes the banner's title.
const GENERIC_TITLES = new Set(['home', 'dashboard', 'index', 'overview', 'list', 'card', 'workspace', 'area', 'menu'])

interface HoistedAction {
  html: string
  label: string
  disabled: boolean
}

export function PageBanner({ sections, pathname }: { sections: NavSection[]; pathname: string }) {
  const { theme } = useTheme()
  const isDetail = isDetailPagePath(pathname)
  const route = useMemo(() => (isDetail ? DETAIL_BANNER_ROUTES : BANNER_ROUTES).find((entry) => routeMatches(entry.path, pathname)), [isDetail, pathname])
  const appRoute = useMemo(() => {
    const matches = Object.entries(ROUTES).filter(([, path]) => routeMatches(path, pathname))
    if (matches.length === 0) return undefined
    // Several route patterns can match the same pathname (e.g. the detail
    // route '/invoices/:id' also matches '/invoices/create' since ':id' is a
    // wildcard segment) — the one with the fewest wildcard segments is the
    // literal, intended match.
    const wildcards = (path: string) => path.split('/').filter((part) => part.startsWith(':')).length
    return matches.reduce((best, entry) => (wildcards(entry[1]) < wildcards(best[1]) ? entry : best))
  }, [pathname])
  const breadcrumb = useMemo(() => buildBreadcrumb(sections, pathname), [sections, pathname])
  // The page's own title row, absorbed into the banner (see bannerHeading.ts).
  const [adoptedTitle, setAdoptedTitle] = useState<string | null>(null)
  const [hoisted, setHoisted] = useState<HoistedAction[]>([])
  const hoistedEls = useRef<HTMLElement[]>([])

  const section = sections.find((item) => item.key === breadcrumb?.sectionKey || item.items.some((navItem) => itemContainsPath(navItem, pathname)))
  const PageIcon = section?.icon ?? LayoutGrid
  const crumb = breadcrumb?.crumbs.at(-1)
  const routeKey = route?.key ?? appRoute?.[0]
  const actionMatch = routeKey?.match(/^(.*?)(Create|New|Edit|Update)(.*)$/i)
  const fallbackTitle = actionMatch
    ? `${/^(Create|New)$/i.test(actionMatch[2]) ? 'New' : 'Edit'} ${`${actionMatch[1]} ${actionMatch[3]}`.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').trim()}`
    : routeKey
      ? routeKey.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').trim()
      : pathname.split('/').filter(Boolean).at(-1)?.replace(/[-_]/g, ' ') ?? 'Workspace'
  const title = crumb && !/^list$/i.test(crumb)
    ? crumb
    : route
      ? routeTitle(route.key, route.kind)
      : fallbackTitle
  const createPath = route?.kind === 'list' ? routeCreatePath(route.key) : undefined
  const actions = route?.kind !== 'list'
    ? []
    : (BANNER_ACTIONS[route.key] ?? (createPath ? [{ label: routeCreateLabel(route.key), path: createPath }] : []))
  const baseTitle = route
    ? routeTitle(route.key, route.kind).replace(/\s+(List|Details)$/i, '').toLowerCase()
    : title.toLowerCase()
  const subtitle = route?.kind === 'detail'
    ? 'Record details'
    : route?.kind === 'list'
      ? `Browse, search and manage ${baseTitle} records`
      : pathname === '/dashboard' || pathname === '/'
        ? 'Workspace overview'
        : breadcrumb?.sectionLabel ?? 'Workspace'

  // A title built from a route key or the section name ("racks Area", "Settings")
  // is weaker than the page's own heading, which then becomes the banner title.
  const weakTitle = /^[a-z]/.test(title) || GENERIC_TITLES.has(normalizeHeading(title)) || normalizeHeading(title) === normalizeHeading(breadcrumb?.sectionLabel ?? '')
  const hasOwnActions = actions.length > 0
  const shownTitle = adoptedTitle ?? title

  useEffect(() => {
    if (theme !== 'blue-metal') return
    const content = document.getElementById('route-page-content')
    if (!content) return

    const marked = new Set<HTMLElement>()
    const merged = new Set<HTMLElement>()
    const stats = new Set<HTMLElement>()
    const unmark = () => {
      for (const el of marked) el.classList.remove(HIDDEN_CLASS)
      marked.clear()
      for (const el of merged) el.classList.remove(MERGED_CLASS)
      merged.clear()
      for (const el of stats) el.classList.remove(STAT_CLASS)
      stats.clear()
    }
    const hide = (el: HTMLElement) => {
      el.classList.add(HIDDEN_CLASS)
      marked.add(el)
    }
    const syncHoisted = (els: HTMLElement[]) => {
      hoistedEls.current = els
      const next = els.map((el) => ({ html: el.innerHTML, label: el.innerText.trim(), disabled: el instanceof HTMLButtonElement && el.disabled }))
      setHoisted((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }

    const apply = () => {
      unmark()
      // The blocks the page draws at its top are painted as part of the banner,
      // so the two read as one header instead of a banner above a second card.
      const headerBlocks = findHeaderBlocks(content)
      for (const block of headerBlocks) {
        block.classList.add(MERGED_CLASS)
        merged.add(block)
      }
      // The page's headline numbers are drawn compactly, whichever module's
      // card shape they use.
      for (const card of findStatCards(content)) {
        card.classList.add(STAT_CLASS)
        stats.add(card)
      }
      // Inside that header, a label that only repeats what the banner already
      // says (the page's name, or the section it is in) is noise.
      const repeated = new Set([normalizeHeading(title), normalizeHeading(subtitle)].filter(Boolean))
      for (const block of headerBlocks) {
        for (const label of block.querySelectorAll<HTMLElement>('h1, h2, h3, span, p')) {
          if (label.querySelector('button, a[href], input, select')) continue
          const text = normalizeHeading(label.innerText || label.textContent || '')
          if (text && repeated.has(text)) hide(collapsible(label, block))
        }
      }
      let toHoist: HTMLElement[] = []
      const titleRow = findTitleRow(content)
      // Only the page's OWN title belongs in the banner. A heading that names
      // something else (a chart, a section) is the page's content and stays put.
      // A create/edit page's own heading is usually the generic "New X"/"Edit X"
      // phrasing (fallbackTitle), while the banner shows the breadcrumb's fuller
      // name for the same page ("Create Detailed Invoice") — those two read as
      // different strings but name the same page, so fallbackTitle is also an
      // accepted match for the page's own heading.
      if (titleRow && (titlesMatch(titleRow.text, title) || titlesMatch(titleRow.text, fallbackTitle) || weakTitle)) {
        setAdoptedTitle(weakTitle ? titleRow.text : null)
        // The page's own title row is the banner's job. Buttons that can be
        // redrawn in the banner move there and the whole row goes; otherwise the
        // row stays with its buttons and only the title goes.
        if (titleRow.row && titleRow.actions && !hasOwnActions) {
          hide(collapsible(titleRow.row, content))
          toHoist = titleRow.actions
        } else {
          hide(collapsible(titleRow.titleBlock, content))
        }

        // Any other heading that repeats the banner title word for word.
        const normalizedTitle = normalizeHeading(weakTitle ? titleRow.text : title)
        for (const heading of content.querySelectorAll<HTMLElement>('h1, h2, h3')) {
          if (normalizeHeading(heading.innerText || heading.textContent || '') === normalizedTitle) hide(heading)
        }
      } else {
        setAdoptedTitle(null)
      }

      // A panel that prints its own name again inside itself ("Quick Actions"
      // as the card's header and again as the first thing in its body).
      const headings = Array.from(content.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
      for (let i = 0; i < headings.length; i += 1) {
        const text = normalizeHeading(headings[i].innerText || headings[i].textContent || '')
        if (!text) continue
        for (let j = 0; j < i; j += 1) {
          if (normalizeHeading(headings[j].innerText || headings[j].textContent || '') !== text) continue
          // Either the label sits inside the card that repeats it, or the label
          // sits just above the card in the same wrapper; the card's own copy goes.
          const label = headings[j]
          const card = label.closest('.app-card, section, [class*="rounded-xl"], [class*="rounded-lg"]')
          const wrapper = label.parentElement
          if ((card && card.contains(headings[i])) || (wrapper && wrapper !== content && wrapper.contains(headings[i]))) {
            hide(headings[i])
            break
          }
        }
      }

      // Once its label is gone, a header row holding only buttons is just those
      // buttons: they move up onto the banner's own row.
      if (toHoist.length === 0 && !hasOwnActions) {
        for (const block of headerBlocks) {
          const actionsOnly = onlyActions(block)
          if (actionsOnly) {
            hide(block)
            toHoist = actionsOnly
            break
          }
        }
      }
      syncHoisted(toHoist)
    }

    apply()
    let frame = 0
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(apply)
    })
    observer.observe(content, { childList: true, characterData: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unmark()
      setAdoptedTitle(null)
      syncHoisted([])
    }
  }, [pathname, theme, title, subtitle, weakTitle, hasOwnActions])

  if (theme !== 'blue-metal') return null

  return (
    <div className="blue-theme-banner relative -mx-6 flex min-h-[72px] flex-col justify-center gap-1.5 overflow-hidden border-b border-border px-7 py-3 sm:min-h-[76px] sm:px-9 sm:py-3.5">
      {/* Same generic photo on every banner (list and detail alike) — there's no
          sensible way to pick a different one per page type without it looking
          arbitrary, so one image stands for "this is the app's banner surface"
          everywhere, the same role the flat #10283a fill played before. The
          `.blue-banner-continues` header blocks a page draws right under this
          (see bannerHeading.ts / index.css) stay flat on purpose — only the
          banner strip itself carries the photo, so the merged header still
          reads as "photo band, then one solid panel", not a repeating image. */}
      <div
        className="absolute inset-0 bg-cover bg-[position:right_center]"
        style={{ backgroundImage: "url('/blue-metal-dashboard.jpg')" }}
      />
      {/* The banner is a very short, very wide crop of a normal-aspect photo, so
          bg-cover blows it up far past its native resolution and whatever lands
          at the right edge (a wall, a UI chrome edge, ...) can come out as a
          blown-out, near-white patch. The old fade (down to 0.3 opacity at the
          right) left that fully exposed; 0.82 still lets the photo's texture and
          colour read through without any single crop being able to blow out. */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,#0a1c2c_0%,#0f2c42_38%,rgba(15,44,66,0.78)_62%,rgba(15,44,66,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,172,255,0.14),transparent_55%,rgba(4,15,29,0.18))]" />
      {/* Its own row above the title, pinned to the banner's own top-left
          corner — was floated to the right of the title (same row), which read
          as "wherever there's room" rather than a fixed, predictable spot. */}
      <div className="relative z-10 min-w-0">
        <Breadcrumb sections={sections} isModern />
      </div>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-300/35 bg-sky-500/10 text-sky-200">
            <PageIcon size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white">{shownTitle}</h1>
            <p className="text-xs text-slate-300">{subtitle}</p>
          </div>
        </div>
      {hoisted.length > 0 && (
        <div className="relative z-10 flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {hoisted.map((action, index) => (
            <button
              key={`${index}-${action.label}`}
              type="button"
              disabled={action.disabled}
              title={action.label}
              onClick={() => hoistedEls.current[index]?.click()}
              className="blue-theme-primary inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md border border-white/15 bg-[#315f7a] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3b718f] disabled:opacity-50"
              dangerouslySetInnerHTML={{ __html: action.html }}
            />
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className="relative z-10 flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="blue-theme-primary inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md border border-white/15 bg-[#315f7a] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3b718f]"
            >
              <Plus size={16} /> {action.label}
            </Link>
          ))}
        </div>
      )}
      <div ref={setBannerSlot} className="relative z-10 flex min-w-0 flex-wrap items-center gap-3 empty:hidden" />
      </div>
    </div>
  )
}
