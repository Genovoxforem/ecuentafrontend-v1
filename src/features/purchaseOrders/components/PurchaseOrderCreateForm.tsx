import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ShoppingCart, Check, X, Plus, Pencil, Trash2, LoaderCircle, Save, CheckCircle2, ExternalLink } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { fetchLegacyDocument } from '../../../shared/legacyHtmlFetch'
import { api } from '../../../api/axios'
import { formatMoney, formatNumber } from '../../../utils/format'
import { useVendorOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useCustomerLookups } from '../../customers/thirdPartyOptions.queries'
import { useLogActivity } from '../../agenda/agenda.queries'
import { useAuth } from '../../auth/AuthContext'
import { parseOrderDictionaries, looksLikeLegacyLoginPage } from '../../salesOrders/orderFormOptionsParser'

// This entire form talks to a real, complete JSON API —
// commande/purchaseorder/api/purchase_handler.php — read directly from its
// PHP source (not guessed). Unlike most of this app's other legacy
// integrations, no HTML scraping is needed for the create flow itself;
// scraping is only used below for the Payment Terms dictionary, which has
// no REST route of its own (see useSupplierPaymentTerms).
const API_URL = '/commande/purchaseorder/api/purchase_handler.php'

interface ApiEnvelope<T> {
  success: boolean
  error?: string
  details?: Record<string, string>
  data?: T
}

async function callApi<T>(params: Record<string, string | number>): Promise<T> {
  const { data } = await axios.get<ApiEnvelope<T>>(API_URL, { params, validateStatus: () => true })
  if (!data.success) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data.data as T
}

// GET ?action=get_supplier&id=X — confirmed real (handleGetSupplier() in
// purchase_handler.php). The real page's own onSupplierChange() handler
// calls this exact action and auto-fills Payment Terms/Payment Mode/
// Currency/Rate from its response (read directly from purchaseorder.js,
// lines ~369-382) — replicated below the same way OrderCreateForm.tsx's
// useCustomerDefaults mirrors the Sales Order equivalent.
interface SupplierDefaults {
  condReglementId: string
  modeReglementId: string
  multicurrencyCode: string
  multicurrencyTx: number
  outstandingBalance: number
}
function useSupplierDefaults(vendorId: string) {
  return useQuery({
    queryKey: ['purchaseOrders', 'supplierDefaults', vendorId],
    queryFn: async (): Promise<SupplierDefaults> => {
      const d = await callApi<{
        cond_reglement_supplier_id: number | string | null
        mode_reglement_supplier_id: number | string | null
        multicurrency_code: string | null
        multicurrency_tx: number | null
        outstanding_balance: number | null
      }>({ action: 'get_supplier', id: vendorId })
      return {
        condReglementId: d.cond_reglement_supplier_id ? String(d.cond_reglement_supplier_id) : '',
        modeReglementId: d.mode_reglement_supplier_id ? String(d.mode_reglement_supplier_id) : '',
        multicurrencyCode: d.multicurrency_code ?? '',
        multicurrencyTx: d.multicurrency_tx || 1,
        outstandingBalance: d.outstanding_balance ?? 0,
      }
    },
    enabled: vendorId !== '',
    staleTime: 1000 * 30,
  })
}

