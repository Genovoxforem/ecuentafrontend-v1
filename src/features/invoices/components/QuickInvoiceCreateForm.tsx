import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap, Check, X, LoaderCircle, Plus, Trash2, ChevronDown, ChevronRight,
  FileText, ShoppingCart, Package, Truck, Wallet, Calculator,
  User, Building2, Banknote, Calendar, Receipt, Mail, Printer,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useCreateInvoice, useCreateAndValidateInvoice, type NewInvoiceLine } from '../invoiceCreate.queries'
import { usePaymentModes, usePaymentTerms, useBankAccountOptions, useCustomerInvoiceDefaults } from '../invoiceFormOptions.queries'
import { useGeneralSettings } from '../../settings/settings.queries'
import { formatMoney } from '../../../utils/format'
import { isBackendUnavailable } from '../../../shared/components/BackendUnavailable'

// Invoice types matching the PHP invoice.php's <select id="inv_type">:
// 0 = Normal/Standard, 6 = LPO, 7 = Export
const INVOICE_TYPES = [
  { value: '0', label: 'Standard Invoice' },
  { value: '6', label: 'LPO' },
  { value: '7', label: 'Export' },
]

const VAT_RATES = [
  { value: '0', label: '0%' },
  { value: '16', label: '16%' },
]

interface InvoiceLineState extends NewInvoiceLine {
  id: string
}

let lineIdCounter = 0
function newLineId() {
  return `line-${++lineIdCounter}`
}

function createEmptyLine(): InvoiceLineState {
  return {
    id: newLineId(),
    label: '',
    qty: 1,
    unitPriceHt: 0,
    vatRate: 0,
    discountPercent: 0,
    discountType: 1,
    productId: '',
  }
}

// ── Main form component ──────────────────────────────────────────────────
// Converts the PHP invoice.php?action=create workflow to React:
//   1. Customer selection (with auto-fill of payment terms/mode/bank)
//   2. Invoice header (date, ref client, type, currency)
//   3. Invoice lines (product picker, qty, price, VAT, discount)
//   4. Payment details (bank account, payment mode, payment terms, date)
//   5. Totals (sub total, VAT, total HT, total TTC, received, balance)
//   6. Shipment details (collapsible)
//   7. Actions: Save Draft, Save & Print, Cancel
// All <select> boxes use SearchableSelect (Select2-style combobox).

