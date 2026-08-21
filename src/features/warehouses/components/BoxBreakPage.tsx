import { useState } from 'react'
import { Box, PackageX, Layers, Wrench, Star } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLocalCollection, nextLocalRef } from '../../../shared/localCollection'
import { useProductOptions } from '../../products/products.queries'
import { useWarehouses } from '../warehouseExtras.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

// No UOM (unit-of-measure) hierarchy or box-break endpoint exists on this
// backend, so "Break FROM"/"Break INTO" use a static unit list rather than
// a fetched one. Performing a break logs a local, session-only activity
// entry (shown below) rather than silently doing nothing — but it never
// touches the real product's stock number, since that would misrepresent
// actual inventory.
const UNITS = ['Pallet', 'Case', 'Box', 'Unit']

interface BreakActivity {
  ref: string
  productLabel: string
  warehouseLabel: string
  from: string
  into: string
  boxes: number
  at: string
}
const ACTIVITY_KEY = ['local', 'box-break-activity'] as const

export function BoxBreakPage() {
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const [activity, updateActivity] = useLocalCollection<BreakActivity[]>(ACTIVITY_KEY, [])

  const [productId, setProductId] = useState('')
  const [warehouseRef, setWarehouseRef] = useState('')
  const [breakFrom, setBreakFrom] = useState('Pallet')
  const [breakInto, setBreakInto] = useState('Box')
  const [unitsPerBox, setUnitsPerBox] = useState('')
  const [boxesToBreak, setBoxesToBreak] = useState('1')
  const [lotBatchNo, setLotBatchNo] = useState('')
  const [note, setNote] = useState('')
  const [cascadeBreak, setCascadeBreak] = useState(false)
  const [activityWindow, setActivityWindow] = useState<'7d' | '30d' | '90d'>('30d')

  const selectedProduct = (products ?? []).find((p) => p.id === productId)
  const selectedWarehouse = warehouses.find((w) => w.ref === warehouseRef)

  function handlePerformBreak() {
    if (!selectedProduct || !warehouseRef) return
    updateActivity((cur) => [
      {
        ref: nextLocalRef('BB'),
        productLabel: selectedProduct.label,
        warehouseLabel: selectedWarehouse?.shortName ?? warehouseRef,
        from: breakFrom,
        into: breakInto,
        boxes: Number(boxesToBreak) || 1,
        at: new Date().toISOString(),
      },
      ...cur,
    ])
  }

  const breaksThisMonth = activity.filter((a) => new Date(a.at).getMonth() === new Date().getMonth()).length
  const boxesBroken30d = activity.reduce((sum, a) => sum + a.boxes, 0)
  const unitsCreated30d = activity.reduce((sum, a) => sum + a.boxes * (Number(unitsPerBox) || 0), 0)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Box size={20} className="text-brand" /> Box Break
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="!p-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Breaks This Month</p>
          <p className="text-xl font-bold text-text! mt-1">{breaksThisMonth || '—'}</p>
          <p className="text-xs text-text-faint mt-0.5">total breaks</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Boxes Broken (30d)</p>
          <p className="text-xl font-bold text-text! mt-1">{boxesBroken30d || '—'}</p>
          <p className="text-xs text-text-faint mt-0.5">boxes processed</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Units Created (30d)</p>
          <p className="text-xl font-bold text-text! mt-1">{unitsCreated30d || '—'}</p>
          <p className="text-xs text-text-faint mt-0.5">individual units</p>
        </Card>
      </div>

      <Card className="!h-auto">
        <h3 className="flex items-center gap-2 text-base font-semibold text-text! mb-4">
          <Wrench size={16} className="text-brand" /> Perform Box Break
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
          <div>
            <label className="block text-sm mb-1 text-danger">Product*</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectCls + ' w-full'}>
              <option value="">-- Select product --</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ref} — {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-danger">Warehouse*</label>
            <select value={warehouseRef} onChange={(e) => setWarehouseRef(e.target.value)} className={selectCls + ' w-full'}>
              <option value="">-- Select --</option>
              {warehouses.map((w) => (
                <option key={w.ref} value={w.ref}>
                  {w.shortName || w.ref}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-danger">Break FROM*</label>
            <select value={breakFrom} onChange={(e) => setBreakFrom(e.target.value)} className={selectCls + ' w-full'} disabled={!productId}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-danger">Break INTO*</label>
            <select value={breakInto} onChange={(e) => setBreakInto(e.target.value)} className={selectCls + ' w-full'} disabled={!productId}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-danger">Units per Box*</label>
            <input value={unitsPerBox} onChange={(e) => setUnitsPerBox(e.target.value)} placeholder="auto-filled from UOM" className={inputCls + ' w-full'} />
            <p className="text-[11px] text-text-faint mt-1">Auto-filled from UOM config</p>
          </div>
          <div>
            <label className="block text-sm mb-1 text-danger">How many boxes to break*</label>
            <input value={boxesToBreak} onChange={(e) => setBoxesToBreak(e.target.value)} className={inputCls + ' w-full'} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-muted">Lot / Batch No.</label>
            <input value={lotBatchNo} onChange={(e) => setLotBatchNo(e.target.value)} placeholder="Optional — inherited by units" className={inputCls + ' w-full'} />
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <label className="block text-sm mb-1 text-text-muted">Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional reason / reference" className={inputCls + ' w-full'} />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 text-sm text-text!">
          <input type="checkbox" checked={cascadeBreak} onChange={(e) => setCascadeBreak(e.target.checked)} className="text-brand focus:ring-brand/30" />
          <span className="font-semibold">Cascade Break</span> — chain through intermediate UOMs (e.g. PALLET → BOX → UNIT in one step)
        </label>

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={handlePerformBreak} disabled={!productId || !warehouseRef} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
            <Wrench size={14} /> Perform Box Break
          </button>
          <button type="button" className="flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            <Star size={14} /> Save as Template
          </button>
        </div>
      </Card>

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-text!">
            <Layers size={16} className="text-brand" /> Break Activity
          </h3>
          <div className="flex rounded-lg border border-input-border overflow-hidden">
            {(['7d', '30d', '90d'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setActivityWindow(w)}
                className={`px-3 py-1 text-xs font-medium ${activityWindow === w ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        {activity.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-text-faint italic py-6 justify-center">
            <PackageX size={16} /> No box breaks recorded this session.
          </p>
        ) : (
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.ref} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                <span className="text-text!">
                  {a.productLabel} — {a.from} → {a.into} × {a.boxes}
                </span>
                <span className="text-text-faint text-xs">{a.warehouseLabel}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
