import { useState, type ComponentType } from 'react'
import { X, Pencil, CheckCircle2, UsersRound, Loader2, PhoneCall, CalendarPlus } from 'lucide-react'
import { useActivitiesMeta, useScheduleActivity, useCloseActivity, type ActivityItem, type ActivityMeta, type ActivityProcessType } from '../../../userDetailTabs.queries'
import { Field, inputCls, primaryBtn } from '../UserDetailShared'
import { PROCESS_LABEL, accountingNeedsLabel } from './activitiesTabShared'
import { ActivityForm, FormRow, fromDatetimeLocalInput, toDatetimeLocalInput } from './activityForms'

export const PROCESS_ICON: Record<ActivityProcessType, ComponentType<{ size?: number; className?: string }>> = { task: CheckCircle2, meeting: UsersRound, calls: PhoneCall }

export function resolveUserNames(csv: string, meta: ActivityMeta | undefined): string {
  const ids = (csv || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.length) return '—'
  const map = new Map((meta?.users ?? []).map((u) => [String(u.id), u.name]))
  return ids.map((id) => map.get(id) ?? `User #${id}`).join(', ')
}

// Read-only "Details" panel — matches the reference's own field set per
// process type exactly (see activities.js's buildDetailView).
export function ActivityDetailView({
  activity: a,
  meta,
  onGoto,
  userId,
  onClose,
}: {
  activity: ActivityItem
  meta: ActivityMeta | undefined
  onGoto: (panel: 'schedule' | 'edit') => void
  userId: string | undefined
  onClose: () => void
}) {
  const close = useCloseActivity(userId)
  const isOpen = a.status === 'open'
  const rows: Array<[string, string]> = [
    ['Status', isOpen ? 'Open' : 'Closed'],
    ['Created', a.createdDate || '—'],
    ['Accounting Needs', accountingNeedsLabel(a.relatedTo, meta)],
    ['Assigned Sales', a.assignSalespersonName || (a.assignSalesperson ? resolveUserNames(String(a.assignSalesperson), meta) : '—')],
  ]
  if (a.processtype === 'task') {
    rows.push(['Due Date', a.dueDate || '—'], ['Priority', a.priority || '—'], ['Company', a.industry || '—'], ['Reminder', a.reminder ? `Yes — ${a.remtime}` : 'No'])
  } else if (a.processtype === 'meeting') {
    rows.push(
      ['Location', a.location || '—'],
      ['From', a.startDate || '—'],
      ['To', a.dueDate || '—'],
      ['Host', resolveUserNames(a.userRemainder, meta)],
      ['Participants', resolveUserNames(a.participantsRemainder, meta)],
      ['Demo Given', a.demoGiven === '1' ? 'Yes' : a.demoGiven === '0' ? 'No' : '—'],
      ['Demo Date', a.demoDate || '—'],
      ['Proposal Shared', a.proposalShared === '1' ? 'Yes' : a.proposalShared === '0' ? 'No' : '—'],
      ['Proposal Date', a.proposalDate || '—'],
      ['Lead Outcome', a.statusCode || '—'],
      ['Loss Reason', a.lossReason || '—'],
    )
  } else {
    rows.push(
      ['Call Start', a.dueDate || '—'],
      ['Call Type', a.callStatus || '—'],
      ['Call Purpose', a.callPurpose || '—'],
      ['Follow-up Type', (meta?.followupTypes ?? {})[a.followupType] ?? (a.followupType || '—')],
      ['Lead Type', a.leadType || '—'],
      ['Last Contact', a.lastContactDate || '—'],
      ['Agenda', a.agenda || '—'],
    )
  }
  const notes = a.description || a.statusDescription

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        {rows.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </div>
      {notes && (
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs text-text-faint uppercase tracking-wide mb-1">Notes / Description</p>
          <p className="text-sm text-text! whitespace-pre-wrap">{notes}</p>
        </div>
      )}
      {isOpen && (
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => onGoto('schedule')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover"
          >
            <CalendarPlus size={13} /> Schedule
          </button>
          <button
            type="button"
            onClick={() => onGoto('edit')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover"
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            type="button"
            disabled={close.isPending}
            onClick={() => close.mutate({ activityId: a.id, processtype: a.processtype, description: a.description }, { onSuccess: onClose })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success text-white hover:bg-success-hover px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {close.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Close
          </button>
        </div>
      )}
      {close.isError && <p className="text-sm text-danger">{close.error instanceof Error ? close.error.message : 'Failed to close.'}</p>}
    </div>
  )
}

// Real reschedule/follow-up form — POST action=schedule — plus a quick
// "Close Activity" action (POST action=close), matching the reference's
// own buildScheduleForm exactly (see activities.js).
export function ActivityScheduleForm({ userId, activity, onDone }: { userId: string | undefined; activity: ActivityItem; onDone: () => void }) {
  const schedule = useScheduleActivity(userId)
  const close = useCloseActivity(userId)
  const [scheduleAt, setScheduleAt] = useState(toDatetimeLocalInput(activity.dueDateRaw || activity.startDateRaw))
  const [reminder, setReminder] = useState(activity.reminder)
  const [remtime, setRemtime] = useState(toDatetimeLocalInput(activity.remtimeRaw))
  const [description, setDescription] = useState('')
  const [statusCode, setStatusCode] = useState(activity.statusCode)
  const [lossReason, setLossReason] = useState(activity.lossReason)
  const [statusDescription, setStatusDescription] = useState(activity.statusDescription)
  const [demoDate, setDemoDate] = useState(toDatetimeLocalInput(activity.demoDateRaw))
  const [proposalDate, setProposalDate] = useState(toDatetimeLocalInput(activity.proposalDateRaw))
  const [lastContactDate, setLastContactDate] = useState(toDatetimeLocalInput(activity.lastContactDateRaw))

  const submit = () => {
    if (!description.trim()) return
    schedule.mutate(
      {
        activityId: activity.id,
        fields: {
          processtype: activity.processtype,
          description,
          schedule_at: fromDatetimeLocalInput(scheduleAt),
          reminder,
          remtime: fromDatetimeLocalInput(remtime),
          status_code: statusCode,
          loss_reason: lossReason,
          statusdescription: statusDescription,
          demo_date: fromDatetimeLocalInput(demoDate),
          proposal_date: fromDatetimeLocalInput(proposalDate),
          last_contact_date: fromDatetimeLocalInput(lastContactDate),
        },
      },
      { onSuccess: onDone },
    )
  }
  const closeNow = () => {
    close.mutate({ activityId: activity.id, processtype: activity.processtype, description: statusDescription || description }, { onSuccess: onDone })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">Reschedule or add a follow-up for this {PROCESS_LABEL[activity.processtype].toLowerCase()}.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Schedule Date & Time">
          <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={inputCls} />
        </FormRow>
        <div className="rounded-md border border-border px-3 py-2 space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} /> Set reminder
          </label>
          <input type="datetime-local" disabled={!reminder} value={remtime} onChange={(e) => setRemtime(e.target.value)} className={inputCls} />
        </div>
      </div>
      <FormRow label="Follow-up Notes *">
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} resize-y`} />
      </FormRow>
      {activity.processtype === 'meeting' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <FormRow label="Lead Outcome (1=Won,2=Loss,3=Dropped)">
            <input value={statusCode} onChange={(e) => setStatusCode(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Reason For Loss">
            <input value={lossReason} onChange={(e) => setLossReason(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Demo Date">
            <input type="datetime-local" value={demoDate} onChange={(e) => setDemoDate(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Proposal Date">
            <input type="datetime-local" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Client Objection" className="sm:col-span-2">
            <textarea rows={2} value={statusDescription} onChange={(e) => setStatusDescription(e.target.value)} className={`${inputCls} resize-y`} />
          </FormRow>
        </div>
      )}
      {activity.processtype === 'calls' && (
        <FormRow label="Last Contact Date">
          <input type="datetime-local" value={lastContactDate} onChange={(e) => setLastContactDate(e.target.value)} className={inputCls} />
        </FormRow>
      )}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <button
          type="button"
          disabled={close.isPending}
          onClick={closeNow}
          className="inline-flex items-center gap-1.5 rounded-lg bg-success text-white hover:bg-success-hover px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {close.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Close Activity
        </button>
        <button type="button" disabled={schedule.isPending || !description.trim()} onClick={submit} className={primaryBtn}>
          {schedule.isPending ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />} Save Schedule
        </button>
      </div>
      {(schedule.isError || close.isError) && (
        <p className="text-sm text-danger">{((schedule.error ?? close.error) as Error | null)?.message ?? 'Failed.'}</p>
      )}
    </div>
  )
}

// Unified View/Schedule/Edit panel for one activity — mirrors the
// reference's own offcanvas tabs (activities.js's panelTabs/renderActivityPanel).
export function ActivityPanelModal({
  userId,
  activity,
  initialPanel,
  onClose,
}: {
  userId: string | undefined
  activity: ActivityItem
  initialPanel: 'view' | 'edit' | 'schedule'
  onClose: () => void
}) {
  const { data: meta } = useActivitiesMeta(userId)
  const [panel, setPanel] = useState<'view' | 'edit' | 'schedule'>(initialPanel)
  const isOpen = activity.status === 'open'
  const Icon = PROCESS_ICON[activity.processtype]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-text-faint uppercase tracking-wide">
                {PROCESS_LABEL[activity.processtype]} · #{activity.id}
              </p>
              <h3 className="text-sm font-semibold text-text!">{activity.subject}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 mt-3 border-b border-border">
          <button
            type="button"
            onClick={() => setPanel('view')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 ${panel === 'view' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            Details
          </button>
          {isOpen && (
            <button
              type="button"
              onClick={() => setPanel('schedule')}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 ${panel === 'schedule' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              Schedule
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel('edit')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 ${panel === 'edit' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            Edit
          </button>
        </div>

        <div className="px-5 py-4">
          {panel === 'view' && <ActivityDetailView activity={activity} meta={meta} onGoto={setPanel} userId={userId} onClose={onClose} />}
          {panel === 'schedule' && <ActivityScheduleForm userId={userId} activity={activity} onDone={onClose} />}
          {panel === 'edit' && <ActivityForm userId={userId} processtype={activity.processtype} activity={activity} onDone={onClose} />}
        </div>
      </div>
    </div>
  )
}
