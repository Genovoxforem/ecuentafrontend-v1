import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { useVendorOptions } from '../../customers/customerOptions'
import { useCreateVendorInvoice } from '../vendorInvoices.queries'

// Same real payment-type codes QuickPurchaseCreateForm uses (see that
// file's own comment for the source).
const PAYMENT_TYPES = [
  { code: '01', label: 'Cash' },
  { code: '03', label: 'Cash/Credit' },
  { code: '02', label: 'Credit' },
  { code: '05', label: 'Debit  card' },
  { code: '04', label: 'Bank cheque' },
  { code: '08', label: 'Bank transfer' },
  { code: '06', label: 'Mobile money' },
  { code: '07', label: 'Other' },
]

// Real POST /api/purchase-invoices/ create (see vendorInvoices.queries.ts),
// header only — matches the legacy "New invoice" (card.php?action=create)
// screen exactly, which is the first step of Dolibarr's two-step supplier
// invoice flow (draft header first, item lines added afterwards on the
// invoice's own card view). No lines are sent, matching that same scope.
// Bank account/Project/Incoterms/Payment Terms stay decorative — no real
// backend/dictionary exists for any of them (see QuickPurchaseCreateForm's
// own comment).
export function DetailedPurchaseCreateForm() {
  const { data: vendors, isLoading: vendorsLoading } = useVendorOptions()
  const createInvoice = useCreateVendorInvoice()
  const navigate = useNavigate()

  const today = new Date().toISOString().slice(0, 10)
  const [vendorId, setVendorId] = useState('')
  const [refSupplier, setRefSupplier] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(today)
  const [paymentModeCode, setPaymentModeCode] = useState('')
  const [formError, setFormError] = useState('')

  function handleSubmit() {
    setFormError('')
    if (!vendorId) {
      setFormError('Vendor is required.')
      return
    }
    createInvoice.mutate(
      { vendorId, date, refSupplier, label, paymentModeCode },
      {
        onSuccess: () => navigate(ROUTES.vendorInvoiceList),
        onError: () => setFormError('Could not create this invoice — please try again.'),
      },
    )
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> New invoice
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.vendorInvoiceList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={createInvoice.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createInvoice.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create draft
        </button>
      }
    >
      <Card className="bg-surface-hover! !h-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Vendor" required>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClasses}>
            <option value="">{vendorsLoading ? 'Loading…' : 'Select a third party'}</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="text-sm text-danger">Ref.*</p>
          <p className="text-sm text-text-faint mt-1">Draft</p>
        </div>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Type" required>
            <Select defaultValue="Standard invoice" options={['Standard invoice']} />
          </Field>
          <Field label="Ref. vendor" required>
            <input type="text" value={refSupplier} onChange={(e) => setRefSupplier(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Label">
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Invoice date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Payment due on">
            <input type="date" className={inputClasses} />
          </Field>
          <Field label="Payment Terms">
            <Select defaultValue="Due Upon Receipt" options={['Due Upon Receipt']} />
          </Field>

          <Field label="Payment Type" required>
            <select value={paymentModeCode} onChange={(e) => setPaymentModeCode(e.target.value)} className={inputClasses}>
              <option value="">Select a payment type</option>
              {PAYMENT_TYPES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bank account">
            <Select options={[]} />
          </Field>
          <Field label="Project">
            <Select options={[]} />
          </Field>

          <Field label="Incoterms">
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
