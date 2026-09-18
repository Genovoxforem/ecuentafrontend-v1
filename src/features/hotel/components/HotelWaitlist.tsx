import { useState } from 'react'
import { Hourglass, LoaderCircle, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelWaitlist, useHotelRoomTypes, useHotelSaveWait, useHotelWaitStatus, useHotelToken, type HotelWaitlistEntry } from '../hotel.queries'

const STATUS_TAG: Record<string, string> = { waiting: 'bg-warning-bg text-warning-fg', contacted: 'bg-info-bg text-info-fg' }

function WaitModal({ entry, onClose, onSaved }: { entry: HotelWaitlistEntry | null; onClose: () => void; onSaved: () => void }) {
  const { data: token } = useHotelToken()
  const { data: roomTypes } = useHotelRoomTypes()
  const save = useHotelSaveWait()

  const [name, setName] = useState(entry?.name ?? '')
  const [phone, setPhone] = useState(entry?.phone ?? '')
  const [roomType, setRoomType] = useState(entry?.room_type_id ?? '0')
  const [pax, setPax] = useState(String(entry?.pax ?? 1))
  const [checkIn, setCheckIn] = useState(entry?.ci_raw?.slice(0, 10) ?? '')
  const [checkOut, setCheckOut] = useState(entry?.co_raw?.slice(0, 10) ?? '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) return setError('Enter a guest name.')
    if (!token) return
    save.mutate(
      { id: entry?.id, name, phone, room_type: roomType, pax: Number(pax) || 1, check_in: checkIn, check_out: checkOut, note, token },
      { onSuccess: onSaved, onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">{entry ? 'Edit waitlist entry' : 'Add to waitlist'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm">
              <option value="0">Any room type</option>
              {(roomTypes ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input type="number" min={1} value={pax} onChange={(e) => setPax(e.target.value)} placeholder="Pax" className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm" />
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" rows={2} className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
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
            {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Real via custom/hotel/api.php?r=waitlist, plus a=savewait / a=waitstatus
// — the Hotel Suite app's own Waitlist view.
export function HotelWaitlist() {
  const { data: token } = useHotelToken()
  const { data: rows, isLoading, isError, error, refetch } = useHotelWaitlist()
  const status = useHotelWaitStatus()
  const [modal, setModal] = useState<{ entry: HotelWaitlistEntry | null } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function handleStatus(id: string, to: string, confirmMsg?: string) {
    if (!token) return
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusyId(id)
    status.mutate({ id, to, token }, { onSettled: () => setBusyId(null) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <Hourglass size={22} />
          </span>
          <h2 className="text-lg font-bold text-text!">Waitlist</h2>
        </div>
        <button type="button" onClick={() => setModal({ entry: null })} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          + Add to waitlist
        </button>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading waitlist…" />}
      {isError && <LegacyErrorCard title="Couldn't load waitlist" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {rows && (
        <Card className="!h-auto !p-0 overflow-hidden">
          {rows.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">
              Waitlist is empty. Add guests here when you're fully booked, then convert them when a suite frees up.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-3 py-2">Guest</th>
                  <th className="font-medium px-3 py-2">Room type</th>
                  <th className="font-medium px-3 py-2">Dates</th>
                  <th className="font-medium px-3 py-2">Pax</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="text-text! font-medium">{r.name || '—'}</p>
                      {r.phone && <p className="text-xs text-text-faint">{r.phone}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">{r.rtype}</td>
                    <td className="px-3 py-2.5 text-text-muted">{r.ci_raw ? `${r.ci} → ${r.co || '?'}` : 'flexible'}</td>
                    <td className="px-3 py-2.5 text-text-muted">{r.pax}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[r.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {r.status === 'waiting' && (
                        <button type="button" disabled={!token || busyId === r.id} onClick={() => handleStatus(r.id, 'contacted')} className="text-xs text-brand hover:underline mr-3 disabled:opacity-50">
                          {busyId === r.id ? <LoaderCircle size={11} className="inline animate-spin" /> : 'Contacted'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!token || busyId === r.id}
                        onClick={() => handleStatus(r.id, 'converted', 'Mark as booked and remove from waitlist?')}
                        className="text-xs text-success-fg hover:underline mr-3 disabled:opacity-50"
                      >
                        Booked
                      </button>
                      <button type="button" onClick={() => setModal({ entry: r })} className="text-xs text-text-muted hover:underline mr-3">
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={!token || busyId === r.id}
                        onClick={() => handleStatus(r.id, 'cancelled', 'Remove from waitlist?')}
                        className="text-xs text-danger hover:underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {modal && <WaitModal entry={modal.entry} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
    </div>
  )
}
