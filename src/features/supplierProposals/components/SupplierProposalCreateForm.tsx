import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileBadge, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { Avatar } from '../../../shared/components/Avatar'
import { useVendorOptions } from '../../customers/customerOptions'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useAuth } from '../../auth/AuthContext'
import { useCreateSupplierProposal } from '../supplierProposals.queries'

// `fixedCustomerId` powers SupplierProposalCreateFromCustomerForm.tsx
// (reached from a specific vendor's own Vendor tab, "Create A Price
// Request" button) — same real vendor-locked-field-not-a-different-page
// behavior confirmed for Quotations (see QuotationCreateForm.tsx's own
// comment), generalized here the same way rather than duplicated.
export function SupplierProposalCreateForm({ fixedCustomerId, backTo }: { fixedCustomerId?: string; backTo?: string } = {}) {
  const { user } = useAuth()
  const { data: vendors, isLoading: vendorsLoading } = useVendorOptions()
  const { data: fixedVendor } = useCustomerDetail(fixedCustomerId)
  const createProposal = useCreateSupplierProposal()
  const navigate = useNavigate()
  const listLink = backTo ?? ROUTES.supplierProposalList

  const [vendorId, setVendorId] = useState(fixedCustomerId ?? '')
  const [plannedDelivery, setPlannedDelivery] = useState('')
  const [amount, setAmount] = useState(0)
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function handleSubmit() {
    setFormError('')
    const vendorName = fixedVendor?.name ?? vendors?.find((v) => v.id === vendorId)?.name
    if (!vendorName) {
      setFormError('Vendor is required.')
      return
    }
    setPending(true)
    createProposal({
      thirdParty: vendorName,
      plannedDelivery,
      amountExclTax: amount,
      author: user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown',
    })
    setPending(false)
    navigate(listLink)
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBadge size={20} className="text-brand" /> New price request
        </h2>
      }
      footerLeft={
        <Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
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
            {fixedCustomerId ? (
              <div className={`${inputClasses} flex items-center gap-2`}>
                <Avatar name={fixedVendor?.name ?? ''} size={20} color="bg-brand" />
                {fixedVendor ? (
                  <Link to={ROUTES.customerDetail.replace(':id', fixedCustomerId)} className="text-brand hover:underline">
                    {fixedVendor.name}
                  </Link>
                ) : (
                  <span className="text-text-faint">Loading…</span>
                )}
              </div>
            ) : (
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClasses}>
                <option value="">{vendorsLoading ? 'Loading…' : 'Select a vendor'}</option>
                {vendors?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
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
    </StickyFormShell>
  )
}
