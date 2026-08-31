import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Check, X, Plus, Pencil, Trash2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { api } from '../../../api/axios'
import { formatMoney, formatNumber } from '../../../utils/format'
import { useVendorOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useBankAccountOptions, useWarehouseOptionsForPurchaseInvoice } from '../vendorInvoices.queries'

// GET /api/payment_types.php — same real dictionary Purchase/Sales Order
// create forms already use for this exact field.
interface DictionaryOption {
  id: string
  text: string
}
function usePaymentTypes() {
  return useQuery({
    queryKey: ['dictionary', '/payment_types.php'],
    queryFn: async (): Promise<DictionaryOption[]> => {
      const { data } = await api.get<{ success: boolean; results: Array<{ id: string | number; text: string }> }>('/payment_types.php')
      return data.success ? data.results.map((r) => ({ id: String(r.id), text: r.text })) : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

interface InvoiceLine {
  key: number
  productId: string
  description: string
  supplierRef: string
  qty: number
  unitPrice: number
  vatRate: number
  vatCode: string
  discountPct: number
}

function lineExclAfterDiscount(qty: number, unitPrice: number, discountPct: number): number {
  return qty * unitPrice * (1 - discountPct / 100)
}
function lineTotalIncl(qty: number, unitPrice: number, vatRate: number, discountPct: number): number {
  return lineExclAfterDiscount(qty, unitPrice, discountPct) * (1 + vatRate / 100)
}

let lineKeySeq = 0
const noSpinnerCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
const disabledClasses = `${inputClasses} bg-surface-hover text-text-faint cursor-not-allowed`

// New purchase invoice — matches fourn/facture/purchase.php's real layout.
// fourn/facture/api/supplier_invoice_lines_api.php?action=validateInvoice
// is CONFIRMED BROKEN for a brand-new invoice — live-tested end-to-end
// 2026-08-29, not just read from source (see vendorInvoices.queries.ts's
// header comment for the full trace: it really does create a draft
// FactureFournisseur header, then fails to save any lines against that
// same, real, existing invoice — "Invoice not found" — and never
// validates). "Save as Draft" was already known broken the same way. So
// neither button can actually create a purchase invoice right now — both
// stay visible to match the real screen, but disabled, with the real,
// working legacy page offered as the actual way to do this (same fallback
// this app already uses for Purchase Orders after the equivalent
// discovery there). Warehouse/Bank account are still real fields worth
// filling in for anyone using the legacy fallback link. Type, Payment due
// on, Payment Terms, Incoterms and Currency aren't read by this action at
// all regardless (Type is hardcoded to Standard invoice, currency to the
// base ZMW, the invoice date itself is always "now" server-side) — kept in
// the layout to match the real screen, marked inert.
export function DetailedPurchaseCreateForm() {
  const { data: vendors, isLoading: vendorsLoading } = useVendorOptions()
  const vendorOptions = useMemo(() => (vendors ?? []).map((v) => ({ value: v.id, label: v.name })), [vendors])
  const { data: products } = useProductOptions()
  const productOptions = useMemo(
    () =>
      (products ?? []).map((p) => ({
        value: p.id,
        label: p.label,
        keywords: `${p.ref} ${p.classification} ${p.barcode}`,
        description: (
          <>
            Ref :{p.ref} | Classification: {p.classification || '—'}
            <br />
            Price: {formatMoney(p.priceExclTax)} Excl. tax | Stock: {formatNumber(p.stock)}
          </>
        ),
      })),
    [products],
  )
  const { data: paymentTypes } = usePaymentTypes()
  const { data: bankAccounts } = useBankAccountOptions()
  const { data: warehouses } = useWarehouseOptionsForPurchaseInvoice()

  const today = new Date().toISOString().slice(0, 10)
  const [vendorId, setVendorId] = useState('')
  const [refSupplier, setRefSupplier] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(today)
  const [warehouseId, setWarehouseId] = useState('')
  const [fkAccount, setFkAccount] = useState('')
  const [modeReglementId, setModeReglementId] = useState('')
  const [showShipment, setShowShipment] = useState(false)
  const [shipment, setShipment] = useState({
    shipmentvia: '',
    shipmentdate: '',
    shipmentaddress: '',
    trackingid: '',
    gdnno: '',
    grnno: '',
    transporter: '',
    truck_details: '',
  })

  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [draftProductId, setDraftProductId] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftSupplierRef, setDraftSupplierRef] = useState('')
  const [draftVatRate, setDraftVatRate] = useState(0)
  const [draftVatCode, setDraftVatCode] = useState('')
  const [draftUnitPrice, setDraftUnitPrice] = useState(0)
  const [draftQty, setDraftQty] = useState(1)
  const [draftDiscountPct, setDraftDiscountPct] = useState(0)
  const [editingLineKey, setEditingLineKey] = useState<number | null>(null)
  const [formError, setFormError] = useState('')

  function pickDraftProduct(productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    setDraftProductId(productId)
    setDraftDescription(product?.label ?? '')
    setDraftUnitPrice(product?.priceExclTax ?? 0)
    setDraftVatRate(product?.vatRatePct ?? 0)
    setDraftVatCode(product?.vatCode ?? '')
  }

  function resetDraftLine() {
    setDraftProductId('')
    setDraftDescription('')
    setDraftSupplierRef('')
    setDraftVatRate(0)
    setDraftVatCode('')
    setDraftUnitPrice(0)
    setDraftQty(1)
    setDraftDiscountPct(0)
    setEditingLineKey(null)
  }

  function addDraftLine() {
    if (!draftDescription.trim() && !draftProductId) {
      setFormError('Select an item or enter a description.')
      return
    }
    if (draftQty <= 0) {
      setFormError('Quantity must be greater than 0.')
      return
    }
    setFormError('')
    const line: InvoiceLine = {
      key: editingLineKey ?? lineKeySeq++,
      productId: draftProductId,
      description: draftDescription,
      supplierRef: draftSupplierRef,
      qty: draftQty,
      unitPrice: draftUnitPrice,
      vatRate: draftVatRate,
      vatCode: draftVatCode,
      discountPct: draftDiscountPct,
    }
    setLines((prev) => (editingLineKey != null ? prev.map((l) => (l.key === editingLineKey ? line : l)) : [...prev, line]))
    resetDraftLine()
  }

  function editLine(key: number) {
    const line = lines.find((l) => l.key === key)
    if (!line) return
    setDraftProductId(line.productId)
    setDraftDescription(line.description)
    setDraftSupplierRef(line.supplierRef)
    setDraftVatRate(line.vatRate)
    setDraftVatCode(line.vatCode)
    setDraftUnitPrice(line.unitPrice)
    setDraftQty(line.qty)
    setDraftDiscountPct(line.discountPct)
    setEditingLineKey(key)
  }

  function deleteLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
    if (editingLineKey === key) resetDraftLine()
  }

  const totalExcl = lines.reduce((sum, l) => sum + lineExclAfterDiscount(l.qty, l.unitPrice, l.discountPct), 0)
  const totalTax = lines.reduce((sum, l) => sum + lineExclAfterDiscount(l.qty, l.unitPrice, l.discountPct) * (l.vatRate / 100), 0)
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0)

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> New purchase invoice
        </h2>
      }
      footerLeft={
        <div className="flex items-center gap-4">
          <Link to={ROUTES.vendorInvoiceList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
          <div className="text-xs text-text-faint leading-tight">
            <p>
              Total Amount: <span className="font-medium text-text!">{formatMoney(totalExcl + totalTax)}</span>
            </p>
            <p>
              Total Quantity: <span className="font-medium text-text!">{formatNumber(totalQty)}</span>
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
            {/* Both real create paths on this backend are confirmed broken by a live
                end-to-end test (2026-08-29) — see vendorInvoices.queries.ts's own
                header comment for the full trace. Not fixable from the frontend, so
                the real, working legacy form is offered as the actual way to do this. */}
            <a
              href={`/fourn/facture/purchase.php${vendorId ? `?socid=${vendorId}` : ''}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              Create in legacy system instead <ExternalLink size={13} />
            </a>
          </div>
        </div>
      }
      footerRight={
        <>
          <button
            type="button"
            disabled
            title="No real path exists on this backend to save a purchase invoice — confirmed broken by a live end-to-end test (creates an orphaned draft header, then fails to save any lines against it). Use the legacy system link instead."
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-faint cursor-not-allowed"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled
            title="Confirmed broken by a live end-to-end test — creates an orphaned draft invoice with no lines and never validates. Use the legacy system link instead."
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed"
          >
            <Check size={14} /> Save as Invoice
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 flex-1 shrink-0">
        <Card className="!h-auto shrink-0">
          <div className="rounded-lg bg-surface-alt border border-border p-3 mb-4">
            <Field label="Vendor" required>
              <SearchableSelect value={vendorId} onChange={setVendorId} options={vendorOptions} placeholder={vendorsLoading ? 'Loading…' : 'Select a third party'} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Supplier Invoice No" required>
              <input type="text" value={refSupplier} onChange={(e) => setRefSupplier(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Invoice date" required>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Type" required>
              <select disabled className={disabledClasses}>
                <option>Standard invoice</option>
              </select>
            </Field>
            <Field label="Currency">
              <select disabled className={disabledClasses}>
                <option>Zambian Kwacha (ZMW)</option>
              </select>
            </Field>
            <Field label="Payment due on">
              <input disabled className={disabledClasses} placeholder="Not used by the real create API" />
            </Field>
            <Field label="Payment Terms">
              <select disabled className={disabledClasses}>
                <option>Due Upon Receipt</option>
              </select>
            </Field>
          </div>
          <p className="text-xs text-text-faint italic mt-3">
            Type, Currency, Payment due on, Payment Terms and Incoterms aren't read by the real create API on this backend — the invoice date it records is always the moment you click Save,
            regardless of the Invoice date field above. Shown for layout reference only.
          </p>
        </Card>

        <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-text!">Item Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5">Product / Service</th>
                  <th className="font-medium px-4 py-2.5 w-28">Supplier Ref</th>
                  <th className="font-medium px-4 py-2.5 w-24">VAT</th>
                  <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 w-28">Unit Price (Inc. Tax)</th>
                  <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                  <th className="font-medium px-4 py-2.5 w-24">Disc. %</th>
                  <th className="font-medium px-4 py-2.5 w-32 text-right">Total (Incl.)</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border align-top bg-surface-alt/50">
                  <td className="px-4 py-2">
                    {vendorId ? (
                      <SearchableSelect value={draftProductId} onChange={pickDraftProduct} options={productOptions} placeholder="Select Predefined Product/Services" />
                    ) : (
                      <span className="text-sm text-text-faint">Please select a vendor first.</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={draftSupplierRef} onChange={(e) => setDraftSupplierRef(e.target.value)} placeholder="Supplier Ref" className={inputClasses} />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      readOnly
                      value={`${draftVatRate}%${draftVatCode ? `(${draftVatCode})` : ''}`}
                      className={`${inputClasses} cursor-not-allowed bg-surface text-text-muted text-center`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} step="0.01" value={draftUnitPrice} onChange={(e) => setDraftUnitPrice(Number(e.target.value))} className={`${inputClasses} ${noSpinnerCls}`} />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={(draftUnitPrice * (1 + draftVatRate / 100)).toFixed(2)}
                      onChange={(e) => {
                        const incl = Number(e.target.value)
                        setDraftUnitPrice(draftVatRate > 0 ? incl / (1 + draftVatRate / 100) : incl)
                      }}
                      className={`${inputClasses} ${noSpinnerCls}`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} step="1" value={draftQty} onChange={(e) => setDraftQty(Number(e.target.value))} className={`${inputClasses} ${noSpinnerCls}`} />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={draftDiscountPct}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setDraftDiscountPct(Number(e.target.value))}
                      className={`${inputClasses} ${noSpinnerCls}`}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(lineTotalIncl(draftQty, draftUnitPrice, draftVatRate, draftDiscountPct))}</td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={addDraftLine} className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-surface-hover">
                      <Plus size={13} /> {editingLineKey != null ? 'Update' : 'Add'}
                    </button>
                  </td>
                </tr>

                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 text-center text-text-faint italic">
                      No lines added yet.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => {
                    const lineIncl = lineTotalIncl(line.qty, line.unitPrice, line.vatRate, line.discountPct)
                    const unitPriceIncl = line.unitPrice * (1 + line.vatRate / 100)
                    return (
                      <tr key={line.key} className="border-b border-border align-top">
                        <td className="px-4 py-2.5 text-text!">{line.description}</td>
                        <td className="px-4 py-2.5 text-text-muted">{line.supplierRef || '—'}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                          {line.vatRate}%{line.vatCode ? `(${line.vatCode})` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(line.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(unitPriceIncl)}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{formatNumber(line.qty)}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{line.discountPct}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(lineIncl)}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <button type="button" title="Edit line" onClick={() => editLine(line.key)} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand">
                            <Pencil size={14} />
                          </button>
                          <button type="button" title="Delete line" onClick={() => deleteLine(line.key)} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="!h-auto shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
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
              <select value={modeReglementId} onChange={(e) => setModeReglementId(e.target.value)} className={inputClasses}>
                <option value="">Select a payment type</option>
                {paymentTypes?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.text}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Incoterms">
              <select disabled className={disabledClasses}>
                <option>Select a incoterms</option>
              </select>
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setShowShipment((v) => !v)}
            className="flex items-center gap-1.5 mt-4 text-sm font-medium text-brand hover:underline"
          >
            {showShipment ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Add Shipment Details
          </button>
          {showShipment && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 mt-3 pt-3 border-t border-border">
              <Field label="GDN No.">
                <input value={shipment.gdnno} onChange={(e) => setShipment((s) => ({ ...s, gdnno: e.target.value }))} className={inputClasses} />
              </Field>
              <Field label="GRN No.">
                <input value={shipment.grnno} onChange={(e) => setShipment((s) => ({ ...s, grnno: e.target.value }))} className={inputClasses} />
              </Field>
              <Field label="Shipping Via">
                <input value={shipment.shipmentvia} onChange={(e) => setShipment((s) => ({ ...s, shipmentvia: e.target.value }))} className={inputClasses} />
              </Field>
              <Field label="Shipping Date">
                <input type="date" value={shipment.shipmentdate} onChange={(e) => setShipment((s) => ({ ...s, shipmentdate: e.target.value }))} className={inputClasses} />
              </Field>
              <Field label="Tracking ID">
                <input value={shipment.trackingid} onChange={(e) => setShipment((s) => ({ ...s, trackingid: e.target.value }))} className={inputClasses} />
              </Field>
              <Field label="Transporter">
                <input value={shipment.transporter} onChange={(e) => setShipment((s) => ({ ...s, transporter: e.target.value }))} className={inputClasses} />
              </Field>
              <Field label="Truck Details">
                <input value={shipment.truck_details} onChange={(e) => setShipment((s) => ({ ...s, truck_details: e.target.value }))} className={inputClasses} />
              </Field>
              <Field label="Shipping Address">
                <input value={shipment.shipmentaddress} onChange={(e) => setShipment((s) => ({ ...s, shipmentaddress: e.target.value }))} className={inputClasses} />
              </Field>
            </div>
          )}
        </Card>

        <Card className="!h-auto shrink-0">
          <h3 className="font-semibold text-text! mb-3">Payment Details</h3>
          <div className="space-y-2 text-sm max-w-sm ml-auto">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Sub Total:</span>
              <span className="tabular-nums text-text!">{formatMoney(totalExcl)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">VAT:</span>
              <span className="tabular-nums text-text!">{formatMoney(totalTax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-text-muted font-medium">Total (ZMW):</span>
              <span className="font-bold tabular-nums text-info">{formatMoney(totalExcl + totalTax)}</span>
            </div>
          </div>
        </Card>
      </div>
    </StickyFormShell>
  )
}
