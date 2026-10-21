/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ShoppingCart, Check, X, Plus, Pencil, Trash2, LoaderCircle, Save, CheckCircle2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { Avatar } from '../../../shared/components/Avatar'
import { api } from '../../../api/axios'
import { fapiGet, fapiPost } from '../../../api/fapiEnvelope'
import { formatMoney, formatNumber } from '../../../utils/format'
import { useVendorOptions } from '../../customers/customerOptions'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useProductOptions } from '../../products/products.queries'
import { useCustomerLookups } from '../../customers/thirdPartyOptions.queries'
import { PO_BASE, usePurchaseOrderFormOptions } from '../purchaseOrderFapi'

// Purchase order create form on fourn/commande/fapi: form_options.php (dropdowns and the defaults resolved for the chosen
// supplier), product_info.php (the supplier's price for a product) and create.php (header, lines and validation in one
// transaction).

// The defaults the form applies when a supplier is chosen: its payment terms and mode and its currency.
function useSupplierDefaults(vendorId: string) {
  const q = usePurchaseOrderFormOptions(vendorId || undefined)
  const d = q.data?.defaults
  return {
    data:
      vendorId && d
        ? {
            condReglementId: d.payment_term_id ? String(d.payment_term_id) : '',
            modeReglementId: d.payment_mode_id ? String(d.payment_mode_id) : '',
            multicurrencyCode: d.currency_code ?? '',
            multicurrencyTx: 1,
          }
        : undefined,
  }
}

// What the supplier quotes for a product (best price for the quantity, its reference and VAT), falling back to the last
// price paid and then the product's own price, so the field is never left at 0 for no reason.
interface SupplierProductInfo {
  buyingPrice: number
  supplierRef: string
  vatRate: number
  vatCode: string
}
function useSupplierProductInfo(vendorId: string, productId: string) {
  return useQuery({
    queryKey: ['purchaseOrders', 'supplierProduct', vendorId, productId],
    queryFn: async (): Promise<SupplierProductInfo> => {
      const d = await fapiGet<any>(`${PO_BASE}/product_info.php`, { product_id: productId, socid: vendorId })
      const sp = d.supplier_price
      return {
        buyingPrice: Number(sp?.price ?? sp?.unitprice ?? sp?.buying_price) || Number(d.last_price?.price ?? d.last_price?.unit_price) || Number(d.product?.sell_price) || 0,
        supplierRef: sp?.ref_supplier ?? sp?.ref ?? '',
        vatRate: Number(sp?.tva_tx ?? d.product?.tva_tx) || 0,
        vatCode: d.product?.vat_code ?? '',
      }
    },
    enabled: vendorId !== '' && productId !== '',
    staleTime: 1000 * 30,
  })
}

