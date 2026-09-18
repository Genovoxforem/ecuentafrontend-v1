import { useMemo, useState } from 'react'
import { BellRing, LoaderCircle, Plus, Check, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelWakeups, useHotelOccRooms, useHotelSaveWakeup, useHotelWakeupDone, useHotelDelWakeup, useHotelToken } from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Real page: booking/service/wake_up_calls.php (mainmenu=hotel&leftmenu=
// wake_up_obj) — via custom/hotel/api.php?r=wakeups (real Suite resource,
// same one the old combined Concierge card used before this leaf was
// carved out into its own page, same reasoning as Enquiry — see
// HotelEnquiryPage.tsx's own note). Every column here is a real field
// (id/room/guest/wdate/wtime/status). "+Add" opens the same real
// savewakeup write inline, using the real occupied-rooms list (r=occrooms)
// to pick a room the same way the old card did. Action offers both real
// mutations the Suite exposes: "Done" (wakedone) while pending, and Delete
// (delwakeup) always.
export function HotelWakeUpCallsPage() {
  const { data: token } = useHotelToken()
  const { data: wakeups, isLoading, isError, error, refetch } = useHotelWakeups()
  const { data: occRooms } = useHotelOccRooms()
  const save = useHotelSaveWakeup()
  const done = useHotelWakeupDone()
  const del = useHotelDelWakeup()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [room, setRoom] = useState('')
  const [guest, setGuest] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [formError, setFormError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = wakeups ?? []
    if (!q) return rows
    return rows.filter((w) => `${w.room} ${w.guest} ${w.status}`.toLowerCase().includes(q))
  }, [wakeups, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function handleRoomChange(id: string) {
    setRoom(id)
    const r = occRooms?.find((o) => o.id === id)
    setGuest(r?.guest ?? '')
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
    if (!token) return
    if (!confirm('Delete this wake-up call?')) return
    setBusyId(id)
    del.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }

  function getExportData() {
    return {
      headers: ['Sl.No', 'Room No', 'Guest Name', 'Wake Up Date', 'Wake Up Time', 'Status'],
      rows: filtered.map((w, i) => [String(i + 1), w.room || '—', w.guest || '—', w.wdate, w.wtime, w.status === 'completed' ? 'Done' : 'Pending']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
              <BellRing size={22} />
            </span>
            <h2 className="text-lg font-bold text-text!">Wake-up Calls</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading wake-up calls…" />}
        {isError && <LegacyErrorCard title="Couldn't load wake-up calls" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {showForm && (
          <Card className="!h-auto">
            <h3 className="font-semibold text-text! mb-3">New wake-up call</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-danger mb-1">Room *</label>
                <select value={room} onChange={(e) => handleRoomChange(e.target.value)} className={`w-full ${inputCls}`}>
                  <option value="">Select suite…</option>
                  {(occRooms ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.no} {r.status === 'checkin' ? '· in-house' : '· booked'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-text-muted mb-1">Guest Name</label>
                <input value={guest} onChange={(e) => setGuest(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-danger mb-1">Wake Up Date *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-danger mb-1">Wake Up Time *</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
            </div>
            {formError && <p className="text-sm text-danger mt-3">{formError}</p>}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                disabled={!token || save.isPending}
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {save.isPending && <LoaderCircle size={14} className="animate-spin" />} Save
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
                Cancel
              </button>
            </div>
          </Card>
        )}

        {wakeups && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Wake-up Calls" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{wakeups.length === 0 ? 'No Data Available In Table' : 'No wake-up calls match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Sl.No</th>
                      <th className="font-medium px-3 py-2">Room No</th>
                      <th className="font-medium px-3 py-2">Guest Name</th>
                      <th className="font-medium px-3 py-2">Wake Up Date</th>
                      <th className="font-medium px-3 py-2">Wake Up Time</th>
                      <th className="font-medium px-3 py-2">Status</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((w, i) => (
                      <tr key={w.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                        <td className="px-3 py-2.5 text-text!">{w.room || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{w.guest || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{w.wdate}</td>
                        <td className="px-3 py-2.5 text-text-muted">{w.wtime}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === 'completed' ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                            {w.status === 'completed' ? 'Done' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {w.status !== 'completed' && (
                              <button
                                type="button"
                                disabled={!token || busyId === w.id}
                                onClick={() => handleDone(w.id)}
                                title="Mark done"
                                className="p-1.5 rounded-md text-success-fg hover:bg-surface-hover disabled:opacity-50"
                              >
                                {busyId === w.id && done.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!token || busyId === w.id}
                              onClick={() => handleDelete(w.id)}
                              title="Delete"
                              className="p-1.5 rounded-md text-danger hover:bg-surface-hover disabled:opacity-50"
                            >
                              {busyId === w.id && del.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {wakeups && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
