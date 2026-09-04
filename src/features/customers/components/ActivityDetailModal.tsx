import { useState } from 'react'
import { Eye, X, CalendarClock, Pencil, Check, LoaderCircle, Phone, Users2, ListChecks } from 'lucide-react'
import { useCloseActivity, type ActivityDetail, type ActivityType } from '../customerDetailTabs.queries'
import { ActivityFormModal } from './ActivityFormModal'
import { ScheduleActivityModal } from './ScheduleActivityModal'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === '' || value === null || value === undefined) return null
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border last:border-0 text-sm">
      <span className="text-text-faint shrink-0">{label}</span>
      <span className="text-text! text-right">{value}</span>
    </div>
  )
}

const PROC_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { task: ListChecks, meeting: Users2, calls: Phone }
const PROC_LABEL: Record<string, string> = { task: 'Task', meeting: 'Meeting', calls: 'Call' }

// Native replacement for the legacy panel's "Details" tab
// (buildDetailView in societe/assets/js/components/activities.js) — the
// per-type field set below is copied field-for-field from that function
// (read directly, not guessed). Open items get the same Schedule/Edit
// quick-actions the real panel offers; closed items are read-only, also
// matching the real page.
export function ActivityDetailModal({ socid, item, onClose }: { socid: string; item: ActivityDetail; onClose: () => void }) {
  const type: ActivityType = item.processtype === 'meeting' ? 'meetings' : item.processtype === 'calls' ? 'calls' : 'tasks'
  const closeActivity = useCloseActivity(socid, type)
  const [subPanel, setSubPanel] = useState<'edit' | 'schedule' | null>(null)
  const p = item.processtype || 'task'
  const Icon = PROC_ICON[p] ?? ListChecks
  const isOpen = item.status === 'open'

  if (subPanel === 'edit') return <ActivityFormModal socid={socid} type={type} mode="edit" initial={item} onClose={onClose} />
  if (subPanel === 'schedule') return <ScheduleActivityModal socid={socid} item={item} onClose={onClose} />

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Eye size={16} className="text-brand" /> {item.subject}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-brand/10 text-brand shrink-0">
            <Icon size={18} />
          </span>
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">{PROC_LABEL[p] ?? p}</span>
            <p className="font-semibold text-text!">{item.subject}</p>
          </div>
        </div>

        <div>
          <Row label="Status" value={<span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${isOpen ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>{isOpen ? 'Open' : 'Closed'}</span>} />
          <Row label="Created" value={item.createddate} />
          <Row label="Accounting Needs" value={item.relatedto} />
          <Row label="Assigned Sales" value={item.assign_salesperson_name} />

          {p === 'task' && (
            <>
              <Row label="Due Date" value={item.duedate} />
              <Row label="Priority" value={item.priority} />
              <Row label="Company" value={item.industry} />
              <Row label="Reminder" value={item.reminder ? `Yes — ${item.remtime}` : 'No'} />
            </>
          )}
          {p === 'meeting' && (
            <>
              <Row label="Location" value={item.location} />
              <Row label="From" value={item.startdate} />
              <Row label="To" value={item.duedate} />
              <Row label="Demo Given" value={item.demo_given === '1' ? 'Yes' : item.demo_given === '0' ? 'No' : undefined} />
              <Row label="Demo Date" value={item.demo_date} />
              <Row label="Proposal Shared" value={item.proposal_shared === '1' ? 'Yes' : item.proposal_shared === '0' ? 'No' : undefined} />
              <Row label="Proposal Date" value={item.proposal_date} />
              <Row label="Lead Outcome" value={item.status_code} />
              <Row label="Loss Reason" value={item.loss_reason} />
            </>
          )}
          {p === 'calls' && (
            <>
              <Row label="Call Start" value={item.duedate} />
              <Row label="Call Type" value={item.callstatus} />
              <Row label="Call Purpose" value={item.callpurpose} />
              <Row label="Follow-up Type" value={item.followup_type} />
              <Row label="Lead Type" value={item.lead_type} />
              <Row label="Last Contact" value={item.last_contact_date} />
              <Row label="Agenda" value={item.agenda} />
            </>
          )}

          {!isOpen && <Row label="Closed By" value={`${item.closedby_name || '—'}${item.statusupdatedtime ? ` (${item.statusupdatedtime})` : ''}`} />}
        </div>

        {(item.description || item.statusdescription) && (
          <div className="mt-3 rounded-md border border-border bg-surface-alt p-3 text-sm">
            <p className="text-xs font-semibold text-text-faint mb-1">Notes / Description</p>
            <p className="text-text! whitespace-pre-wrap">{item.description || item.statusdescription}</p>
          </div>
        )}

        {closeActivity.isError && <p className="mt-2 text-xs text-danger">{closeActivity.error instanceof Error ? closeActivity.error.message : 'Could not close.'}</p>}

        {isOpen && (
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setSubPanel('schedule')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-info/40 text-info hover:bg-info-bg"
            >
              <CalendarClock size={14} /> Schedule
            </button>
            <button
              type="button"
              onClick={() => setSubPanel('edit')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              disabled={closeActivity.isPending}
              onClick={() => closeActivity.mutate({ id: item.id, processtype: item.processtype, description: item.description }, { onSuccess: onClose })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-success text-white hover:opacity-90 disabled:opacity-60"
            >
              {closeActivity.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
