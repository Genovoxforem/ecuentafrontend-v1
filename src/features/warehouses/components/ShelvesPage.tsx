import { useState } from 'react'
import { Layers, Plus, X as XIcon } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useShelves, useCreateShelf, useRacks } from '../warehouseExtras.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

// Same local-only convention as RacksAreaPage.tsx (real llx_shelves table
// exists, but its module isn't activated server-side).
export function ShelvesPage() {
  const shelves = useShelves()
  const racks = useRacks()
  const createShelf = useCreateShelf()
  const [showForm, setShowForm] = useState(false)
  const [rackRef, setRackRef] = useState('')
  const [capacity, setCapacity] = useState('')
  const [error, setError] = useState('')

  const rackLabel = (ref: string) => racks.find((r) => r.ref === ref)?.name || ref || '-'

  function handleCreate() {
    if (!rackRef) return setError('Rack is required.')
    const cap = Number(capacity)
    if (!capacity || Number.isNaN(cap) || cap <= 0) return setError('Capacity must be a positive number.')
    createShelf({ rackRef, capacity: cap })
    setRackRef('')
    setCapacity('')
    setError('')
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> Shelves
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Shelf'}
        </button>
      </div>

      {showForm && (
        <Card className="!h-auto">
          {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
          {racks.length === 0 && <p className="text-sm text-text-faint mb-3">No racks created yet — add one on the Racks page first.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Rack</label>
              <select value={rackRef} onChange={(e) => setRackRef(e.target.value)} className={selectCls}>
                <option value="">Select…</option>
                {racks.map((r) => (
                  <option key={r.ref} value={r.ref}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Capacity</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={handleCreate} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Save
            </button>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">No</th>
              <th className="font-medium px-4 py-2.5">Rack</th>
              <th className="font-medium px-4 py-2.5">Shelves Ref</th>
              <th className="font-medium px-4 py-2.5 text-right">Capacity</th>
            </tr>
          </thead>
          <tbody>
            {shelves.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              shelves.map((s, i) => (
                <tr key={s.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-text-faint">{i + 1}</td>
                  <td className="px-4 py-3 text-text-muted">{rackLabel(s.rackRef)}</td>
                  <td className="px-4 py-3 text-brand font-medium">{s.ref}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text!">{s.capacity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
