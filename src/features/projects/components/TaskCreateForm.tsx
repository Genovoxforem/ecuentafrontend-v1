import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProjectsList } from '../projects.queries'
import { useTasksList, useCreateTask } from '../tasks.queries'
import { ROUTES } from '../../../routes'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const selectCls = inputCls + ' appearance-none'

// Real POST /api/project-tasks/ (see tasks.queries.ts), against Dolibarr's
// real Task class. Project and Parent Task are two real dropdowns (from
// useProjectsList/useTasksList) instead of the legacy page's single
// combined "<projectId>_<taskId>" select — same real data, clearer UX.
export function TaskCreateForm() {
  const navigate = useNavigate()
  const { data: projects, isLoading: projectsLoading } = useProjectsList('all')
  const [projectId, setProjectId] = useState('')
  const { data: tasksInProject } = useTasksList(projectId ? Number(projectId) : undefined)
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

  const parentTaskOptions = useMemo(() => tasksInProject?.items ?? [], [tasksInProject])
  const noProjects = !projectsLoading && (projects?.items.length ?? 0) === 0

  function handleSubmit() {
    setFormError('')
    if (!projectId) return setFormError('Project is required!')
    if (!label.trim()) return setFormError('Label is required!')
    const hours = Number(workloadHours) || 0
    const minutes = Number(workloadMinutes) || 0
    createTask.mutate(
      {
        projectId: Number(projectId),
        parentTaskId: parentTaskId ? Number(parentTaskId) : undefined,
        label: label.trim(),
        description,
        dateStart: startDate || undefined,
        dateEnd: endDate || undefined,
        plannedWorkloadSeconds: hours || minutes ? hours * 3600 + minutes * 60 : undefined,
        progress: progress !== '' ? Number(progress) : undefined,
      },
      {
        onSuccess: () => navigate(ROUTES.projectTaskList),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create task.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListChecks size={20} className="text-brand" /> New task
      </h2>

      {noProjects && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          No project defined or owned — create a project first before adding a task to it.
        </Card>
      )}

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Project*</label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value)
                setParentTaskId('')
              }}
              className={selectCls}
              disabled={projectsLoading || noProjects}
            >
              <option value="">Select a project</option>
              {projects?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.ref})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Parent task</label>
            <select value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} className={selectCls} disabled={!projectId}>
              <option value="">None (top-level task)</option>
              {parentTaskOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Label*</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
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
            <label className="block text-xs font-medium text-text-faint mb-1">Progress</label>
            <input value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="%" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-faint mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
        </div>

        {formError && <p className="text-sm font-medium text-danger mb-3">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(ROUTES.projectTaskList)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createTask.isPending || noProjects}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createTask.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </Card>
    </div>
  )
}
