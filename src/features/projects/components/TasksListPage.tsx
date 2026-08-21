import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Plus, Trash2, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatDate } from '../../../utils/format'
import { useTasksList, useDeleteTask } from '../tasks.queries'
import { ROUTES } from '../../../routes'

function formatWorkload(seconds: number | null) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h}h${m ? ` ${m}m` : ''}`
}

// Real GET/DELETE /api/project-tasks/ data (see tasks.queries.ts), against
// Dolibarr's real Task class.
export function TasksListPage() {
  const { data, isLoading, isError, error } = useTasksList()
  const deleteTask = useDeleteTask()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [rowError, setRowError] = useState('')

  function handleDelete(id: number, ref: string | null) {
    if (!window.confirm(`Delete task ${ref || `#${id}`}? This cannot be undone.`)) return
    setRowError('')
    setPendingId(id)
    deleteTask.mutate(id, {
      onSettled: () => setPendingId(null),
      onError: (err) => setRowError(err instanceof Error ? err.message : 'Failed to delete task — it may have time-spent entries linked to it.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListChecks size={20} className="text-brand" /> Tasks/Activities
        </h2>
        <Link to={ROUTES.projectTaskCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Task
        </Link>
      </div>

      {isError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load tasks.'}</Card>}
      {rowError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{rowError}</Card>}

      <Card className="!h-auto !p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Task Ref.</th>
              <th className="font-medium py-2 px-4">Task Label</th>
              <th className="font-medium py-2 px-4">Start Date</th>
              <th className="font-medium py-2 px-4">Deadline</th>
              <th className="font-medium py-2 px-4">Project Ref.</th>
              <th className="font-medium py-2 px-4">Planned Workload</th>
              <th className="font-medium py-2 px-4">Progress</th>
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
              data.items.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 px-4 text-brand whitespace-nowrap">{t.ref || '—'}</td>
                  <td className="py-2.5 px-4 text-text!">{t.label}</td>
                  <td className="py-2.5 px-4 text-text-muted">{t.dateStart ? formatDate(t.dateStart) : '—'}</td>
                  <td className="py-2.5 px-4 text-text-muted">{t.dateEnd ? formatDate(t.dateEnd) : '—'}</td>
                  <td className="py-2.5 px-4 text-text-muted">{t.projectRef}</td>
                  <td className="py-2.5 px-4 text-text-muted">{formatWorkload(t.plannedWorkload)}</td>
                  <td className="py-2.5 px-4 text-text-muted">{t.progress != null ? `${t.progress}%` : '—'}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      title="Delete"
                      disabled={pendingId === t.id}
                      onClick={() => handleDelete(t.id, t.ref)}
                      className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-40"
                    >
                      {pendingId === t.id && deleteTask.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
