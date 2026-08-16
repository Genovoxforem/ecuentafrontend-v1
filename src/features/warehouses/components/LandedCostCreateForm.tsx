import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAuth } from '../../auth/AuthContext'
import { useCreateLandedCost, todayIso } from '../warehouseExtras.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-sm mb-1 ${required ? 'text-danger' : 'text-text-muted'}`}>
        {label}
        {required && '*'}
      </label>
      {children}
    </div>
  )
}

export function LandedCostCreateForm() {
  const navigate = useNavigate()
  const createLandedCost = useCreateLandedCost()
  const { user } = useAuth()
  const userLabel = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : ''

  const [startDate, setStartDate] = useState(todayIso())
  const [purchaseInvoice, setPurchaseInvoice] = useState('')
  const [note, setNote] = useState('')
  const [landedCostInvoice, setLandedCostInvoice] = useState('')
  const [landedExpense, setLandedExpense] = useState('')

  function handleCreate() {
    createLandedCost({ startDate, userName: userLabel, purchaseInvoice, landedCostInvoice, landedExpense, note })
    navigate(ROUTES.landedCostList)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Truck size={20} className="text-brand" /> Create Landed Cost
      </h2>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-4">
          <Field label="Start date" required>
            <div className="flex gap-1.5">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls + ' flex-1'} />
              <button type="button" onClick={() => setStartDate(todayIso())} className="rounded-md border border-input-border px-3 text-sm text-text-muted hover:bg-surface-hover shrink-0">
                Now
              </button>
            </div>
          </Field>
          <Field label="User" required>
            <input value={userLabel} disabled className={inputCls + ' w-full'} />
          </Field>
          <Field label="Purchase Invoice">
            <input value={purchaseInvoice} onChange={(e) => setPurchaseInvoice(e.target.value)} className={inputCls + ' w-full'} />
          </Field>
          <Field label="Note (private)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls + ' w-full'} />
          </Field>
          <Field label="Landed Cost Invoice">
            <input value={landedCostInvoice} onChange={(e) => setLandedCostInvoice(e.target.value)} className={inputCls + ' w-full'} />
          </Field>
          <Field label="Landed Expense">
            <input value={landedExpense} onChange={(e) => setLandedExpense(e.target.value)} className={inputCls + ' w-full'} />
          </Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2">Invoice Ref</th>
                <th className="font-medium py-2">Landed Cost Details</th>
                <th className="font-medium py-2">QTY</th>
                <th className="font-medium py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => navigate(ROUTES.landedCostList)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
          Back
        </button>
        <button type="button" onClick={handleCreate} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Create
        </button>
      </div>
    </div>
  )
}
