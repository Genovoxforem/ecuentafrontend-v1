import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { useVendorOptions } from '../../customers/customerOptions'
import { useAuth } from '../../auth/AuthContext'
import { useCreatePurchaseOrder } from '../purchaseOrders.queries'

export function PurchaseOrderCreateForm() {
  const { user } = useAuth()
  const { data: vendors, isLoading: vendorsLoading } = useVendorOptions()
  const createPurchaseOrder = useCreatePurchaseOrder()
  const navigate = useNavigate()

  const [vendorId, setVendorId] = useState('')
  const [refVendor, setRefVendor] = useState('')
  const [plannedDelivery, setPlannedDelivery] = useState('')
  const [amount, setAmount] = useState(0)
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function handleSubmit() {
    setFormError('')
    const vendor = vendors?.find((v) => v.id === vendorId)
    if (!vendor) {
      setFormError('Vendor is required.')
      return
    }
    setPending(true)
    createPurchaseOrder({
      thirdParty: vendor.name,
      refOrderVendor: refVendor,
      plannedDelivery,
      amountExclTax: amount,
      author: user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown',
    })
    setPending(false)
    navigate(ROUTES.purchaseOrderList)
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ShoppingCart size={20} className="text-brand" /> New Purchase Order
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.purchaseOrderList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create draft
        </button>
      }
    >
      <Card className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref.">
            <input disabled defaultValue="Draft" className={`${inputClasses} text-text-faint`} />
          </Field>
          <Field label="Vendor" required>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClasses}>
              <option value="">{vendorsLoading ? 'Loading…' : 'Select a vendor'}</option>
              {vendors?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ref. vendor">
            <input type="text" value={refVendor} onChange={(e) => setRefVendor(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Payment Terms">
            <Select defaultValue="Due Upon Receipt" options={['Due Upon Receipt']} />
          </Field>

          <Field label="Payment Type" required>
            <Select options={[]} />
          </Field>
          <Field label="Planned date of delivery">
            <input type="date" value={plannedDelivery} onChange={(e) => setPlannedDelivery(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Estimated amount (excl. tax)">
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClasses} />
          </Field>
          <Field label="Project">
            <Select options={[]} />
          </Field>

          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>
          <Field label="Note (public)">
            <input type="text" className={inputClasses} />
          </Field>

          <Field label="Note (private)">
            <input type="text" className={inputClasses} />
          </Field>
          <Field label="Incoterms">
            <Select options={[]} />
          </Field>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
