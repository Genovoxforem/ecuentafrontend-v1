import { useState } from 'react'
import { CalendarPlus, X, LoaderCircle, Check } from 'lucide-react'
import { useCreateOrderEvent } from '../orderDetail.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

const STATUS_OPTIONS: { value: '-1' | '0' | '50' | '100'; label: string }[] = [
  { value: '-1', label: 'Not applicable' },
  { value: '0', label: 'To do' },
  { value: '50', label: 'In progress' },
  { value: '100', label: 'Finished' },
]

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// Native replacement for linking out to comm/action/card.php?action=create
// — see orderDetail.queries.ts's useCreateOrderEvent comment for the real
// POST contract this submits to (a genuine event, not a mockup — it's
// linked to this order the same way the legacy page's own form links it,
// via fk_element/elementtype, and shows up for real afterward in "Latest
// linked events").
export function AddOrderEventModal({ id, socid, onClose }: { id: string; socid: number | null; onClose: () => void }) {
  const createEvent = useCreateOrderEvent(id, socid)

  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [fullDay, setFullDay] = useState(false)
  const [startDate, setStartDate] = useState(nowLocal())
  const [endDate, setEndDate] = useState('')
  const [complete, setComplete] = useState<'-1' | '0' | '50' | '100'>('-1')
  const [location, setLocation] = useState('')
  const [formError, setFormError] = useState('')

  function handleSubmit() {
    setFormError('')
    if (!label.trim()) {
      setFormError('Label is required.')
      return
    }
    if (complete === '100' && !endDate) {
      setFormError('End date is required when status is Finished.')
      return
    }
    createEvent.mutate({ label: label.trim(), note, fullDay, startDate, endDate, complete, location })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <CalendarPlus size={16} className="text-brand" /> Add Event
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        {createEvent.isSuccess ? (
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
              <span className="text-xs font-medium text-text-faint">Label*</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-text-faint">
              <input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} /> Event on all day(s)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Start date*</span>
                <input type={fullDay ? 'date' : 'datetime-local'} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">End date</span>
                <input type={fullDay ? 'date' : 'datetime-local'} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Status / Percentage</span>
              <select value={complete} onChange={(e) => setComplete(e.target.value as typeof complete)} className={inputCls}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Description</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className={inputCls} />
            </label>

            {(formError || createEvent.isError) && (
              <p className="text-xs text-danger">{formError || (createEvent.error instanceof Error ? createEvent.error.message : 'Could not create this event.')}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="button"
                disabled={createEvent.isPending}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {createEvent.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <CalendarPlus size={14} />} Create Event
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
