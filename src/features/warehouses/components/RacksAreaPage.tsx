import { useState } from 'react'
import { Boxes, Plus, X as XIcon } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useRacks, useCreateRack, useWarehouses } from '../warehouseExtras.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

// No REST/scrape source for racks (see warehouseExtras.queries.ts — the
// real llx_rack table exists but its Dolibarr module isn't activated
// server-side) — local-only, same convention as Warehouses/Inventory.
export function RacksAreaPage() {
  const racks = useRacks()
  const warehouses = useWarehouses()
  const createRack = useCreateRack()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [warehouseRef, setWarehouseRef] = useState('')
  const [error, setError] = useState('')

  const warehouseLabel = (ref: string) => warehouses.find((w) => w.ref === ref)?.shortName || ref || '-'

  function handleCreate() {
    if (!name.trim()) return setError('Label is required.')
    createRack({ name, shortName: shortName || name, warehouseRef, status: 'Active' })
    setName('')
    setShortName('')
    setWarehouseRef('')
    setError('')
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Boxes size={20} className="text-brand" /> Racks
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {showForm ? <XIcon size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Rack'}
        </button>
      </div>

      {showForm && (
        <Card className="!h-auto">
          {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Label</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Ref (short name)</label>
              <input value={shortName} onChange={(e) => setShortName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Warehouse</label>
              <select value={warehouseRef} onChange={(e) => setWarehouseRef(e.target.value)} className={selectCls}>
                <option value="">Select…</option>
                {warehouses.map((w) => (
                  <option key={w.ref} value={w.ref}>
                    {w.shortName || w.ref}
                  </option>
                ))}
              </select>
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
              <th className="font-medium px-4 py-2.5">Label</th>
              <th className="font-medium px-4 py-2.5">Ref</th>
              <th className="font-medium px-4 py-2.5">Warehouse</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {racks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              racks.map((r, i) => (
                <tr key={r.ref} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-text-faint">{i + 1}</td>
                  <td className="px-4 py-3 text-brand font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-text-muted">{r.shortName}</td>
                  <td className="px-4 py-3 text-text-muted">{warehouseLabel(r.warehouseRef)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.status === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{r.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