// GET ?action=get_product&id=X&soc_id=Y — confirmed real (handleGetProduct()
// in purchase_handler.php). This is what actually backs the real page's
// per-supplier "buying price" auto-fill on the Unit Price column — it reads
// llx_product_fournisseur_price for that exact (product, supplier) pair.
// Falls back to the product's own catalog sale price when no supplier-
// specific price is on file (that field comes back 0/'' from the real
// endpoint itself in that case), so the field is never left at 0 for no
// reason.
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
      const d = await callApi<{
        price: number
        tva_tx: number
        default_vat_code: string
        buying_price: number
        supplier_ref: string
      }>({ action: 'get_product', id: productId, soc_id: vendorId })
      return {
        buyingPrice: Number(d.buying_price) || Number(d.price) || 0,
        supplierRef: d.supplier_ref || '',
        vatRate: Number(d.tva_tx) || 0,
        vatCode: d.default_vat_code || '',
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

// Payment Terms (llx_c_payment_term) has no REST route on this backend —
// same gap OrderCreateForm.tsx's useOrderDictionaries hit for Sales Orders.
// The dictionary table is shared platform-wide (not order-type-specific), so
// this scrapes the Purchase Order page's own real markup instead of
// duplicating a whole new page just to read the same <select
// name="cond_reglement_id">, reusing the already-exported, generic
// parseOrderDictionaries() rather than copying its logic.
function usePurchasePaymentTerms() {
  return useQuery({
    queryKey: ['purchaseOrders', 'paymentTerms'],
    queryFn: async (): Promise<DictionaryOption[]> => {
      const doc = await fetchLegacyDocument('/commande/purchaseorder/index_v2.php')
      if (looksLikeLegacyLoginPage(doc)) return []
      return parseOrderDictionaries(doc).paymentTerms
    },
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

// The real page's own createOrder() (purchaseorder.js) sends a Unix
// timestamp for both `date` and `date_livraison` — built via
// Date.UTC(year, month-1, day)/1000 (convertEcuentaDate()), not a "YYYY-MM-DD"
// string. Matched exactly here rather than letting the backend guess at a
// plain date string.
function toUtcTimestamp(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 1000)
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

export function PurchaseOrderCreateForm() {
  const today = new Date().toISOString().slice(0, 10)
  const [vendorId, setVendorId] = useState('')
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

  const { user } = useAuth()
  const logActivity = useLogActivity()
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
  const { data: supplierProductInfo } = useSupplierProductInfo(vendorId, draftProductId)

  // Mirrors the real page's onSupplierChange() → auto-fill exactly (see
  // useSupplierDefaults' header comment) — only into fields still at their
  // initial blank value, so it never clobbers something the user already
  // picked.
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

  // POST ?action=create — full real contract, read directly from
  // handleCreateOrder() in purchase_handler.php. product_type is hardcoded
  // to 0 for every line on purpose: that's exactly what the real page's own
  // createOrder() sends too (purchaseorder.js), regardless of the actual
  // product's type. multicurrency is intentionally simplified to the same
  // degree OrderCreateForm.tsx's Sales Order equivalent is — only the
  // top-level code/rate are sent, not a separate per-line foreign-currency
  // price.
  const createMutation = useMutation({
    mutationFn: async (validate: boolean) => {
      const body = {
        action: 'create',
        socid: Number(vendorId),
        date: toUtcTimestamp(date),
        supplier_ref: refVendor || undefined,
        note_public: notePublic || undefined,
        note_private: notePrivate || undefined,
        fk_project: projectId ? Number(projectId) : undefined,
        date_livraison: deliveryDate ? toUtcTimestamp(deliveryDate) : undefined,
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
          supplier_ref: l.supplierRef || '',
          tva_tx: l.vatRate,
          default_vat_code: l.vatCode,
          remise_percent: discountToRemisePercent(l.qty, l.unitPrice, l.discountPct, l.discountType),
          product_type: 0,
        })),
      }
      const { data } = await axios.post<ApiEnvelope<CreatedOrder>>(`${API_URL}?action=create`, body, { validateStatus: () => true })
      if (!data.success) {
        const detail = data.details ? Object.values(data.details).join(' ') : undefined
        throw new Error(detail ?? data.error ?? 'Failed to create purchase order')
      }
      return data.data as CreatedOrder
    },
    onSuccess: (order, validate) => {
      const vendorName = vendors?.find((v) => v.id === vendorId)?.name ?? 'a vendor'
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `${validate ? 'New' : 'Draft'} purchase order ${order.ref} for ${vendorName}`, category: 'purchase', authorName })
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
    setVendorId('')
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
        footerLeft={<Link to={ROUTES.purchaseOrderList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">Back to List</Link>}
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
          <Link to={ROUTES.purchaseOrderList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
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
              {/* purchase_handler.php's addline() step is confirmed broken on the backend
                  (silently fails with a blank error, no matter the line data) — verified
                  2026-08-28. Not fixable from the frontend, so on any create failure we
                  offer the real, working multi-step legacy form as a fallback instead. */}
              <a
                href={`/fourn/commande/card.php?action=create${vendorId ? `&socid=${vendorId}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                Create in legacy system instead <ExternalLink size={13} />
              </a>
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
              <SearchableSelect value={vendorId} onChange={setVendorId} options={vendorOptions} placeholder={vendorsLoading ? 'Loading…' : 'Select a third party'} />
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
