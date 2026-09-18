import { useMemo, useState } from 'react'
import { Info, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useHotelHousekeepers, useHotelRack, useHotelAssignClean, useHotelToken } from '../hotel.queries'

const fieldCls = 'h-10 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Real page: booking/service/assign_room_cleaning.php (mainmenu=hotel&
// leftmenu=assgn_clean_obj) — a single-field form (Assign Housekeeper +
// Save), no room picker of its own. The real Hotel Suite write this maps to
// (a=assignclean, r=housekeepers) takes both a housekeeper AND a comma list
// of rooms, so — since the classic page never asks for rooms either — this
// assigns every suite the real rack (r=rack) currently reports as "dirty"
// (needing service) to the chosen housekeeper, same real mutation
// HotelHousekeeping.tsx's own multi-select Assign form already uses, just
// without a manual room picker to match this exact classic layout.
export function HotelAssignRoomCleaningPage() {
  const { data: token } = useHotelToken()
  const { data: housekeepers, isLoading: hkLoading } = useHotelHousekeepers()
  const { data: rack, isLoading: rackLoading } = useHotelRack()
  const assign = useHotelAssignClean()

  const [hk, setHk] = useState('')
  const [error, setError] = useState('')
  const [savedFor, setSavedFor] = useState<string | null>(null)

  const dirtyRooms = useMemo(() => (rack ?? []).filter((r) => r.status === 'dirty'), [rack])

  function handleSave() {
    setError('')
    setSavedFor(null)
    if (!token) return
    if (!hk) return setError('Assign Housekeeper is required.')
    if (dirtyRooms.length === 0) return setError('No suites currently need cleaning.')
    assign.mutate(
      { hk, rooms: dirtyRooms.map((r) => r.id).join(','), token },
      {
        onSuccess: () => setSavedFor(housekeepers?.find((h) => h.id === hk)?.name ?? hk),
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text!">Assign Room Cleaning</h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40 max-w-xl">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          The real classic page has no room picker — it assigns every suite currently marked "to service".
          {rack && ` Right now that's ${dirtyRooms.length} suite${dirtyRooms.length === 1 ? '' : 's'}.`}
        </p>
      </Card>

      <Card className="!h-auto max-w-md space-y-4">
        <div>
          <label className="block text-sm text-danger mb-1">Assign Housekeeper:*</label>
          <select value={hk} onChange={(e) => setHk(e.target.value)} disabled={hkLoading} className={`w-full ${fieldCls}`}>
            <option value="">Select</option>
            {(housekeepers ?? []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {savedFor && !error && <p className="text-sm text-success-fg">Assigned {dirtyRooms.length} suite(s) to {savedFor}.</p>}

        <button
          type="button"
          disabled={!token || rackLoading || assign.isPending}
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {assign.isPending && <LoaderCircle size={14} className="animate-spin" />} Save
        </button>
      </Card>
    </div>
  )
}
