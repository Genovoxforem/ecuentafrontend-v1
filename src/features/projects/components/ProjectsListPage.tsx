import { Link } from 'react-router-dom'
import { Network, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProjectsList, type ProjectListFilter } from '../projects.queries'
import { ROUTES } from '../../../routes'

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-surface-hover text-text-muted',
  Open: 'bg-success-bg text-success-fg',
  Closed: 'bg-danger-bg text-danger-fg',
  Unknown: 'bg-surface-hover text-text-muted',
}

// Real POST projet/projects-list-ajax.php data (see projects.queries.ts).
// Validate/Clone/Delete row actions from the old dead /api/projects/ are
// gone — no real API exists for any of them any more (that module has no
// JSON create/update/delete surface at all, only this thin read-only
// list) — so this table is read-only, honestly, rather than pretending
// buttons still work.
export function ProjectsListPage({ filter, title }: { filter: ProjectListFilter; title: string }) {
  const { data, isLoading, isError, error } = useProjectsList(filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Network size={20} className="text-brand" /> {title}
        </h2>
        <Link to={ROUTES.projectCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Project
        </Link>
      </div>

      {isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load projects.'}</Card>
      )}

      <Card className="!h-auto !p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Ref.</th>
              <th className="font-medium py-2 px-4">Project Label</th>
              <th className="font-medium py-2 px-4">Third-Party</th>
              <th className="font-medium py-2 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-4 px-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 px-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              data.items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <Link to={ROUTES.projectDetail.replace(':id', String(p.id))} className="text-brand font-medium hover:underline">
                      {p.ref}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 text-text!">{p.title}</td>
                  <td className="py-2.5 px-4 text-text-muted">{p.thirdPartyName || '—'}</td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[p.statusLabel]}`}>{p.statusLabel}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-text-faint italic">Start Date, End Date, Visibility and Budget aren't returned by the real Projects list endpoint on this backend — not shown to avoid guessing.</p>
    </div>
  )
}
