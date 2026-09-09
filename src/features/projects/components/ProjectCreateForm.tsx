import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Network, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
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
  const { id: idParam } = useParams<{ id: string }>()
  const projectId = projectIdProp ?? (idParam ? Number(idParam) : undefined)
  const isEdit = Boolean(projectId)
  const { data: customers } = useCustomerOptions()
  const [searchParams] = useSearchParams()

  const [title, setTitle] = useState('')
  // Pre-filled when reached from a specific customer's own Projects tab
  // ("New project" — see CustomerDetail.tsx) — this field isn't disabled
  // (unlike most below), so the prefill is genuinely visible, even though
  // nothing on this page actually saves.
  const [thirdPartyId, setThirdPartyId] = useState(searchParams.get('customerId') ?? '')
  const [description, setDescription] = useState('')
  const [followOpportunity, setFollowOpportunity] = useState(true)
  const [followTask, setFollowTask] = useState(true)
  const [billTime, setBillTime] = useState(false)

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Network size={20} className="text-brand" /> {isEdit ? 'Edit project' : 'New lead or project'}
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.projectList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button type="button" disabled title="No real API available on this backend" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed">
          {isEdit ? 'Save changes' : 'Create draft'}
        </button>
      }
    >
      <Card>
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

        <div>
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
      </Card>
    </StickyFormShell>
  )
}
