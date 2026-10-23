import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap, Check, X, LoaderCircle, Plus, Trash2, ChevronDown, ChevronRight,
  FileText, ShoppingCart, Truck, Calculator,
  Building2, Banknote, Printer, PlusCircle, Mail, CreditCard,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell, WizardStep } from '../../../shared/components/layout/StickyFormShell'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { getProduct, getProductUom } from '../../../api/products'
import { useCreateInvoice, useCreateAndValidateInvoice, type NewInvoiceLine } from '../invoiceCreate.queries'
import { usePaymentModes, usePaymentTerms, useBankAccountOptions, useCustomerInvoiceDefaults, useInvoiceCurrencies } from '../invoiceFormOptions.queries'
import { useGeneralSettings } from '../../settings/settings.queries'
import { formatMoney } from '../../../utils/format'
import { useWarehousePickerOptions } from '../../warehouses/warehouseExtras.queries'
import { useProjectsList } from '../../projects/projects.queries'

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
  // The picked product's own price per base unit, its cost price, and the unit of measure chosen for the line
  // (factor = base units in one chosen unit; 1 for the base unit).
  basePriceHt?: number
  costPrice?: number
  uomId?: string
  uomLabel?: string
  uomFactor?: number
}

// The product's cost price (product/fapi/get.php: cost_price, else the weighted average cost). The picker's own
// list (/api/products/) carries no cost column, which is why this used to read 0.00 for every product.
function LineCost({ productId }: { productId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'cost', productId],
    queryFn: async () => {
      const p = (await getProduct(productId ?? '', { withStock: false, withPrices: false })).product
      return Number(p.cost_price) || Number(p.pmp) || 0
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
  if (!productId) return <>—</>
  if (isLoading) return <span className="text-text-faint">…</span>
  return <>{formatMoney(data ?? 0)}</>
}

// The product's units of measure (product/fapi/uom.php). A product with conversions can be sold by the box,
// the dozen... : picking one re-prices the line and, on save, the quantity and price go to the invoice in base units.
function LineUom({ line, onPick }: { line: InvoiceLineState; onPick: (patch: Partial<InvoiceLineState>) => void }) {
  const { data } = useQuery({
    queryKey: ['products', 'uom', line.productId],
    queryFn: () => getProductUom(line.productId ?? ''),
    enabled: !!line.productId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
  const conversions = (data?.conversions ?? []).filter((c) => c.allow_sale && c.factor > 0)
  if (!data?.options.uom_enabled || conversions.length === 0) return null
  const base = data.options.base_unit
  const baseLabel = base?.label ?? 'Base'
  const current = conversions.find((c) => String(c.id) === line.uomId)
  return (
    <div className="mt-1">
      <select
        value={line.uomId ?? ''}
        onChange={(e) => {
          const conv = conversions.find((c) => String(c.id) === e.target.value)
          const basePrice = line.basePriceHt ?? line.unitPriceHt
          onPick(
            conv
              ? { uomId: String(conv.id), uomLabel: conv.packing_label || conv.uom_label, uomFactor: conv.factor, unitPriceHt: conv.selling_price_ht ?? basePrice * conv.factor }
              : { uomId: '', uomLabel: '', uomFactor: 1, unitPriceHt: basePrice },
          )
        }}
        className={`${inputClasses} !py-1 text-xs`}
        title="Unit of measure"
      >
        <option value="">{baseLabel}</option>
        {conversions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.packing_label || c.uom_label}
          </option>
        ))}
      </select>
      <p className="mt-0.5 text-[11px] text-text-faint">{current ? `1 ${current.packing_label || current.uom_label} = ${current.factor} ${baseLabel}` : `1 ${baseLabel} = 1 Base`}</p>
    </div>
  )
}

let lineIdCounter = 0
function newLineId() {
  return `line-${++lineIdCounter}`
}

// A number field that keeps what is typed, so the 0 can be deleted and a value typed over it
// (a controlled Number input snaps an emptied field straight back to 0).
function NumberInput({ value, onChange, className, max }: { value: number; onChange: (n: number) => void; className?: string; max?: number }) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText((prev) => (Number(prev) === value ? prev : String(value)))
  }, [value])
  return (
    <input
      type="number"
      min={0}
      max={max}
      step="0.01"
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setText(e.target.value)
        onChange(Number(e.target.value) || 0)
      }}
      onBlur={() => setText(String(value))}
      className={className}
    />
  )
}

