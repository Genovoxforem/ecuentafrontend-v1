import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Network, ExternalLink } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useCustomerOptions } from '../../customers/customerOptions'
import { ROUTES } from '../../../routes'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const disabledCls = inputCls + ' bg-surface-hover text-text-faint cursor-not-allowed'
const selectCls = inputCls + ' appearance-none'

const LEAD_STATUS_OPTIONS = [
  { value: '1', label: 'Prospection' },
  { value: '2', label: 'Qualification' },
  { value: '3', label: 'Proposal' },
  { value: '4', label: 'Negotiation' },
  { value: '6', label: 'Won' },
  { value: '7', label: 'Lost' },
]

// projet/card.php has no JSON API at all — confirmed by reading it directly
// (no json_encode anywhere in the file). The generic Restler REST layer
// (projet/class/api_projects.class.php) that the old /api/projects/ bridge
// used to wrap is gone from disk (confirmed live: that endpoint now returns
// the legacy login page, not JSON) — same situation as Contracts' own
// generic API: real, but DOLAPIKEY-gated with no session-cookie bridge, so
// out of reach without a backend change. There is genuinely no way to
// create or edit a project from the frontend right now, so this form is
// shown for layout reference only — every field is disabled and the real,
// working legacy page is offered as the actual way to do this.
export function ProjectCreateForm({ projectId: projectIdProp }: { projectId?: number } = {}) {
  const navigate = useNavigate()
  const { id: idParam } = useParams<{ id: string }>()
  const projectId = projectIdProp ?? (idParam ? Number(idParam) : undefined)
  const isEdit = Boolean(projectId)
  const { data: customers } = useCustomerOptions()

  const [title, setTitle] = useState('')
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [description, setDescription] = useState('')
  const [followOpportunity, setFollowOpportunity] = useState(true)
  const [followTask, setFollowTask] = useState(true)
  const [billTime, setBillTime] = useState(false)

  const legacyUrl = isEdit ? `/projet/card.php?action=edit&id=${projectId}` : '/projet/card.php?action=create'

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Network size={20} className="text-brand" /> {isEdit ? 'Edit project' : 'New lead or project'}
      </h2>

      <Card className="!h-auto !bg-warning-bg border-warning/40">
        <p className="text-sm font-medium text-warning-fg">No real API exists on this backend to {isEdit ? 'update' : 'create'} a project.</p>
        <p className="text-xs text-text-muted mt-1">The form below matches the real page's layout for reference, but nothing typed into it is saved. Use the legacy system to actually {isEdit ? 'edit' : 'create'} a project.</p>
        <a
          href={legacyUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          {isEdit ? 'Edit' : 'Create'} in legacy system <ExternalLink size={14} />
        </a>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Project label*</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Third-party</label>
            <select value={thirdPartyId} onChange={(e) => setThirdPartyId(e.target.value)} className={selectCls}>
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
            <select disabled className={disabledCls}>
              <option>Project contacts</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Start date</label>
            <input type="date" disabled className={disabledCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">End date</label>
            <input type="date" disabled className={disabledCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Budget</label>
            <input disabled className={disabledCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Lead status</label>
            <select disabled className={disabledCls}>
              <option>select option</option>
              {LEAD_STATUS_OPTIONS.map((o) => (
                <option key={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Lead probability</label>
            <input disabled className={disabledCls} placeholder="%" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Lead amount</label>
            <input disabled className={disabledCls} />
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

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(ROUTES.projectList)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" disabled title="No real API available on this backend" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed">
            {isEdit ? 'Save changes' : 'Create draft'}
          </button>
        </div>
      </Card>
    </div>
  )
}
