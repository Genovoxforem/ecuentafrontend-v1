import { useState } from 'react'
import { CalendarClock, X, LoaderCircle, Check } from 'lucide-react'
import { useScheduleActivity, useCloseActivity, type ActivityDetail } from '../customerDetailTabs.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

function dtLocal(raw: string): string {
  if (!raw) return ''
  return raw.replace(' ', 'T').slice(0, 16)
}

// Native replacement for the legacy panel's "Schedule" tab
// (buildScheduleForm in societe/assets/js/components/activities.js) — logs
// a real follow-up (required notes) and, when a date is given, moves the
// activity's due date to it and reopens it. Wired to the real
// societe/api/activities.php action=schedule / action=close (its own
// "Close Activity" button lives here too, matching the legacy panel).
export function ScheduleActivityModal({ socid, item, onClose }: { socid: string; item: ActivityDetail; onClose: () => void }) {
  const type = item.processtype === 'meeting' ? 'meetings' : item.processtype === 'calls' ? 'calls' : 'tasks'
  const scheduleActivity = useScheduleActivity(socid, type)
  const closeActivity = useCloseActivity(socid, type)
  const [description, setDescription] = useState(item.description || '')
  const [scheduleAt, setScheduleAt] = useState(dtLocal(item.duedate_raw || item.startdate_raw))
  const [reminder, setReminder] = useState(item.reminder)
  const [remtime, setRemtime] = useState(dtLocal(item.remtime_raw))
  const [statusCode, setStatusCode] = useState(item.status_code)
  const [lossReason, setLossReason] = useState(item.loss_reason)
  const [demoDate, setDemoDate] = useState(dtLocal(item.demo_date_raw))
  const [proposalDate, setProposalDate] = useState(dtLocal(item.proposal_date_raw))
  const [lastContactDate, setLastContactDate] = useState(dtLocal(item.last_contact_date_raw))
  const [formError, setFormError] = useState('')

  function handleSave() {
    setFormError('')
    if (!description.trim()) {
      setFormError('Follow-up notes are required.')
      return
    }
    scheduleActivity.mutate({
      id: item.id,
      processtype: item.processtype,
      input: {
        description,
        schedule_at: scheduleAt,
        reminder,
        remtime,
        status_code: type === 'meetings' ? statusCode : undefined,
        loss_reason: type === 'meetings' ? lossReason : undefined,
        demo_date: type === 'meetings' ? demoDate : undefined,
        proposal_date: type === 'meetings' ? proposalDate : undefined,
        last_contact_date: type === 'calls' ? lastContactDate : undefined,
      },
    })
  }

  function handleClose() {
    closeActivity.mutate({ id: item.id, processtype: item.processtype, description }, { onSuccess: onClose })
  }

  const success = scheduleActivity.isSuccess
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <CalendarClock size={16} className="text-brand" /> Schedule
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
              <Check size={20} />
            </span>
            <p className="text-sm font-medium text-text!">Follow-up saved.</p>
            <button type="button" onClick={onClose} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Reschedule or add a follow-up for this {item.subject}.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Schedule Date &amp; Time</span>
                <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={inputCls} />
              </label>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-xs font-medium text-text-faint">
                  <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} /> Set reminder
                </label>
                <input type="datetime-local" value={remtime} onChange={(e) => setRemtime(e.target.value)} disabled={!reminder} className={`${inputCls} disabled:opacity-50`} />
              </div>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-text-faint">Follow-up Notes*</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
              </label>

              {type === 'meetings' && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-faint">Lead Outcome</span>
                    <select value={statusCode} onChange={(e) => setStatusCode(e.target.value)} className={inputCls}>
                      <option value="">Select Lead Outcome</option>
                      <option value="1">Won</option>
                      <option value="2">Loss</option>
                      <option value="3">Dropped</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-faint">Reason For Loss</span>
                    <input value={lossReason} onChange={(e) => setLossReason(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-faint">Demo Date</span>
                    <input type="datetime-local" value={demoDate} onChange={(e) => setDemoDate(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-faint">Proposal Date</span>
                    <input type="datetime-local" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} className={inputCls} />
                  </label>
                </>
              )}
              {type === 'calls' && (
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium text-text-faint">Last Contact Date</span>
                  <input type="datetime-local" value={lastContactDate} onChange={(e) => setLastContactDate(e.target.value)} className={inputCls} />
                </label>
              )}
            </div>

            {(formError || scheduleActivity.isError || closeActivity.isError) && (
              <p className="text-xs text-danger">
                {formError ||
                  (scheduleActivity.error instanceof Error ? scheduleActivity.error.message : '') ||
                  (closeActivity.error instanceof Error ? closeActivity.error.message : '')}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={closeActivity.isPending}
                onClick={handleClose}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-success text-white hover:opacity-90 disabled:opacity-60"
              >
                {closeActivity.isPending && <LoaderCircle size={13} className="animate-spin" />} Close Activity
              </button>
              <button
                type="button"
                disabled={scheduleActivity.isPending}
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {scheduleActivity.isPending && <LoaderCircle size={13} className="animate-spin" />} Save Schedule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