// Net amount of a line after its discount (a percentage or a flat amount).
function lineNet(line: NewInvoiceLine): number {
  const gross = line.qty * line.unitPriceHt
  const discount = line.discountType === 2 ? (line.discountFixed ?? 0) : gross * ((line.discountPercent ?? 0) / 100)
  return gross - discount
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
}

// 0% and 16% plus whatever rate a picked product carries.
function vatChoices(current: number) {
  return VAT_RATES.some((v) => Number(v.value) === current) ? VAT_RATES : [...VAT_RATES, { value: String(current), label: `${current}%` }]
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
  const [projectId, setProjectId] = useState('')
  const [barcode, setBarcode] = useState('')
  const { data: projects } = useProjectsList('all')
  const { data: currencies } = useInvoiceCurrencies()
  const [bankAccountId, setBankAccountId] = useState('')
  const { data: warehouses = [] } = useWarehousePickerOptions()
  const [warehouseChoice, setWarehouseChoice] = useState('')
  // Like the classic page, default to the first open warehouse.
  const warehouseId = warehouseChoice || String(warehouses.find((w) => w.open)?.id ?? warehouses[0]?.id ?? '')
  const [paymentModeCode, setPaymentModeCode] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [paymentDate, setPaymentDate] = useState(today)
  const [paymentNote, setPaymentNote] = useState('')
  const [shippingCharges, setShippingCharges] = useState(0)
  // Shipping charges are an amount INCLUDING tax (the create call takes shipping_amount_ttc); the rate only splits it into excl. tax and VAT.
  const [shippingVat, setShippingVat] = useState('16')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [useAdvance, setUseAdvance] = useState(false)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [formError, setFormError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
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

  // Like the classic page: payment terms default to "Due Upon Receipt".
  useEffect(() => {
    if (!paymentTermId && paymentTerms?.length) setPaymentTermId((paymentTerms.find((t) => /due upon receipt/i.test(t.text)) ?? paymentTerms[0]).id)
  }, [paymentTerms, paymentTermId])

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
        basePriceHt: product.priceExclTax,
        costPrice: product.costPrice,
        uomId: '',
        uomLabel: '',
        uomFactor: 1,
      })
    } else {
      updateLine(id, { productId: '' })
    }
  }

  // Barcode scan / typed code + Enter: the matching product goes into the first empty line (a repeat scan adds one more).
  function scanBarcode(code: string) {
    const wanted = code.trim()
    if (!wanted) return
    const product = products?.find((p) => p.barcode === wanted || p.ref === wanted)
    if (!product) {
      setFormError(`No product with barcode ${wanted}.`)
      return
    }
    setFormError('')
    setBarcode('')
    const existing = lines.find((l) => l.productId === product.id)
    if (existing) {
      updateLine(existing.id, { qty: existing.qty + 1 })
      return
    }
    const patch = { productId: product.id, label: product.label, unitPriceHt: product.priceExclTax, vatRate: product.vatRatePct, vatCode: product.vatCode, productType: product.type === 'service' ? 1 : 0, basePriceHt: product.priceExclTax, costPrice: product.costPrice, uomId: '', uomLabel: '', uomFactor: 1 }
    const empty = lines.find((l) => !l.productId && !l.label.trim())
    if (empty) updateLine(empty.id, patch)
    else setLines((prev) => [...prev, { ...createEmptyLine(), ...patch }])
  }

  // ── Totals calculation ────────────────────────────────────────────────
  const totals = useMemo(() => {
    let subTotalHt = 0
    let totalVat = 0
    let totalQty = 0
    let itemCount = 0
    let discountTotal = 0

    for (const line of lines) {
      const netHt = lineNet(line)
      discountTotal += line.qty * line.unitPriceHt - netHt
      subTotalHt += netHt
      totalVat += netHt * (line.vatRate / 100)
      totalQty += line.qty
      if (line.label.trim() && line.qty > 0) itemCount += 1
    }

    const shipVat = shippingCharges - shippingCharges / (1 + Number(shippingVat) / 100)
    totalVat += shipVat
    const totalHt = subTotalHt + (shippingCharges - shipVat)
    const totalTtc = totalHt + totalVat
    const balance = totalTtc - paymentAmount

    return { subTotalHt, totalVat, totalHt, totalTtc, totalQty, balance, itemCount, discountTotal }
  }, [lines, shippingCharges, shippingVat, paymentAmount])

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
      projectId,
      warehouseId,
      note: paymentNote,
      notePublic,
      notePrivate,
      currency,
      currencyRate,
      shippingCharges,
      shippingVatRate: Number(shippingVat),
      paymentAmount,
      useAdvance,
      refNo: invoiceType === '6' ? refNo : undefined,
      lpoNo: invoiceType === '6' ? lpoNo : undefined,
      shipment: showShipment ? shipment : undefined,
      lines: lines
        .filter((l) => l.label.trim() && l.qty > 0)
        .map(({ id, basePriceHt, costPrice, uomId, uomLabel, uomFactor, ...rest }) => {
          void id; void basePriceHt; void costPrice; void uomId
          const factor = uomFactor && uomFactor > 0 ? uomFactor : 1
          // Sold by the box (factor > 1): the invoice gets base units at the matching price, so the amount and the stock movement are right.
          return factor === 1 ? rest : { ...rest, label: uomLabel ? `${rest.label} (${rest.qty} ${uomLabel})` : rest.label, qty: rest.qty * factor, unitPriceHt: rest.unitPriceHt / factor, discountFixed: rest.discountFixed }
        }),
    }
  }

  function handleSaveDraft() {
    setFormError('')
    const err = validate()
    if (err) { setFormError(err); return }
    createInvoice.mutate(buildInput(), {
      onSuccess: () => navigate(ROUTES.invoiceList),
      onError: (err) => setFormError(err instanceof Error ? err.message : 'Could not create this invoice — please try again.'),
    })
  }

  function handleSaveAndPrint() {
    setFormError('')
    const err = validate()
    if (err) { setFormError(err); return }
    // The classic page prints the receipt once the invoice is validated: the saved invoice opens with its ticket.
    createAndValidate.mutate(buildInput(), {
      onSuccess: (res) => navigate(res?.id ? `${ROUTES.invoiceDetail.replace(':id', String(res.id))}?action=print` : ROUTES.invoiceList),
      onError: (err) => setFormError(err instanceof Error ? err.message : 'Could not create this invoice — please try again.'),
    })
  }

  // Real: the title bar's own "+ New Sale" link just reloads a blank
  // invoice.php?action=create — this resets the same in-place form instead
  // of a full navigation, since we're already on that route.
  function handleNewSale() {
    setCustomerId('')
    setDate(today)
    setRefClient('')
    setInvoiceType('0')
    setCurrency(generalSettings?.currency ?? '')
    setCurrencyRate(1)
    setLines([createEmptyLine()])
    setProjectId('')
    setBarcode('')
    setBankAccountId('')
    setPaymentModeCode('')
    setPaymentTermId('')
    setPaymentDate(today)
    setPaymentNote('')
    setShippingCharges(0)
    setShippingVat('16')
    setPaymentAmount(0)
    setUseAdvance(false)
    setNotePublic('')
    setNotePrivate('')
    setRefNo('')
    setLpoNo('')
    setShipment({ gdnNo: '', grnNo: '', month: '', shippingVia: '', shippingDate: '', trackingId: '', transporter: '', truckDetails: '', shippingAddress: '' })
    setFormError('')
    setActionNotice('')
  }

  // "Mail Invoice" (action=send_email — the endpoint only returns the data
  // for an email modal, it sends nothing itself) and "Online Payment" (a Lenco
  // payment-gateway modal) are not built here. Save Draft / Save & Print use
  // the same endpoint's draft / validate_cash actions — see
  // invoiceCreate.queries.ts. These two surface an honest "not available yet"
  // state instead of a silent no-op or a fabricated success.
  function handleMailInvoice() {
    setFormError('')
    setActionNotice('')
    const err = validate()
    if (err) { setFormError(err); return }
    // The classic Mail Invoice saves and validates the invoice, then opens the email form for it.
    createAndValidate.mutate(buildInput(), {
      onSuccess: (res) => navigate(res?.id ? `${ROUTES.invoiceDetail.replace(':id', String(res.id))}?action=email` : ROUTES.invoiceList),
      onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not create this invoice — please try again.'),
    })
  }

  // The classic Online Payment saves and validates the invoice, then opens the payment window for it.
  function handleOnlinePayment() {
    setFormError('')
    setActionNotice('')
    const err = validate()
    if (err) { setFormError(err); return }
    createAndValidate.mutate(buildInput(), {
      onSuccess: (res) => navigate(res?.id ? `${ROUTES.invoiceDetail.replace(':id', String(res.id))}?action=pay` : ROUTES.invoiceList),
      onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not create this invoice — please try again.'),
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

  const customerName = selectedCustomer?.name
  // Projects of the chosen customer (or not tied to one), like the classic page's project picker.
  const projectOptions = (projects?.items ?? [])
    .filter((p) => !p.thirdPartyName || !customerName || p.thirdPartyName === customerName)
    .map((p) => ({ value: String(p.id), label: `${p.ref} - ${p.title}` }))
  const currencyOptions = (currencies ?? []).map((c) => ({ value: c.id, label: c.text }))
  const bankOptions = (bankAccounts ?? []).map((b) => ({ value: b.id, label: b.text }))
  const paymentModeOptions = (paymentModes ?? []).map((p) => ({ value: p.id, label: p.text }))
  const paymentTermOptions = (paymentTerms ?? []).map((p) => ({ value: p.id, label: p.text }))

  return (
    <StickyFormShell
      scrollsInternally={false}
      wizard={[
        { title: 'Customer & Details', subtitle: 'Customer, date, type & currency' },
        { title: 'Item Table', subtitle: 'Add products or services' },
        { title: 'Payment & Summary', subtitle: 'Warehouse, payment & totals' },
      ]}
      header={
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Zap size={20} className="text-brand" /> Create Quick Invoice
          </h2>
          <InBanner>
            <button
              type="button"
              onClick={handleNewSale}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
            >
              <PlusCircle size={14} /> New Sale
            </button>
          </InBanner>
        </div>
      }
      footerLeft={
        <div className="flex items-center gap-4">
          <Link to={ROUTES.invoiceList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs leading-tight text-text-faint">
            <span>
              Total Amount<br />
              <span className="text-sm font-bold text-text! tabular-nums">{formatMoney(totals.totalTtc)}</span>
            </span>
            <span>
              Total Quantity<br />
              <span className="text-sm font-bold text-text! tabular-nums">{totals.totalQty.toFixed(2)}</span>
            </span>
          </div>
        </div>
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
            onClick={handleOnlinePayment}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
          >
            <CreditCard size={14} /> Online Payment
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleMailInvoice}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
          >
            <Mail size={14} /> Mail Invoice
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
      {/* ── Step 1: Customer + Invoice Header ──────────────────────────── */}
      <WizardStep n={0}>
        <Card className="!h-auto shrink-0">
          <h3 className="flex items-center gap-2 font-semibold text-text! mb-4">
            <Building2 size={16} className="text-brand" /> Customer & Invoice Details
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div className="lg:col-span-2">
              <Field label="Customer" required>
                <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} placeholder={customersLoading ? 'Loading customers…' : 'Select a customer'} />
              </Field>
            </div>
            <div />
            {/* After a customer is picked: who they are and what they owe, like the classic page's customer card. */}
            {selectedCustomer && (
              <div className="lg:col-span-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface-alt px-4 py-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{initials(selectedCustomer.name)}</span>
                <div className="min-w-0">
                  <Link to={ROUTES.customerDetail.replace(':id', selectedCustomer.id)} className="block truncate text-base font-semibold text-brand hover:underline">
                    {selectedCustomer.name}
                  </Link>
                  <p className="text-xs text-text-faint">{[selectedCustomer.ref, selectedCustomer.country].filter(Boolean).join(' · ')}</p>
                  {selectedCustomer.tpin && <p className="text-sm font-semibold text-success">Tpin: {selectedCustomer.tpin}</p>}
                </div>
                <div className="ml-auto grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <p className="text-xs text-text-faint">Current outstanding bill</p>
                    <p className="font-semibold text-text! tabular-nums">{formatMoney(customerDefaults?.outstandingBalance ?? 0)} {currency || 'ZMW'}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <p className="text-xs text-text-faint">Current advance amount</p>
                    <p className="font-semibold text-text! tabular-nums">{formatMoney(customerDefaults?.advanceAmount ?? 0)} {currency || 'ZMW'}</p>
                  </div>
                </div>
              </div>
            )}
            <Field label="Ref. customer">
              <input type="text" value={refClient} onChange={(e) => setRefClient(e.target.value)} placeholder="Optional customer ref" className={inputClasses} />
            </Field>
            <Field label="Invoice Date" required>
              <div className="flex gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
                <button type="button" onClick={() => setDate(today)} className="shrink-0 rounded-lg border border-border px-3 text-sm font-medium text-text hover:bg-surface-hover">
                  Now
                </button>
              </div>
            </Field>
            <Field label="Project">
              <SearchableSelect value={projectId} onChange={setProjectId} options={projectOptions} placeholder="Select a project" />
            </Field>
            <Field label="Type" required>
              <SearchableSelect value={invoiceType} onChange={setInvoiceType} options={INVOICE_TYPES} placeholder="Select type" />
            </Field>
            <Field label="Currency">
              <SearchableSelect value={currency} onChange={setCurrency} options={currencyOptions} placeholder="Select currency" />
            </Field>
            {currency && currency !== (generalSettings?.currency ?? currency) && (
              <p className="self-end pb-2 text-sm text-text-muted">
                Rate: <strong className="text-text">1 {generalSettings?.currency} = {currencyRate.toFixed(4)} {currency}</strong>
              </p>
            )}
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
        </Card>
      </WizardStep>

      {/* ── Step 2: Item Table ─────────────────────────────────────────── */}
      <WizardStep n={1}>
        <Card className="!h-auto shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-text!">
              <ShoppingCart size={16} className="text-brand" /> Item Table
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-text-muted">{totals.itemCount}</span>
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  scanBarcode(barcode)
                }}
                placeholder="Scan or type barcode…"
                className={`${inputClasses} w-56`}
              />
              <button type="button" onClick={addLine} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/20">
                <Plus size={14} /> Add Line
              </button>
            </div>
          </div>

          {/* The lines scroll inside the table box (header stays), so adding many products never pushes the page. */}
          <div className="max-h-[48vh] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[1] bg-surface">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-2 min-w-[200px]">Product / Service</th>
                  <th className="font-medium py-2 px-2 min-w-[160px]">Description</th>
                  <th className="font-medium py-2 px-2 w-28">VAT</th>
                  <th className="font-medium py-2 px-2 w-40">Unit Price (Excl.)</th>
                  <th className="font-medium py-2 px-2 w-36">Unit Price (Inc. Tax)</th>
                  <th className="font-medium py-2 px-2 w-20">Qty</th>
                  <th className="font-medium py-2 px-2 w-36">Disc.</th>
                  <th className="font-medium py-2 px-2 w-24 text-right">Cost Price</th>
                  <th className="font-medium py-2 px-2 w-28 text-right">Total (Incl.)</th>
                  <th className="font-medium py-2 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const net = lineNet(line)
                  const incl = net * (1 + line.vatRate / 100)
                  const flat = line.discountType === 2
                  return (
                    <tr key={line.id} className="border-b border-border/50 align-top">
                      <td className="py-2 px-2">
                        <SearchableSelect value={line.productId ?? ''} onChange={(val) => pickProductForLine(line.id, val)} options={productOptions} placeholder="Custom line" className="min-w-[180px]" />
                        <LineUom line={line} onPick={(patch) => updateLine(line.id, patch)} />
                      </td>
                      <td className="py-2 px-2">
                        <input type="text" value={line.label} onChange={(e) => updateLine(line.id, { label: e.target.value })} placeholder="Description" className={inputClasses} />
                      </td>
                      <td className="py-2 px-2">
                        {line.productId ? (
                          <p className="py-2 text-sm font-medium text-text-muted" title="The product's own VAT">
                            {line.vatRate}%{line.vatCode ? ` (${line.vatCode})` : ''}
                          </p>
                        ) : (
                          <select value={String(line.vatRate)} onChange={(e) => updateLine(line.id, { vatRate: Number(e.target.value) })} className={inputClasses}>
                            {vatChoices(line.vatRate).map((v) => (
                              <option key={v.value} value={v.value}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <NumberInput value={line.unitPriceHt} onChange={(n) => updateLine(line.id, { unitPriceHt: n })} className={inputClasses} />
                      </td>
                      <td className="py-2 px-2">
                        <NumberInput
                          value={Math.round(line.unitPriceHt * (1 + line.vatRate / 100) * 100) / 100}
                          onChange={(n) => updateLine(line.id, { unitPriceHt: n / (1 + line.vatRate / 100) })}
                          className={inputClasses}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <NumberInput value={line.qty} onChange={(n) => updateLine(line.id, { qty: n })} className={inputClasses} />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <NumberInput
                            value={flat ? (line.discountFixed ?? 0) : (line.discountPercent ?? 0)}
                            max={flat ? undefined : 100}
                            onChange={(n) => updateLine(line.id, flat ? { discountFixed: n } : { discountPercent: n })}
                            className={inputClasses}
                          />
                          <select
                            value={flat ? '2' : '1'}
                            onChange={(e) => updateLine(line.id, { discountType: Number(e.target.value), discountPercent: 0, discountFixed: 0 })}
                            className={`${inputClasses} !w-16 shrink-0`}
                            title="Discount type: % or a flat amount"
                          >
                            <option value="1">%</option>
                            <option value="2">Amt</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right text-text-muted tabular-nums"><LineCost productId={line.productId} /></td>
                      <td className="py-2.5 px-2 text-right font-medium text-text tabular-nums">{formatMoney(incl)}</td>
                      <td className="py-2 px-2 text-center">
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(line.id)} className="text-text-faint hover:text-danger transition-colors" title="Remove line">
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

        {/* Totals of the lines above, in a card of their own. */}
        <Card className="!h-auto shrink-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Sub Total', formatMoney(totals.subTotalHt + totals.discountTotal), ''],
              ['Discount', `- ${formatMoney(totals.discountTotal)}`, totals.discountTotal > 0 ? 'text-danger' : ''],
              ['Total (excl. tax)', formatMoney(totals.totalHt), ''],
              ['VAT', formatMoney(totals.totalVat), ''],
              ['Total (incl. tax)', formatMoney(totals.totalTtc), 'text-brand'],
              ['Quantity / Items', `${totals.totalQty.toFixed(2)} / ${totals.itemCount}`, ''],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-lg bg-surface-alt px-3 py-2.5">
                <p className="text-xs text-text-faint">{label}</p>
                <p className={`mt-0.5 text-base font-bold tabular-nums text-text! ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </WizardStep>

      {/* ── Step 3: Payment details + Totals ───────────────────────────── */}
      <WizardStep n={2}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="!h-auto shrink-0 lg:col-span-2">
            <h3 className="flex items-center gap-2 font-semibold text-text! mb-4">
              <Banknote size={16} className="text-brand" /> Additional Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
              <Field label="Warehouse" required>
                <SearchableSelect value={warehouseId} onChange={setWarehouseChoice} options={warehouses.map((w) => ({ value: String(w.id), label: w.ref }))} placeholder="Select warehouse" />
              </Field>
              <Field label="Bank Account" required>
                <SearchableSelect value={bankAccountId} onChange={setBankAccountId} options={bankOptions} placeholder="Select bank account" />
              </Field>
              <Field label="Date" required>
                <div className="flex gap-2">
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClasses} />
                  <button type="button" onClick={() => setPaymentDate(today)} className="shrink-0 rounded-lg border border-border px-3 text-sm font-medium text-text hover:bg-surface-hover">
                    Now
                  </button>
                </div>
              </Field>
              <Field label="Payment Type" required>
                <SearchableSelect value={paymentModeCode} onChange={setPaymentModeCode} options={paymentModeOptions} placeholder="Select payment type" />
              </Field>
              <Field label="Payment Terms" required>
                <SearchableSelect value={paymentTermId} onChange={setPaymentTermId} options={paymentTermOptions} placeholder="Select payment terms" />
              </Field>
              <div className="sm:col-span-3">
                <Field label="Payment Note">
                  <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Note" className={inputClasses} />
                </Field>
              </div>
            </div>

            <button type="button" onClick={() => setShowShipment((s) => !s)} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              {showShipment ? <ChevronDown size={14} /> : <ChevronRight size={14} />} <Truck size={14} /> Add Shipment Details
            </button>
            {showShipment && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 border-t border-border pt-3">
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
                <Field label="Shipping Address">
                  <input type="text" value={shipment.shippingAddress} onChange={(e) => setShipment((s) => ({ ...s, shippingAddress: e.target.value }))} className={inputClasses} />
                </Field>
              </div>
            )}

            <button type="button" onClick={() => setShowNotes((s) => !s)} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              {showNotes ? <ChevronDown size={14} /> : <ChevronRight size={14} />} <FileText size={14} /> Notes
            </button>
            {showNotes && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-3">
                <Field label="Public Note">
                  <textarea rows={3} value={notePublic} onChange={(e) => setNotePublic(e.target.value)} className={inputClasses} />
                </Field>
                <Field label="Private Note">
                  <textarea rows={3} value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} className={inputClasses} />
                </Field>
              </div>
            )}
          </Card>

          <Card className="!h-auto shrink-0">
            <h3 className="flex items-center gap-2 font-semibold text-text! mb-4">
              <Calculator size={16} className="text-brand" /> Invoice Summary
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Sub Total</span>
                <span className="font-medium text-text tabular-nums">{formatMoney(totals.subTotalHt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-muted">Shipping Charges (incl. tax)</span>
                <div className="flex items-center gap-1.5">
                  <select value={shippingVat} onChange={(e) => setShippingVat(e.target.value)} className={`${inputClasses} !w-24`} title="VAT of the shipping charges">
                    {VAT_RATES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <NumberInput value={shippingCharges} onChange={setShippingCharges} className={`${inputClasses} !w-24 text-right`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">VAT</span>
                <span className="font-medium text-text tabular-nums">{formatMoney(totals.totalVat)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total (excl. tax)</span>
                <span className="font-medium text-text tabular-nums">{formatMoney(totals.totalHt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total (inc. tax)</span>
                <span className="font-medium text-text tabular-nums">{formatMoney(totals.totalTtc)}</span>
              </div>
              <label className="flex items-center gap-2 text-text-muted">
                <input type="checkbox" checked={useAdvance} onChange={(e) => setUseAdvance(e.target.checked)} className="rounded border-border" />
                Use advance payment: {formatMoney(customerDefaults?.advanceAmount ?? 0)}
              </label>
              <div className="border-t border-border pt-2.5 flex items-center justify-between">
                <span className="font-semibold text-text">Total ({currency || 'ZMW'})</span>
                <span className="text-lg font-bold text-text tabular-nums">{formatMoney(totals.totalTtc)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-muted">Received Amount</span>
                <NumberInput value={paymentAmount} onChange={setPaymentAmount} className={`${inputClasses} !w-28 text-right`} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-danger">Balance Amount</span>
                <span className="font-medium text-danger tabular-nums">{formatMoney(totals.balance)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                <div className="rounded-lg bg-surface-alt py-2">
                  <p className="text-xs text-text-faint">Total Quantity</p>
                  <p className="text-lg font-bold text-text tabular-nums">{totals.totalQty.toFixed(0)}</p>
                </div>
                <div className="rounded-lg bg-surface-alt py-2">
                  <p className="text-xs text-text-faint">Items</p>
                  <p className="text-lg font-bold text-text tabular-nums">{totals.itemCount}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </WizardStep>

      {formError && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </div>
      )}
      {actionNotice && <div className="rounded-lg border border-info-bg bg-info-bg/40 px-4 py-3 text-sm text-info-fg">{actionNotice}</div>}
    </StickyFormShell>
  )
}
