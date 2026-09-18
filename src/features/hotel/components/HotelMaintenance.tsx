import { useState } from 'react'
import { Wrench, LoaderCircle, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelMaintenance, useHotelMaintStaff, useHotelSaveMaint, useHotelMaintAdvance, useHotelDelMaint, useHotelToken, type HotelMaintTicket } from '../hotel.queries'

const PRIORITY_COLOR: Record<string, string> = { urgent: 'text-rose-600', high: 'text-amber-600', normal: 'text-text-muted', low: 'text-text-faint' }
const STATUS_TAG: Record<string, string> = { reported: 'bg-warning-bg text-warning-fg', assigned: 'bg-info-bg text-info-fg', inprogress: 'bg-info-bg text-info-fg', completed: 'bg-success-bg text-success-fg' }
const NEXT_STEP: Record<string, { to: string; label: string }> = {
  reported: { to: 'assigned', label: 'Assign' },
  assigned: { to: 'inprogress', label: 'Start' },
  inprogress: { to: 'completed', label: 'Complete' },
}

function TicketModal({ ticket, onClose, onSaved }: { ticket: HotelMaintTicket | null; onClose: () => void; onSaved: () => void }) {
  const { data: token } = useHotelToken()
  const { data: staff } = useHotelMaintStaff()
  const save = useHotelSaveMaint()

  const [issue, setIssue] = useState(ticket?.issue ?? '')
  const [category, setCategory] = useState(ticket?.category ?? 'other')
  const [priority, setPriority] = useState(ticket?.priority ?? 'normal')
  const [assignedTo, setAssignedTo] = useState(ticket?.assigned_to ?? '0')
  const [notes, setNotes] = useState(ticket?.notes ?? '')
  const [error, setError] = useState('')

  function handleSave() {
    if (!issue.trim()) return setError('Describe the issue.')
    if (!token) return
    save.mutate(
      { id: ticket?.id, room: '0', issue, category, priority, assigned_to: assignedTo, notes, token },
      { onSuccess: onSaved, onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">{ticket ? 'Edit ticket' : 'Report maintenance issue'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="Issue (e.g. AC not working)"
            className="w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm">
              <option value="ac">AC / Heating</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="furniture">Furniture</option>
              <option value="tv">TV / Electronics</option>
              <option value="other">Other</option>
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm col-span-2">
              <option value="0">Unassigned</option>
              {(staff ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={!token || save.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save ticket
          </button>
        </div>
      </div>
    </div>
  )
}

// Real via custom/hotel/api.php?r=maintenance, plus a=savemaint /
// a=maintadvance / a=delmaint — the Hotel Suite app's own Maintenance
// Tickets view.
export function HotelMaintenance() {
  const { data: token } = useHotelToken()
  const { data: tickets, isLoading, isError, error, refetch } = useHotelMaintenance()
  const advance = useHotelMaintAdvance()
  const del = useHotelDelMaint()
  const [modal, setModal] = useState<{ ticket: HotelMaintTicket | null } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function handleAdvance(id: string, to: string) {
    if (!token) return
    setBusyId(id)
    advance.mutate({ id, to, token }, { onSettled: () => setBusyId(null) })
  }
  function handleDelete(id: string) {
    if (!token || !confirm('Delete this ticket?')) return
    del.mutate({ id, token })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <Wrench size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Maintenance Tickets</h2>
          </div>
        </div>
        <button type="button" onClick={() => setModal({ ticket: null })} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          + Report issue
        </button>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading tickets…" />}
      {isError && <LegacyErrorCard title="Couldn't load tickets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {tickets && (
        <Card className="!h-auto !p-0 overflow-hidden">
          {tickets.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No maintenance tickets. Tap "+ Report issue" to log one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-3 py-2">Issue</th>
                  <th className="font-medium px-3 py-2">Suite</th>
                  <th className="font-medium px-3 py-2">Priority</th>
                  <th className="font-medium px-3 py-2">Assignee</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const next = NEXT_STEP[t.status]
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="text-text! font-medium">{t.issue}</p>
                        <p className="text-xs text-text-faint">
                          {t.category} · {t.created}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">{t.room || '—'}</td>
                      <td className={`px-3 py-2.5 font-medium capitalize ${PRIORITY_COLOR[t.priority] ?? ''}`}>{t.priority}</td>
                      <td className="px-3 py-2.5 text-text-muted">{t.assignee || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[t.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {next && (
                          <button
                            type="button"
                            disabled={!token || busyId === t.id}
                            onClick={() => handleAdvance(t.id, next.to)}
                            className="text-xs text-brand hover:underline disabled:opacity-50 mr-3"
                          >
                            {busyId === t.id ? <LoaderCircle size={11} className="inline animate-spin" /> : next.label}
                          </button>
                        )}
                        <button type="button" onClick={() => setModal({ ticket: t })} className="text-xs text-text-muted hover:underline mr-3">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(t.id)} className="text-xs text-danger hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {modal && <TicketModal ticket={modal.ticket} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
    </div>
  )
}
