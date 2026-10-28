import { useState, type ReactNode } from 'react'
import { Bell, Trash2, Loader2, Save, Repeat } from 'lucide-react'
import { useConfirm } from '../../../../../shared/components/ConfirmDialog'
import { useActivitiesMeta, useCreateActivity, useUpdateActivity, useDeleteActivity, type ActivityItem, type ActivityMeta, type ActivityProcessType, type ActivityFormFields } from '../../../userDetailTabs.queries'
import { inputCls, primaryBtn } from '../UserDetailShared'
import { PROCESS_LABEL } from './activitiesTabShared'

// The reference's own datetime picker submits "YYYY-MM-DD HH:mm:ss"; native
// <input type="datetime-local"> uses "YYYY-MM-DDTHH:mm" — these convert
// between the two so real _raw values round-trip through the form.
export function toDatetimeLocalInput(raw: string): string {
  return raw ? raw.replace(' ', 'T').slice(0, 16) : ''
}

export function fromDatetimeLocalInput(val: string): string {
  return val ? `${val.replace('T', ' ')}:00` : ''
}

export function activityToFormFields(a: ActivityItem): ActivityFormFields {
  return {
    processtype: a.processtype,
    subject: a.subject,
    description: a.description,
    priority: a.priority || 'normal',
    relatedto: a.relatedTo,
    industry: a.industry,
    fk_parent_id: a.fkParentId,
    assign_salesperson: a.assignSalesperson || '',
    duedate: a.dueDateRaw,
    startdate: a.startDateRaw,
    location: a.location,
    demo_given: a.demoGiven,
    demo_date: a.demoDateRaw,
    proposal_shared: a.proposalShared,
    proposal_date: a.proposalDateRaw,
    statusdescription: a.statusDescription,
    userremainder: a.userRemainder ? a.userRemainder.split(',').filter(Boolean) : [],
    participentsremainder: a.participantsRemainder ? a.participantsRemainder.split(',').filter(Boolean) : [],
    callstatus: a.callStatus,
    callpurpose: a.callPurpose,
    followup_type: a.followupType,
    lead_type: a.leadType,
    last_contact_date: a.lastContactDateRaw,
    agenda: a.agenda,
  }
}

export function FormRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-xs text-text-faint">{label}</span>
      {children}
    </label>
  )
}

export interface FormFieldsProps {
  values: ActivityFormFields
  onChange: (patch: Partial<ActivityFormFields>) => void
  meta: ActivityMeta | undefined
  mode: 'create' | 'edit'
}

