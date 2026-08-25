import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useCreateInvoice } from '../invoiceCreate.queries'
import { formatMoney } from '../../../utils/format'
import { isBackendUnavailable } from '../../../shared/components/BackendUnavailable'

// Real POST /api/invoices/list/ create (see invoiceCreate.queries.ts) —
// same real endpoint InvoiceCreateForm.tsx uses, just a single-line form
// instead of a repeatable Item Table. Matches the legacy app's own split:
// list.php links "New Quick Invoice" to a leaner compta/facture/invoice.php
// and "New Detailed Invoice" to the full card.php?action=create form — two
// genuinely different pages, not two links to the same one (which is what
// this app had before, and why both lit up together in the sidebar).
export function QuickInvoiceCreateForm() {
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: products } = useProductOptions()
  const createInvoice = useCreateInvoice()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(today)
  const [productId, setProductId] = useState('')
  const [label, setLabel] = useState('')
  const [qty, setQty] = useState(1)
  const [unitPriceHt, setUnitPriceHt] = useState(0)
  const [vatRate, setVatRate] = useState(0)
  const [formError, setFormError] = useState('')

  function pickProduct(id: string) {
    const product = products?.find((p) => p.id === id)
    setProductId(id)
    setLabel(product?.label ?? '')
    setUnitPriceHt(product ? product.priceExclTax : 0)
  }

  const totalHt = qty * unitPriceHt
  const totalVat = totalHt * (vatRate / 100)

  function handleSubmit() {
    setFormError('')
    if (!customerId) {
      setFormError('Customer is required.')
      return
    }
    if (!label.trim() || qty <= 0) {
      setFormError('A description and quantity are required.')
      return
    }
    createInvoice.mutate(
      { customerId, date, lines: [{ productId, label, qty, unitPriceHt, vatRate }] },
      {
        onSuccess: () => navigate(ROUTES.invoiceList),
        // POST /api/invoices/list/ doesn't exist on the current backend (see
        // BackendUnavailable.tsx) — this create draft action gets the honest "not available"
        // message instead of the generic retry-suggesting one.
        onError: (err) =>
          setFormError(isBackendUnavailable(err) ? "Creating an invoice isn't available on this backend yet." : 'Could not create this invoice — please try again.'),
      },
    )
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Zap size={20} className="text-brand" /> New Quick Invoice
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.invoiceList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
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
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Customer" required>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClasses}>
              <option value="">{customersLoading ? 'Loading…' : 'Select a third party'}</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Invoice date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-text! mb-3">Item</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-4">
          <div className="xl:col-span-2">
            <Field label="Product/Service">
              <select value={productId} onChange={(e) => pickProduct(e.target.value)} className={inputClasses}>
                <option value="">Custom line</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label="Description" required>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} />
            </Field>
          </div>

          <Field label="Qty" required>
            <input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={inputClasses} />
          </Field>
          <Field label="Unit Price (Excl.)">
            <input type="number" min={0} step="0.01" value={unitPriceHt} onChange={(e) => setUnitPriceHt(Number(e.target.value))} className={inputClasses} />
          </Field>
          <Field label="VAT %">
            <input type="number" min={0} max={100} value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className={inputClasses} />
          </Field>
          <div>
            <span className="text-sm text-text block mb-1">Total (Incl. Tax)</span>
            <p className="h-9 flex items-center font-semibold text-text! tabular-nums">{formatMoney(totalHt + totalVat)}</p>
          </div>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
