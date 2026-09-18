import { useMemo, useState } from 'react'
import { BedSingle, Plus, Pencil, Trash2, X, LoaderCircle, Search, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useHotelSettingsBundle, useHotelSaveType, useHotelDelType, useHotelToken } from '../hotel.queries'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Real page: booking/settings/bed_types.php — this uses the Hotel Suite
// API instead (custom/hotel/api.php?r=settings, a=savetype/deltype&kind=bed),
// the same data source Hotel Settings' Bed Types card already used. Also
// confirmed live (unlike kind=floor/roomtype — see HotelFloorTypesPage.tsx)
// that writes here genuinely persist: a real write-then-read-back test
// round-tripped correctly.
export function HotelBedTypesPage() {
  const { data: settings, isLoading, isError, error, refetch } = useHotelSettingsBundle()
  const { data: token } = useHotelToken()
  const save = useHotelSaveType()
  const del = useHotelDelType()

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<{ id?: string; name: string; status: 0 | 1 | 2 } | null>(null)
  const [saveError, setSaveError] = useState('')

  const rows = settings?.bed ?? []
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
  }, [rows, search])

  function handleSave() {
    if (!token || !editing || !editing.name.trim()) return
    setSaveError('')
    save.mutate(
      { kind: 'bed', id: editing.id, name: editing.name, status: editing.status, token },
      { onSuccess: () => setEditing(null), onError: (e) => setSaveError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <BedSingle size={20} className="text-brand" /> Bed Types
        </h2>
        <button
          type="button"
          onClick={() => setEditing({ name: '', status: 1 })}
          title="Add bed type"
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover"
        >
          <Plus size={16} />
        </button>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">booking/settings/bed_types.php</code>. Uses the real Hotel Suite API — confirmed live that writes here
          genuinely persist (unlike Room Type/Floor Details, which return success but silently don't save).
        </p>
      </Card>

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
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Bed type name" className={`flex-1 ${fieldCls}`} />
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: Number(e.target.value) as 0 | 1 | 2 })}
              className={fieldCls}
            >
              <option value={1}>Active</option>
              <option value={2}>Inactive</option>
            </select>
            <button type="button" disabled={!token || save.isPending} onClick={handleSave} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm text-white disabled:opacity-50">
              {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-md text-text-faint hover:bg-surface-hover">
              <X size={16} />
            </button>
          </div>
          {saveError && <p className="text-xs text-danger mt-2">{saveError}</p>}
        </Card>
      )}

      {isLoading && <p className="text-sm text-text-faint py-2">Loading…</p>}
      {isError && <p className="text-sm text-danger py-2">{error instanceof Error ? error.message : 'Failed to load.'} <button type="button" onClick={() => refetch()} className="underline">Retry</button></p>}

      {!isLoading && !isError && (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Sl.No</th>
                <th className="font-medium px-4 py-2.5">Bed Type</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-text-faint italic">
                    No bed types found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-muted">{i + 1}</td>
                    <td className="px-4 py-2.5 text-text!">{r.name}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        disabled={!token}
                        onClick={() => token && save.mutate({ kind: 'bed', id: r.id, name: r.name, status: r.status === 1 ? 2 : 1, token })}
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
                        onClick={() => token && confirm(`Delete "${r.name}"?`) && del.mutate({ kind: 'bed', id: r.id, token })}
                        className="p-1.5 rounded-md text-danger hover:bg-surface-hover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
