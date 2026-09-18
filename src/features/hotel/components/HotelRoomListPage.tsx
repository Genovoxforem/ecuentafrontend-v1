import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DoorOpen, Plus, Pencil, Trash2, X, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import {
  useHotelRoomsAdmin,
  useHotelSettingsBundle,
  useHotelRoomTypes,
  useHotelSaveRoom,
  useHotelDelRoom,
  useHotelZraSyncRoom,
  useHotelVatRates,
  useHotelUnits,
  useHotelTlCodes,
  useHotelCreateRoomFormOptions,
  useHotelToken,
  type HotelRoomAdmin,
} from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const fieldCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function EditRoomPanel({
  room,
  roomTypeOptions,
  floorOptions,
  onClose,
}: {
  room: HotelRoomAdmin
  roomTypeOptions: { id: string; name: string }[]
  floorOptions: { id: string; name: string }[]
  onClose: () => void
}) {
  const { data: token } = useHotelToken()
  const { data: vatRates } = useHotelVatRates()
  const { data: units } = useHotelUnits()
  const { data: tlCodes } = useHotelTlCodes()
  const save = useHotelSaveRoom()

  const [no, setNo] = useState(room.no)
  const [ty, setTy] = useState(String(room.ty))
  const [floor, setFloor] = useState(room.floor)
  const [rate, setRate] = useState(String(room.rate ?? ''))
  const [status, setStatus] = useState<0 | 1 | 2>(room.status)
  const [error, setError] = useState('')

  function handleSave() {
    if (!token || !no.trim()) return setError('Room No. is required.')
    setError('')
    save.mutate(
      {
        id: room.id,
        no,
        ty,
        floor,
        rate: Number(rate) || 0,
        status,
        cls: '90111501',
        country: '239',
        unit: String(units?.find((u) => u.ut === 'qty')?.id ?? '31'),
        packing: String(units?.find((u) => u.ut === 'pack')?.id ?? '45'),
        pbt: 'HT',
        tva: Number(vatRates?.[0]?.taux ?? 16),
        vatcode: vatRates?.[0]?.code ?? '',
        tl: tlCodes?.[0] ? `${tlCodes[0].rate} (${tlCodes[0].code})` : '',
        token,
      },
      { onSuccess: onClose, onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-surface border-l border-border p-5 space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Edit Room</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Room No. *</label>
          <input value={no} onChange={(e) => setNo(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Room Type *</label>
          <select value={ty} onChange={(e) => setTy(e.target.value)} className={fieldCls}>
            {roomTypeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Floor *</label>
          <select value={floor} onChange={(e) => setFloor(e.target.value)} className={fieldCls}>
            {/* Real Suite's own flOpts() prepends a "(no longer listed)" option
                for the room's current floor id when it isn't in the live list
                (e.g. it was since deactivated) — reproduced so the select's
                initial value always matches a real <option>. */}
            {!floorOptions.some((f) => f.id === room.floor) && <option value={room.floor}>Floor {room.floor} (no longer listed)</option>}
            {floorOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Room Rate</label>
          <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Blank = room type's rack rate" className={fieldCls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(Number(e.target.value) as 0 | 1 | 2)} className={fieldCls}>
            <option value={1}>Active</option>
            <option value={2}>Out of service</option>
          </select>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="button"
          disabled={save.isPending || !token}
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null} Save
        </button>
      </div>
    </div>
  )
}

// Real page: booking/settings/room_list.php — this uses the real Hotel
// Suite API instead (custom/hotel/api.php?r=rooms_admin, a=saveroom/
// delroom/zrasync), the same data source HotelSettings.tsx's own Rooms
// card already used, now given its own dedicated page matching the real
// classic menu's separate "Room List" entry (and its real Sl.No/Room No/
// Floor Name/Room Type/Room Rate/Status/Action column layout). "+ ADD
// Room" goes to the dedicated Add Room page (create_room.php's real
// equivalent); Edit opens a lighter inline panel here instead, since only
// a handful of fields actually vary per room (see HotelAddRoomPage.tsx's
// own comment on why the rest stay real, sensible defaults).
export function HotelRoomListPage() {
  const { data: rooms, isLoading, isError, error, refetch } = useHotelRoomsAdmin()
  const { data: settings } = useHotelSettingsBundle()
  const { data: roomTypes } = useHotelRoomTypes()
  const { data: token } = useHotelToken()
  const del = useHotelDelRoom()
  const zraSync = useHotelZraSyncRoom()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [editingRoom, setEditingRoom] = useState<HotelRoomAdmin | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Real, live Floor/Room Type options — see HotelAddRoomPage.tsx's own
  // comment and useHotelCreateRoomFormOptions' own comment: scraped from
  // create_room.php's real dropdowns (Dolibarr's generic category system),
  // genuinely different ids from both r=roomtypes and settings.roomtype/
  // settings.floor. Falls back to those while the scrape is loading so the
  // selects never sit fully empty.
  const { data: createRoomFormOptions } = useHotelCreateRoomFormOptions()
  const fallbackRoomTypeOptions = (settings?.roomtype && settings.roomtype.length > 0 ? settings.roomtype : (roomTypes ?? [])).map((t) => ({ id: String(t.id), name: t.name }))
  const roomTypeOptions = createRoomFormOptions?.roomTypes.length ? createRoomFormOptions.roomTypes : fallbackRoomTypeOptions
  const fallbackFloorOptions = (settings?.floor ?? []).filter((f) => f.status === 1).map((f) => ({ id: f.id, name: f.name }))
  const floorOptions = createRoomFormOptions?.floors.length
    ? createRoomFormOptions.floors
    : fallbackFloorOptions.length > 0
      ? fallbackFloorOptions
      : [{ id: '1', name: 'Ground floor' }]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = rooms ?? []
    if (!q) return rows
    return rows.filter((r) => `${r.no} ${r.type} ${r.floor}`.toLowerCase().includes(q))
  }, [rooms, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function handleDelete(r: HotelRoomAdmin) {
    if (!token || !confirm(`Delete room "${r.no}"?`)) return
    setBusyId(r.id)
    del.mutate({ id: r.id, token }, { onSettled: () => setBusyId(null) })
  }
  function handleZraSync(r: HotelRoomAdmin) {
    if (!token || !r.pid) return
    setBusyId(r.id)
    zraSync.mutate({ pid: r.pid, token }, { onSettled: () => setBusyId(null) })
  }

  function getExportData() {
    return {
      headers: ['Sl.No', 'Room No', 'Floor Name', 'Room Type', 'Room Rate', 'Status'],
      rows: filtered.map((r, i) => [String(i + 1), r.no, r.floor, r.type, String(r.rate_ttc ?? r.rate ?? 0), r.status === 1 ? 'Active' : 'Out of service']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
              <DoorOpen size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">Room List</h2>
              <p className="text-xs text-text-faint mt-0.5">{rooms ? `${rooms.length} rooms` : ''}</p>
            </div>
          </div>
          <Link to={ROUTES.hotelAddRoom} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> ADD Room
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading rooms…" />}
        {isError && <LegacyErrorCard title="Couldn't load rooms" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {rooms && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
              <h3 className="font-semibold text-text!">Rooms</h3>
              <div className="flex items-center gap-2">
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
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Room List" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{rooms.length === 0 ? 'No Data Available In Table' : 'No rooms match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Sl.No</th>
                      <th className="font-medium px-3 py-2">Room No</th>
                      <th className="font-medium px-3 py-2">Floor Name</th>
                      <th className="font-medium px-3 py-2">Room Type</th>
                      <th className="font-medium px-3 py-2 text-right">Room Rate</th>
                      <th className="font-medium px-3 py-2">Status</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => {
                      const synced = r.zracode === '000'
                      return (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                          <td className="px-3 py-2.5 text-text! font-medium">{r.no}</td>
                          <td className="px-3 py-2.5 text-text-muted">{r.floor}</td>
                          <td className="px-3 py-2.5 text-text-muted">{r.type}</td>
                          <td className="px-3 py-2.5 text-right text-text-muted">K{Number(r.rate_ttc ?? r.rate ?? 0).toLocaleString()}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                              {r.status === 1 ? 'Active' : 'Out of service'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <button type="button" onClick={() => setEditingRoom(r)} title="Edit" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover">
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={!token || busyId === r.id}
                              onClick={() => handleDelete(r)}
                              title="Delete"
                              className="p-1.5 rounded-md text-danger hover:bg-surface-hover disabled:opacity-50"
                            >
                              {busyId === r.id && del.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                            {!synced && (
                              <button
                                type="button"
                                disabled={!token || !r.pid || busyId === r.id}
                                onClick={() => handleZraSync(r)}
                                title="Update ZRA"
                                className="ml-1 text-xs text-brand hover:underline disabled:opacity-50"
                              >
                                {busyId === r.id && zraSync.isPending ? <LoaderCircle size={11} className="inline animate-spin" /> : 'ZRA'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {rooms && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}

      {editingRoom && (
        <EditRoomPanel room={editingRoom} roomTypeOptions={roomTypeOptions} floorOptions={floorOptions} onClose={() => setEditingRoom(null)} />
      )}
    </div>
  )
}
