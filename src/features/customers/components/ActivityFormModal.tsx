import { useState } from 'react'
import { CalendarPlus, Pencil, X, LoaderCircle, Check, Trash2 } from 'lucide-react'
import {
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  useCustomerActivitiesMeta,
  type ActivityType,
  type ActivityDetail,
  type ActivityFormInput,
} from '../customerDetailTabs.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

const TYPE_LABEL: Record<ActivityType, string> = { tasks: 'Task', meetings: 'Meeting', calls: 'Call' }

// dtLocal(dbDate) -> value an <input type="datetime-local"> accepts.
// activities.php's own sc_api_datetime() runs every date field through
// PHP's strtotime(), which parses this "YYYY-MM-DDTHH:MM" form fine — no
// reformatting needed on submit.
function dtLocal(raw: string): string {
  if (!raw) return ''
  return raw.replace(' ', 'T').slice(0, 16)
}

function emptyForm(): ActivityFormInput {
  return {
    subject: '',
    description: '',
    relatedto: '',
    fk_parent_id: 0,
    duedate: '',
    priority: 'normal',
    industry: '',
    assign_salesperson: '',
    reminder: false,
    remtime: '',
    repeatp: false,
    reptime: '',
    location: '',
    startdate: '',
    demo_given: '',
    demo_date: '',
    userremainder: [],
    participentsremainder: [],
    proposal_shared: '',
    proposal_date: '',
    statusdescription: '',
    status_code: '',
    loss_reason: '',
    decision_maker: '',
    callstatus: 'outbound',
    callpurpose: 'none',
    agenda: '',
    followup_type: '',
    lead_type: '',
    last_contact_date: '',
  }
}

function formFromDetail(d: ActivityDetail): ActivityFormInput {
  return {
    subject: d.subject,
    description: d.description,
    relatedto: d.relatedto,
    fk_parent_id: d.fk_parent_id,
    duedate: dtLocal(d.duedate_raw),
    priority: d.priority || 'normal',
    industry: d.industry,
    assign_salesperson: d.assign_salesperson || '',
    reminder: d.reminder,
    remtime: dtLocal(d.remtime_raw),
    repeatp: d.repeatp,
    reptime: dtLocal(d.reptime),
    location: d.location,
    startdate: dtLocal(d.startdate_raw),
    demo_given: d.demo_given,
    demo_date: dtLocal(d.demo_date_raw),
    userremainder: d.userremainder ? d.userremainder.split(',').map(Number).filter(Boolean) : [],
    participentsremainder: d.participentsremainder ? d.participentsremainder.split(',').map(Number).filter(Boolean) : [],
    proposal_shared: d.proposal_shared,
    proposal_date: dtLocal(d.proposal_date_raw),
    statusdescription: d.statusdescription,
    status_code: d.status_code,
    loss_reason: d.loss_reason,
    decision_maker: d.decision_maker,
    callstatus: d.callstatus || 'outbound',
    callpurpose: d.callpurpose || 'none',
    agenda: d.agenda,
    followup_type: d.followup_type,
    lead_type: d.lead_type,
    last_contact_date: dtLocal(d.last_contact_date_raw),
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-faint">{label}</span>
      {children}
    </label>
  )
}

