import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Check, X, Info, Plus, Trash2, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useCreateInvoice, type NewInvoiceLine } from '../invoiceCreate.queries'
import { formatMoney } from '../../../utils/format'

const INVOICE_TYPES = ['Standard invoice', 'Lpo', 'Export', 'Template invoice', 'Credit note']

// Real llx_c_paiement codes/labels (queried directly against the DB) — no
// dictionary endpoint exists for this on the backend, so it's a static list
// like BASE_CURRENCIES/INCOTERMS_OPTIONS elsewhere in this app rather than
// a live fetch, but the codes themselves are real and match what
// fk_mode_reglement actually stores.
const PAYMENT_TYPES = [
  { code: '01', label: 'Cash' },
  { code: '03', label: 'Cash/Credit' },
  { code: '02', label: 'Credit' },
  { code: 'CB', label: 'Credit card' },
  { code: '05', label: 'Debit card' },
  { code: '04', label: 'Bank cheque' },
  { code: '08', label: 'Bank transfer' },
  { code: '06', label: 'Mobile money' },
  { code: '07', label: 'Other' },
]

interface LineState extends NewInvoiceLine {
  key: number
}

let lineKeySeq = 0
function newLine(): LineState {
  return { key: lineKeySeq++, productId: '', label: '', qty: 1, unitPriceHt: 0, vatRate: 0 }
}

// Real POST /api/invoices/list/ create (see invoiceCreate.queries.ts)
// against llx_facture/llx_facturedet. Type buttons, Payment Terms, Bank
// account, Project, Incoterms, Doc template and Currency stay decorative —
// the backend only accepts customer/date/ref.customer/payment type/note/
// lines, so those fields don't reach it (same honesty as the fields this
// form already left as bare Selects before).
export function InvoiceCreateForm() {
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: products } = useProductOptions()
  const createInvoice = useCreateInvoice()
  const navigate = useNavigate()

  const [type, setType] = useState(INVOICE_TYPES[0])
  const today = new Date().toISOString().slice(0, 10)

  const [customerId, setCustomerId] = useState('')
  const [refClient, setRefClient] = useState('')
  const [date, setDate] = useState(today)
  const [paymentModeCode, setPaymentModeCode] = useState('')
  const [lines, setLines] = useState<LineState[]>([newLine()])
  const [formError, setFormError] = useState('')

  function updateLine(key: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProduct(key: number, productId: string) {
    const product = products?.find((p) => p.id === productId)
    updateLine(key, { productId, label: product?.label ?? '', unitPriceHt: product ? product.priceExclTax : 0 })
  }

  const totalHt = lines.reduce((sum, l) => sum + l.qty * l.unitPriceHt, 0)
  const totalVat = lines.reduce((sum, l) => sum + l.qty * l.unitPriceHt * (l.vatRate / 100), 0)

  function handleSubmit() {
    setFormError('')
    if (!customerId) {
      setFormError('Customer is required.')
      return
    }
    if (!lines.some((l) => l.label.trim() && l.qty > 0)) {
      setFormError('At least one line with a product/description and quantity is required.')
      return
    }
    createInvoice.mutate(
      {
        customerId,
        date,
        refClient,
        paymentModeCode,
        lines: lines.filter((l) => l.label.trim() && l.qty > 0).map(({ key: _key, ...l }) => l),
      },
      {
        onSuccess: () => navigate(ROUTES.invoiceList),
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
      <Card className="bg-surface-hover! grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div>
          <p className="text-sm text-danger">Ref.*</p>
          <p className="text-sm text-text-faint mt-1">Draft</p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-danger">Type*</span>
          <Info size={13} className="text-text-faint" />
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {INVOICE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-md text-sm border ${type === t ? 'border-brand text-brand bg-brand/5' : 'border-border text-text-muted hover:bg-surface-hover'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Ref. customer">
            <input type="text" value={refClient} onChange={(e) => setRefClient(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Invoice date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Payment Terms" required>
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
          <Field label="Doc template">
            <Select defaultValue="crabe" options={['crabe']} />
          </Field>
          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">Item Table</h3>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, newLine()])}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
          >
            <Plus size={13} /> Add line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Product/Service</th>
                <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                <th className="font-medium px-4 py-2.5 w-20">VAT %</th>
                <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                <th className="font-medium px-4 py-2.5 w-28 text-right">Total TTC</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineTtc = line.qty * line.unitPriceHt * (1 + line.vatRate / 100)
                return (
                  <tr key={line.key} className="border-b border-border align-top">
                    <td className="px-4 py-2 space-y-1">
                      <select value={line.productId} onChange={(e) => pickProduct(line.key, e.target.value)} className={inputClasses}>
                        <option value="">Custom line</option>
                        {products?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={line.label}
                        onChange={(e) => updateLine(line.key, { label: e.target.value })}
                        placeholder="Description"
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} value={line.qty} onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} max={100} value={line.vatRate} onChange={(e) => updateLine(line.key, { vatRate: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPriceHt}
                        onChange={(e) => updateLine(line.key, { unitPriceHt: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(lineTtc)}</td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        title="Remove line"
                        disabled={lines.length === 1}
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border">
          <h3 className="font-semibold text-text! mb-2">Totals</h3>
          <div className="grid grid-cols-3 gap-3 text-sm max-w-md">
            <div>
              <p className="text-text-muted">Total (Excl. Tax):</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(totalHt)}</p>
            </div>
            <div>
              <p className="text-text-muted">Total Tax:</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(totalVat)}</p>
            </div>
            <div>
              <p className="text-text-muted">Total (Inc. Tax):</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(totalHt + totalVat)}</p>
            </div>
          </div>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
