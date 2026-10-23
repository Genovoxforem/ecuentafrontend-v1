import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Info, Check, X, LoaderCircle, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell, WizardStep } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { Avatar } from '../../../shared/components/Avatar'
import { fapiGet } from '../../../api/fapiEnvelope'
import { formatMoney, formatNumber } from '../../../utils/format'
import { useVendorOptions } from '../../customers/customerOptions'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useProductOptions } from '../../products/products.queries'
import { useBankAccountOptions, useCreateVendorInvoice, useWarehouseOptionsForPurchaseInvoice } from '../vendorInvoices.queries'
import { usePurchaseOrderFormOptions } from '../../purchaseOrders/purchaseOrderFapi'

// GET /api/payment_types.php — same real dictionary Purchase/Sales Order
// create forms already use for this exact field.
interface DictionaryOption {
  id: string
  text: string
}
function usePaymentTypes() {
  return useQuery({
    queryKey: ['purchase-forms', 'paymentModes'],
    queryFn: async (): Promise<DictionaryOption[]> =>
      (await fapiGet<{ payment_modes: Array<{ value: number | string; label: string }> }>('/fourn/commande/fapi/form_options.php')).payment_modes.map((m) => ({ id: String(m.value), text: m.label })),
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

// New purchase invoice. Save posts to fourn/facture/fapi/create.php, which writes the header, every
// line and (for Save as Invoice) the validation in one transaction, so a failure leaves no orphan
// draft. Payment terms, the due date and the payment mode go to that same call. The Type and Currency
// fields are read-only: the call creates a standard invoice in the base currency.
// `fixedCustomerId` powers VendorInvoiceCreateFromCustomerForm.tsx (reached from a specific vendor's own
// Vendor tab, "Create Invoice Or Credit Note" button): the vendor is locked to that third-party.
export function DetailedPurchaseCreateForm({ fixedCustomerId, backTo }: { fixedCustomerId?: string; backTo?: string } = {}) {
  const { data: vendors, isLoading: vendorsLoading } = useVendorOptions()
  const { data: fixedVendor } = useCustomerDetail(fixedCustomerId)
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
  const listLink = backTo ?? ROUTES.vendorInvoiceList
  const [vendorId, setVendorId] = useState(fixedCustomerId ?? '')
  const { data: pickedVendor } = useCustomerDetail(fixedCustomerId ? undefined : vendorId || undefined)
  const vendorProfile = fixedCustomerId ? fixedVendor : pickedVendor
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
  const [dueDate, setDueDate] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [incotermId, setIncotermId] = useState('')
  const [showTypeInfo, setShowTypeInfo] = useState(false)
  const [incotermLocation, setIncotermLocation] = useState('')
  const create = useCreateVendorInvoice()
  const navigate = useNavigate()
  // form_options.php?socid resolves the vendor's own terms, payment mode and bank (then the install default).
  const { data: formOptions } = usePurchaseOrderFormOptions(vendorId || undefined)
  useEffect(() => {
    if (!vendorId || !formOptions?.defaults) return
    const d = formOptions.defaults
    setPaymentTermId((prev) => prev || (d.payment_term_id ? String(d.payment_term_id) : ''))
    setModeReglementId((prev) => prev || (d.payment_mode_id ? String(d.payment_mode_id) : ''))
    setFkAccount((prev) => prev || (d.bank_account_id ? String(d.bank_account_id) : ''))
  }, [vendorId, formOptions])

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

  function submit(validate: boolean) {
    setFormError('')
    if (!vendorId) return setFormError('Select a vendor.')
    if (!refSupplier.trim()) return setFormError('Supplier Invoice No is required.')
    if (lines.length === 0) return setFormError('Add at least one line.')
    if (validate && !warehouseId) return setFormError('Select a warehouse to save as an invoice.')
    create.mutate(
      {
        vendorId,
        refSupplier: refSupplier.trim(),
        date: invoiceDate,
        dueDate,
        paymentTermId,
        incotermId,
        incotermLocation,
        fkAccount,
        modeReglementId,
        warehouseId,
        validate,
        lines: lines.map((l) => ({ productId: l.productId, supplierRef: l.supplierRef, label: l.description, qty: l.qty, unitPriceHt: l.unitPrice, vatRate: l.vatRate, discPercent: l.discountPct })),
      },
      {
        onSuccess: (res) => navigate(res.id ? ROUTES.vendorInvoiceDetail.replace(':id', String(res.id)) : listLink),
        onError: (e) => setFormError(e instanceof Error ? e.message : 'The invoice could not be created.'),
      },
    )
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> New vendor invoice
        </h2>
      }
      footerLeft={
        <div className="flex items-center gap-4">
          <Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
          <div className="flex flex-col gap-1">
            {formError && <p role="alert" className="text-sm font-medium text-danger">{formError}</p>}
          </div>
        </div>
      }
      footerRight={
        <>
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
        </>
      }
    >
      <div className="flex flex-col gap-4 flex-1 shrink-0">
        <WizardStep n={0}>
        <Card className="!h-auto shrink-0">
          <div className="rounded-lg bg-surface-alt border border-border p-3 mb-4">
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
                <SearchableSelect value={vendorId} onChange={setVendorId} options={vendorOptions} placeholder={vendorsLoading ? 'Loading…' : 'Select a third party'} />
              )}
            </Field>
          </div>

          {/* After a vendor is picked: who they are, like the classic page's customer card. */}
          {vendorProfile && (
            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface-alt px-4 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {vendorProfile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'}
              </span>
              <div className="min-w-0">
                <Link to={ROUTES.customerDetail.replace(':id', String(vendorProfile.id))} className="block truncate text-base font-semibold text-brand hover:underline">
                  {vendorProfile.name}
                </Link>
                <p className="text-xs text-text-faint">{[vendorProfile.codeFournisseur, vendorProfile.countryLabel].filter(Boolean).join(' · ')}</p>
                {vendorProfile.tpin && <p className="text-sm font-semibold text-success">Tpin: {vendorProfile.tpin}</p>}
              </div>
              {(vendorProfile.email || vendorProfile.phone) && (
                <div className="ml-auto text-right text-xs text-text-muted">
                  {vendorProfile.email && <p>{vendorProfile.email}</p>}
                  {vendorProfile.phone && <p>{vendorProfile.phone}</p>}
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <p className="mb-1.5 text-sm font-medium text-text-muted">
              Type<span className="text-danger">*</span>
            </p>
            <div role="radiogroup" aria-label="Invoice type" className="flex flex-wrap items-center gap-2">
              <button type="button" role="radio" aria-checked className="rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand">
                Standard invoice
              </button>
              {['Template invoice', 'Credit note'].map((t) => (
                <button key={t} type="button" role="radio" aria-checked={false} disabled title="The vendor invoice create API only makes standard invoices" className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-sm text-text-faint">
                  {t}
                </button>
              ))}
              {/* The explanation shows only when the info badge is clicked. */}
              <button type="button" onClick={() => setShowTypeInfo((v) => !v)} aria-expanded={showTypeInfo} aria-label="About the other invoice types" className="rounded-full text-info hover:opacity-80">
                <Info size={16} />
              </button>
              {showTypeInfo && (
                <span role="status" className="text-xs text-text-muted">
                  (This option is only available when creating an invoice from the "Vendor" tab of a third party)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Supplier Invoice No" required>
              <input type="text" value={refSupplier} onChange={(e) => setRefSupplier(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Invoice date" required>
              <div className="flex gap-2">
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClasses} />
                <button type="button" onClick={() => setInvoiceDate(today)} className="shrink-0 rounded-lg border border-border px-3 text-sm font-medium text-text hover:bg-surface-hover">
                  Now
                </button>
              </div>
            </Field>
            <Field label="Payment Terms" required>
              <select value={paymentTermId} onChange={(e) => setPaymentTermId(e.target.value)} className={inputClasses}>
                <option value="">Select a payment terms</option>
                {formOptions?.payment_terms.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
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
            <Field label="Payment due on">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Currency">
              <select disabled className={disabledClasses}>
                <option>Zambian Kwacha (ZMW)</option>
              </select>
            </Field>
          </div>
        </Card>
        </WizardStep>

        <WizardStep n={1}>
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
        </WizardStep>

        <WizardStep n={2}>
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
            <Field label="Incoterms">
              {/* The list comes from fourn/commande/fapi/form_options.php; hidden by the server when incoterms are switched off. */}
              <div className="flex gap-2">
                <select value={incotermId} onChange={(e) => setIncotermId(e.target.value)} disabled={formOptions ? !formOptions.settings.incoterms_enabled : false} className={inputClasses}>
                  <option value="">{formOptions && !formOptions.settings.incoterms_enabled ? 'Incoterms are not enabled' : 'Select a incoterms'}</option>
                  {formOptions?.incoterms.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <input type="text" value={incotermLocation} onChange={(e) => setIncotermLocation(e.target.value)} placeholder="Location" disabled={!incotermId} className={inputClasses} />
              </div>
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
        </WizardStep>
      </div>
    </StickyFormShell>
  )
}
