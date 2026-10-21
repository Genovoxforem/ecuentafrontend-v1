import { useState } from 'react'
import { Check, LoaderCircle, Zap, X } from 'lucide-react'
import { useAgendaFilterOptions, useCreateEvent } from '../../agenda/calendarApi.queries'
import { useAuth } from '../../auth/AuthContext'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

const pad = (n: number) => String(n).padStart(2, '0')
const dateIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeIso = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

// The agenda tab's "Quick event": type, title, start and length, saved against this third party in one step.
// (The full form with status, priority, contacts, assignees and categories is "Create event".)
export function QuickEventModal({ socid, onClose, onCreated }: { socid: number; onClose: () => void; onCreated: () => void }) {
  const { data: options, isLoading } = useAgendaFilterOptions()
  const createEvent = useCreateEvent()
  const { user } = useAuth()
  const now = new Date()
  const [actioncode, setActioncode] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(dateIso(now))
  const [time, setTime] = useState(timeIso(new Date(now.getTime() + 15 * 60_000)))
  const [minutes, setMinutes] = useState(30)
  const [error, setError] = useState('')

  const code = actioncode || options?.types.find((t) => t.code === 'AC_OTH')?.code || options?.types[0]?.code || ''

  function submit() {
    setError('')
    if (!label.trim()) return setError('A title is required.')
    if (!code) return setError('Pick an event type.')
    if (!user?.id) return setError('Your user could not be identified.')
    const start = new Date(`${date}T${time}`)
    if (Number.isNaN(start.getTime())) return setError('Enter a valid date and time.')
    const end = new Date(start.getTime() + minutes * 60_000)
    createEvent.mutate(
      { actioncode: code, label: label.trim(), fullday: false, startDate: dateIso(start), startTime: timeIso(start), endDate: dateIso(end), endTime: timeIso(end), percent: 0, priority: 0, location: '', note: '', busy: false, socid, assignedUserIds: [Number(user.id)] },
      { onSuccess: () => onCreated(), onError: (e) => setError(e instanceof Error ? e.message : 'Could not create the event.') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-text!">
            <Zap size={16} className="text-brand" /> Quick event
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 p-5">
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Type</span>
            <select value={code} onChange={(e) => setActioncode(e.target.value)} disabled={isLoading} className={inputCls}>
              {(options?.types ?? []).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Title <span className="text-danger">*</span>
            </span>
            <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className={inputCls} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Length</span>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={inputCls}>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={createEvent.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {createEvent.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create
          </button>
        </div>
      </div>
    </div>
  )
}
