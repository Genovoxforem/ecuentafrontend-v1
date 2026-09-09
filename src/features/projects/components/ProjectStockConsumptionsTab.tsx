import { useState } from 'react'
import { LoaderCircle, Boxes } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useWarehouses } from '../../warehouses/warehouseExtras.queries'
import { useProductOptions } from '../../products/products.queries'
import { useDeclareProjectConsumption } from '../projectConsumption.queries'
import type { ProjectRow } from '../projects.queries'
import { ProjectInfoCards } from './ProjectInfoRecap'

// Real "Consumptions" widget from custom/consumption/card.php?type=projet —
// the Declare form genuinely POSTs (action=conso), the same real handler
// Quotations' ConsumptionsTab already uses with type=propal (see
// projectConsumption.queries.ts). The full "List Of Consumption" ledger
// below has no JSON API on this backend though (confirmed: no json_encode
// anywhere in the module), so it stays an honest empty state — same split
// as ConsumptionHistoryReplica.tsx does for Quotations.
export function ProjectStockConsumptionsTab({ project }: { project: ProjectRow }) {
  const declare = useDeclareProjectConsumption(project.id)
  const warehouses = useWarehouses()
  const { data: products } = useProductOptions()
  const productOptions = (products ?? []).map((p) => ({ value: p.id, label: `${p.ref} - ${p.label}` }))

  const [warehouseId, setWarehouseId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [label, setLabel] = useState(`Consumption for the project (${project.ref})`)
  const [eatBy, setEatBy] = useState('')
  const [sellBy, setSellBy] = useState('')

  function handleDeclare() {
    if (!warehouseId || !productId || !qty) return
    declare.mutate(
      { productId, warehouseId, qty: Number(qty), label, eatBy, sellBy },
      { onSuccess: () => setQty('') },
    )
  }

  return (
    <div className="space-y-3">
      <ProjectInfoCards project={project} />

      <Card className="!h-auto">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50 mb-3">
          <Boxes size={15} className="text-brand" /> Consumptions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <span className="text-sm text-text">
              Warehouse<span className="text-danger">*</span>
            </span>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={`${inputClasses} mt-1`}>
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.ref}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-sm text-text">
              Product<span className="text-danger">*</span>
            </span>
            <div className="mt-1">
              <SearchableSelect value={productId} onChange={setProductId} options={productOptions} placeholder="Select Predefined Product/services" />
            </div>
          </div>
          <div>
            <span className="text-sm text-text">
              Number of units<span className="text-danger">*</span>
            </span>
            <input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputClasses} mt-1`} title="Negative reduces stock, positive corrects/increases it" />
          </div>
          <div>
            <span className="text-sm text-text">Label of movement</span>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={`${inputClasses} mt-1`} />
          </div>
          <div>
            <span className="text-sm text-text">Eat-by date</span>
            <input type="date" value={eatBy} onChange={(e) => setEatBy(e.target.value)} className={`${inputClasses} mt-1`} />
          </div>
          <div>
            <span className="text-sm text-text">Sell-by date</span>
            <input type="date" value={sellBy} onChange={(e) => setSellBy(e.target.value)} className={`${inputClasses} mt-1`} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            disabled={!warehouseId || !productId || !qty || declare.isPending}
            onClick={handleDeclare}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {declare.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null} Declare
          </button>
        </div>
        {declare.isError && <p className="text-xs text-danger mt-2">{declare.error instanceof Error ? declare.error.message : 'Could not declare this consumption.'}</p>}
        {declare.isSuccess && <p className="text-xs text-success mt-2">Consumption declared.</p>}
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">List Of Consumption (For This Project)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Ref.</th>
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5">Product Ref.</th>
                <th className="font-medium px-4 py-2.5">Warehouse</th>
                <th className="font-medium px-4 py-2.5">Inv./Mov. Code</th>
                <th className="font-medium px-4 py-2.5">Label Of Movement</th>
                <th className="font-medium px-4 py-2.5">Origin</th>
                <th className="font-medium px-4 py-2.5">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-text-faint italic">
                  No data source available — this backend has no endpoint to list past stock movements for a project.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