export function QuickInvoiceCreateForm() {
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: products } = useProductOptions()
  const { data: paymentModes } = usePaymentModes()
  const { data: paymentTerms } = usePaymentTerms()
  const { data: bankAccounts } = useBankAccountOptions()
  const { data: generalSettings } = useGeneralSettings()
  const createInvoice = useCreateInvoice()
  const createAndValidate = useCreateAndValidateInvoice()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  // ── Form state ────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(today)
  const [refClient, setRefClient] = useState('')
  const [invoiceType, setInvoiceType] = useState('0')
  const [currency, setCurrency] = useState(generalSettings?.currency ?? '')
  const [currencyRate, setCurrencyRate] = useState(1)
  const [lines, setLines] = useState<InvoiceLineState[]>([createEmptyLine()])
  const [bankAccountId, setBankAccountId] = useState('')
  const [paymentModeCode, setPaymentModeCode] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [paymentDate, setPaymentDate] = useState(today)
  const [paymentNote, setPaymentNote] = useState('')
  const [shippingCharges, setShippingCharges] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [useAdvance, setUseAdvance] = useState(false)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [formError, setFormError] = useState('')
  const [showShipment, setShowShipment] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  // LPO-specific fields
  const [refNo, setRefNo] = useState('')
  const [lpoNo, setLpoNo] = useState('')

  // Shipment details
  const [shipment, setShipment] = useState({
    gdnNo: '', grnNo: '', month: '', shippingVia: '',
    shippingDate: '', trackingId: '', transporter: '',
    truckDetails: '', shippingAddress: '',
  })

  // ── Customer defaults auto-fill ───────────────────────────────────────
  // Mirrors the PHP's AJAX call to /core/ajax/thirdparty.php?action=fetch
  // which fills cond_reglement_id, mode_reglement_id, fk_account, currency.
  const { data: customerDefaults } = useCustomerInvoiceDefaults(customerId)

  useEffect(() => {
    if (customerDefaults) {
      if (customerDefaults.fkAccount) setBankAccountId(customerDefaults.fkAccount)
      if (customerDefaults.multicurrencyCode) setCurrency(customerDefaults.multicurrencyCode)
      if (customerDefaults.multicurrencyTx) setCurrencyRate(customerDefaults.multicurrencyTx)
      if (customerDefaults.notePublic) setNotePublic(customerDefaults.notePublic)
      if (customerDefaults.notePrivate) setNotePrivate(customerDefaults.notePrivate)
    }
  }, [customerDefaults])

  // ── Line management ───────────────────────────────────────────────────
  function addLine() {
    setLines((prev) => [...prev, createEmptyLine()])
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev))
  }

  function updateLine(id: string, patch: Partial<InvoiceLineState>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function pickProductForLine(id: string, productId: string) {
    const product = products?.find((p) => p.id === productId)
    if (product) {
      updateLine(id, {
        productId,
        label: product.label,
        unitPriceHt: product.priceExclTax,
        vatRate: product.vatRatePct,
        vatCode: product.vatCode,
        productType: product.type === 'service' ? 1 : 0,
      })
    } else {
      updateLine(id, { productId: '' })
    }
  }

  // ── Totals calculation ────────────────────────────────────────────────
  const totals = useMemo(() => {
    let subTotalHt = 0
    let totalVat = 0
    let totalQty = 0

    for (const line of lines) {
      const lineHt = line.qty * line.unitPriceHt
      const discount = line.discountType === 2
        ? (line.discountFixed ?? 0)
        : lineHt * ((line.discountPercent ?? 0) / 100)
      const netHt = lineHt - discount
      const lineVat = netHt * (line.vatRate / 100)
      subTotalHt += netHt
      totalVat += lineVat
      totalQty += line.qty
    }

    const totalHt = subTotalHt + shippingCharges
    const totalTtc = totalHt + totalVat
    const balance = totalTtc - paymentAmount

    return { subTotalHt, totalVat, totalHt, totalTtc, totalQty, balance }
  }, [lines, shippingCharges, paymentAmount])

  // ── Validation ────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!customerId) return 'Customer is required.'
    if (!date) return 'Invoice date is required.'
    if (!bankAccountId || bankAccountId === '0') return 'Bank account is required.'
    if (!paymentModeCode || paymentModeCode === '0') return 'Payment mode is required.'
    const hasValidLine = lines.some((l) => l.label.trim() && l.qty > 0)
    if (!hasValidLine) return 'At least one line with a description and quantity is required.'
    if (invoiceType === '6' && !refNo.trim()) return 'Ref No is required for LPO invoices.'
    return null
  }

  // ── Submit handlers ───────────────────────────────────────────────────
  // Mirrors the PHP's createdraft() and createinvoice() functions.
  function buildInput() {
    return {
      customerId,
      date,
      refClient,
      type: Number(invoiceType),
      paymentModeCode,
      paymentTermId,
      bankAccountId,
      note: paymentNote,
      notePublic,
      notePrivate,
      currency,
      currencyRate,
      shippingCharges,
      paymentAmount,
      useAdvance,
      refNo: invoiceType === '6' ? refNo : undefined,
      lpoNo: invoiceType === '6' ? lpoNo : undefined,
      shipment: showShipment ? shipment : undefined,
      lines: lines
        .filter((l) => l.label.trim() && l.qty > 0)
        .map(({ id, ...rest }) => rest),
    }
  }

  function handleSaveDraft() {
    setFormError('')
    const err = validate()
    if (err) { setFormError(err); return }
    createInvoice.mutate(buildInput(), {
      onSuccess: () => navigate(ROUTES.invoiceList),
      onError: (err) =>
        setFormError(isBackendUnavailable(err) ? "Creating an invoice isn't available on this backend yet." : 'Could not create this invoice — please try again.'),
    })
  }

  function handleSaveAndPrint() {
    setFormError('')
    const err = validate()
    if (err) { setFormError(err); return }
    createAndValidate.mutate(buildInput(), {
      onSuccess: () => navigate(ROUTES.invoiceList),
      onError: (err) =>
        setFormError(isBackendUnavailable(err) ? "Creating an invoice isn't available on this backend yet." : 'Could not create this invoice — please try again.'),
    })
  }

  const isSubmitting = createInvoice.isPending || createAndValidate.isPending
  const selectedCustomer = customers?.find((c) => c.id === customerId)

  // ── Select2-style option builders ─────────────────────────────────────
  const customerOptions = (customers ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    description: c.tpin ? `TPIN: ${c.tpin}` : c.country ? c.country : undefined,
    keywords: `${c.ref} ${c.tpin} ${c.country}`,
  }))

  const productOptions = (products ?? []).map((p) => ({
    value: p.id,
    label: p.label,
    description: `${p.ref} • ${formatMoney(p.priceExclTax)} ${p.type === 'service' ? 'Service' : 'Product'}`,
    keywords: `${p.ref} ${p.barcode} ${p.classification}`,
  }))

  const bankOptions = (bankAccounts ?? []).map((b) => ({ value: b.id, label: b.text }))
  const paymentModeOptions = (paymentModes ?? []).map((p) => ({ value: p.id, label: p.text }))
  const paymentTermOptions = (paymentTerms ?? []).map((p) => ({ value: p.id, label: p.text }))

  return (
    <StickyFormShell
      header={
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Zap size={20} className="text-brand" /> New Quick Invoice
          </h2>
          {selectedCustomer && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <User size={14} />
              <span className="font-medium text-text">{selectedCustomer.name}</span>
              {selectedCustomer.tpin && <span className="text-text-faint">TPIN: {selectedCustomer.tpin}</span>}
            </div>
          )}
        </div>
      }
      footerLeft={
        <Link to={ROUTES.invoiceList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            {createInvoice.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save Draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveAndPrint}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createAndValidate.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Printer size={14} />} Save & Print
          </button>
        </div>
      }
    >
      {/* ── Customer + Invoice Header ──────────────────────────────────── */}
      <Card>
        <h3 className="flex items-center gap-2 font-semibold text-text! mb-4">
          <Building2 size={16} className="text-brand" /> Customer & Invoice Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div className="sm:col-span-2">
            <Field label="Customer" required>
              <SearchableSelect
                value={customerId}
                onChange={setCustomerId}
                options={customerOptions}
                placeholder={customersLoading ? 'Loading customers…' : 'Select a customer'}
              />
            </Field>
          </div>
          <Field label="Invoice Date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Customer Reference (Ref Client)">
            <input type="text" value={refClient} onChange={(e) => setRefClient(e.target.value)} placeholder="Optional customer ref" className={inputClasses} />
          </Field>
          <Field label="Invoice Type" required>
            <SearchableSelect
              value={invoiceType}
              onChange={setInvoiceType}
              options={INVOICE_TYPES}
              placeholder="Select type"
            />
          </Field>
          <Field label="Currency">
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClasses} />
          </Field>
        </div>

        {/* LPO-specific fields — shown when type=6, matching the PHP's radio_tax boxdet */}
        {invoiceType === '6' && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-4 rounded-lg bg-surface-alt border border-border">
            <Field label="Ref No" required>
              <input type="text" maxLength={10} value={refNo} onChange={(e) => setRefNo(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="LPO No" required>
              <input type="text" maxLength={10} value={lpoNo} onChange={(e) => setLpoNo(e.target.value)} className={inputClasses} />
            </Field>
          </div>
        )}

        {/* Customer info card — mirrors the PHP's AJAX customer_info_card */}
        {selectedCustomer && (
          <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg bg-surface-alt px-4 py-2.5 text-sm">
            {selectedCustomer.tpin && (
              <span className="text-text-muted">TPIN: <strong className="text-text">{selectedCustomer.tpin}</strong></span>
            )}
            {customerDefaults?.outstandingBalance !== undefined && customerDefaults.outstandingBalance > 0 && (
              <span className="text-text-muted">Outstanding: <strong className="text-text">{formatMoney(customerDefaults.outstandingBalance)}</strong></span>
            )}
            {customerDefaults?.advanceAmount !== undefined && customerDefaults.advanceAmount > 0 && (
              <span className="text-text-muted">Advance: <strong className="text-text">{formatMoney(customerDefaults.advanceAmount)}</strong></span>
            )}
            {currency !== 'ZMW' && (
              <span className="text-text-muted">Rate: <strong className="text-text">1 ZMW = {currencyRate.toFixed(4)} {currency}</strong></span>
            )}
          </div>
        )}
      </Card>

      {/* ── Invoice Lines (Item Table) ─────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <ShoppingCart size={16} className="text-brand" /> Invoice Lines
          </h3>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/20"
          >
            <Plus size={14} /> Add Line
          </button>
        </div>

        {/* Line items table */}
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium pb-2 px-2 min-w-[200px]">Product / Service</th>
                <th className="font-medium pb-2 px-2 min-w-[180px]">Description</th>
                <th className="font-medium pb-2 px-2 w-20">Qty</th>
                <th className="font-medium pb-2 px-2 w-28">Unit Price</th>
                <th className="font-medium pb-2 px-2 w-24">VAT</th>
                <th className="font-medium pb-2 px-2 w-24">Disc %</th>
                <th className="font-medium pb-2 px-2 w-28 text-right">Total HT</th>
                <th className="font-medium pb-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineHt = line.qty * line.unitPriceHt
                const discount = lineHt * ((line.discountPercent ?? 0) / 100)
                const netHt = lineHt - discount
                return (
                  <tr key={line.id} className="border-b border-border/50">
                    <td className="py-2 px-2">
                      <SearchableSelect
                        value={line.productId ?? ''}
                        onChange={(val) => pickProductForLine(line.id, val)}
                        options={productOptions}
                        placeholder="Custom line"
                        className="min-w-[180px]"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={line.label}
                        onChange={(e) => updateLine(line.id, { label: e.target.value })}
                        placeholder="Description"
                        className={inputClasses}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.qty}
                        onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPriceHt}
                        onChange={(e) => updateLine(line.id, { unitPriceHt: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={String(line.vatRate)}
                        onChange={(e) => updateLine(line.id, { vatRate: Number(e.target.value) })}
                        className={inputClasses}
                      >
                        {VAT_RATES.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={line.discountPercent ?? 0}
                        onChange={(e) => updateLine(line.id, { discountPercent: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-text tabular-nums">
                      {formatMoney(netHt)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-text-faint hover:text-danger transition-colors"
                          title="Remove line"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Payment Details + Totals (2-column) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment details */}
        <Card>
          <h3 className="flex items-center gap-2 font-semibold text-text! mb-4">
            <Banknote size={16} className="text-brand" /> Payment Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Bank Account" required>
              <SearchableSelect
                value={bankAccountId}
                onChange={setBankAccountId}
                options={bankOptions}
                placeholder="Select bank account"
              />
            </Field>
            <Field label="Payment Date" required>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Payment Mode" required>
              <SearchableSelect
                value={paymentModeCode}
                onChange={setPaymentModeCode}
                options={paymentModeOptions}
                placeholder="Select payment mode"
              />
            </Field>
            <Field label="Payment Terms">
              <SearchableSelect
                value={paymentTermId}
                onChange={setPaymentTermId}
                options={paymentTermOptions}
                placeholder="Select payment terms"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Payment Note">
                <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Optional note" className={inputClasses} />
              </Field>
            </div>
            <Field label="Shipping Charges">
              <input
                type="number"
                min={0}
                step="0.01"
                value={shippingCharges}
                onChange={(e) => setShippingCharges(Number(e.target.value))}
                className={inputClasses}
              />
            </Field>
            <Field label="Received Amount">
              <input
                type="number"
                min={0}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className={inputClasses}
              />
            </Field>
          </div>

          {/* Advance payment checkbox — mirrors the PHP's use_advance checkbox */}
          <label className="mt-3 flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={useAdvance}
              onChange={(e) => setUseAdvance(e.target.checked)}
              className="rounded border-border"
            />
            Use advance payment
          </label>
        </Card>

        {/* Totals card */}
        <Card>
          <h3 className="flex items-center gap-2 font-semibold text-text! mb-4">
            <Calculator size={16} className="text-brand" /> Summary
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Sub Total</span>
              <span className="font-medium text-text tabular-nums">{formatMoney(totals.subTotalHt)}</span>
            </div>
            {shippingCharges > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Shipping</span>
                <span className="font-medium text-text tabular-nums">{formatMoney(shippingCharges)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total HT</span>
              <span className="font-medium text-text tabular-nums">{formatMoney(totals.totalHt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">VAT</span>
              <span className="font-medium text-text tabular-nums">{formatMoney(totals.totalVat)}</span>
            </div>
            <div className="border-t border-border pt-2.5 flex items-center justify-between">
              <span className="font-semibold text-text">Total TTC</span>
              <span className="font-bold text-text tabular-nums">{formatMoney(totals.totalTtc)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Received</span>
              <span className="font-medium text-text tabular-nums">{formatMoney(paymentAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-danger">Balance</span>
              <span className="font-medium text-danger tabular-nums">{formatMoney(totals.balance)}</span>
            </div>
            <div className="border-t border-border pt-2.5 flex items-center justify-between">
              <span className="text-xs text-text-faint">Total Quantity</span>
              <span className="text-xs font-medium text-text tabular-nums">{totals.totalQty.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Shipment Details (collapsible) ─────────────────────────────── */}
      <Card>
        <button
          type="button"
          onClick={() => setShowShipment((s) => !s)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <Truck size={16} className="text-brand" /> Shipment Details
          </h3>
          {showShipment ? <ChevronDown size={16} className="text-text-faint" /> : <ChevronRight size={16} className="text-text-faint" />}
        </button>
        {showShipment && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="GDN No.">
              <input type="text" value={shipment.gdnNo} onChange={(e) => setShipment((s) => ({ ...s, gdnNo: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label="GRN No.">
              <input type="text" value={shipment.grnNo} onChange={(e) => setShipment((s) => ({ ...s, grnNo: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label="Month">
              <input type="text" value={shipment.month} onChange={(e) => setShipment((s) => ({ ...s, month: e.target.value }))} placeholder="e.g. January 2025" className={inputClasses} />
            </Field>
            <Field label="Shipping Via">
              <input type="text" value={shipment.shippingVia} onChange={(e) => setShipment((s) => ({ ...s, shippingVia: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label="Shipping Date">
              <input type="date" value={shipment.shippingDate} onChange={(e) => setShipment((s) => ({ ...s, shippingDate: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label="Tracking ID">
              <input type="text" value={shipment.trackingId} onChange={(e) => setShipment((s) => ({ ...s, trackingId: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label="Transporter">
              <input type="text" value={shipment.transporter} onChange={(e) => setShipment((s) => ({ ...s, transporter: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label="Truck Details">
              <input type="text" value={shipment.truckDetails} onChange={(e) => setShipment((s) => ({ ...s, truckDetails: e.target.value }))} className={inputClasses} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Shipping Address">
                <textarea
                  rows={2}
                  value={shipment.shippingAddress}
                  onChange={(e) => setShipment((s) => ({ ...s, shippingAddress: e.target.value }))}
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>
        )}
      </Card>

      {/* ── Notes (collapsible) ────────────────────────────────────────── */}
      <Card>
        <button
          type="button"
          onClick={() => setShowNotes((s) => !s)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <FileText size={16} className="text-brand" /> Notes
          </h3>
          {showNotes ? <ChevronDown size={16} className="text-text-faint" /> : <ChevronRight size={16} className="text-text-faint" />}
        </button>
        {showNotes && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Public Note">
              <textarea rows={3} value={notePublic} onChange={(e) => setNotePublic(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Private Note">
              <textarea rows={3} value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} className={inputClasses} />
            </Field>
          </div>
        )}
      </Card>

      {formError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </div>
      )}
    </StickyFormShell>
  )
}
