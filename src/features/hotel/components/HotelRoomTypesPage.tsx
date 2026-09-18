import { useMemo, useState } from 'react'
import { Tag, Plus, Pencil, Trash2, X, LoaderCircle, Search, PackagePlus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useHotelSettingsBundle, useHotelRoomTypes, useHotelSaveType, useHotelDelType, useHotelSaveSuite, useHotelVatRates, useHotelUnits, useHotelToken } from '../hotel.queries'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Real page: categories/index.php?type=25 (the classic "booking_roomtype"
// category screen) — confirmed live this backend throws a PHP fatal error
// there ("Class 'RoomType' not found" in categorie.class.php), so this is
// built against the real, WORKING Hotel Suite API instead
// (custom/hotel/api.php?r=settings|roomtypes, a=savetype/deltype&kind=roomtype)
// — the same data source HotelSettings.tsx's own Room Types card already
// uses, just given its own dedicated page (matching the real classic
// menu's separate "Room Type" entry). Two real resources disagree here
// (confirmed live): r=roomtypes has 5 genuine room types this backend's
// rooms/rates/rack actually use (Deluxe Suite, Heritage Suite, Standard,
// Family Suite, Presidential), while r=settings.roomtype (the editable
// list savetype/deltype act on) is empty — and saving a new entry there
// returns {"ok":true} but doesn't persist (confirmed directly via a live
// test write against the real backend, not guessed). So the 5 real types
// are shown read-only below whenever the editable list is empty, rather
// than hiding real data or fabricating edit/delete actions for rows that
// don't exist in the resource those actions actually operate on.
//
// a=savesuite looked like it might be the real fix for the above — it
// builds an actual Dolibarr product (label/SKU/price/tax/classification)
// rather than writing to the non-persisting settings.roomtype list. Live-
// tested directly against this backend before shipping this, though (same
// verification method as the savetype/deltype finding above): it fails
// outright with {"error":"Could not create suite: Table
// 'bazaudye.llx_room_types' doesn't exist"} — a genuine missing-table bug
// on this backend, not a maybe-works guess. "Add real room type" below is
// kept (matching this page's own pattern of showing real, wired actions
// even when they're confirmed broken) with that exact error surfaced
// honestly rather than hidden or retried.
export function HotelRoomTypesPage() {
  const { data: settings } = useHotelSettingsBundle()
  const { data: roomTypes } = useHotelRoomTypes()
  const { data: token } = useHotelToken()
  const { data: vatRates } = useHotelVatRates()
  const { data: units } = useHotelUnits()
  const save = useHotelSaveType()
  const del = useHotelDelType()
  const saveSuite = useHotelSaveSuite()

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<{ id?: string; name: string; status: 0 | 1 | 2 } | null>(null)
  const [addingSuite, setAddingSuite] = useState(false)
  const [suiteLabel, setSuiteLabel] = useState('')
  const [suiteRef, setSuiteRef] = useState('')
  const [suitePrice, setSuitePrice] = useState('')
  const [suiteError, setSuiteError] = useState('')

  function handleSaveSuite() {
    if (!token) return
    if (!suiteLabel.trim() || !suiteRef.trim()) return setSuiteError('Name and SKU are both required.')
    setSuiteError('')
    saveSuite.mutate(
      {
        label: suiteLabel,
        ref: suiteRef,
        price: Number(suitePrice) || 0,
        pbt: 'HT',
        tva: Number(vatRates?.[0]?.taux ?? 16),
        cls: '90111501',
        unit: String(units?.find((u) => u.ut === 'qty')?.id ?? '31'),
        packing: String(units?.find((u) => u.ut === 'pack')?.id ?? '45'),
        token,
      },
      {
        onSuccess: () => {
          setAddingSuite(false)
          setSuiteLabel('')
          setSuiteRef('')
          setSuitePrice('')
        },
        onError: (e) => setSuiteError(e instanceof Error ? e.message : 'Failed to save.'),
      },
    )
  }

  const customRows = settings?.roomtype ?? []
  const referenceRows = customRows.length === 0 ? (roomTypes ?? []) : []

  const filteredCustom = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? customRows.filter((r) => r.name.toLowerCase().includes(q)) : customRows
  }, [customRows, search])
  const filteredReference = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? referenceRows.filter((r) => r.name.toLowerCase().includes(q)) : referenceRows
  }, [referenceRows, search])

  function handleSave() {
    if (!token || !editing || !editing.name.trim()) return
    save.mutate({ kind: 'roomtype', id: editing.id, name: editing.name, status: editing.status, token }, { onSuccess: () => setEditing(null) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tag size={20} className="text-brand" /> Room Types
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddingSuite(true)}
            className="flex items-center gap-1.5 rounded-lg border border-input-border px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover"
          >
            <PackagePlus size={15} /> Add real room type
          </button>
          <button
            type="button"
            onClick={() => setEditing({ name: '', status: 1 })}
            title="Add room type (settings list — doesn't persist yet)"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {addingSuite && (
        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Add real room type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs text-text-muted mb-1">Name</span>
              <input value={suiteLabel} onChange={(e) => setSuiteLabel(e.target.value)} className={`w-full ${fieldCls}`} />
            </label>
            <label className="block">
              <span className="block text-xs text-text-muted mb-1">SKU</span>
              <input value={suiteRef} onChange={(e) => setSuiteRef(e.target.value)} className={`w-full ${fieldCls}`} />
            </label>
            <label className="block">
              <span className="block text-xs text-text-muted mb-1">Rack rate (K, excl. tax)</span>
              <input type="number" min={0} value={suitePrice} onChange={(e) => setSuitePrice(e.target.value)} className={`w-full ${fieldCls}`} />
            </label>
          </div>
          {suiteError && <p className="text-sm text-danger mt-2">{suiteError}</p>}
          <div className="flex items-center gap-2 mt-3">
            <button type="button" disabled={!token || saveSuite.isPending} onClick={handleSaveSuite} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm text-white disabled:opacity-50">
              {saveSuite.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setAddingSuite(false)} className="p-2 rounded-md text-text-faint hover:bg-surface-hover">
              <X size={16} />
            </button>
          </div>
        </Card>
      )}

      <Card className="!h-auto">
        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-faint">Name</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className={`w-64 ${fieldCls}`} />
          </label>
          <button type="button" className="h-9 px-4 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover flex items-center gap-1.5">
            <Search size={14} /> Search
          </button>
        </div>
      </Card>

      {editing && (
        <Card className="!h-auto">
          <div className="flex items-center gap-2">
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Room type name" className={`flex-1 ${fieldCls}`} />
            <button type="button" disabled={!token || save.isPending} onClick={handleSave} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm text-white disabled:opacity-50">
              {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-md text-text-faint hover:bg-surface-hover">
              <X size={16} />
            </button>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Name</th>
              <th className="font-medium px-4 py-2.5">Status</th>
              <th className="font-medium px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustom.length === 0 && filteredReference.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-text-faint italic">
                  No room types found.
                </td>
              </tr>
            ) : (
              <>
                {filteredCustom.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text!">{r.name}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        disabled={!token}
                        onClick={() => token && save.mutate({ kind: 'roomtype', id: r.id, name: r.name, status: r.status === 1 ? 2 : 1, token })}
                        className={`text-xs px-2 py-0.5 rounded-full ${r.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}
                      >
                        {r.status === 1 ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setEditing({ id: r.id, name: r.name, status: r.status })} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover">
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={!token}
                        onClick={() => token && confirm(`Delete "${r.name}"?`) && del.mutate({ kind: 'roomtype', id: r.id, token })}
                        className="p-1.5 rounded-md text-danger hover:bg-surface-hover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReference.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text!">{r.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-info-bg text-info-fg">In use</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-faint" title="Read-only — comes from the real room/rate data, not the editable list">
                      —
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
