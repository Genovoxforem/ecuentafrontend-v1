import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProjectDetail, useCreateProject, useUpdateProject } from '../projects.queries'
import { ROUTES } from '../../../routes'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const selectCls = inputCls + ' appearance-none'

// Real llx_c_lead_status dictionary (confirmed directly against the DB —
// small, fixed reference table, same static-but-real convention as
// PAYMENT_TYPES elsewhere in this app rather than a live fetch for 6 rows).
const LEAD_STATUS_OPTIONS = [
  { value: '1', label: 'Prospection' },
  { value: '2', label: 'Qualification' },
  { value: '3', label: 'Proposal' },
  { value: '4', label: 'Negotiation' },
  { value: '6', label: 'Won' },
  { value: '7', label: 'Lost' },
]

// Real POST/PUT /api/projects/ (see projects.queries.ts), against Dolibarr's
// real Project class. Doubles as the Edit form when `projectId` is passed —
// same fields, pre-filled from useProjectDetail(), submitting via
// useUpdateProject() instead of useCreateProject().
export function ProjectCreateForm({ projectId }: { projectId?: number } = {}) {
  const navigate = useNavigate()
  const isEdit = Boolean(projectId)
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: existing, isLoading: existingLoading } = useProjectDetail(projectId)
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const [title, setTitle] = useState('')
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [visibility, setVisibility] = useState<'0' | '1'>('0')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [budget, setBudget] = useState('')
  const [oppStatus, setOppStatus] = useState('')
  const [oppProbability, setOppProbability] = useState('')
  const [oppAmount, setOppAmount] = useState('')
  const [description, setDescription] = useState('')
  const [followOpportunity, setFollowOpportunity] = useState(true)
  const [followTask, setFollowTask] = useState(true)
  const [billTime, setBillTime] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!existing) return
    const p = existing.project
    setTitle(p.title)
    setThirdPartyId(p.thirdPartyId ? String(p.thirdPartyId) : '')
    setVisibility(p.public ? '1' : '0')
    setDateStart(p.dateStart ? p.dateStart.slice(0, 10) : '')
    setDateEnd(p.dateEnd ? p.dateEnd.slice(0, 10) : '')
    setBudget(p.budgetAmount != null ? String(p.budgetAmount) : '')
    setOppStatus(p.oppStatusId ? String(p.oppStatusId) : '')
    setOppProbability(p.oppPercent != null ? String(p.oppPercent) : '')
    setOppAmount(p.oppAmount != null ? String(p.oppAmount) : '')
    setDescription(p.description)
    setFollowOpportunity(p.usageOpportunity)
    setFollowTask(p.usageTask)
    setBillTime(p.usageBillTime)
  }, [existing])

  const isLoading = isEdit ? existingLoading : false
  const pending = createProject.isPending || updateProject.isPending

  function handleSubmit() {
    setFormError('')
    if (!title.trim()) return setFormError('Project label is required!')
    const input = {
      title: title.trim(),
      description,
      thirdPartyId: thirdPartyId || undefined,
      public: visibility === '1',
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      budgetAmount: budget || undefined,
      oppStatusId: oppStatus || undefined,
      oppPercent: oppProbability || undefined,
      oppAmount: oppAmount || undefined,
      usageOpportunity: followOpportunity,
      usageTask: followTask,
      usageBillTime: billTime,
    }
    if (isEdit && projectId) {
      updateProject.mutate(
        { id: projectId, ...input },
        { onSuccess: () => navigate(ROUTES.projectList), onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to update project.') },
      )
    } else {
      createProject.mutate(input, {
        onSuccess: () => navigate(ROUTES.projectList),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create project.'),
      })
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Network size={20} className="text-brand" /> {isEdit ? 'Edit project' : 'New lead or project'}
      </h2>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Project label*</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} disabled={isLoading} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Third-party</label>
            <select value={thirdPartyId} onChange={(e) => setThirdPartyId(e.target.value)} className={selectCls} disabled={isLoading || customersLoading}>
              <option value="">Select a third party</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Visibility</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as '0' | '1')} className={selectCls} disabled={isLoading}>
              <option value="0">Project contacts</option>
              <option value="1">Public</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Start date</label>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">End date</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Budget</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Lead status</label>
            <select value={oppStatus} onChange={(e) => setOppStatus(e.target.value)} className={selectCls} disabled={isLoading}>
              <option value="">select option</option>
              {LEAD_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Lead probability</label>
            <input value={oppProbability} onChange={(e) => setOppProbability(e.target.value)} className={inputCls} placeholder="%" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Lead amount</label>
            <input value={oppAmount} onChange={(e) => setOppAmount(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-faint mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-text-faint mb-2">Usage</label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'opportunity', label: 'Follow opportunity', checked: followOpportunity, set: setFollowOpportunity },
              { key: 'task', label: 'Follow tasks or time spent', checked: followTask, set: setFollowTask },
              { key: 'bill', label: 'Bill the time spent', checked: billTime, set: setBillTime },
            ].map((u) => (
              <button
                key={u.key}
                type="button"
                onClick={() => u.set((v) => !v)}
                className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                  u.checked ? 'border-brand bg-brand/10 text-brand' : 'border-input-border text-text-muted hover:bg-surface-hover'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {formError && <p className="text-sm font-medium text-danger mb-3">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(ROUTES.projectList)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || isLoading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create draft'}
          </button>
        </div>
      </Card>
    </div>
  )
}
