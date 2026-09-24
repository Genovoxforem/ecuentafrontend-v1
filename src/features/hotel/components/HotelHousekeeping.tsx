import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelRack, useHotelCleanJobs, useHotelHousekeepers, useHotelCleanRoom, useHotelCleanAdvance, useHotelAssignClean, useHotelToken } from '../hotel.queries'

const STATUS_STYLES: Record<string, { label: string; chip: string }> = {
  occupied: { label: 'Occupied', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ready: { label: 'Ready', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  dirty: { label: 'To service', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  arriving: { label: 'Arriving', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  ooo: { label: 'Out of service', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
}
const JOB_STATUS_TAG: Record<string, string> = {
  assigned: 'bg-warning-bg text-warning-fg',
  inprogress: 'bg-info-bg text-info-fg',
  completed: 'bg-success-bg text-success-fg',
  inspected: 'bg-success-bg text-success-fg',
}
const NEXT_STEP: Record<string, { to: string; label: string }> = {
  assigned: { to: 'inprogress', label: 'Start' },
  inprogress: { to: 'completed', label: 'Mark cleaned' },
  completed: { to: 'inspected', label: 'Inspect' },
}

function AssignForm({ onDone }: { onDone: () => void }) {
  const { data: token } = useHotelToken()
  const { data: housekeepers } = useHotelHousekeepers()
  const { data: rack } = useHotelRack()
  const assign = useHotelAssignClean()
  const [hk, setHk] = useState('')
  const [rooms, setRooms] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setRooms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    if (!token || !hk || rooms.size === 0) return
    assign.mutate({ hk, rooms: Array.from(rooms).join(','), token }, { onSuccess: onDone })
  }

  return (
    <Card className="!h-auto space-y-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-text-muted">Housekeeper</span>
        <select value={hk} onChange={(e) => setHk(e.target.value)} className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm">
          <option value="">Select…</option>
          {(housekeepers ?? []).map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <p className="text-sm text-text-muted mb-1.5">Suites to service</p>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto no-scrollbar">
          {(rack ?? []).map((r) => {
            const on = rooms.has(r.id)
            const flagged = r.status === 'dirty' || r.status === 'occupied'
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggle(r.id)}
                className={`px-2.5 py-1 rounded-md border text-xs font-medium ${on ? 'bg-brand text-white border-brand' : 'border-border text-text hover:border-brand'}`}
              >
                {r.no}
                {flagged && ' *'}
              </button>
            )
          })}
        </div>
      </div>
      <button
        type="button"
        disabled={!token || !hk || rooms.size === 0 || assign.isPending}
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {assign.isPending ? <LoaderCircle size={13} className="animate-spin" /> : null} Assign
      </button>
    </Card>
  )
}

// Real via custom/hotel/api.php?r=rack|cleanjobs|housekeepers, plus
// a=clean / a=cleanadvance / a=assignclean — the Hotel Suite app's own
// Housekeeping view.
export function HotelHousekeeping() {
  const { data: token } = useHotelToken()
  const rack = useHotelRack()
  const jobs = useHotelCleanJobs()
  const cleanRoom = useHotelCleanRoom()
  const advance = useHotelCleanAdvance()
  const [showAssign, setShowAssign] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  function handleQuickClean(roomId: string) {
    if (!token) return
    setBusyId(roomId)
    cleanRoom.mutate({ room: roomId, token }, { onSettled: () => setBusyId(null) })
  }

  function handleAdvance(id: string, to: string) {
    if (!token) return
    setBusyId(id)
    advance.mutate({ id, to, token }, { onSettled: () => setBusyId(null) })
  }

  return (
    <div className="space-y-4">

      {rack.isLoading && <LegacyLoadingCard label="Loading suite status…" />}
      {rack.isError && <LegacyErrorCard title="Couldn't load suite status" message={rack.error instanceof Error ? rack.error.message : 'Unknown error.'} onRetry={() => rack.refetch()} />}

      {rack.data && (
        <Card className="!h-auto">
          {rack.data.length === 0 ? (
            <p className="text-sm text-text-faint italic py-4 text-center">No suites configured yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rack.data.map((r) => {
                const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.ready
                const clickable = r.status === 'dirty'
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={!clickable || !token || busyId === r.id}
                    onClick={() => clickable && handleQuickClean(r.id)}
                    title={clickable ? 'Tap to mark ready' : r.type}
                    className={`w-16 h-12 rounded-lg border grid place-items-center text-sm font-semibold ${s.chip} ${clickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
                  >
                    {busyId === r.id ? <LoaderCircle size={14} className="animate-spin" /> : r.no}
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text!">Cleaning Assignments</h3>
        <button type="button" onClick={() => setShowAssign((v) => !v)} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          + Assign housekeeper
        </button>
      </div>

      {showAssign && <AssignForm onDone={() => setShowAssign(false)} />}

      {jobs.isLoading && <LegacyLoadingCard label="Loading assignments…" />}
      <Card className="!h-auto !p-0 overflow-hidden">
        {jobs.data && jobs.data.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No cleaning assignments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-3 py-2">Suite</th>
                <th className="font-medium px-3 py-2">Housekeeper</th>
                <th className="font-medium px-3 py-2">Assigned</th>
                <th className="font-medium px-3 py-2">Status</th>
                <th className="font-medium px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(jobs.data ?? []).map((j) => {
                const next = NEXT_STEP[j.status]
                return (
                  <tr key={j.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-text! font-medium">{j.room || '—'}</td>
                    <td className="px-3 py-2.5 text-text-muted">{j.hk || '—'}</td>
                    <td className="px-3 py-2.5 text-text-muted">{j.assigned}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${JOB_STATUS_TAG[j.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{j.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {next && (
                        <button
                          type="button"
                          disabled={!token || busyId === j.id}
                          onClick={() => handleAdvance(j.id, next.to)}
                          className="text-xs text-brand hover:underline disabled:opacity-50"
                        >
                          {busyId === j.id ? <LoaderCircle size={11} className="inline animate-spin" /> : next.label}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
