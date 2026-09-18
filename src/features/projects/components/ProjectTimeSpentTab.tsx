import { useState } from 'react'
import { Hourglass, Plus, X, LoaderCircle, Check } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAuth } from '../../auth/AuthContext'
import { useTasksList, useAddTimeSpent } from '../tasks.queries'
import type { ProjectRow } from '../projects.queries'
import { ProjectInfoCards } from './ProjectInfoRecap'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const selectCls = inputCls + ' appearance-none'

// Real "List Of Time Consumed On Tasks Of Project" widget from
// projet/tasks/time.php — the Add row genuinely POSTs via the same
// /api/project-tasks/?action=addtimespent endpoint TasksListPage.tsx/
// tasks.queries.ts already use (Task::addTimeSpent(), confirmed live). There
// is no matching list/GET endpoint for past time-spent entries though, so
// the results table below stays an honest empty state rather than
// fabricating rows. "By" is always the logged-in user server-side (no field
// for it in the real POST), and there's no real "Value" field at all.
export function ProjectTimeSpentTab({ project }: { project: ProjectRow }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-3">
      <ProjectInfoCards project={project} />

      {showAdd && <AddTimeSpentForm project={project} onDone={() => setShowAdd(false)} />}

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">
            <Hourglass size={15} className="text-brand" /> List Of Time Consumed On Tasks Of Project
          </h3>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            title="Add time spent"
            className="flex items-center justify-center w-7 h-7 rounded-md bg-brand text-white hover:bg-brand-hover shrink-0"
          >
            {showAdd ? <X size={15} /> : <Plus size={15} />}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5">Task Ref.</th>
                <th className="font-medium px-4 py-2.5">Task Label</th>
                <th className="font-medium px-4 py-2.5">By</th>
                <th className="font-medium px-4 py-2.5">Note</th>
                <th className="font-medium px-4 py-2.5">Duration</th>
                <th className="font-medium px-4 py-2.5" title="No real API available on this backend">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-faint italic">
                  No data source available — this backend has no endpoint to list past time-spent entries.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function AddTimeSpentForm({ project, onDone }: { project: ProjectRow; onDone: () => void }) {
  const { user } = useAuth()
  const { data: tasks, isLoading: tasksLoading } = useTasksList(project.id)
  const addTimeSpent = useAddTimeSpent()

  const [taskId, setTaskId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')

  function handleSubmit() {
    setFormError('')
    if (!taskId) return setFormError('Task is required.')
    const h = Number(hours) || 0
    const m = Number(minutes) || 0
    if (!h && !m) return setFormError('Duration is required.')
    addTimeSpent.mutate(
      { id: Number(taskId), date, durationSeconds: h * 3600 + m * 60, note: note || undefined },
      {
        onSuccess: onDone,
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to add time spent.'),
      },
    )
  }

  return (
    <Card className="!h-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Task*</label>
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={tasksLoading} className={selectCls}>
            <option value="">{tasksLoading ? 'Loading tasks…' : '-- Select a task --'}</option>
            {tasks?.items.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ref ? `${t.ref} — ` : ''}
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">By</label>
          <input value={user ? `${user.firstname} ${user.lastname}` : '—'} disabled className={inputCls + ' text-text-faint cursor-not-allowed'} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text-faint mb-1">Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-faint mb-1">Duration</label>
          <div className="flex items-center gap-1.5">
            <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="h" className={inputCls} />
            <span className="text-text-faint">:</span>
            <input value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="m" className={inputCls} />
          </div>
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
          disabled={addTimeSpent.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {addTimeSpent.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Add
        </button>
      </div>
    </Card>
  )
}
