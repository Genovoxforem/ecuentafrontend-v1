import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Info } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAuth } from '../../auth/AuthContext'
import { useCreateLandedCost, useLandedCostFormOptions, todayIso } from '../warehouseExtras.queries'
import { formatMoney } from '../../../utils/format'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

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
  const { data: formOptions } = useLandedCostFormOptions()
  const fallbackUserLabel = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : ''

  const [startDate, setStartDate] = useState(todayIso())
  const [userId, setUserId] = useState('')
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState('')
  const [note, setNote] = useState('')
  const [landedCostInvoiceId, setLandedCostInvoiceId] = useState('')
  const [landedExpense, setLandedExpense] = useState('')

  // Defaults to the real create page's own default (the currently logged-in
  // user) once it loads — never overwrites an actual user selection.
  useEffect(() => {
    if (userId || !formOptions?.users?.length) return
    const match = formOptions.users.find((u) => u.label.includes(fallbackUserLabel)) ?? formOptions.users[0]
    if (match) setUserId(String(match.id))
  }, [formOptions?.users, fallbackUserLabel, userId])

  function handleCreate() {
    const userLabel = formOptions?.users.find((u) => String(u.id) === userId)?.label ?? fallbackUserLabel
    const purchaseInvoiceRef = formOptions?.vendorInvoices.find((i) => String(i.id) === purchaseInvoiceId)?.ref ?? ''
    const landedCostInvoiceRef = formOptions?.landedCostInvoices.find((i) => String(i.id) === landedCostInvoiceId)?.ref ?? ''
    createLandedCost({ startDate, userName: userLabel, purchaseInvoice: purchaseInvoiceRef, landedCostInvoice: landedCostInvoiceRef, landedExpense, note })
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
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={selectCls + ' w-full'}>
              <option value="">Select…</option>
              {(formOptions?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Purchase Invoice">
            <select value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)} className={selectCls + ' w-full'}>
              <option value="">Select…</option>
              {(formOptions?.vendorInvoices ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.ref} — {i.vendorName} ({formatMoney(i.amount)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note (private)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls + ' w-full'} />
          </Field>
          <Field label="Landed Cost Invoice">
            <select value={landedCostInvoiceId} onChange={(e) => setLandedCostInvoiceId(e.target.value)} className={selectCls + ' w-full'}>
              <option value="">Select…</option>
              {(formOptions?.landedCostInvoices ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.ref}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Landed Expense">
            <input value={landedExpense} onChange={(e) => setLandedExpense(e.target.value)} className={inputCls + ' w-full'} />
          </Field>
        </div>

        {/* Purchase Invoice only lists the real backend's first page of
            vendor invoices (~10 of the real total) — later pages load via an
            AJAX call this pass didn't wire up. Landed Expense stays a plain
            text field: the real page's own picker for it is a bespoke modal
            this pass couldn't safely reverse-engineer a save contract for. */}
        <div className="flex items-start gap-2 mb-4 text-xs text-text-faint">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            User, Purchase Invoice, and Landed Cost Invoice are real data from the backend. Purchase Invoice shows only the first page of real invoices; Landed Expense isn't wired to a real source yet, and
            saving here stays local to this browser tab.
          </span>
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
