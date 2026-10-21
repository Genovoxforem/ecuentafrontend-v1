import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Check, X, Plus, Trash2, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell, WizardStep } from '../../../shared/components/layout/StickyFormShell'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { useVendorOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useBankAccountOptions, useCreateVendorInvoice, useWarehouseOptionsForPurchaseInvoice, type NewVendorInvoiceLine } from '../vendorInvoices.queries'
import { usePurchaseOrderFormOptions } from '../../purchaseOrders/purchaseOrderFapi'
import { formatMoney } from '../../../utils/format'

interface LineState extends NewVendorInvoiceLine {
  key: number
}

let lineKeySeq = 0
function newLine(): LineState {
  return { key: lineKeySeq++, productId: '', supplierRef: '', label: '', qty: 1, unitPriceHt: 0, vatRate: 0, discPercent: 0 }
}

// Quick purchase invoice: Save posts to fourn/facture/fapi/create.php (header, lines and the optional
// validation in one transaction). The payment mode, terms and bank default from the chosen vendor.
export function QuickPurchaseCreateForm() {
  const { data: vendors, isLoading: vendorsLoading } = useVendorOptions()
  const { data: products } = useProductOptions()
  const { data: bankAccounts } = useBankAccountOptions()
  const { data: warehouses } = useWarehouseOptionsForPurchaseInvoice()

  const today = new Date().toISOString().slice(0, 10)
  const [vendorId, setVendorId] = useState('')
  const [refSupplier, setRefSupplier] = useState('')
  const [date, setDate] = useState(today)
  const [warehouseId, setWarehouseId] = useState('')
  const [fkAccount, setFkAccount] = useState('')
  const [paymentModeCode, setPaymentModeCode] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [lines, setLines] = useState<LineState[]>([newLine()])
  const [dueDate, setDueDate] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [formError, setFormError] = useState('')
  const create = useCreateVendorInvoice()
  const navigate = useNavigate()
  const { data: formOptions } = usePurchaseOrderFormOptions(vendorId || undefined)
  useEffect(() => {
    if (!vendorId || !formOptions?.defaults) return
    const d = formOptions.defaults
    setPaymentTermId((prev) => prev || (d.payment_term_id ? String(d.payment_term_id) : ''))
    setPaymentModeCode((prev) => prev || (d.payment_mode_id ? String(d.payment_mode_id) : ''))
    setFkAccount((prev) => prev || (d.bank_account_id ? String(d.bank_account_id) : ''))
  }, [vendorId, formOptions])

  function updateLine(key: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProduct(key: number, productId: string) {
    const product = products?.find((p) => p.id === productId)
    updateLine(key, { productId, label: product?.label ?? '', unitPriceHt: product ? product.priceExclTax : 0 })
  }

  const validLines = lines.filter((l) => l.label.trim() && l.qty > 0)
  const totalHt = validLines.reduce((sum, l) => sum + l.qty * l.unitPriceHt * (1 - (l.discPercent ?? 0) / 100), 0)
  const totalVat = validLines.reduce((sum, l) => sum + l.qty * l.unitPriceHt * (1 - (l.discPercent ?? 0) / 100) * (l.vatRate / 100), 0)

  function submit(validate: boolean) {
    setFormError('')
    if (!vendorId) return setFormError('Select a vendor.')
    if (!refSupplier.trim()) return setFormError('Supplier Invoice No is required.')
    if (validLines.length === 0) return setFormError('Add at least one line with a description and a quantity.')
    if (validate && !warehouseId) return setFormError('Select a warehouse to save as an invoice.')
    create.mutate(
      { vendorId, refSupplier: refSupplier.trim(), date, dueDate, paymentTermId, fkAccount, modeReglementId: paymentModeCode, warehouseId, validate, lines: validLines },
      {
        onSuccess: (res) => navigate(res.id ? ROUTES.vendorInvoiceDetail.replace(':id', String(res.id)) : ROUTES.vendorInvoiceList),
        onError: (e) => setFormError(e instanceof Error ? e.message : 'The invoice could not be created.'),
      },
    )
  }

  return (
    <StickyFormShell
      wizard={[
        { title: 'Vendor & Details', subtitle: 'Vendor, invoice no. & type' },
        { title: 'Items', subtitle: 'Add products/services' },
        { title: 'Payment & Totals', subtitle: 'Warehouse, bank & totals' },
      ]}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Lock size={20} className="text-brand" /> New purchase invoice
        </h2>
      }
      footerLeft={
        <div className="flex items-center gap-4">
          <Link to={ROUTES.vendorInvoiceList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
          {formError && <p role="alert" className="text-sm font-medium text-danger">{formError}</p>}
        </div>
      }
      footerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => submit(false)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => submit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {create.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save as Invoice
          </button>
        </div>
      }
    >
      <WizardStep n={0}>
      <Card className="bg-surface-hover! !h-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <Field label="Supplier Invoice No" required>
          <input type="text" value={refSupplier} onChange={(e) => setRefSupplier(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Invoice date" required>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
        </Field>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Type" required>
            <Select defaultValue="Standard invoice" options={['Standard invoice']} />
          </Field>
          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>
          <Field label="Payment due on">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClasses} />
          </Field>
        </div>
      </Card>
      </WizardStep>

      <WizardStep n={1}>
      <Card className="!h-auto !p-0 overflow-hidden">
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
                <th className="font-medium px-4 py-2.5 w-32">Supplier Ref</th>
                <th className="font-medium px-4 py-2.5 w-20">VAT %</th>
                <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                <th className="font-medium px-4 py-2.5 w-16">Qty</th>
                <th className="font-medium px-4 py-2.5 w-16">Disc. %</th>
                <th className="font-medium px-4 py-2.5 w-28 text-right">Total (Incl.)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineHt = line.qty * line.unitPriceHt * (1 - (line.discPercent ?? 0) / 100)
                const lineTtc = lineHt * (1 + line.vatRate / 100)
                return (
                  <tr key={line.key} className="border-b border-border align-top">
                    <td className="px-4 py-2 space-y-1">
                      <select value={line.productId} onChange={(e) => pickProduct(line.key, e.target.value)} className={inputClasses}>
                        <option value="">Select Predefined Product/Services</option>
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
                      <input type="text" value={line.supplierRef} onChange={(e) => updateLine(line.key, { supplierRef: e.target.value })} className={inputClasses} />
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
                    <td className="px-4 py-2">
                      <input type="number" min={0} value={line.qty} onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} max={100} value={line.discPercent} onChange={(e) => updateLine(line.key, { discPercent: Number(e.target.value) })} className={inputClasses} />
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
      </Card>
      </WizardStep>

      <WizardStep n={2}>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Field label="Warehouse" required>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputClasses}>
                <option value="">Select a warehouse</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank account" required>
                <select value={fkAccount} onChange={(e) => setFkAccount(e.target.value)} className={inputClasses}>
                  <option value="">Select a bank account</option>
                  {bankAccounts?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment Type" required>
                <select value={paymentModeCode} onChange={(e) => setPaymentModeCode(e.target.value)} className={inputClasses}>
                  <option value="">Select a payment type</option>
                  {formOptions?.payment_modes.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Payment Terms">
                <select value={paymentTermId} onChange={(e) => setPaymentTermId(e.target.value)} className={inputClasses}>
                  <option value="">Select a payment terms</option>
                  {formOptions?.payment_terms.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Incoterms">
                <Select options={[]} />
              </Field>
            </div>
            <Field label="Payment Note">
              <input type="text" value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} className={inputClasses} />
            </Field>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Sub Total:</span>
              <span className="font-medium text-text! tabular-nums">{formatMoney(totalHt)} ZMW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">VAT:</span>
              <span className="font-medium text-text! tabular-nums">{formatMoney(totalVat)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold text-text!">Total (ZMW):</span>
              <span className="font-bold text-text! tabular-nums">{formatMoney(totalHt + totalVat)}</span>
            </div>
          </div>
        </div>
      </Card>
      </WizardStep>
    </StickyFormShell>
  )
}
