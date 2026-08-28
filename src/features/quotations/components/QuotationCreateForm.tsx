import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { FileBadge, Check, X, Plus, Pencil, Trash2, LoaderCircle, Save, CheckCircle2, ExternalLink } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { api } from '../../../api/axios'
import { formatMoney, formatNumber } from '../../../utils/format'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useCustomerLookups } from '../../customers/thirdPartyOptions.queries'
import { useLogActivity } from '../../agenda/agenda.queries'
import { useAuth } from '../../auth/AuthContext'

// This form talks to a real, complete JSON API —
// comm/propal/api/proposal_handler.php — read directly from its PHP source.
// Replaces the previous local-only fake collection (quotations.queries.ts's
// old comment claimed "no backend endpoint exists... confirmed", which
// turned out to be wrong — the same situation Purchase Orders were in
// before that page was rebuilt this same way).
const API_URL = '/comm/propal/api/proposal_handler.php'

interface ApiEnvelope<T> {
  success: boolean
  error?: string
  errors?: Record<string, string>
  data?: T
}

// comm/propal/index_v2.php (the real "New Quotation" page) renders
// Availability Period / Source / Payment Terms / Shipping Method as plain
// <select> options straight from their DB tables (selectAvailabilityDelay(),
// selectInputReason(), select_conditions_paiements(), selectShippingMethod())
// — same "dead REST route, real legacy page" pattern as Sales Orders' own
// useOrderDictionaries (orderFormOptionsParser.ts), scraped from this page
// directly instead since it's the actual real page these fields come from.
interface DictOption {
  id: string
  text: string
}
interface QuotationDictionaries {
  availabilityDelays: DictOption[]
  demandReasons: DictOption[]
  paymentTerms: DictOption[]
  shippingMethods: DictOption[]
}
function parseSelectOptions(doc: Document, name: string): DictOption[] {
  const select = doc.querySelector(`select[name="${name}"]`)
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ id: o.getAttribute('value') ?? '', text: (o.textContent ?? '').trim() }))
    .filter((o) => o.id && o.id !== '0' && o.id !== '-1')
}
function useQuotationDictionaries() {
  return useQuery({
    queryKey: ['quotations', 'dictionaries'],
    queryFn: async (): Promise<QuotationDictionaries> => {
      const res = await fetch('/comm/propal/index_v2.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
      return {
        availabilityDelays: parseSelectOptions(doc, 'availability_id'),
        demandReasons: parseSelectOptions(doc, 'demand_reason_id'),
        paymentTerms: parseSelectOptions(doc, 'cond_reglement_id'),
        shippingMethods: parseSelectOptions(doc, 'shipping_method_id'),
      }
    },
    staleTime: 1000 * 60 * 10,
  })
}

interface DictionaryResponse {
  success: boolean
  results: Array<{ id: string | number; text: string }>
}
// GET /api/payment_types.php — same real, working dictionary (llx_c_paiement)
// already used for Sales/Purchase Orders' Payment Mode field; not
// document-type-specific, reused as-is here.
function usePaymentTypes() {
  return useQuery({
    queryKey: ['dictionary', '/payment_types.php'],
    queryFn: async (): Promise<DictOption[]> => {
      const { data } = await api.get<DictionaryResponse>('/payment_types.php')
      return data.success ? data.results.map((r) => ({ id: String(r.id), text: r.text })) : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

interface ProjectOption {
  id: string
  ref: string
  title: string
}
// GET /api/projects.php — same real, working endpoint (queries llx_projet
// WHERE fk_statut = 1) already used for Sales/Purchase Orders' Project
// field; not document-type-specific, reused as-is here.
function useProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'open'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: ProjectOption[] }>('/projects.php')
      return data.results ?? []
    },
    staleTime: 1000 * 60,
  })
}

// dis_type: 1 = % off the line, 2 = a flat amount off the line — real
// values CommandeFournisseurLine-style addline() params accept, read
// directly from handleCreateProposal()'s addline() call. Unlike Sales/
// Purchase Orders, this API accepts the flat amount directly
// (remise_amount) — no client-side percent conversion needed here.
type DiscountType = '1' | '2'

interface QuotationLine {
  key: number
  productId: string
  description: string
  qty: number
  unitPrice: number
  vatRate: number
  vatCode: string
  discountValue: number
  discountType: DiscountType
  buyingPrice: number
}

