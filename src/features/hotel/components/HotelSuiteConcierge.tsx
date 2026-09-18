import { useState } from 'react'
import { ConciergeBell, LoaderCircle, Check, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useHotelWakeups,
  useHotelOccRooms,
  useHotelSaveWakeup,
  useHotelWakeupDone,
  useHotelDelWakeup,
  useHotelEnquiries,
  useHotelSaveEnquiry,
  useHotelDelEnquiry,
  useHotelToken,
} from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function WakeupCallsCard() {
  const { data: token } = useHotelToken()
  const { data: wakeups, isLoading, isError, error, refetch } = useHotelWakeups()
  const { data: occRooms } = useHotelOccRooms()
  const save = useHotelSaveWakeup()
  const done = useHotelWakeupDone()
  const del = useHotelDelWakeup()

  const [busyId, setBusyId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [room, setRoom] = useState('')
  const [guest, setGuest] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [formError, setFormError] = useState('')

  function handleRoomChange(id: string) {
    setRoom(id)
    setGuest(occRooms?.find((o) => o.id === id)?.guest ?? '')
  }

  function handleSave() {
    if (!token) return
    if (!room || !date || !time) return setFormError('Room, date and time are all required.')
    setFormError('')
    save.mutate(
      { room, guest, wdate: date, wtime: time, token },
      {
        onSuccess: () => {
          setShowForm(false)
          setRoom('')
          setGuest('')
          setDate('')
          setTime('')
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Failed to save.'),
      },
    )
  }

  function handleDone(id: string) {
    if (!token) return
    setBusyId(id)
    done.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }
  function handleDelete(id: string) {
    if (!token || !confirm('Delete this wake-up call?')) return
    setBusyId(id)
    del.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }

  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Wake-up Calls</h3>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover">
          + Schedule
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-lg border border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={room} onChange={(e) => handleRoomChange(e.target.value)} className={inputCls}>
              <option value="">Select suite…</option>
              {(occRooms ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.no} {r.status === 'checkin' ? '· in-house' : '· booked'}
                </option>
              ))}
            </select>
            <input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Guest name" className={inputCls} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </div>
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!token || save.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {save.isPending && <LoaderCircle size={12} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && <LegacyLoadingCard label="Loading…" />}
      {isError && <LegacyErrorCard title="Couldn't load wake-up calls" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {wakeups && wakeups.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">No wake-up calls scheduled.</p>
      ) : (
        <div className="divide-y divide-border">
          {(wakeups ?? []).map((w) => (
            <div key={w.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text!">
                  Room {w.room || '—'} {w.guest ? `· ${w.guest}` : ''}
                </p>
                <p className="text-xs text-text-faint">
                  {w.wdate} {w.wtime}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === 'completed' ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                {w.status === 'completed' ? 'Done' : 'Pending'}
              </span>
              <div className="flex items-center gap-1">
                {w.status !== 'completed' && (
                  <button type="button" disabled={!token || busyId === w.id} onClick={() => handleDone(w.id)} title="Mark done" className="p-1.5 rounded-md text-success-fg hover:bg-surface-hover disabled:opacity-50">
                    {busyId === w.id && done.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                )}
                <button type="button" disabled={!token || busyId === w.id} onClick={() => handleDelete(w.id)} title="Delete" className="p-1.5 rounded-md text-danger hover:bg-surface-hover disabled:opacity-50">
                  {busyId === w.id && del.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function EnquiriesLeadsCard() {
  const { data: token } = useHotelToken()
  const { data: enquiries, isLoading, isError, error, refetch } = useHotelEnquiries()
  const save = useHotelSaveEnquiry()
  const del = useHotelDelEnquiry()

  const [deleting, setDeleting] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [ci, setCi] = useState('')
  const [co, setCo] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  function handleSave() {
    if (!token) return
    if (!name.trim()) return setFormError('Name is required.')
    setFormError('')
    save.mutate(
      { name, email, phone, ci, co, message, token },
      {
        onSuccess: () => {
          setShowForm(false)
          setName('')
          setEmail('')
          setPhone('')
          setCi('')
          setCo('')
          setMessage('')
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Failed to save.'),
      },
    )
  }

  function handleDelete(id: string) {
    if (!token || !confirm('Delete this enquiry?')) return
    setDeleting(id)
    del.mutate({ id, token }, { onSettled: () => setDeleting(null) })
  }

  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Enquiries &amp; Leads</h3>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover">
          + Add Lead
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-lg border border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className={inputCls} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputCls} />
            <input type="date" value={ci} onChange={(e) => setCi(e.target.value)} placeholder="Check in" className={inputCls} />
            <input type="date" value={co} onChange={(e) => setCo(e.target.value)} placeholder="Check out" className={inputCls} />
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notes / requirements" rows={2} className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!token || save.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {save.isPending && <LoaderCircle size={12} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && <LegacyLoadingCard label="Loading…" />}
      {isError && <LegacyErrorCard title="Couldn't load enquiries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {enquiries && enquiries.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">No enquiries yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {(enquiries ?? []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text!">{e.name || 'Guest'}</p>
                <p className="text-xs text-text-faint">
                  {[e.email, e.phone].filter(Boolean).join(' · ') || '—'}
                  {e.ci ? ` · ${e.ci} → ${e.co || '—'}` : ''}
                </p>
              </div>
              <button type="button" disabled={!token || deleting === e.id} onClick={() => handleDelete(e.id)} title="Delete" className="p-1.5 rounded-md text-danger hover:bg-surface-hover disabled:opacity-50">
                {deleting === e.id ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Real via custom/hotel/api.php?r=wakeups|enquiries, plus a=savewakeup/
// wakedone/delwakeup/saveenquiry/delenquiry — the Hotel Suite app's own
// Concierge tab (confirmed live: a condensed two-card dashboard, "Wake-up
// Calls" + "Enquiries & Leads" side by side, distinct from the fuller
// classic DataTables pages the outer sidebar's own "Wake-Up Calls" and
// "Enquiry" leaves use — HotelWakeUpCallsPage.tsx / HotelEnquiryPage.tsx —
// which share the exact same real resources/mutations, just presented as
// full searchable/exportable tables instead of this compact view).
export function HotelSuiteConcierge() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <ConciergeBell size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">Concierge</h2>
          <p className="text-xs text-text-faint mt-0.5 uppercase tracking-wide">Wake-up calls &amp; leads</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WakeupCallsCard />
        <EnquiriesLeadsCard />
      </div>
    </div>
  )
}
