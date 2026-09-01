import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, FolderKanban, Users2, ListChecks, Clock, LayoutDashboard, Boxes, Ticket, MoreHorizontal, Mail, Pencil, Copy, Trash2, ExternalLink } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useProjectsList } from '../projects.queries'

const TABS = [
  { key: 'project', label: 'Project', icon: FolderKanban },
  { key: 'contacts', label: 'Contacts of Project', icon: Users2 },
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
  { key: 'timespent', label: 'Time Spent', icon: Clock },
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'stock', label: 'Stock Consumptions', icon: Boxes },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'more', label: 'More', icon: MoreHorizontal },
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

const disabledBtn = 'flex items-center gap-1.5 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-not-allowed'

// Real header/main data reused from projet/projects-list-ajax.php (see
// projects.queries.ts), matched by id — same "find in the already-fetched
// list" pattern used for Contract Detail's header, since projet/card.php
// has no JSON API behind it at all (confirmed by reading it directly). The
// other tabs are design-only, matching the real page's layout with inert
// controls, exactly like Contract Detail's no-API tabs — except Tasks and
// Time Spent, which link out to this app's own existing Tasks/Time Spent
// pages (not re-verified against the live backend as part of this pass).
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('project')
  const { data, isLoading, isError, error, refetch } = useProjectsList('all')

  if (isLoading) {
    return (
      <div className="p-6">
        <LegacyLoadingCard label="Loading project…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="p-6">
        <LegacyErrorCard title="Couldn't load project" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  const project = data.items.find((p) => p.id === Number(id))
  if (!project) {
    return (
      <div className="p-6">
        <LegacyErrorCard title="Project not found" message={`No project with id ${id} in the first 25 rows the real backend returns (it hardcodes its own page size).`} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
          <div>
            <Link to={ROUTES.projectList} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text mb-1.5">
              <ChevronLeft size={14} /> Projects
            </Link>
            <h2 className="text-lg font-bold text-text!">Project Management Details</h2>
            <div className="text-xs text-text-muted mt-1 space-y-0.5">
              <p>
                <span className="text-text-faint">Ref No:</span> <span className="font-medium text-text!">{project.ref}</span>
              </p>
              <p>{project.title}</p>
              <p>
                <span className="text-text-faint">Third-party:</span> {project.thirdPartyName || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
              <Mail size={14} /> Send Email
            </button>
            <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
              <Pencil size={14} /> Modify
            </button>
            <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
              <Copy size={14} /> Clone
            </button>
            <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6" style={{ scrollBehavior: 'smooth' }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                <Icon size={14} className="shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {tab === 'project' && <ProjectTab project={project} />}
      {tab === 'contacts' && <NoApiTab title="Contacts of Project" reason="projet/contact.php is a full legacy page with no JSON API." />}
      {tab === 'tasks' && <LinkOutTab title="Tasks" description="This app has its own Tasks feature." href={ROUTES.projectTaskList} />}
      {tab === 'timespent' && <LinkOutTab title="Time Spent" description="This app has its own Time Spent feature." href={ROUTES.projectTimeSpent} />}
      {tab === 'overview' && <NoApiTab title="Overview" reason="projet/card.php's Overview tab (ganttchart.inc.php/graph_opportunities.inc.php) has no JSON API." />}
      {tab === 'stock' && <NoApiTab title="Stock Consumptions" reason="No JSON API found for this tab on this backend." />}
      {tab === 'tickets' && <NoApiTab title="Tickets" reason="No JSON API found for this tab on this backend." />}
      {tab === 'more' && <NoApiTab title="More" reason="Covers Notes/Documents/Agenda — all classic legacy pages with no JSON API." />}
    </div>
  )
}

function ProjectTab({ project }: { project: { ref: string; title: string; thirdPartyName: string | null; statusLabel: string } }) {
  return (
    <div className="space-y-3">
      <Card className="!h-auto">
        <TabTitle>Project</TabTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3 mt-3 text-sm">
          <div>
            <p className="text-text-faint text-xs">Ref.</p>
            <p className="font-medium text-text!">{project.ref}</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Project Label</p>
            <p className="font-medium text-text!">{project.title}</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Third-Party</p>
            <p className="font-medium text-text!">{project.thirdPartyName || '—'}</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Status</p>
            <p className="font-medium text-text!">{project.statusLabel}</p>
          </div>
        </div>
        <NoApiNote>
          Visibility, Lead Status, Lead Probability, Lead Amount, Start/End Date, Budget and Description aren't returned by the real Projects list endpoint on this backend — not shown to avoid
          guessing.
        </NoApiNote>
      </Card>
    </div>
  )
}

function NoApiTab({ title, reason }: { title: string; reason: string }) {
  return (
    <Card className="!h-auto">
      <TabTitle>{title}</TabTitle>
      <NoApiNote>{reason} Shown for layout reference only.</NoApiNote>
    </Card>
  )
}

function LinkOutTab({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Card className="!h-auto">
      <TabTitle>{title}</TabTitle>
      <p className="text-sm text-text-muted mt-2">{description}</p>
      <Link to={href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        Go to {title} <ExternalLink size={13} />
      </Link>
    </Card>
  )
}
