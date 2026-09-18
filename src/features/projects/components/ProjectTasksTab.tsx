import { useMemo, useState } from 'react'
import { ListChecks, Plus, Trash2, LoaderCircle, X, Check } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatDate } from '../../../utils/format'
import { useTasksList, useCreateTask, useDeleteTask, type TaskRow } from '../tasks.queries'
import type { ProjectRow } from '../projects.queries'
import { ProjectInfoCards } from './ProjectInfoRecap'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const selectCls = inputCls + ' appearance-none'

function formatWorkload(seconds: number | null) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h}h${m ? ` ${m}m` : ''}`
}

// Real "List of tasks" widget from projet/tasks.php, backed by the same
// genuine /api/project-tasks/ REST API TasksListPage.tsx/TaskCreateForm.tsx
// already use (see tasks.queries.ts) — scoped to this project, so unlike
// that standalone page there's no Project picker and the create form starts
// with this project already selected.
export function ProjectTasksTab({ project }: { project: ProjectRow }) {
  const { data, isLoading, isError, error } = useTasksList(project.id)
  const deleteTask = useDeleteTask()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [rowError, setRowError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

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
    <div className="space-y-3">
      <ProjectInfoCards project={project} />
      {rowError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{rowError}</Card>}

      {showCreate && <NewTaskForm project={project} tasks={data?.items ?? []} onDone={() => setShowCreate(false)} />}

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">
            <ListChecks size={15} className="text-brand" /> List of tasks
          </h3>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            title="New task"
            className="flex items-center justify-center w-7 h-7 rounded-md bg-brand text-white hover:bg-brand-hover shrink-0"
          >
            {showCreate ? <X size={15} /> : <Plus size={15} />}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Task Ref.</th>
                <th className="font-medium px-4 py-2.5">Task Label</th>
                <th className="font-medium px-4 py-2.5">Start Date</th>
                <th className="font-medium px-4 py-2.5">Deadline</th>
                <th className="font-medium px-4 py-2.5">Planned Workload</th>
                <th className="font-medium px-4 py-2.5" title="No real API available on this backend">Time Spent</th>
                <th className="font-medium px-4 py-2.5">Progress Declared/Consumption</th>
                <th className="font-medium px-4 py-2.5" title="No real API available on this backend">Progress Calculated/Weighting</th>
                <th className="font-medium px-4 py-2.5" title="No real API available on this backend">Cost Of Progress</th>
                <th className="font-medium px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-text-faint italic">
                    <LoaderCircle size={14} className="inline animate-spin mr-2" /> Loading tasks…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-danger italic">
                    {error instanceof Error ? error.message : 'Failed to load tasks.'}
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-text-faint italic">
                    No item for this project.
                  </td>
                </tr>
              ) : (
                data.items.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-brand whitespace-nowrap">{t.ref || '—'}</td>
                    <td className="px-4 py-2.5 text-text!">{t.label}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{t.dateStart ? formatDate(t.dateStart) : '—'}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{t.dateEnd ? formatDate(t.dateEnd) : '—'}</td>
                    <td className="px-4 py-2.5 text-text-muted">{formatWorkload(t.plannedWorkload)}</td>
                    <td className="px-4 py-2.5 text-text-faint" title="No real API available on this backend">—</td>
                    <td className="px-4 py-2.5 text-text-muted">{t.progress != null ? `${t.progress}%` : '—'}</td>
                    <td className="px-4 py-2.5 text-text-faint" title="No real API available on this backend">—</td>
                    <td className="px-4 py-2.5 text-text-faint" title="No real API available on this backend">—</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        title="Delete"
                        disabled={pendingId === t.id}
                        onClick={() => handleDelete(t.id, t.ref)}
                        className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-40"
                      >
                        {pendingId === t.id && deleteTask.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function NewTaskForm({ project, tasks, onDone }: { project: ProjectRow; tasks: TaskRow[]; onDone: () => void }) {
  const createTask = useCreateTask()
  const [parentTaskId, setParentTaskId] = useState('')
  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [workloadHours, setWorkloadHours] = useState('')
  const [workloadMinutes, setWorkloadMinutes] = useState('')
  const [progress, setProgress] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  const parentOptions = useMemo(() => tasks, [tasks])

  function handleSubmit() {
    setFormError('')
    if (!label.trim()) return setFormError('Label is required.')
    const hours = Number(workloadHours) || 0
    const minutes = Number(workloadMinutes) || 0
    createTask.mutate(
      {
        projectId: project.id,
        parentTaskId: parentTaskId ? Number(parentTaskId) : undefined,
        label: label.trim(),
        description,
        dateStart: startDate || undefined,
        dateEnd: endDate || undefined,
        plannedWorkloadSeconds: hours || minutes ? hours * 3600 + minutes * 60 : undefined,
        progress: progress !== '' ? Number(progress) : undefined,
      },
      {
        onSuccess: onDone,
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create task.'),
      },
    )
  }

  return (
    <Card className="!h-auto">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text! mb-3">
        <ListChecks size={15} className="text-brand" /> New task
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Ref.*</label>
          <input value="(auto-generated on save)" disabled title="This API assigns the ref automatically — not settable ahead of time" className={inputCls + ' text-text-faint cursor-not-allowed'} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Allocated to</label>
          <select disabled title="No real API available on this backend" className={selectCls + ' text-text-faint cursor-not-allowed'}>
            <option>—</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Label*</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Child of project/task*</label>
          <select value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} className={selectCls}>
            <option value="">Project {project.ref} ({project.title})</option>
            {parentOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Planned workload</label>
          <div className="flex items-center gap-1.5">
            <input value={workloadHours} onChange={(e) => setWorkloadHours(e.target.value)} placeholder="h" className={inputCls} />
            <span className="text-text-faint">:</span>
            <input value={workloadMinutes} onChange={(e) => setWorkloadMinutes(e.target.value)} placeholder="m" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Declared real progress</label>
          <input value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="%" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
      </div>

      {formError && <p className="text-sm font-medium text-danger mt-3">{formError}</p>}

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
        <button type="button" onClick={onDone} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createTask.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createTask.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Add
        </button>
      </div>
    </Card>
  )
}
