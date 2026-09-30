import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileBadge, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { Avatar } from '../../../shared/components/Avatar'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useCreateSupplierProposal, useSupplierProposalCreateForm, type SupplierProposalFormOption } from '../supplierProposals.queries'

function OptionSelect({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: SupplierProposalFormOption[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// supplier_proposal/card.php?action=create — every dropdown is the real form's own
// and Create sends the same POST it does. The result is a draft price request; its
// amount comes from the lines added to it afterwards, so there is no amount here.
//
// `fixedCustomerId` powers SupplierProposalCreateFromCustomerForm.tsx
// (reached from a specific vendor's own Vendor tab, "Create A Price
// Request" button) — same real vendor-locked-field-not-a-different-page
// behavior confirmed for Quotations (see QuotationCreateForm.tsx's own
// comment), generalized here the same way rather than duplicated.
export function SupplierProposalCreateForm({ fixedCustomerId, backTo }: { fixedCustomerId?: string; backTo?: string } = {}) {
  const { data: form, isLoading, isError, error, refetch } = useSupplierProposalCreateForm()
  const { data: fixedVendor } = useCustomerDetail(fixedCustomerId)
  const createProposal = useCreateSupplierProposal()
  const navigate = useNavigate()
  const listLink = backTo ?? ROUTES.supplierProposalList

  const [vendorId, setVendorId] = useState(fixedCustomerId ?? '')
  const [paymentTermsId, setPaymentTermsId] = useState('')
  const [paymentTypeId, setPaymentTypeId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [shippingMethodId, setShippingMethodId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [template, setTemplate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [currency, setCurrency] = useState('')
  const [formError, setFormError] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading price request form…" />
  if (isError || !form) {
    return <LegacyErrorCard title="Couldn't load the price request form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  function handleSubmit() {
    if (!form) return
    setFormError('')
    if (!vendorId) {
      setFormError('Vendor is required.')
      return
    }
    createProposal.mutate(
      {
        vendorId,
        paymentTermsId,
        paymentTypeId,
        bankAccountId,
        shippingMethodId,
        deliveryDate,
        template: template || form.defaultTemplate,
        projectId,
        currency: currency || form.defaultCurrency,
      },
      {
        onSuccess: () => navigate(listLink),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'The price request could not be created.'),
      },
    )
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
          disabled={createProposal.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createProposal.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create draft
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
              <OptionSelect value={vendorId} onChange={setVendorId} options={form.vendors} placeholder="Select a vendor" />
            )}
          </Field>

          <Field label="Payment Terms">
            <OptionSelect value={paymentTermsId} onChange={setPaymentTermsId} options={form.paymentTerms} placeholder="Select a payment terms" />
          </Field>
          <Field label="Payment Type">
            <OptionSelect value={paymentTypeId} onChange={setPaymentTypeId} options={form.paymentTypes} placeholder="Select a payment type" />
          </Field>

          <Field label="Bank account">
            <OptionSelect value={bankAccountId} onChange={setBankAccountId} options={form.bankAccounts} placeholder="Select a bank account" />
          </Field>
          <Field label="Shipping method">
            <OptionSelect value={shippingMethodId} onChange={setShippingMethodId} options={form.shippingMethods} placeholder="Select a shipping method" />
          </Field>

          <Field label="Delivery date">
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Default doc template">
            <OptionSelect value={template || form.defaultTemplate} onChange={setTemplate} options={form.templates} />
          </Field>

          <Field label="Project">
            <OptionSelect value={projectId} onChange={setProjectId} options={form.projects} placeholder="Select a project" />
          </Field>
          <Field label="Currency">
            <OptionSelect value={currency || form.defaultCurrency} onChange={setCurrency} options={form.currencies} />
          </Field>
        </div>
      </Card>

      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
    </StickyFormShell>
  )
}