function lineExclAfterDiscount(qty: number, unitPrice: number, discount: number, discountType: DiscountType): number {
  if (discountType === '2') return qty * unitPrice - discount
  return qty * unitPrice * (1 - discount / 100)
}
function lineTotalIncl(qty: number, unitPrice: number, vatRate: number, discount: number, discountType: DiscountType): number {
  return lineExclAfterDiscount(qty, unitPrice, discount, discountType) * (1 + vatRate / 100)
}

// The real page's own selectDate()-driven fields post as Unix timestamps
// (dol_mktime under the hood) — matched here rather than a plain "YYYY-MM-DD"
// string.
function toUtcTimestamp(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 1000)
}

let lineKeySeq = 0

const noSpinnerCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

interface CreatedQuotation {
  id: number
  ref: string
}

export function QuotationCreateForm() {
  const today = new Date().toISOString().slice(0, 10)
  const defaultValidity = new Date()
  defaultValidity.setDate(defaultValidity.getDate() + 15)
  const defaultValidityIso = defaultValidity.toISOString().slice(0, 10)

  const [customerId, setCustomerId] = useState('')
  const [refCustomer, setRefCustomer] = useState('')
  const [date, setDate] = useState(today)
  const [projectId, setProjectId] = useState('')
  const [validityDate, setValidityDate] = useState(defaultValidityIso)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [availabilityId, setAvailabilityId] = useState('')
  const [demandReasonId, setDemandReasonId] = useState('')
  const [shippingMethodId, setShippingMethodId] = useState('')
  const [condReglementId, setCondReglementId] = useState('')
  const [modeReglementId, setModeReglementId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1.0')
  const [incotermId, setIncotermId] = useState('')
  const [incotermLocation, setIncotermLocation] = useState('')
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [lines, setLines] = useState<QuotationLine[]>([])
  const [draftProductId, setDraftProductId] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftVatRate, setDraftVatRate] = useState(0)
  const [draftVatCode, setDraftVatCode] = useState('')
  const [draftUnitPrice, setDraftUnitPrice] = useState(0)
  const [draftQty, setDraftQty] = useState(1)
  const [draftDiscountValue, setDraftDiscountValue] = useState(0)
  const [draftDiscountType, setDraftDiscountType] = useState<DiscountType>('1')
  const [draftBuyingPrice, setDraftBuyingPrice] = useState(0)
  const [editingLineKey, setEditingLineKey] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [createdQuotation, setCreatedQuotation] = useState<CreatedQuotation | null>(null)

  const { user } = useAuth()
  const logActivity = useLogActivity()
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const customerOptions = customers?.map((c) => ({
    value: c.id,
    label: c.name,
    keywords: `${c.ref} ${c.tpin} ${c.country}`,
    description: (
      <>
        {c.ref}
        {c.tpin ? ` | Tpin: ${c.tpin}` : ''}
        {c.country ? ` | Country: ${c.country}` : ''}
      </>
    ),
  }))
  const { data: products } = useProductOptions()
  const productOptions = (products ?? []).map((p) => ({
    value: p.id,
    label: p.label,
    keywords: `${p.ref} ${p.classification} ${p.barcode}`,
    description: (
      <>
        Ref :{p.ref} | Classification: {p.classification || '—'}
        <br />
        Price: {formatMoney(p.priceBaseType === 'TTC' ? p.priceInclTax : p.priceExclTax)} {p.priceBaseType === 'TTC' ? 'Inc.' : 'Excl.'} tax | Stock:{' '}
        {formatNumber(p.stock)}
      </>
    ),
  }))
  const { data: lookups } = useCustomerLookups()
  const { data: paymentTypes } = usePaymentTypes()
  const { data: dictionaries } = useQuotationDictionaries()
  const { data: projects } = useProjectOptions()

  function pickDraftProduct(productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    setDraftProductId(productId)
    setDraftDescription(product?.label ?? '')
    setDraftUnitPrice(product?.priceExclTax ?? 0)
    setDraftVatRate(product?.vatRatePct ?? 0)
    setDraftVatCode(product?.vatCode ?? '')
    setDraftBuyingPrice(product?.costPrice ?? 0)
  }

  function resetDraftLine() {
    setDraftProductId('')
    setDraftDescription('')
    setDraftVatRate(0)
    setDraftVatCode('')
    setDraftUnitPrice(0)
    setDraftQty(1)
    setDraftDiscountValue(0)
    setDraftDiscountType('1')
    setDraftBuyingPrice(0)
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
    const line: QuotationLine = {
      key: editingLineKey ?? lineKeySeq++,
      productId: draftProductId,
      description: draftDescription,
      qty: draftQty,
      unitPrice: draftUnitPrice,
      vatRate: draftVatRate,
      vatCode: draftVatCode,
      discountValue: draftDiscountValue,
      discountType: draftDiscountType,
      buyingPrice: draftBuyingPrice,
    }
    setLines((prev) => (editingLineKey != null ? prev.map((l) => (l.key === editingLineKey ? line : l)) : [...prev, line]))
    resetDraftLine()
  }

  function editLine(key: number) {
    const line = lines.find((l) => l.key === key)
    if (!line) return
    setDraftProductId(line.productId)
    setDraftDescription(line.description)
    setDraftVatRate(line.vatRate)
    setDraftVatCode(line.vatCode)
    setDraftUnitPrice(line.unitPrice)
    setDraftQty(line.qty)
    setDraftDiscountValue(line.discountValue)
    setDraftDiscountType(line.discountType)
    setDraftBuyingPrice(line.buyingPrice)
    setEditingLineKey(key)
  }

  function deleteLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
    if (editingLineKey === key) resetDraftLine()
  }

  const totalExcl = lines.reduce((sum, l) => sum + lineExclAfterDiscount(l.qty, l.unitPrice, l.discountValue, l.discountType), 0)
  const totalTax = lines.reduce((sum, l) => sum + lineExclAfterDiscount(l.qty, l.unitPrice, l.discountValue, l.discountType) * (l.vatRate / 100), 0)
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0)

  // POST ?action=create — full real contract, read directly from
  // handleCreateProposal() in proposal_handler.php.
  const createMutation = useMutation({
    mutationFn: async (validate: boolean) => {
      const body = {
        action: 'create',
        socid: Number(customerId),
        date: toUtcTimestamp(date),
        fin_validite: toUtcTimestamp(validityDate),
        ref_client: refCustomer || undefined,
        note_public: notePublic || undefined,
        note_private: notePrivate || undefined,
        fk_project: projectId ? Number(projectId) : undefined,
        date_livraison: deliveryDate ? toUtcTimestamp(deliveryDate) : undefined,
        availability_id: availabilityId ? Number(availabilityId) : undefined,
        demand_reason_id: demandReasonId ? Number(demandReasonId) : undefined,
        shipping_method_id: shippingMethodId ? Number(shippingMethodId) : undefined,
        cond_reglement_id: condReglementId ? Number(condReglementId) : undefined,
        mode_reglement_id: modeReglementId ? Number(modeReglementId) : undefined,
        fk_incoterms: incotermId ? Number(incotermId) : undefined,
        location_incoterms: incotermLocation || undefined,
        multicurrency_code: currencyCode || undefined,
        multicurrency_tx: currencyCode ? Number(exchangeRate) || 1 : undefined,
        validate,
        lines: lines.map((l) => ({
          fk_product: l.productId ? Number(l.productId) : null,
          desc: l.description,
          qty: l.qty,
          subprice: l.unitPrice,
          tva_tx: l.vatRate,
          default_vat_code: l.vatCode,
          dis_type: Number(l.discountType),
          remise_percent: l.discountType === '1' ? l.discountValue : 0,
          remise_amount: l.discountType === '2' ? l.discountValue : 0,
          pa_ht: l.buyingPrice || undefined,
          product_type: 0,
        })),
      }
      const { data } = await axios.post<ApiEnvelope<CreatedQuotation>>(`${API_URL}?action=create`, body, { validateStatus: () => true })
      if (!data.success) {
        const detail = data.errors ? Object.values(data.errors).join(' ') : undefined
        throw new Error(detail ?? data.error ?? 'Failed to create quotation')
      }
      return data.data as CreatedQuotation
    },
    onSuccess: (quotation, validate) => {
      const customerName = customers?.find((c) => c.id === customerId)?.name ?? 'a customer'
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `${validate ? 'New' : 'Draft'} quotation ${quotation.ref} for ${customerName}`, category: 'other', authorName })
      setCreatedQuotation(quotation)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to create quotation'),
  })

  function handleSubmit(validate: boolean) {
    setFormError('')
    if (!customerId) {
      setFormError('Customer is required.')
      return
    }
    if (!modeReglementId) {
      setFormError('Payment Mode is required.')
      return
    }
    if (lines.length === 0) {
      setFormError('At least one item is required.')
      return
    }
    createMutation.mutate(validate)
  }

  function startNewQuotation() {
    setCreatedQuotation(null)
    setCustomerId('')
    setRefCustomer('')
    setDate(today)
    setProjectId('')
    setValidityDate(defaultValidityIso)
    setDeliveryDate('')
    setAvailabilityId('')
    setDemandReasonId('')
    setShippingMethodId('')
    setCondReglementId('')
    setModeReglementId('')
    setCurrencyCode('')
    setExchangeRate('1.0')
    setIncotermId('')
    setIncotermLocation('')
    setNotePublic('')
    setNotePrivate('')
    setLines([])
    resetDraftLine()
  }

  if (createdQuotation) {
    return (
      <StickyFormShell
        header={
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <FileBadge size={20} className="text-brand" /> New Quotation
          </h2>
        }
        footerLeft={<Link to={ROUTES.quotationList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">Back to List</Link>}
        footerRight={
          <button type="button" onClick={startNewQuotation} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Quotation
          </button>
        }
      >
        <Card className="!h-auto items-center text-center justify-center gap-3 !py-12">
          <CheckCircle2 size={40} className="text-success" />
          <h3 className="text-lg font-semibold text-text!">Quotation {createdQuotation.ref} created</h3>
          <a
            href={`/comm/propal/card.php?id=${createdQuotation.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            View quotation on legacy page <ExternalLink size={13} />
          </a>
        </Card>
      </StickyFormShell>
    )
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBadge size={20} className="text-brand" /> New Quotation
        </h2>
      }
      footerLeft={
        <div className="flex items-center gap-4">
          <Link to={ROUTES.quotationList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
          <div className="text-xs text-text-faint leading-tight">
            <p>
              Total Amount: <span className="font-medium text-text!">{formatMoney(totalExcl + totalTax)} ZMW</span>
            </p>
            <p>
              Total Lines: <span className="font-medium text-text!">{formatNumber(totalQty)}</span>
            </p>
          </div>
          {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
        </div>
      }
      footerRight={
        <>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            <Save size={14} /> Save As Draft
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            {createMutation.isPending ? 'Creating…' : 'Create Quotation'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 flex-1 shrink-0">
        <Card className="!h-auto shrink-0">
          <div className="rounded-lg bg-surface-alt border border-border p-3 mb-4">
            <Field label="Customer" required>
              <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions ?? []} placeholder={customersLoading ? 'Loading…' : 'Select a third party'} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Date" required>
              <div className="flex items-center gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
                <button type="button" onClick={() => setDate(today)} className="shrink-0 rounded-md border border-input-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover">
                  Now
                </button>
              </div>
            </Field>
            <Field label="Project">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
                <option value="">Select a project</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ref} — {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Validity ending date" required>
              <input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} className={inputClasses} />
            </Field>

            <Field label="Planned date of delivery">
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Ref. customer">
              <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Availability Period">
              <select value={availabilityId} onChange={(e) => setAvailabilityId(e.target.value)} className={inputClasses}>
                <option value="">Select an availability delay</option>
                {dictionaries?.availabilityDelays.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.text}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Source">
              <select value={demandReasonId} onChange={(e) => setDemandReasonId(e.target.value)} className={inputClasses}>
                <option value="">Select a source</option>
                {dictionaries?.demandReasons.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.text}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Shipping Method">
              <select value={shippingMethodId} onChange={(e) => setShippingMethodId(e.target.value)} className={inputClasses}>
                <option value="">Select a shipping method</option>
                {dictionaries?.shippingMethods.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.text}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment Terms">
              <select value={condReglementId} onChange={(e) => setCondReglementId(e.target.value)} className={inputClasses}>
                <option value="">Select a payment terms</option>
                {dictionaries?.paymentTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.text}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment Mode" required>
              <select value={modeReglementId} onChange={(e) => setModeReglementId(e.target.value)} className={inputClasses}>
                <option value="">Select a payment type</option>
                {paymentTypes?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.text}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <span className="text-sm text-text">Currency</span>
              <select
                value={currencyCode}
                onChange={(e) => {
                  setCurrencyCode(e.target.value)
                  if (!e.target.value) setExchangeRate('1.0')
                }}
                className={`${inputClasses} mt-1`}
              >
                <option value="">Zambian Kwacha (ZMW)</option>
                {lookups?.currencies?.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-faint mt-1">Rate: {exchangeRate}</p>
            </div>
            <Field label="Incoterms">
              <div className="flex items-center gap-2">
                <select value={incotermId} onChange={(e) => setIncotermId(e.target.value)} className={inputClasses}>
                  <option value="">Select a incoterms</option>
                  {lookups?.incoterms?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code}
                    </option>
                  ))}
                </select>
                <input type="text" placeholder="Location" value={incotermLocation} onChange={(e) => setIncotermLocation(e.target.value)} className={inputClasses} />
              </div>
            </Field>

            <Field label="Note (public)">
              <textarea value={notePublic} onChange={(e) => setNotePublic(e.target.value)} rows={2} className={inputClasses} />
            </Field>
            <Field label="Note (private)">
              <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} rows={2} className={inputClasses} />
            </Field>
          </div>
        </Card>

        <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-text!">Item Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5">Product/Service</th>
                  <th className="font-medium px-4 py-2.5 w-24">VAT</th>
                  <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 w-28">Unit Price (Inc. Tax)</th>
                  <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                  <th className="font-medium px-4 py-2.5 w-32">Disc.</th>
                  <th className="font-medium px-4 py-2.5 w-28">Buying Price</th>
                  <th className="font-medium px-4 py-2.5 w-32 text-right">Total (Inc. Tax)</th>
                  <th className="w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border align-top bg-surface-alt/50">
                  <td className="px-4 py-2">
                    <SearchableSelect value={draftProductId} onChange={pickDraftProduct} options={productOptions} placeholder="Select Predefined Product/Services" />
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
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draftUnitPrice}
                      onChange={(e) => setDraftUnitPrice(Number(e.target.value))}
                      className={`${inputClasses} ${noSpinnerCls}`}
                    />
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
                    <div className="flex items-stretch gap-1">
                      <input
                        type="number"
                        min={0}
                        max={draftDiscountType === '1' ? 100 : undefined}
                        step="0.01"
                        value={draftDiscountValue}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDraftDiscountValue(Number(e.target.value))}
                        className={`${inputClasses} ${noSpinnerCls} w-16 px-2`}
                      />
                      <select value={draftDiscountType} onChange={(e) => setDraftDiscountType(e.target.value as DiscountType)} className={`${inputClasses} w-14 px-1`}>
                        <option value="1">%</option>
                        <option value="2">P</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draftBuyingPrice}
                      onChange={(e) => setDraftBuyingPrice(Number(e.target.value))}
                      className={`${inputClasses} ${noSpinnerCls}`}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                    {formatMoney(lineTotalIncl(draftQty, draftUnitPrice, draftVatRate, draftDiscountValue, draftDiscountType))}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={addDraftLine}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-surface-hover"
                    >
                      <Plus size={13} /> {editingLineKey != null ? 'Update' : 'Add'}
                    </button>
                  </td>
                </tr>

                {lines.map((line) => {
                  const lineIncl = lineTotalIncl(line.qty, line.unitPrice, line.vatRate, line.discountValue, line.discountType)
                  const unitPriceIncl = line.unitPrice * (1 + line.vatRate / 100)
                  return (
                    <tr key={line.key} className="border-b border-border align-top">
                      <td className="px-4 py-2.5 text-text!">{line.description}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                        {line.vatRate}%{line.vatCode ? `(${line.vatCode})` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(line.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(unitPriceIncl)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{formatNumber(line.qty)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                        {line.discountValue}
                        {line.discountType === '1' ? '%' : ' (flat)'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{line.buyingPrice ? formatMoney(line.buyingPrice) : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(lineIncl)}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <button type="button" title="Edit line" onClick={() => editLine(line.key)} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand">
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete line"
                          onClick={() => deleteLine(line.key)}
                          className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger"
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

        <Card className="!h-auto shrink-0">
          <h3 className="font-semibold text-text! mb-3">Totals</h3>
          <div className="space-y-2 text-sm max-w-sm ml-auto">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total (Excl. Tax):</span>
              <span className="tabular-nums text-text!">{formatMoney(totalExcl)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total Tax:</span>
              <span className="tabular-nums text-text!">{formatMoney(totalTax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-text-muted font-medium">Total (Inc. Tax):</span>
              <span className="font-bold tabular-nums text-info">{formatMoney(totalExcl + totalTax)}</span>
            </div>
          </div>
        </Card>
      </div>
    </StickyFormShell>
  )
}
