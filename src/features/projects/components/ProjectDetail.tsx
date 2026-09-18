import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Mail,
  Copy,
  Trash2,
  FolderKanban,
  Users2,
  ListChecks,
  Clock,
  LayoutDashboard,
  Boxes,
  Ticket,
  StickyNote,
  CalendarClock,
  Building2,
  MapPin,
  Paperclip,
  FilePlus2,
  Link2,
  Search,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useProjectsList, type ProjectRow } from '../projects.queries'
import { ProjectTasksTab } from './ProjectTasksTab'
import { ProjectTimeSpentTab } from './ProjectTimeSpentTab'
import { ProjectOverviewTab } from './ProjectOverviewTab'
import { ProjectStockConsumptionsTab } from './ProjectStockConsumptionsTab'
import { TicketsList } from '../../tickets/components/TicketsList'
import { ProjectDocumentsTab } from './ProjectDocumentsTab'
import { ProjectInfoCards, InfoRow } from './ProjectInfoRecap'
import { SendProjectEmailModal } from './SendProjectEmailModal'

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-surface-hover text-text-muted',
  Open: 'bg-success-bg text-success-fg',
  Closed: 'bg-danger-bg text-danger-fg',
  Unknown: 'bg-surface-hover text-text-muted',
}

const TABS = [
  { key: 'project', label: 'Project', icon: FolderKanban },
  { key: 'contacts', label: 'Contacts of Project', icon: Users2 },
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
  { key: 'timespent', label: 'Time Spent', icon: Clock },
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'stock', label: 'Stock Consumptions', icon: Boxes },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'linkedfiles', label: 'Linked Files', icon: Paperclip },
  { key: 'eventsagenda', label: 'Events / Agenda', icon: CalendarClock },
] as const

type TabKey = (typeof TABS)[number]['key']

function TabTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-brand">
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
    </h3>
  )
}

function NoApiNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-text-faint italic mt-2">{children}</p>
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-[120px]">
      <p className="text-xs text-text-faint uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-text! mt-0.5">{value}</p>
    </div>
  )
}

