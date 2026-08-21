import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Network, Plus, Check, Copy, Trash2, LoaderCircle, Pencil } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney, formatDate } from '../../../utils/format'
import { useProjectsList, useValidateProject, useCloneProject, useDeleteProject, type ProjectListFilter } from '../projects.queries'
import { ROUTES } from '../../../routes'

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-surface-hover text-text-muted',
  Open: 'bg-success-bg text-success-fg',
  Closed: 'bg-danger-bg text-danger-fg',
  Unknown: 'bg-surface-hover text-text-muted',
}

// Real GET/POST/DELETE /api/projects/ data (see projects.queries.ts), with
// real Validate/Clone/Delete row actions wired to the same real backend
// methods the legacy Project Details page's own buttons call
// (Project::setValid/createFromClone/delete).
export function ProjectsListPage({ filter, title }: { filter: ProjectListFilter; title: string }) {
  const { data, isLoading, isError, error } = useProjectsList(filter)
  const validateProject = useValidateProject()
  const cloneProject = useCloneProject()
  const deleteProject = useDeleteProject()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [rowError, setRowError] = useState('')

  function handleValidate(id: number) {
    setRowError('')
    setPendingId(id)
    validateProject.mutate(id, {
      onSettled: () => setPendingId(null),
      onError: (err) => setRowError(err instanceof Error ? err.message : 'Failed to validate project.'),
    })
  }
  function handleClone(id: number) {
    setRowError('')
    setPendingId(id)
    cloneProject.mutate(id, {
      onSettled: () => setPendingId(null),
      onError: (err) => setRowError(err instanceof Error ? err.message : 'Failed to clone project.'),
    })
  }
  function handleDelete(id: number, ref: string) {
    if (!window.confirm(`Delete project ${ref}? This cannot be undone.`)) return
    setRowError('')
    setPendingId(id)
    deleteProject.mutate(id, {
      onSettled: () => setPendingId(null),
      onError: (err) => setRowError(err instanceof Error ? err.message : 'Failed to delete project — it may have linked records.'),
    })
  }

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
      {rowError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{rowError}</Card>}

      <Card className="!h-auto !p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Ref.</th>
              <th className="font-medium py-2 px-4">Project Label</th>
              <th className="font-medium py-2 px-4">Third-Party</th>
              <th className="font-medium py-2 px-4">Start Date</th>
              <th className="font-medium py-2 px-4">End Date</th>
              <th className="font-medium py-2 px-4">Budget</th>
              <th className="font-medium py-2 px-4">Status</th>
              <th className="font-medium py-2 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-4 px-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 px-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              data.items.map((p) => {
                const busy = pendingId === p.id
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4 text-brand font-medium whitespace-nowrap">{p.ref}</td>
                    <td className="py-2.5 px-4 text-text!">{p.title}</td>
                    <td className="py-2.5 px-4 text-text-muted">{p.thirdPartyName || '—'}</td>
                    <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">{p.dateStart ? formatDate(p.dateStart) : '—'}</td>
                    <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">{p.dateEnd ? formatDate(p.dateEnd) : '—'}</td>
                    <td className="py-2.5 px-4 text-text-muted">{p.budgetAmount != null ? formatMoney(p.budgetAmount) : '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[p.statusLabel]}`}>{p.statusLabel}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {p.statusCode === 0 && (
                          <button
                            type="button"
                            title="Validate"
                            disabled={busy}
                            onClick={() => handleValidate(p.id)}
                            className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-success disabled:opacity-40"
                          >
                            {busy && validateProject.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                        )}
                        <Link to={ROUTES.projectEdit.replace(':id', String(p.id))} title="Edit" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand">
                          <Pencil size={14} />
                        </Link>
                        <button
                          type="button"
                          title="Clone"
                          disabled={busy}
                          onClick={() => handleClone(p.id)}
                          className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand disabled:opacity-40"
                        >
                          {busy && cloneProject.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Copy size={14} />}
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          disabled={busy}
                          onClick={() => handleDelete(p.id, p.ref)}
                          className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-40"
                        >
                          {busy && deleteProject.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
