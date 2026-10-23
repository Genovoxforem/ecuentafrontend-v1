import { useState } from 'react'
import { useProjectOptions } from '../../../api/lookups'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileBadge, Check, X, Plus, Pencil, Trash2, LoaderCircle, Save, CheckCircle2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { Avatar } from '../../../shared/components/Avatar'
import { addQuotationLine, createQuotation, deleteQuotation, fetchQuotationFormOptions, quotationAction } from '../../../api/quotations'
import { formatMoney, formatNumber } from '../../../utils/format'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useProductOptions } from '../../products/products.queries'

// Created through comm/propal/fapi (create.php for the header, lines.php for each line, proposal.php to validate).

// Quotation-specific dropdown dictionaries are served by its form-options API.
interface DictOption {
  id: string
  text: string
}
interface QuotationDictionaries {
  availabilityDelays: DictOption[]
  demandReasons: DictOption[]
  paymentTerms: DictOption[]
  paymentMethods: DictOption[]
  shippingMethods: DictOption[]
  currencies: DictOption[]
  incoterms: DictOption[]
}
function useQuotationDictionaries() {
  return useQuery({
    queryKey: ['quotations', 'dictionaries'],
    queryFn: async (): Promise<QuotationDictionaries> => {
      const options = await fetchQuotationFormOptions()
      const map = (list: typeof options.availability) =>
        list.filter((option) => option.value && option.value !== '0' && option.value !== '-1')
          .map((option) => ({ id: String(option.value), text: option.label }))
      return {
        availabilityDelays: map(options.availability),
        demandReasons: map(options.demand_reasons),
        paymentTerms: map(options.payment_terms),
        paymentMethods: map(options.payment_methods),
        shippingMethods: map(options.shipping_methods),
        currencies: map(options.multicurrencies),
        incoterms: map(options.incoterms),
      }
    },
    staleTime: 1000 * 60 * 10,
  })
}

// GET /api/projects.php — same real, working endpoint (queries llx_projet
// WHERE fk_statut = 1) already used for Sales/Purchase Orders' Project
// field; not document-type-specific, reused as-is here.

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

let lineKeySeq = 0

const noSpinnerCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

interface CreatedQuotation {
  id: number
  ref: string
}

// `fixedCustomerId` powers QuotationCreateFromCustomerForm.tsx (reached from
// a specific customer's own Customer tab, "AddProp" button). Confirmed live
// against the reference app (comm/propal/card.php?action=create&socid=X)
// that this is genuinely the SAME create form, just with the customer field
// locked instead of a free-pick dropdown — not a structurally different
// page the way Contracts' customer-scoped create is — so this component is
// generalized with a prop rather than duplicated.
export function QuotationCreateForm({ fixedCustomerId, backTo }: { fixedCustomerId?: string; backTo?: string } = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultValidity = new Date()
  defaultValidity.setDate(defaultValidity.getDate() + 15)
  const defaultValidityIso = defaultValidity.toISOString().slice(0, 10)

  const [customerId, setCustomerId] = useState(fixedCustomerId ?? '')
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

  const listLink = backTo ?? ROUTES.quotationList
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: fixedCustomer } = useCustomerDetail(fixedCustomerId)
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
  const { data: dictionaries } = useQuotationDictionaries()
  const paymentTypes = dictionaries?.paymentMethods
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
      const created = await createQuotation({
        socid: Number(customerId),
        date,
        fin_validite: validityDate,
        ref_client: refCustomer || undefined,
        note_public: notePublic || undefined,
        note_private: notePrivate || undefined,
        project_id: projectId ? Number(projectId) : undefined,
        delivery_date: deliveryDate || undefined,
        availability_id: availabilityId ? Number(availabilityId) : undefined,
        demand_reason_id: demandReasonId ? Number(demandReasonId) : undefined,
        shipping_method_id: shippingMethodId ? Number(shippingMethodId) : undefined,
        cond_reglement_id: condReglementId ? Number(condReglementId) : undefined,
        mode_reglement_id: modeReglementId ? Number(modeReglementId) : undefined,
        fk_incoterms: incotermId ? Number(incotermId) : undefined,
        location_incoterms: incotermLocation || undefined,
        multicurrency_code: currencyCode || undefined,
        multicurrency_tx: currencyCode ? Number(exchangeRate) || 1 : undefined,
      })
      // create.php stores the header only; the lines go in one by one. A refused line removes the draft so no empty quotation is left behind.
      try {
        for (const l of lines) {
          const gross = l.qty * l.unitPrice
          await addQuotationLine(created.id, {
            product_id: l.productId ? Number(l.productId) : undefined,
            description: l.description,
            qty: l.qty,
            pu_ht: l.unitPrice,
            tva_tx: l.vatRate,
            // lines.php only takes a percentage, so a flat amount off the line is converted.
            remise_percent: l.discountType === '1' ? l.discountValue : gross > 0 ? (l.discountValue / gross) * 100 : 0,
            product_type: 0,
          })
        }
        if (validate) await quotationAction(created.id, 'validate')
      } catch (e) {
        await deleteQuotation(created.id).catch(() => undefined)
        throw e
      }
      return created as CreatedQuotation
    },
    onSuccess: (quotation) => {
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
    setCustomerId(fixedCustomerId ?? '')
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
        footerLeft={<Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">Back to List</Link>}
        footerRight={
          <button type="button" onClick={startNewQuotation} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Quotation
          </button>
        }
      >
        <Card className="!h-auto items-center text-center justify-center gap-3 !py-12">
          <CheckCircle2 size={40} className="text-success" />
          <h3 className="text-lg font-semibold text-text!">Quotation {createdQuotation.ref} created</h3>
          <Link
            to={ROUTES.quotationDetail.replace(':id', String(createdQuotation.id))}
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            View quotation
          </Link>
        </Card>
      </StickyFormShell>
    )
  }

  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBadge size={20} className="text-brand" /> New Quotation
        </h2>
      }
      footerLeft={
        <div className="flex items-center gap-4">
          <Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
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
          <div className="mb-4">
            <Field label="Customer" required>
              {fixedCustomerId ? (
                <div className={`${inputClasses} flex items-center gap-2`}>
                  <Avatar name={fixedCustomer?.name ?? ''} size={20} color="bg-brand" />
                  {fixedCustomer ? (
                    <Link to={ROUTES.customerDetail.replace(':id', fixedCustomerId)} className="text-brand hover:underline">
                      {fixedCustomer.name}
                    </Link>
                  ) : (
                    <span className="text-text-faint">Loading…</span>
                  )}
                </div>
              ) : (
                <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions ?? []} placeholder={customersLoading ? 'Loading…' : 'Select a third party'} />
              )}
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
                {dictionaries?.currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.text}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-faint mt-1">Rate: {exchangeRate}</p>
            </div>
            <Field label="Incoterms">
              <div className="flex items-center gap-2">
                <select value={incotermId} onChange={(e) => setIncotermId(e.target.value)} className={inputClasses}>
                  <option value="">Select a incoterms</option>
                  {dictionaries?.incoterms.map((incoterm) => (
                    <option key={incoterm.id} value={incoterm.id}>
                      {incoterm.text}
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
          <div className="flex items-center justify-between px-2 py-3 border-b border-border">
            <h3 className="font-semibold text-text!">Item Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium pl-2 pr-4 py-2.5">Product/Service</th>
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
                  <td className="pl-2 pr-4 py-2">
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
                      <td className="pl-2 pr-4 py-2.5 text-text!">{line.description}</td>
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