// Real header/main data reused from projet/projects-list-ajax.php (see
// projects.queries.ts), matched by id — same "find in the already-fetched
// list" pattern used for Contract Detail's header, since projet/card.php
// has no JSON API behind it at all (confirmed by reading it directly). Page
// shell, avatar/badge header and pill-style scrollable tab strip all mirror
// CustomerDetail.tsx (this app's canonical detail-page design) — with
// Quotations/Orders/etc. swapped for Budget/Start/End/Visibility, the real
// fields this backend actually returns for a project. Tab bodies below are
// design-only, matching the real page's layout with inert controls — except
// Tasks and Time Spent, which link out to this app's own existing features.
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('project')
  const { data, isLoading, isError, error, refetch } = useProjectsList('all')

  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false)
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false)
  const updateTabScrollState = useCallback(() => {
    const el = tabsScrollRef.current
    if (!el) return
    setCanScrollTabsLeft(el.scrollLeft > 1)
    setCanScrollTabsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])
  useEffect(() => {
    updateTabScrollState()
    const el = tabsScrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateTabScrollState, { passive: true })
    window.addEventListener('resize', updateTabScrollState)
    return () => {
      el.removeEventListener('scroll', updateTabScrollState)
      window.removeEventListener('resize', updateTabScrollState)
    }
  }, [updateTabScrollState, data])
  function scrollTabs(direction: 1 | -1) {
    tabsScrollRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading project…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load project" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  const project = data.items.find((p) => p.id === Number(id))
  if (!project) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Project not found" message={`No project with id ${id} in the first 25 rows the real backend returns (it hardcodes its own page size).`} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.projectList} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> Projects
        </Link>
        <Link to={ROUTES.projectList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="flex items-start gap-4 min-w-[240px] flex-1">
                <Avatar name={project.title} size={64} rounded="lg" color="bg-brand" />
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-text!">{project.title}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[project.statusLabel]}`}>{project.statusLabel}</span>
                  </div>
                  <p className="text-xs text-text-faint">
                    #{project.id} · {project.ref}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-faint">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} /> Third-party <span className="font-medium text-text!">{project.thirdPartyName || '—'}</span>
                    </span>
                    {project.visibility && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {project.visibility}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled
                  title="No real API available on this backend"
                  className="flex items-center justify-center w-9 h-9 rounded-md bg-surface-hover text-text-muted opacity-60 cursor-not-allowed"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  disabled
                  title="No real API available on this backend"
                  className="flex items-center justify-center w-9 h-9 rounded-md bg-surface-hover text-text-muted opacity-60 cursor-not-allowed"
                >
                  <Copy size={15} />
                </button>
                <button
                  type="button"
                  disabled
                  title="No real API available on this backend"
                  className="flex items-center justify-center w-9 h-9 rounded-md bg-danger text-white opacity-90 cursor-not-allowed"
                >
                  <Trash2 size={15} />
                </button>
                <Link to={ROUTES.projectList} className="flex items-center justify-center w-9 h-9 rounded-md bg-surface-hover text-text-muted hover:text-text" title="Close">
                  <X size={16} />
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-border">
              <StatTile label="Budget" value={project.budgetAmount || '—'} />
              <StatTile label="Start Date" value={project.startDate || '—'} />
              <StatTile label="End Date" value={project.endDate || '—'} />
              <StatTile label="Visibility" value={project.visibility || '—'} />
            </div>

            <div className="border-t border-border px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                {canScrollTabsLeft && (
                  <button
                    type="button"
                    onClick={() => scrollTabs(-1)}
                    aria-label="Scroll tabs left"
                    className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-border bg-surface text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}
                <div ref={tabsScrollRef} className="flex items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar bg-surface rounded-full p-1 flex-1 min-w-0">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`flex items-center gap-1.5 shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        tab === key ? 'bg-brand text-white shadow-sm shadow-brand/25' : 'text-text-muted hover:text-text hover:bg-surface-hover'
                      }`}
                    >
                      <Icon size={14} className="shrink-0" /> {label}
                    </button>
                  ))}
                </div>
                {canScrollTabsRight && (
                  <button
                    type="button"
                    onClick={() => scrollTabs(1)}
                    aria-label="Scroll tabs right"
                    className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-border bg-surface text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'project' && <ProjectTab project={project} />}
        {tab === 'contacts' && <ContactsOfProjectTab project={project} />}
        {tab === 'tasks' && <ProjectTasksTab project={project} />}
        {tab === 'timespent' && <ProjectTimeSpentTab project={project} />}
        {tab === 'overview' && <ProjectOverviewTab project={project} onGoToTimeSpent={() => setTab('timespent')} />}
        {tab === 'stock' && <ProjectStockConsumptionsTab project={project} />}
        {tab === 'tickets' && (
          <div className="space-y-3">
            <ProjectInfoCards project={project} />
            <TicketsList projectId={project.id} embedded />
          </div>
        )}
        {tab === 'notes' && <ProjectNotesTab />}
        {tab === 'linkedfiles' && <ProjectDocumentsTab project={project} />}
        {tab === 'eventsagenda' && <EventsAgendaTab project={project} />}
      </div>
    </div>
  )
}

const primaryDisabledBtn = 'flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-90 cursor-not-allowed'
const dangerDisabledBtn = 'flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white opacity-90 cursor-not-allowed'

// Layout matches this app's own "Project Information" / "Description & Tags" mockup:
// a wide info card with icon-led rows and the action bar at its bottom, a narrower
// description card beside it, then the Linked Files / Latest Events tables below.
function ProjectTab({ project }: { project: ProjectRow }) {
  const [showEmailModal, setShowEmailModal] = useState(false)
  return (
    <div className="space-y-4">
      <ProjectInfoCards project={project} />

      <Card className="!h-auto">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Mail size={14} /> Send Email
          </button>
          <button type="button" disabled title="No real API available on this backend" className={primaryDisabledBtn}>
            <Pencil size={14} /> Modify
          </button>
          <button type="button" disabled title="No real API available on this backend" className={primaryDisabledBtn}>
            <X size={14} /> Close
          </button>
          <button type="button" disabled title="No real API available on this backend" className={primaryDisabledBtn}>
            <Copy size={14} /> Clone
          </button>
          <button type="button" disabled title="No real API available on this backend" className={dangerDisabledBtn}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </Card>

      <LinkedFilesCard />
      <EventsAgendaCard />

      {showEmailModal && <SendProjectEmailModal projectRef={project.ref} onClose={() => setShowEmailModal(false)} />}
    </div>
  )
}

