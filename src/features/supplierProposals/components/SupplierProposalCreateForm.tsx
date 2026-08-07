import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileBadge, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { useVendorOptions } from '../../customers/customerOptions'
import { useAuth } from '../../auth/AuthContext'
import { useCreateSupplierProposal } from '../supplierProposals.queries'

export function SupplierProposalCreateForm() {
  const { user } = useAuth()
  const { data: vendors, isLoading: vendorsLoading } = useVendorOptions()
  const createProposal = useCreateSupplierProposal()
  const navigate = useNavigate()

  const [vendorId, setVendorId] = useState('')
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
    createProposal({
      thirdParty: vendor.name,
      plannedDelivery,
      amountExclTax: amount,
      author: user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown',
    })
    setPending(false)
    navigate(ROUTES.supplierProposalList)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileBadge size={20} className="text-brand" /> New price request
      </h2>

      <Card>
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

          <Field label="Payment Terms">
            <Select options={[]} />
          </Field>
          <Field label="Payment Type">
            <Select options={[]} />
          </Field>

          <Field label="Bank account">
            <Select options={[]} />
          </Field>
          <Field label="Shipping method">
            <Select options={[]} />
          </Field>

          <Field label="Delivery date">
            <input type="date" value={plannedDelivery} onChange={(e) => setPlannedDelivery(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Estimated amount (excl. tax)">
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClasses} />
          </Field>

          <Field label="Default doc template">
            <Select defaultValue="aurore" options={['aurore']} />
          </Field>
          <Field label="Project">
            <Select options={[]} />
          </Field>

          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create draft
        </button>
        <Link to={ROUTES.supplierProposalList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      </div>
    </div>
  )
}