// Native replacement for the legacy Edit/Schedule/Create canvas
// (societe/assets/js/components/activities.js's buildTaskForm/
// buildMeetingForm/buildCallForm) — wired to the real
// societe/api/activities.php create/update actions, field-for-field
// against what that PHP file's own INSERT/UPDATE branches accept (read
// directly, not guessed). Not live-tested against this instance's database
// (mutation, requires per-instance approval).
export function ActivityFormModal({
  socid,
  type,
  mode,
  initial,
  onClose,
}: {
  socid: string
  type: ActivityType
  mode: 'create' | 'edit'
  initial?: ActivityDetail
  onClose: () => void
}) {
  const createActivity = useCreateActivity(socid, type)
  const updateActivity = useUpdateActivity(socid, type)
  const deleteActivity = useDeleteActivity(socid, type)
  const { data: meta } = useCustomerActivitiesMeta(socid)
  const [form, setForm] = useState<ActivityFormInput>(initial ? formFromDetail(initial) : emptyForm())
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const busy = createActivity.isPending || updateActivity.isPending
  const mutation = mode === 'create' ? createActivity : updateActivity
  const set = <K extends keyof ActivityFormInput>(key: K) => (value: ActivityFormInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  function handleSubmit() {
    setFormError('')
    if (!form.subject.trim()) {
      setFormError('Subject is required.')
      return
    }
    if (mode === 'create') {
      createActivity.mutate(form)
    } else if (initial) {
      updateActivity.mutate({ id: initial.id, input: form })
    }
  }

  const followupOptions = meta ? Object.entries(meta.followup_types) : []
  const meetingStatusOptions = meta ? Object.entries(meta.meeting_statuses) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            {mode === 'create' ? <CalendarPlus size={16} className="text-brand" /> : <Pencil size={16} className="text-brand" />}
            {mode === 'create' ? 'Add' : 'Edit'} {TYPE_LABEL[type]}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        {mutation.isSuccess ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
              <Check size={20} />
            </span>
            <p className="text-sm font-medium text-text!">{TYPE_LABEL[type]} {mode === 'create' ? 'created' : 'updated'}.</p>
            <button type="button" onClick={onClose} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Subject*">
                <input value={form.subject} onChange={(e) => set('subject')(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Belongs To">
                <select value={form.fk_parent_id} onChange={(e) => set('fk_parent_id')(Number(e.target.value))} className={inputCls}>
                  <option value={0}>None (Main Action)</option>
                  {meta?.parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.subject}
                    </option>
                  ))}
                </select>
              </Field>

              {type === 'tasks' && (
                <>
                  <Field label="Date">
                    <input type="datetime-local" value={form.duedate} onChange={(e) => set('duedate')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Priority">
                    <select value={form.priority} onChange={(e) => set('priority')(e.target.value)} className={inputCls}>
                      {(meta?.priorities ?? ['highest', 'high', 'normal', 'low', 'lowest']).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Company">
                    <input value={form.industry} onChange={(e) => set('industry')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Assigned Sales Person">
                    <select value={form.assign_salesperson} onChange={(e) => set('assign_salesperson')(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                      <option value="">—</option>
                      {meta?.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}

              {type === 'meetings' && (
                <>
                  <Field label="Location">
                    <input value={form.location} onChange={(e) => set('location')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="From Date">
                    <input type="datetime-local" value={form.startdate} onChange={(e) => set('startdate')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="To Date">
                    <input type="datetime-local" value={form.duedate} onChange={(e) => set('duedate')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Host">
                    <select
                      multiple
                      value={form.userremainder.map(String)}
                      onChange={(e) => set('userremainder')(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
                      className={`${inputCls} h-24`}
                    >
                      {meta?.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Participants">
                    <select
                      multiple
                      value={form.participentsremainder.map(String)}
                      onChange={(e) => set('participentsremainder')(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
                      className={`${inputCls} h-24`}
                    >
                      {meta?.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Demo Given">
                    <select value={form.demo_given} onChange={(e) => set('demo_given')(e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      <option value="1">Yes</option>
                      <option value="0">No</option>
                    </select>
                  </Field>
                  <Field label="Demo Date">
                    <input type="datetime-local" value={form.demo_date} onChange={(e) => set('demo_date')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Proposal Shared">
                    <select value={form.proposal_shared} onChange={(e) => set('proposal_shared')(e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      <option value="1">Yes</option>
                      <option value="0">No</option>
                    </select>
                  </Field>
                  <Field label="Proposal Date">
                    <input type="datetime-local" value={form.proposal_date} onChange={(e) => set('proposal_date')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Lead Outcome">
                    <select value={form.status_code} onChange={(e) => set('status_code')(e.target.value)} className={inputCls}>
                      {meetingStatusOptions.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Reason For Loss">
                    <input value={form.loss_reason} onChange={(e) => set('loss_reason')(e.target.value)} className={inputCls} />
                  </Field>
                </>
              )}

              {type === 'calls' && (
                <>
                  <Field label="Call Type">
                    <select value={form.callstatus} onChange={(e) => set('callstatus')(e.target.value)} className={inputCls}>
                      {(meta?.call_statuses ?? ['outbound', 'inbound', 'missed']).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Call Purpose">
                    <select value={form.callpurpose} onChange={(e) => set('callpurpose')(e.target.value)} className={inputCls}>
                      {(meta?.call_purposes ?? ['none', 'prospecting', 'administrative', 'negotiation', 'demo', 'project', 'desk']).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Call Start Time">
                    <input type="datetime-local" value={form.duedate} onChange={(e) => set('duedate')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Last Contact Date">
                    <input type="datetime-local" value={form.last_contact_date} onChange={(e) => set('last_contact_date')(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Follow Up Type">
                    <select value={form.followup_type} onChange={(e) => set('followup_type')(e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {followupOptions.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Lead Type">
                    <select value={form.lead_type} onChange={(e) => set('lead_type')(e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {(meta?.lead_types ?? ['Paid', 'Organic']).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assigned Sales Person">
                    <select value={form.assign_salesperson} onChange={(e) => set('assign_salesperson')(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                      <option value="">—</option>
                      {meta?.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Call Agenda">
                    <input value={form.agenda} onChange={(e) => set('agenda')(e.target.value)} className={inputCls} />
                  </Field>
                </>
              )}

              <Field label="Accounting Needs">
                <select value={form.relatedto} onChange={(e) => set('relatedto')(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {meta?.accounting_needs.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              {type === 'meetings' ? (
                <>
                  <Field label="Clients Objection">
                    <textarea value={form.statusdescription} onChange={(e) => set('statusdescription')(e.target.value)} rows={2} className={`${inputCls} sm:col-span-2`} />
                  </Field>
                  <Field label="Proposal Followup">
                    <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} rows={2} className={`${inputCls} sm:col-span-2`} />
                  </Field>
                </>
              ) : (
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium text-text-faint">{type === 'calls' ? 'Notes' : 'Description'}</span>
                  <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} rows={3} className={inputCls} />
                </label>
              )}

              {mode === 'create' && (
                <div className="sm:col-span-2 flex items-center gap-3 rounded-md border border-input-border px-3 py-2">
                  <label className="flex items-center gap-2 text-sm text-text-muted shrink-0">
                    <input type="checkbox" checked={form.reminder} onChange={(e) => set('reminder')(e.target.checked)} /> Reminder
                  </label>
                  <input
                    type="datetime-local"
                    value={form.remtime}
                    onChange={(e) => set('remtime')(e.target.value)}
                    disabled={!form.reminder}
                    className={`${inputCls} disabled:opacity-50`}
                  />
                </div>
              )}
            </div>

            {(formError || mutation.isError) && (
              <p className="text-xs text-danger">{formError || (mutation.error instanceof Error ? mutation.error.message : `Could not save the ${TYPE_LABEL[type].toLowerCase()}.`)}</p>
            )}

            {confirmDelete && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
                <span>Delete this {TYPE_LABEL[type].toLowerCase()}? This can't be undone.</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 rounded-md text-xs font-medium border border-border text-text-muted hover:bg-surface-hover">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteActivity.isPending}
                    onClick={() => initial && deleteActivity.mutate(initial.id, { onSuccess: onClose })}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-danger text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {deleteActivity.isPending ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
            {deleteActivity.isError && <p className="text-xs text-danger">{deleteActivity.error instanceof Error ? deleteActivity.error.message : 'Could not delete.'}</p>}

            <div className="flex items-center justify-between gap-2 pt-2">
              {mode === 'edit' && initial?.status === 'open' && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-danger/40 text-danger hover:bg-danger-bg"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div className="flex justify-end gap-2 flex-1">
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {busy && <LoaderCircle size={13} className="animate-spin" />} {mode === 'create' ? 'Save' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
