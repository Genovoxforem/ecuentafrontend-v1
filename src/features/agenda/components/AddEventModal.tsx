import { useState } from 'react'
import { CalendarPlus, X, LoaderCircle, Check } from 'lucide-react'
import { useActionTypes, useCreateEvent } from '../calendarApi.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Native replacement for linking out to comm/action/card.php?action=create
// — wired to the real comm/action/ajax/calendar_api.php createEvent action
// (see calendarApi.queries.ts). Not live-tested against this instance's
// database (mutation, requires per-instance approval).
export function AddEventModal({ elementtype, fkElement, socid, onClose, onCreated }: { elementtype: string; fkElement: number; socid?: number; onClose: () => void; onCreated: () => void }) {
  const { data: types, isLoading, isError, error, refetch } = useActionTypes()
  const createEvent = useCreateEvent()

  const [actioncode, setActioncode] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState('09:00')
  const [fullday, setFullday] = useState(false)
  const [formError, setFormError] = useState('')

  function handleSubmit() {
    setFormError('')
    if (!actioncode) {
      setFormError('Type is required.')
      return
    }
    createEvent.mutate(
      { actioncode, label, date, time, fullday, elementtype, fkElement, socid },
      { onSuccess: () => onCreated() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <CalendarPlus size={16} className="text-brand" /> Create Event
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <LegacyLoadingCard label="Loading event types…" />
        ) : isError || !types ? (
          <LegacyErrorCard title="Couldn't load event types" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : createEvent.isSuccess ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
              <Check size={20} />
            </span>
            <p className="text-sm font-medium text-text!">Event created.</p>
            <button type="button" onClick={onClose} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Type*</span>
              <select value={actioncode} onChange={(e) => setActioncode(e.target.value)} className={inputCls}>
                <option value="">Select a type…</option>
                {types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Title</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Time</span>
                <input type="time" value={time} disabled={fullday} onChange={(e) => setTime(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" checked={fullday} onChange={(e) => setFullday(e.target.checked)} /> Full day event
            </label>

            {(formError || createEvent.isError) && (
              <p className="text-xs text-danger">{formError || (createEvent.error instanceof Error ? createEvent.error.message : 'Could not create the event.')}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="button"
                disabled={createEvent.isPending}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {createEvent.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