// --- Design-only tabs below --------------------------------------------
// projet/contact.php, note.php, document.php and agenda.php are all full-page
// legacy HTML with no JSON API behind them (confirmed by reading each file
// directly). Per the standing rule against integrating scraped HTML pages,
// these tabs reproduce the real page's layout only — every control is inert
// (disabled, with a tooltip explaining why) and every list shows an honest
// empty state rather than invented data. Structure matches ContractDetail's
// equivalent no-API tabs: TabTitle + NoApiNote above the Card(s).

// Visual match for projet/note.php — Note (public) / Note (private) side by
// side. Confirmed no JSON API on this backend (no json_encode anywhere in
// that file, and unlike Invoices/Customers/Purchase Orders/Vendors this
// module has no api/notes.php counterpart at all) — so per the standing
// rule against adding new backend endpoints from this frontend repo, both
// fields stay inert.
function ProjectNotesTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Notes</TabTitle>
      <NoApiNote>projet/note.php has no JSON API (confirmed by reading it directly — this is the only Notes tab in this app without one) — both fields below are inert.</NoApiNote>
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-text-muted mb-1">
              Note (public) <Link2 size={12} className="text-text-faint" />
            </label>
            <textarea
              disabled
              title="No real API available on this backend"
              rows={6}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed resize-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-text-muted mb-1">
              Note (private) <Link2 size={12} className="text-text-faint" />
            </label>
            <textarea
              disabled
              title="No real API available on this backend"
              rows={6}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

const disabledSelectCls = 'text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-2 py-1.5 w-full cursor-not-allowed'