export function TaskFormFields({ values, onChange, meta, mode }: FormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Subject *">
          <input value={values.subject ?? ''} onChange={(e) => onChange({ subject: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Date *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.duedate ?? '')}
            onChange={(e) => onChange({ duedate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="Priority">
          <select value={values.priority ?? 'normal'} onChange={(e) => onChange({ priority: e.target.value })} className={`${inputCls} capitalize`}>
            {(meta?.priorities ?? ['normal']).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Accounting Needs">
          <select value={values.relatedto ?? ''} onChange={(e) => onChange({ relatedto: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.accountingNeeds ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Company">
          <input value={values.industry ?? ''} onChange={(e) => onChange({ industry: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Belongs To">
          <select value={String(values.fk_parent_id ?? 0)} onChange={(e) => onChange({ fk_parent_id: e.target.value })} className={inputCls}>
            <option value="0">None (Main Action)</option>
            {(meta?.parents ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.subject}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <FormRow label="Assigned Sales Person" className="sm:w-1/3">
        <select value={String(values.assign_salesperson ?? '')} onChange={(e) => onChange({ assign_salesperson: e.target.value })} className={inputCls}>
          <option value="">—</option>
          {(meta?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Notes">
        <textarea rows={2} value={values.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} className={`${inputCls} resize-y`} />
      </FormRow>
      {mode === 'create' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border px-3 py-2 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <input type="checkbox" checked={!!values.reminder} onChange={(e) => onChange({ reminder: e.target.checked })} /> <Bell size={12} /> Reminder
            </label>
            <input
              type="datetime-local"
              disabled={!values.reminder}
              value={toDatetimeLocalInput(values.remtime ?? '')}
              onChange={(e) => onChange({ remtime: fromDatetimeLocalInput(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div className="rounded-md border border-border px-3 py-2 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <input type="checkbox" checked={!!values.repeatp} onChange={(e) => onChange({ repeatp: e.target.checked })} /> <Repeat size={12} /> Repeat
            </label>
            <input
              type="datetime-local"
              disabled={!values.repeatp}
              value={toDatetimeLocalInput(values.reptime ?? '')}
              onChange={(e) => onChange({ reptime: fromDatetimeLocalInput(e.target.value) })}
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function MeetingFormFields({ values, onChange, meta, mode }: FormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Subject *">
          <input value={values.subject ?? ''} onChange={(e) => onChange({ subject: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Location">
          <input value={values.location ?? ''} onChange={(e) => onChange({ location: e.target.value })} className={inputCls} />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Belongs To">
          <select value={String(values.fk_parent_id ?? 0)} onChange={(e) => onChange({ fk_parent_id: e.target.value })} className={inputCls}>
            <option value="0">None (Main Action)</option>
            {(meta?.parents ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.subject}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="From Date *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.startdate ?? '')}
            onChange={(e) => onChange({ startdate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="To Date *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.duedate ?? '')}
            onChange={(e) => onChange({ duedate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Demo Given">
          <select value={values.demo_given ?? ''} onChange={(e) => onChange({ demo_given: e.target.value })} className={inputCls}>
            <option value="">—</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </FormRow>
        <FormRow label="Demo Date">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.demo_date ?? '')}
            onChange={(e) => onChange({ demo_date: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Host">
          <select
            multiple
            value={values.userremainder ?? []}
            onChange={(e) => onChange({ userremainder: Array.from(e.target.selectedOptions).map((o) => o.value) })}
            className={`${inputCls} h-20`}
          >
            {(meta?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Participants">
          <select
            multiple
            value={values.participentsremainder ?? []}
            onChange={(e) => onChange({ participentsremainder: Array.from(e.target.selectedOptions).map((o) => o.value) })}
            className={`${inputCls} h-20`}
          >
            {(meta?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Accounting Needs">
          <select value={values.relatedto ?? ''} onChange={(e) => onChange({ relatedto: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.accountingNeeds ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Proposal Shared">
          <select value={values.proposal_shared ?? ''} onChange={(e) => onChange({ proposal_shared: e.target.value })} className={inputCls}>
            <option value="">—</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </FormRow>
        <FormRow label="Proposal Date">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.proposal_date ?? '')}
            onChange={(e) => onChange({ proposal_date: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <FormRow label="Clients Objection">
        <textarea rows={2} value={values.statusdescription ?? ''} onChange={(e) => onChange({ statusdescription: e.target.value })} className={`${inputCls} resize-y`} />
      </FormRow>
      <FormRow label="Proposal Followup">
        <textarea rows={2} value={values.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} className={`${inputCls} resize-y`} />
      </FormRow>
      {mode === 'create' && (
        <div className="rounded-md border border-border px-3 py-2 space-y-1.5 sm:w-1/2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <input type="checkbox" checked={!!values.reminder} onChange={(e) => onChange({ reminder: e.target.checked })} /> <Bell size={12} /> Reminder
          </label>
          <input
            type="datetime-local"
            disabled={!values.reminder}
            value={toDatetimeLocalInput(values.remtime ?? '')}
            onChange={(e) => onChange({ remtime: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </div>
      )}
    </div>
  )
}

export function CallFormFields({ values, onChange, meta, mode }: FormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Subject *">
          <input value={values.subject ?? ''} onChange={(e) => onChange({ subject: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Belongs To">
          <select value={String(values.fk_parent_id ?? 0)} onChange={(e) => onChange({ fk_parent_id: e.target.value })} className={inputCls}>
            <option value="0">None (Main Action)</option>
            {(meta?.parents ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.subject}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Accounting Needs">
          <select value={values.relatedto ?? ''} onChange={(e) => onChange({ relatedto: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.accountingNeeds ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Call Type">
          <select value={values.callstatus ?? ''} onChange={(e) => onChange({ callstatus: e.target.value })} className={`${inputCls} capitalize`}>
            {(meta?.callStatuses ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Follow Up Type">
          <select value={values.followup_type ?? ''} onChange={(e) => onChange({ followup_type: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {Object.entries(meta?.followupTypes ?? {}).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Lead Type">
          <select value={values.lead_type ?? ''} onChange={(e) => onChange({ lead_type: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.leadTypes ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Assigned Sales Person">
          <select value={String(values.assign_salesperson ?? '')} onChange={(e) => onChange({ assign_salesperson: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Call Start Time *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.duedate ?? '')}
            onChange={(e) => onChange({ duedate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Last Contact Date">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.last_contact_date ?? '')}
            onChange={(e) => onChange({ last_contact_date: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="Call Purpose">
          <select value={values.callpurpose ?? ''} onChange={(e) => onChange({ callpurpose: e.target.value })} className={`${inputCls} capitalize`}>
            {(meta?.callPurposes ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <FormRow label="Call Agenda">
        <input value={values.agenda ?? ''} onChange={(e) => onChange({ agenda: e.target.value })} className={inputCls} />
      </FormRow>
      {mode === 'create' && (
        <FormRow label="Reminder" className="sm:w-1/2">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.remtime ?? '')}
            onChange={(e) => onChange({ remtime: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      )}
    </div>
  )
}

export function ActivityFormRenderer({ processtype, ...rest }: FormFieldsProps & { processtype: ActivityProcessType }) {
  if (processtype === 'meeting') return <MeetingFormFields {...rest} />
  if (processtype === 'calls') return <CallFormFields {...rest} />
  return <TaskFormFields {...rest} />
}

// Shared create+edit form — real create (POST) / update (PUT) / delete
// (DELETE), all against userprofile/api/activities.php and all confirmed
// live (create → detail → update → detail → delete → detail-now-404).
export function ActivityForm({
  userId,
  processtype,
  activity,
  onDone,
}: {
  userId: string | undefined
  processtype: ActivityProcessType
  activity: ActivityItem | null
  onDone: () => void
}) {
  const { data: meta } = useActivitiesMeta(userId)
  const create = useCreateActivity(userId)
  const update = useUpdateActivity(userId)
  const del = useDeleteActivity(userId)
  const confirm = useConfirm()
  const [values, setValues] = useState<ActivityFormFields>(() => (activity ? activityToFormFields(activity) : { processtype }))
  const patch = (p: Partial<ActivityFormFields>) => setValues((v) => ({ ...v, ...p }))
  const mutation = activity ? update : create

  const submit = () => {
    if (activity) update.mutate({ activityId: activity.id, fields: values }, { onSuccess: onDone })
    else create.mutate(values, { onSuccess: onDone })
  }

  return (
    <div className="space-y-4">
      <ActivityFormRenderer processtype={processtype} values={values} onChange={patch} meta={meta} mode={activity ? 'edit' : 'create'} />
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        {activity && activity.status === 'open' && (
          <button
            type="button"
            disabled={del.isPending}
            onClick={async () => {
              if (await confirm({ title: 'Delete Activity?', message: 'Are you sure you want to delete this activity?' })) del.mutate(activity.id, { onSuccess: onDone })
            }}
            className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-danger/30 text-danger px-3 py-1.5 text-sm font-medium hover:bg-danger-bg disabled:opacity-50"
          >
            {del.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
          </button>
        )}
        <button type="button" disabled={mutation.isPending || !values.subject} onClick={submit} className={primaryBtn}>
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}{' '}
          {activity ? `Update ${PROCESS_LABEL[processtype]}` : `Create ${PROCESS_LABEL[processtype]}`}
        </button>
      </div>
      {(mutation.isError || del.isError) && (
        <p className="text-sm text-danger">{((mutation.error ?? del.error) as Error | null)?.message ?? 'Failed to save.'}</p>
      )}
    </div>
  )
}