interface DictionaryOption {
  id: string
  text: string
}
interface DictionaryResponse {
  success: boolean
  results: Array<{ id: string | number; text: string }>
}
// GET /api/payment_types.php — same real, working dictionary (llx_c_paiement)
// OrderCreateForm.tsx already uses for Sales Orders' Payment Type field; not
// order-type-specific, so reused as-is here for Payment Mode. Goes through
// the `api` instance (not plain axios) since this route lives under /api/*
// and needs the X-API-Key header that instance attaches — unlike
// purchase_handler.php below, which is session-cookie authenticated only.
function usePaymentTypes() {
  return useQuery({
    queryKey: ['dictionary', '/payment_types.php'],
    queryFn: async (): Promise<DictionaryOption[]> => {
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
// WHERE fk_statut = 1, no customer/socid filter) OrderCreateForm.tsx already
// uses for Sales Orders' Project field; not order-type-specific, reused
// as-is here.
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

// Payment Terms (llx_c_payment_term) from form_options.php.
function usePurchasePaymentTerms() {
  return useQuery({
    queryKey: ['purchaseOrders', 'paymentTerms'],
    queryFn: async (): Promise<DictionaryOption[]> =>
      (await fapiGet<{ payment_terms: Array<{ value: number | string; label: string }> }>('/fourn/commande/fapi/form_options.php')).payment_terms.map((t) => ({ id: String(t.value), text: t.label })),
    staleTime: 1000 * 60 * 10,
  })
}

// '1' = % off the line, '2' = a flat amount off the line — same convention
// as Sales Orders' own line_discount_type (<option value="1">%</option>
// <option value="2">P</option>), and CommandeFournisseurLine::addline() only
// ever accepts a remise_percent param the same way Commande::addline() does
// (read directly from handleCreateOrder()'s addline() call) — a flat amount
// is converted to its equivalent percentage before submit, same as Sales
// Orders.
type DiscountType = '1' | '2'

interface OrderLine {
  key: number
  productId: string
  description: string
  supplierRef: string
  qty: number
  unitPrice: number
  vatRate: number
  vatCode: string
  discountPct: number
  discountType: DiscountType
}

function lineExclAfterDiscount(qty: number, unitPrice: number, discount: number, discountType: DiscountType): number {
  if (discountType === '2') return qty * unitPrice - discount
  return qty * unitPrice * (1 - discount / 100)
}
function lineTotalIncl(qty: number, unitPrice: number, vatRate: number, discount: number, discountType: DiscountType): number {
  return lineExclAfterDiscount(qty, unitPrice, discount, discountType) * (1 + vatRate / 100)
}
function discountToRemisePercent(qty: number, unitPrice: number, discount: number, discountType: DiscountType): number {
  if (discountType === '1') return discount
  const subtotal = qty * unitPrice
  return subtotal > 0 ? (discount / subtotal) * 100 : 0
}


let lineKeySeq = 0

const noSpinnerCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

interface CreatedOrder {
  id: number
  ref: string
  total_ht: number
  total_tva: number
  total_ttc: number
}

// `fixedCustomerId` powers PurchaseOrderCreateFromCustomerForm.tsx (reached
// from a specific vendor's own Vendor tab, "Create Order" button) — same
// real customer/vendor-locked-field-not-a-different-page behavior confirmed
// for Quotations (see QuotationCreateForm.tsx's own comment), generalized
// here the same way rather than duplicated.
export function PurchaseOrderCreateForm({ fixedCustomerId, backTo }: { fixedCustomerId?: string; backTo?: string } = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const [vendorId, setVendorId] = useState(fixedCustomerId ?? '')
  const [refVendor, setRefVendor] = useState('')
  const [date, setDate] = useState(today)
  const [projectId, setProjectId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [condReglementId, setCondReglementId] = useState('')
  const [modeReglementId, setModeReglementId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1.0')
  const [incotermId, setIncotermId] = useState('')
  const [incotermLocation, setIncotermLocation] = useState('')
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [lines, setLines] = useState<OrderLine[]>([])
  const [draftProductId, setDraftProductId] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftSupplierRef, setDraftSupplierRef] = useState('')
  const [draftVatRate, setDraftVatRate] = useState(0)
  const [draftVatCode, setDraftVatCode] = useState('')
  const [draftUnitPrice, setDraftUnitPrice] = useState(0)
  const [draftQty, setDraftQty] = useState(1)
  const [draftDiscountPct, setDraftDiscountPct] = useState(0)
  const [draftDiscountType, setDraftDiscountType] = useState<DiscountType>('1')
  const [editingLineKey, setEditingLineKey] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)

  const listLink = backTo ?? ROUTES.purchaseOrderList
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
            Price: {formatMoney(p.priceBaseType === 'TTC' ? p.priceInclTax : p.priceExclTax)} {p.priceBaseType === 'TTC' ? 'Inc.' : 'Excl.'} tax | Stock:{' '}
            {formatNumber(p.stock)}
          </>
        ),
      })),
    [products],
  )
  const { data: lookups } = useCustomerLookups()
  const { data: paymentTypes } = usePaymentTypes()
  const { data: paymentTerms } = usePurchasePaymentTerms()
  const { data: projects } = useProjectOptions()
  const { data: supplierDefaults } = useSupplierDefaults(vendorId)
  // form_options.php?socid resolves the default chain the page applies (supplier's own terms, then the install default).
  const { data: formOptions } = usePurchaseOrderFormOptions(vendorId || undefined)
  const { data: supplierProductInfo } = useSupplierProductInfo(vendorId, draftProductId)

  // Mirrors the real page's onSupplierChange() → auto-fill exactly (see
  // useSupplierDefaults' header comment) — only into fields still at their
  // initial blank value, so it never clobbers something the user already
  // picked.
  useEffect(() => {
    if (!vendorId || !formOptions?.defaults) return
    const d = formOptions.defaults
    setCondReglementId((prev) => prev || (d.payment_term_id ? String(d.payment_term_id) : ''))
    setModeReglementId((prev) => prev || (d.payment_mode_id ? String(d.payment_mode_id) : ''))
  }, [vendorId, formOptions])

  useEffect(() => {
    if (!supplierDefaults) return
    setCondReglementId((prev) => prev || supplierDefaults.condReglementId)
    setModeReglementId((prev) => prev || supplierDefaults.modeReglementId)
    if (supplierDefaults.multicurrencyCode) {
      setCurrencyCode((prev) => prev || supplierDefaults.multicurrencyCode)
      setExchangeRate((prev) => (prev === '1.0' ? String(supplierDefaults.multicurrencyTx) : prev))
    }
  }, [supplierDefaults])

  // Supplier-specific buying price/ref only resolve async (see
  // useSupplierProductInfo) — synced in once available, same pattern as
  // OrderCreateForm.tsx's useProductCostPrice.
  useEffect(() => {
    if (draftProductId && supplierProductInfo) {
      setDraftUnitPrice(supplierProductInfo.buyingPrice)
      setDraftSupplierRef(supplierProductInfo.supplierRef)
      if (supplierProductInfo.vatRate || supplierProductInfo.vatCode) {
        setDraftVatRate(supplierProductInfo.vatRate)
        setDraftVatCode(supplierProductInfo.vatCode)
      }
    }
  }, [draftProductId, supplierProductInfo])

  function pickDraftProduct(productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    setDraftProductId(productId)
    setDraftDescription(product?.label ?? '')
    setDraftUnitPrice(product?.priceExclTax ?? 0)
    setDraftVatRate(product?.vatRatePct ?? 0)
    setDraftVatCode(product?.vatCode ?? '')
    setDraftSupplierRef('')
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
    setDraftDiscountType('1')
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
    const line: OrderLine = {
      key: editingLineKey ?? lineKeySeq++,
      productId: draftProductId,
      description: draftDescription,
      supplierRef: draftSupplierRef,
      qty: draftQty,
      unitPrice: draftUnitPrice,
      vatRate: draftVatRate,
      vatCode: draftVatCode,
      discountPct: draftDiscountPct,
      discountType: draftDiscountType,
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
    setDraftDiscountType(line.discountType)
    setEditingLineKey(key)
  }

  function deleteLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
    if (editingLineKey === key) resetDraftLine()
  }

  const totalExcl = lines.reduce((sum, l) => sum + lineExclAfterDiscount(l.qty, l.unitPrice, l.discountPct, l.discountType), 0)
  const totalTax = lines.reduce((sum, l) => sum + lineExclAfterDiscount(l.qty, l.unitPrice, l.discountPct, l.discountType) * (l.vatRate / 100), 0)
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0)

  const createMutation = useMutation({
    mutationFn: async (validate: boolean): Promise<CreatedOrder> => {
      // fourn/commande/fapi/create.php: header, every line and the optional validation in one transaction.
      const viaFapi = async (): Promise<CreatedOrder> => {
        const d = await fapiPost<{ id: number; ref: string; totals: { total_ht: number; total_tva: number; total_ttc: number } }>(`${PO_BASE}/create.php`, {
          socid: Number(vendorId),
          ref_supplier: refVendor || undefined,
          order_date: date || undefined,
          delivery_date: deliveryDate || undefined,
          payment_term_id: condReglementId ? Number(condReglementId) : undefined,
          payment_mode_id: modeReglementId ? Number(modeReglementId) : undefined,
          project_id: projectId ? Number(projectId) : undefined,
          currency_code: currencyCode || undefined,
          incoterm_id: incotermId ? Number(incotermId) : undefined,
          location_incoterms: incotermLocation || undefined,
          note_public: notePublic || undefined,
          note_private: notePrivate || undefined,
          warehouse_id: validate ? formOptions?.defaults.warehouse_id || undefined : undefined,
          validate,
          lines: lines.map((l) => ({
            ...(l.productId ? { product_id: Number(l.productId) } : {}),
            description: l.description,
            qty: l.qty,
            pu_ht: l.unitPrice,
            tva_tx: l.vatRate,
            remise_percent: discountToRemisePercent(l.qty, l.unitPrice, l.discountPct, l.discountType),
            ref_supplier: l.supplierRef || undefined,
          })),
        })
        return { id: d.id, ref: d.ref, total_ht: d.totals.total_ht, total_tva: d.totals.total_tva, total_ttc: d.totals.total_ttc }
      }
      return viaFapi()
    },
    onSuccess: (order) => {
      setCreatedOrder(order)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to create purchase order'),
  })

  function handleSubmit(validate: boolean) {
    setFormError('')
    if (!vendorId) {
      setFormError('Vendor is required.')
      return
    }
    if (lines.length === 0) {
      setFormError('At least one item is required.')
      return
    }
    createMutation.mutate(validate)
  }

  function startNewOrder() {
    setCreatedOrder(null)
    setVendorId(fixedCustomerId ?? '')
    setRefVendor('')
    setDate(today)
    setProjectId('')
    setDeliveryDate('')
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

  if (createdOrder) {
    return (
      <StickyFormShell
        header={
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <ShoppingCart size={20} className="text-brand" /> New Purchase Order
          </h2>
        }
        footerLeft={<Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">Back to List</Link>}
        footerRight={
          <button type="button" onClick={startNewOrder} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Purchase Order
          </button>
        }
      >
        {/* !h-auto: this Card stands alone (no grid-with-sidebar sibling to stretch-match),
            and Card's own unconditional h-full is known to inflate standalone cards to
            hundreds/1000+px via a flex-item auto-min-height quirk — see this app's own
            card-h-full-inflation-bug notes. Never fixed in Card itself (shared across 35+
            files); always overridden locally like this. */}
        <Card className="!h-auto items-center text-center justify-center gap-3 !py-12">
          <CheckCircle2 size={40} className="text-success" />
          <h3 className="text-lg font-semibold text-text!">Purchase Order {createdOrder.ref} created</h3>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <span>
              Total (Excl.): <span className="font-medium text-text!">{formatMoney(createdOrder.total_ht)} ZMW</span>
            </span>
            <span>
              Total (Incl.): <span className="font-medium text-text!">{formatMoney(createdOrder.total_ttc)} ZMW</span>
            </span>
          </div>
          <Link to={ROUTES.purchaseOrderDetail.replace(':id', String(createdOrder.id))} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            View order
          </Link>
        </Card>
      </StickyFormShell>
    )
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ShoppingCart size={20} className="text-brand" /> New Purchase Order
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
              Total Quantity: <span className="font-medium text-text!">{formatNumber(totalQty)}</span>
            </p>
          </div>
          {formError && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-danger">{formError}</p>
            </div>
          )}
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
            <Save size={14} /> Save Draft
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            {createMutation.isPending ? 'Creating…' : 'Create Order'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 flex-1 shrink-0">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Ref. vendor">
              <input type="text" value={refVendor} onChange={(e) => setRefVendor(e.target.value)} className={inputClasses} />
            </Field>
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

            <Field label="Planned date of delivery">
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Payment Terms">
              <select value={condReglementId} onChange={(e) => setCondReglementId(e.target.value)} className={inputClasses}>
                <option value="">Select a payment terms</option>
                {paymentTerms?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.text}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment Type">
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
                  <th className="font-medium px-4 py-2.5">Product / Service</th>
                  <th className="font-medium px-4 py-2.5 w-28">Supplier Ref</th>
                  <th className="font-medium px-4 py-2.5 w-24">VAT</th>
                  <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 w-28">Unit Price (Inc. Tax)</th>
                  <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                  <th className="font-medium px-4 py-2.5 w-32">Disc.</th>
                  <th className="font-medium px-4 py-2.5 w-32 text-right">Total (Incl.)</th>
                  <th className="w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border align-top bg-surface-alt/50">
                  <td className="px-4 py-2">
                    {vendorId ? (
                      <SearchableSelect value={draftProductId} onChange={pickDraftProduct} options={productOptions} placeholder="Select Predefined Product/Services" />
                    ) : (
                      <span className="text-sm text-text-faint">Please Select A Supplier First To Add Products.</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={draftSupplierRef} onChange={(e) => setDraftSupplierRef(e.target.value)} placeholder="Ref" className={inputClasses} />
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
                        value={draftDiscountPct}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDraftDiscountPct(Number(e.target.value))}
                        className={`${inputClasses} ${noSpinnerCls} w-16 px-2`}
                      />
                      <select value={draftDiscountType} onChange={(e) => setDraftDiscountType(e.target.value as DiscountType)} className={`${inputClasses} w-14 px-1`}>
                        <option value="1">%</option>
                        <option value="2">P</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                    {formatMoney(lineTotalIncl(draftQty, draftUnitPrice, draftVatRate, draftDiscountPct, draftDiscountType))}
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
                  const lineIncl = lineTotalIncl(line.qty, line.unitPrice, line.vatRate, line.discountPct, line.discountType)
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
                      <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                        {line.discountPct}
                        {line.discountType === '1' ? '%' : ' (flat)'}
                      </td>
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
          <h3 className="font-semibold text-text! mb-3">Payment Details</h3>
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