// Visual match for projet/contact.php's "Contacts of Project" tab (the
// add-contact form + results table both come from core/tpl/contacts.tpl.php,
// a shared template many modules reuse — confirmed by reading contact.php
// directly: classic action=addcontact POST + redirect, no json_encode
// anywhere). This app's existing Contacts tabs elsewhere (Sales Orders,
// Quotations, ...) make this work by scraping that same template's HTML —
// the exact technique the standing no-scraping rule says not to keep
// imitating, so this one stays inert like the rest of this page's tabs.
function ContactsOfProjectTab({ project }: { project: ProjectRow }) {
  return (
    <div className="space-y-3">
      <ProjectInfoCards project={project} />
      <TabTitle>Contacts of Project</TabTitle>
      {/* <NoApiNote>projet/contact.php has no JSON API (confirmed by reading it directly) — the add-contact form and unlink action below are inert.</NoApiNote> */}

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-danger/70 uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Nature Of Contact*</th>
                <th className="font-medium px-4 py-2.5">Third-Party*</th>
                <th className="font-medium px-4 py-2.5">Users/Contacts/Addresses*</th>
                <th className="font-medium px-4 py-2.5">Contact Type*</th>
                <th className="font-medium px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-text!">
                    <Users2 size={14} className="text-text-faint" /> Users
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-muted">{project.thirdPartyName || '—'}</td>
                <td className="px-4 py-2.5">
                  <select disabled title="No real API available on this backend" className={disabledSelectCls}>
                    <option>—</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <select disabled title="No real API available on this backend" className={disabledSelectCls}>
                    <option>Select Option</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <button type="button" disabled title="No real API available on this backend" className={`${primaryDisabledBtn} !py-1.5`}>
                    Add
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-text!">
                    <Building2 size={14} className="text-text-faint" /> Third-Party Contacts
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-muted">{project.thirdPartyName || '—'}</td>
                <td className="px-4 py-2.5">
                  <select disabled title="No real API available on this backend" className={disabledSelectCls}>
                    <option>No Contact Defined For This Third Party</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <select disabled title="No real API available on this backend" className={disabledSelectCls}>
                    <option>Select Option</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <button type="button" disabled title="No real API available on this backend" className={`${primaryDisabledBtn} !py-1.5`}>
                    Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Nature Of Contact</th>
                <th className="font-medium px-4 py-2.5">Third-Party</th>
                <th className="font-medium px-4 py-2.5">Users/Contacts/Addresses</th>
                <th className="font-medium px-4 py-2.5">Contact Type</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-faint italic">
                  No data source available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Shared between the Project tab's inline summary and the dedicated More-menu tab below
// (real projet/card.php shows the same Linked Files / Latest Events widgets in both places).
function LinkedFilesCard() {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <SectionHeading icon={Paperclip}>Linked Files</SectionHeading>
        <button type="button" disabled title="No real API available on this backend" className={`${primaryDisabledBtn} !py-1.5`}>
          <FilePlus2 size={14} /> Generate
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-4 py-2.5">Document Template</th>
              <th className="font-medium px-4 py-2.5">Language</th>
              <th className="font-medium px-4 py-2.5">File</th>
              <th className="font-medium px-4 py-2.5">Generated On</th>
              <th className="font-medium px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-text-faint italic">
                No documents generated — projet/card.php's document generator has no JSON API.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// Visual layout matches projet/card.php's own real "Latest N linked events"
// widget (see core/class/html.formactions.class.php's showactions()) —
// underlined title, a fully gridded table (Ref./Date/By/Type/Title), and a
// circular "+" button top-right for adding an event. That widget's rows come
// from real llx_actioncomm data with no JSON API on this backend (confirmed
// by reading the PHP directly), so — per the standing rule against adding
// new backend endpoints from this frontend repo — this stays visual-only:
// the grid/heading/button chrome is real, the row data honestly isn't.
function EventsAgendaCard() {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">Latest 10 Linked Events</h3>
        <button
          type="button"
          disabled
          title="No real API available on this backend"
          className="flex items-center justify-center w-7 h-7 rounded-md bg-brand text-white opacity-60 cursor-not-allowed shrink-0"
        >
          <FilePlus2 size={14} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide">
              <th className="font-medium px-4 py-2.5 border border-border">Ref.</th>
              <th className="font-medium px-4 py-2.5 border border-border">Date</th>
              <th className="font-medium px-4 py-2.5 border border-border">By</th>
              <th className="font-medium px-4 py-2.5 border border-border">Type</th>
              <th className="font-medium px-4 py-2.5 border border-border">Title</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-text-faint italic border border-border">
                No data source available.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// Visual match for projet/info.php — a fuller, separate page from
// card.php's own embedded "Latest linked events" mini-widget (see
// EventsAgendaCard above, still shown on the Project tab — same split
// Sales Orders already has between its mini-widget and commande/agenda.php,
// see orderAgendaParser.ts's header comment). Confirmed no JSON API here
// either (no json_encode anywhere in info.php). This app's Sales Orders
// equivalent makes its version of this page real by scraping that classic
// page's HTML — the exact technique the standing no-scraping rule says not
// to keep imitating, so this stays inert instead. Creation Date is real
// (projet/list.php, already used for the project header); Created By and
// Latest Modification Date have no confirmed source and show "—".
function EventsAgendaTab({ project }: { project: ProjectRow }) {
  return (
    <div className="space-y-3">
      <TabTitle>Events / Agenda</TabTitle>
      <NoApiNote>projet/info.php has no JSON API (confirmed by reading it directly) — the filter row below is inert and the events table has no real data source.</NoApiNote>

      <Card className="!h-auto">
        <InfoRow icon={Users2} label="Created By" value="—" />
        <InfoRow icon={CalendarClock} label="Creation Date" value={project.creationDate || '—'} />
        <InfoRow icon={Clock} label="Latest Modification Date" value="—" />
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">Events On Project</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
          <input disabled title="No real API available on this backend" placeholder="Search" className={disabledSelectCls + ' max-w-[160px]'} />
          <input disabled title="No real API available on this backend" type="date" className={disabledSelectCls + ' max-w-[150px]'} />
          <input disabled title="No real API available on this backend" type="date" className={disabledSelectCls + ' max-w-[150px]'} />
          <select disabled title="No real API available on this backend" className={disabledSelectCls + ' max-w-[140px]'}>
            <option>—</option>
          </select>
          <input disabled title="No real API available on this backend" placeholder="Label" className={disabledSelectCls + ' max-w-[160px]'} />
          <button type="button" disabled title="No real API available on this backend" className="flex items-center justify-center w-9 h-9 rounded-md bg-brand text-white opacity-60 cursor-not-allowed shrink-0">
            <Search size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Ref.</th>
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5">Owner</th>
                <th className="font-medium px-4 py-2.5">Label</th>
                <th className="font-medium px-4 py-2.5">Related Objects</th>
                <th className="font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-faint italic">
                  No data source available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
