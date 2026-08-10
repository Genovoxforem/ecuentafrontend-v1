import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileBadge, Check, X, LoaderCircle, Plus, Trash2, Upload, Download } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useAuth } from '../../auth/AuthContext'
import { useCreateQuotation } from '../quotations.queries'
import { todayIso } from '../../../shared/localCollection'
import { formatMoney } from '../../../utils/format'

// Visual-only line items — useCreateQuotation's local-collection model (see
// quotations.queries.ts) only tracks one flat amountExclTax, not per-line
// data, so these never leave this component. Shown because the reference's
// Item Table has them.
interface QuotationLine {
  key: number
  productId: string
  description: string
  qty: number
  vatRate: number
  unitPrice: number
  discountPct: number
  buyingPrice: number
}

let lineKeySeq = 0
function newLine(): QuotationLine {
  return { key: lineKeySeq++, productId: '', description: '', qty: 1, vatRate: 0, unitPrice: 0, discountPct: 0, buyingPrice: 0 }
}

export function QuotationCreateForm() {
  const today = todayIso()
  const { user } = useAuth()
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: products } = useProductOptions()
  const createQuotation = useCreateQuotation()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState('')
  const [refCustomer, setRefCustomer] = useState('')
  const [validityDays, setValidityDays] = useState(15)
  const [date, setDate] = useState(today)
  const [lines, setLines] = useState<QuotationLine[]>([newLine()])
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function addDays(iso: string, days: number) {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  function updateLine(key: number, patch: Partial<QuotationLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProduct(key: number, productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    updateLine(key, { productId, description: product?.label ?? '', unitPrice: product ? product.priceExclTax : 0 })
  }

  const amount = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0)
  const validityEndDate = addDays(date, validityDays)

  function handleSubmit() {
    setFormError('')
    const customer = customers?.find((c) => c.id === customerId)
    if (!customer) {
      setFormError('Customer is required.')
      return
    }
    setPending(true)
    createQuotation({
      thirdParty: customer.name,
      refCustomer,
      date,
      endDate: validityEndDate,
      amountExclTax: amount,
      author: user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown',
    })
    setPending(false)
    navigate(ROUTES.quotationList)
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBadge size={20} className="text-brand" /> New Quotation
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.quotationList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <>
          <button type="button" disabled title="Same request as Validate & Create below — this backend has no separate draft-save action" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted cursor-default opacity-60">
            Save Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Validate & Create
          </button>
        </>
      }
    >
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref.">
            <input disabled defaultValue="Draft" className={`${inputClasses} text-text-faint`} />
          </Field>
          <Field label="Ref. customer">
            <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Customer" required>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClasses}>
              <option value="">{customersLoading ? 'Loading…' : 'Select a customer'}</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" required>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
              <button type="button" onClick={() => setDate(today)} className="shrink-0 rounded-md border border-input-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover">
                Now
              </button>
            </div>
          </Field>

          <Field label="Validity ending date" required>
            <div className="flex items-center gap-2">
              <input disabled value={validityEndDate} className={`${inputClasses} flex-1 min-w-0 text-text-faint`} />
              <input
                type="number"
                min={1}
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                title="Validity duration (days)"
                className={`${inputClasses} w-20 shrink-0`}
              />
            </div>
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
          <Field label="SourceOfProjectTask">
            <Select options={[]} />
          </Field>

          <Field label="Availability delay (after order)">
            <Select options={[]} />
          </Field>
          <Field label="Shipping method">
            <Select options={[]} />
          </Field>

          <Field label="Project">
            <Select options={[]} />
          </Field>
          <Field label="Default doc template">
            <Select defaultValue="azur" options={['azur']} />
          </Field>

          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>
          <Field label="Incoterms">
            <Select options={[]} />
          </Field>

          <Field label="Note (public)">
            <input type="text" className={inputClasses} />
          </Field>
          <Field label="Note (private)">
            <input type="text" className={inputClasses} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
          <input disabled type="file" className={`${inputClasses} max-w-xs file:mr-3 file:rounded file:border-0 file:bg-surface-hover file:px-2 file:py-1`} />
          <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-faint cursor-default">
            <Upload size={14} /> Upload Products
          </button>
          <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-faint cursor-default">
            <Download size={14} /> Download Sample
          </button>
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
                <th className="font-medium px-4 py-2.5">Product Or Service</th>
                <th className="font-medium px-4 py-2.5 w-20">VAT</th>
                <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                <th className="font-medium px-4 py-2.5 w-20">Discount</th>
                <th className="font-medium px-4 py-2.5 w-28">Buying Price</th>
                <th className="font-medium px-4 py-2.5 w-28 text-right">Total (Inc.)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineTotalIncl = line.qty * line.unitPrice * (1 - line.discountPct / 100) * (1 + line.vatRate / 100)
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
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        placeholder="Description"
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} max={100} value={line.vatRate} onChange={(e) => updateLine(line.key, { vatRate: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} value={line.qty} onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={line.discountPct}
                        onChange={(e) => updateLine(line.key, { discountPct: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.buyingPrice}
                        onChange={(e) => updateLine(line.key, { buyingPrice: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(lineTotalIncl)}</td>
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
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border text-sm">
          <span className="text-text-muted">Total (Excl. Tax)</span>
          <span className="font-semibold text-text! tabular-nums">{formatMoney(amount)} ZMW</span>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
