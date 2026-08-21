import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Check, X, Plus, Pencil, Trash2, LoaderCircle, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { api } from '../../../api/axios'
import { formatMoney, formatNumber } from '../../../utils/format'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useProductFormOptions } from '../../zra/createProduct.queries'
import { useCustomerLookups } from '../../customers/thirdPartyOptions.queries'
import { useLogActivity } from '../../agenda/agenda.queries'
import { useAuth } from '../../auth/AuthContext'
import { QuickCustomerCreateModal } from './QuickCustomerCreateModal'
import { QuickProductCreateModal } from './QuickProductCreateModal'

interface ProjectOption {
  id: number
  ref: string
  title: string
}

// GET /api/salesorder/?action=get_projects — this backend's own contract
// differs by environment: the version this form was originally built
// against (ecnta10) returned all active projects (fk_statut = 1)
// unconditionally, matching the reference layout's project <select> query
// in commande/salesorder/index_v2.php. The current backend (ecuenta9)
// requires a `socid` param and 400s ("Customer ID is required") without
// one, filtering to that customer's own projects instead. Gating this
// query on customerId (and passing socid) satisfies ecuenta9's contract
// and is harmless on ecnta10 too (socid is simply an extra param it never
// reads) — it just means the Project dropdown only populates once a
// customer is picked, same order the rest of the form already expects.
function useProjectOptions(socid: string) {
  return useQuery({
    queryKey: ['salesorder', 'projects', socid],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ProjectOption[] }>('/salesorder/?action=get_projects', { params: { socid } })
      return data.data ?? []
    },
    enabled: socid !== '',
    staleTime: 1000 * 60,
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

// GET /api/{bank_accounts,payment_types,availability_delays,shipping_methods,payment_terms}.php
// — all 5 real Dolibarr dictionaries (llx_bank_account, llx_c_paiement,
// llx_c_availability, llx_c_shipment_mode, llx_c_payment_term), the exact
// same tables commande/salesorder/index_v2.php's own select_comptes() /
// select_types_paiements() / selectAvailabilityDelay() / selectShippingMethod()
// / select_conditions_paiements() calls read. The first two already existed
// but 404'd via this app's X-API-Key auth (missing NOLOGIN — fixed); the
// other three are new, added specifically for this page, matching the same
// file structure/auth.
function useDictionary(path: string) {
  return useQuery({
    queryKey: ['dictionary', path],
    queryFn: async (): Promise<DictionaryOption[]> => {
      const { data } = await api.get<DictionaryResponse>(path)
      return data.success ? data.results.map((r) => ({ id: String(r.id), text: r.text })) : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

interface CustomerDefaults {
  fkAccount: number | null
  bankAccountName: string
  shippingMethodId: number | null
  shippingMethodName: string
  warehouseId: number | null
  multicurrencyCode: string | null
  multicurrencyTx: number
  notePublic: string | null
  notePrivate: string | null
}

// GET /api/salesorder/?action=get_customer&id=X — confirmed real endpoint
// (handleGetCustomer() in api/salesorder/index.php), built specifically to
// carry a customer's own stored defaults (payment/shipping/currency/notes)
// onto a new order the way the legacy form does when you pick a customer —
// existed the whole time, was just never called from this form. Field
// names below are camelCased at the boundary; the raw response uses
// fk_account/shipping_method_id/etc. directly.
function useCustomerDefaults(socid: string) {
  return useQuery({
    queryKey: ['salesorder', 'customer-defaults', socid],
    queryFn: async (): Promise<CustomerDefaults> => {
      const { data } = await api.get<{
        success: boolean
        data: {
          fk_account: string | number | null
          bank_account: string
          shipping_method_id: number | null
          shipping_method_name: string
          warehouse_id: number | null
          multicurrency_code: string | null
          multicurrency_tx: number
          note_public: string | null
          note_private: string | null
        }
      }>('/salesorder/?action=get_customer', { params: { id: socid } })
      const d = data.data
      return {
        fkAccount: d.fk_account ? Number(d.fk_account) : null,
        bankAccountName: d.bank_account,
        shippingMethodId: d.shipping_method_id,
        shippingMethodName: d.shipping_method_name,
        warehouseId: d.warehouse_id,
        multicurrencyCode: d.multicurrency_code,
        multicurrencyTx: d.multicurrency_tx || 1,
        notePublic: d.note_public,
        notePrivate: d.note_private,
      }
    },
    enabled: socid !== '',
    staleTime: 1000 * 30,
  })
}

interface OrderLine {
  key: number
  productId: string
  description: string
  qty: number
  unitPrice: number
  // VAT and discount ARE real, sent fields (Commande::addline()'s tva_tx and
  // remise_percent params, read directly from api/salesorder/index.php's
  // handleCreateOrder() — see the mutationFn below). Cost Price has no
  // corresponding param exposed by this endpoint's addline() call, so that
  // one stays display-only.
  vatRate: number
  // Display-only "A"/"B"/etc. suffix so added lines can show "16%(A)" the
  // same way the entry row and the reference layout do — not sent on
  // submit, vatRate carries the real numeric rate for that.
  vatCode: string
  discountPct: number
  costPrice: number
}

let lineKeySeq = 0

interface CreateOrderResponse {
  success: boolean
  error?: string
  message?: string
  details?: Record<string, string>
}

const WIZARD_STEPS = [
  { title: 'Order Details', subtitle: 'Basic information' },
  { title: 'Items', subtitle: 'Add products/services' },
  { title: 'Complete Order', subtitle: 'Review amounts & confirm' },
]

export function OrderCreateForm() {
  const today = new Date().toISOString().slice(0, 10)
  const [step, setStep] = useState(0)
  const [customerId, setCustomerId] = useState('')
  const [refCustomer, setRefCustomer] = useState('')
  const [date, setDate] = useState(today)
  // Added/confirmed lines only — the in-progress line being built lives in
  // the draft* state below, matching the legacy page's own entry-row-then-
  // Add-button pattern (index_v2.php's #lines-tbody-modern + OrderManager.
  // addLineFromInline() in commande/salesorder/js/salesorder.js), rather
  // than every row being directly editable inline.
  const [lines, setLines] = useState<OrderLine[]>([])
  const [draftProductId, setDraftProductId] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftVatRate, setDraftVatRate] = useState(0)
  const [draftVatCode, setDraftVatCode] = useState('')
  const [draftUnitPrice, setDraftUnitPrice] = useState(0)
  const [draftQty, setDraftQty] = useState(1)
  const [draftDiscountPct, setDraftDiscountPct] = useState(0)
  const [draftCostPrice, setDraftCostPrice] = useState(0)
  const [editingLineKey, setEditingLineKey] = useState<number | null>(null)
  const [projectId, setProjectId] = useState('')
  const [formError, setFormError] = useState('')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [warehouse, setWarehouse] = useState('')
  // Real field (Commande::$warehouse_id / stock reservation flag), but this
  // endpoint's handleCreateOrder() never reads a reserve-stock input at
  // all — there's nothing to send it as, so it stays visual-only until the
  // backend accepts it.
  const [reserveStock, setReserveStock] = useState(true)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')

  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  // Rich picker for the Customer field — matches the reference layout's own customer search
  // dropdown (Form::select_thirdparty_list()), which shows ref/Tpin/Country per result
  // instead of a plain name. Same pattern as productOptions below.
  const customerSelectOptions = useMemo(
    () =>
      (customers ?? []).map((c) => ({
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
      })),
    [customers],
  )
  const { data: products } = useProductOptions()
  // Rich picker for the entry row's Product/Service field — matches the reference layout's
  // own product search dropdown (Form::select_produits()), which shows Ref/Classification/
  // Price/Stock per result rather than a plain label. Built client-side from the same
  // already-loaded product catalog rather than a new per-keystroke server search, since the
  // whole catalog is already fetched here for the plain-select fallback elsewhere in the app.
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
  const { data: projects, isLoading: projectsLoading } = useProjectOptions(customerId)
  // Warehouses: real (llx_entrepot via zra/product-form-options/, already
  // used elsewhere in the app). Currency/Incoterms: real
  // (customers/lookups/, llx_multicurrency / llx_c_incoterms). Bank
  // account/Payment Type/Payment Terms/Availability delay/Shipping method:
  // now all 5 real dictionaries too (see useDictionary above) — the first
  // two existed but were unreachable via X-API-Key (fixed by adding
  // NOLOGIN), the other three are new endpoints added for this page,
  // mirroring exactly what commande/salesorder/index_v2.php's own
  // select_comptes()/select_types_paiements()/selectAvailabilityDelay()/
  // selectShippingMethod()/select_conditions_paiements() calls read.
  const { data: formOptions } = useProductFormOptions()
  const { data: lookups } = useCustomerLookups()
  const { data: customerDefaults } = useCustomerDefaults(customerId)
  const { data: bankAccounts } = useDictionary('/bank_accounts.php')
  const { data: paymentTypes } = useDictionary('/payment_types.php')
  const { data: availabilityDelays } = useDictionary('/availability_delays.php')
  const { data: shippingMethods } = useDictionary('/shipping_methods.php')
  const { data: paymentTerms } = useDictionary('/payment_terms.php')
  const [currencyCode, setCurrencyCode] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1.0')
  const [bankAccountId, setBankAccountId] = useState('')
  const [shippingMethodId, setShippingMethodId] = useState('')
  const [availabilityId, setAvailabilityId] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [paymentTypeId, setPaymentTypeId] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logActivity = useLogActivity()
  const { user } = useAuth()

  // Carries the selected customer's own real stored defaults onto the
  // order — same behavior as the legacy form's own customer-change handler
  // (index_v2.php fetches the customer and auto-fills currency/rate/
  // warehouse/notes). Only applied once per customer selection, and only
  // into fields still at their initial value, so it never clobbers
  // something the user already typed.
  useEffect(() => {
    if (!customerDefaults) return
    if (customerDefaults.multicurrencyCode) setCurrencyCode((prev) => prev || customerDefaults.multicurrencyCode!)
    setExchangeRate((prev) => (prev === '1.0' ? String(customerDefaults.multicurrencyTx) : prev))
    if (customerDefaults.warehouseId) setWarehouse((prev) => prev || String(customerDefaults.warehouseId))
    if (customerDefaults.notePublic) setNotePublic((prev) => prev || customerDefaults.notePublic!)
    if (customerDefaults.notePrivate) setNotePrivate((prev) => prev || customerDefaults.notePrivate!)
    if (customerDefaults.fkAccount) setBankAccountId((prev) => prev || String(customerDefaults.fkAccount))
    if (customerDefaults.shippingMethodId) setShippingMethodId((prev) => prev || String(customerDefaults.shippingMethodId))
  }, [customerDefaults])

  function pickDraftProduct(productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    setDraftProductId(productId)
    setDraftDescription(product?.label ?? '')
    setDraftUnitPrice(product?.priceExclTax ?? 0)
    setDraftVatRate(product?.vatRatePct ?? 0)
    setDraftVatCode(product?.vatCode ?? '')
    setDraftCostPrice(product?.costPrice ?? 0)
  }

  function resetDraftLine() {
    setDraftProductId('')
    setDraftDescription('')
    setDraftVatRate(0)
    setDraftVatCode('')
    setDraftUnitPrice(0)
    setDraftQty(1)
    setDraftDiscountPct(0)
    setDraftCostPrice(0)
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

    // Picking the same catalog product again just bumps that line's quantity instead of
    // adding a duplicate row — only when adding fresh (not while editing an existing line,
    // which should update that one line in place) and only for real products (a productId),
    // since two free-text custom lines can't be reliably compared as "the same" item.
    if (editingLineKey == null && draftProductId) {
      const existing = lines.find((l) => l.productId === draftProductId)
      if (existing) {
        setLines((prev) => prev.map((l) => (l.key === existing.key ? { ...l, qty: l.qty + draftQty } : l)))
        resetDraftLine()
        return
      }
    }

    const line: OrderLine = {
      key: editingLineKey ?? lineKeySeq++,
      productId: draftProductId,
      description: draftDescription,
      qty: draftQty,
      unitPrice: draftUnitPrice,
      vatRate: draftVatRate,
      vatCode: draftVatCode,
      discountPct: draftDiscountPct,
      costPrice: draftCostPrice,
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
    setDraftDiscountPct(line.discountPct)
    setDraftCostPrice(line.costPrice)
    setEditingLineKey(key)
  }

  function deleteLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
    if (editingLineKey === key) resetDraftLine()
  }

  const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0)
  const totalTax = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPct / 100) * (l.vatRate / 100), 0)
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0)

  // POST /api/salesorder/?action=create — full real contract, read directly
  // from handleCreateOrder() in api/salesorder/index.php. Two bugs fixed
  // here vs. what this form sent before: (1) each line's product was sent
  // as `product_id`, but the backend's addline() call reads `fk_product` —
  // every line was silently created with no product attached regardless of
  // what was picked; (2) note_public/note_private/warehouse_id/
  // date_livraison/tva_tx/remise_percent are all real, accepted fields that
  // were simply never included in the request at all.
  const createMutation = useMutation({
    mutationFn: async (validate: boolean) => {
      const body = {
        action: 'create',
        socid: Number(customerId),
        date,
        ref_client: refCustomer || undefined,
        // Sent under both the correct property name (fk_project — what
        // ecnta10's handler assigns to Commande::$fk_project) and a
        // misspelled duplicate (fk_projet — what ecuenta9's handler
        // actually reads, per a real typo in that backend's create
        // action). Harmless extra key on either backend; without it,
        // ecuenta9 silently drops the project link on every order.
        fk_project: projectId ? Number(projectId) : undefined,
        fk_projet: projectId ? Number(projectId) : undefined,
        date_livraison: deliveryDate || undefined,
        warehouse_id: warehouse ? Number(warehouse) : undefined,
        note_public: notePublic || undefined,
        note_private: notePrivate || undefined,
        multicurrency_code: currencyCode || undefined,
        multicurrency_tx: currencyCode ? Number(exchangeRate) || 1 : undefined,
        fk_account: bankAccountId ? Number(bankAccountId) : undefined,
        shipping_method_id: shippingMethodId ? Number(shippingMethodId) : undefined,
        availability_id: availabilityId ? Number(availabilityId) : undefined,
        cond_reglement_id: paymentTermId ? Number(paymentTermId) : undefined,
        mode_reglement_id: paymentTypeId ? Number(paymentTypeId) : undefined,
        validate,
        lines: lines
          .filter((l) => l.description.trim() && l.qty > 0)
          .map((l) => ({
            fk_product: l.productId ? Number(l.productId) : undefined,
            desc: l.description,
            subprice: l.unitPrice,
            qty: l.qty,
            tva_tx: l.vatRate,
            remise_percent: l.discountPct,
          })),
      }
      const { data } = await api.post<CreateOrderResponse>('/salesorder/?action=create', body)
      if (!data.success) {
        const detail = data.details ? Object.values(data.details).join(' ') : undefined
        throw new Error(detail ?? data.error ?? data.message ?? 'Failed to create order')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      const customerName = customers?.find((c) => c.id === customerId)?.name ?? 'a customer'
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New sales order for ${customerName}`, category: 'orders', authorName })
      navigate(ROUTES.orderList)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to create order'),
  })

  // `validate` is a real accepted field (handleCreateOrder() checks
  // $input['validate'] and, if truthy and the user has commande->creer
  // rights, calls Commande::valid() right after creating) — this is what
  // actually distinguishes Save Draft from Create Order now, rather than
  // both buttons issuing the identical request.
  function handleSubmit(validate: boolean) {
    setFormError('')
    if (!customerId) {
      setFormError('Customer is required.')
      setStep(0)
      return
    }
    if (!lines.some((l) => l.description.trim() && l.qty > 0)) {
      setFormError('At least one Product is required.')
      setStep(1)
      return
    }
    createMutation.mutate(validate)
  }

  const isLastStep = step === WIZARD_STEPS.length - 1

  // Gate each step behind the fields it actually needs before letting the
  // wizard move on — mirrors handleSubmit's own final safety-net checks,
  // just surfaced earlier so a missing Customer doesn't turn up as a submit
  // error three steps later.
  function goNext() {
    setFormError('')
    if (step === 0) {
      if (!customerId) {
        setFormError('Customer is required.')
        return
      }
      if (!date) {
        setFormError('Order date is required.')
        return
      }
      if (!warehouse) {
        setFormError('Warehouse is required.')
        return
      }
      if (!paymentTypeId) {
        setFormError('Payment type is required.')
        return
      }
    }
    if (step === 1 && !lines.some((l) => l.description.trim() && l.qty > 0)) {
      setFormError('At least one Product is required.')
      return
    }
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1))
  }

  const selectedCustomerName = customers?.find((c) => c.id === customerId)?.name ?? ''
  const selectedWarehouseName = formOptions?.warehouses?.find((w) => w.value === warehouse)?.label ?? ''
  const selectedProject = projects?.find((p) => String(p.id) === projectId)
  const selectedProjectLabel = selectedProject ? `${selectedProject.ref} — ${selectedProject.title}` : ''
  const selectedPaymentTypeName = paymentTypes?.find((p) => p.id === paymentTypeId)?.text ?? ''
  const selectedPaymentTermName = paymentTerms?.find((t) => t.id === paymentTermId)?.text ?? ''
  const selectedBankAccountName = bankAccounts?.find((b) => b.id === bankAccountId)?.text ?? ''
  const selectedShippingMethodName = shippingMethods?.find((s) => s.id === shippingMethodId)?.text ?? ''
  const selectedAvailabilityName = availabilityDelays?.find((a) => a.id === availabilityId)?.text ?? ''

  return (
    <>
      <StickyFormShell
        headerClassName="pt-1.5 pb-2.5"
      header={
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <ShoppingCart size={20} className="text-brand" /> New Sales Order
          </h2>
          <div className="flex items-center mt-3">
            {WIZARD_STEPS.map((s, i) => {
              const isDone = i < step
              const isActive = i === step
              return (
                <div key={s.title} className={`flex items-center ${i < WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <button type="button" onClick={() => i <= step && setStep(i)} title={s.subtitle} className="flex items-center gap-2.5 group text-left">
                    <span
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                        isDone
                          ? 'bg-success border-success text-white'
                          : isActive
                            ? 'bg-brand border-brand text-white shadow-sm shadow-brand/30'
                            : 'bg-surface border-border text-text-faint'
                      }`}
                    >
                      {isDone ? <Check size={14} /> : i + 1}
                    </span>
                    <span className="hidden sm:block">
                      <span className={`block text-sm ${isActive ? 'text-text! font-semibold' : 'text-text-faint'}`}>{s.title}</span>
                      <span className="block text-xs text-text-faint">{s.subtitle}</span>
                    </span>
                  </button>
                  {i < WIZARD_STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-3 rounded-full transition-colors ${i < step ? 'bg-success' : 'bg-border'}`} />}
                </div>
              )
            })}
          </div>
        </>
      }
      // formError renders in the sticky footer (always on screen) rather than only inline
      // after the active step's Card — that inline spot can end up well below the fold now
      // that the Order Details/Item Table/Complete Order cards stretch to match the Order
      // Summary sidebar's height (see the h-full comments below), which was silently hiding
      // the "Customer is required." style messages goNext() sets on failed validation.
      footerLeft={
        <div className="flex items-center gap-3">
          <Link to={ROUTES.orderList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
          {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
        </div>
      }
      footerRight={
        <>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {createMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
              {createMutation.isPending ? 'Creating…' : 'Create Order'}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Next: {WIZARD_STEPS[step + 1].title} <ChevronRight size={14} />
            </button>
          )}
        </>
      }
    >
      {/* No min-h-0 here (unlike StickyFormShell's own wrapper, which deliberately carries
          one — see its comment): min-h-0 sets an explicit min-height: 0, which unconditionally
          overrides the browser's normal "never shrink a flex/grid item below its content"
          behavior, regardless of overflow. That's exactly the bug class already hit twice on
          this page (Card h-full collapse, then the Item Table's overflow-hidden triggering the
          same automatic-minimum-size override) — this wrapper doesn't want per-card internal
          scrolling, it wants to grow naturally and let the page scroll, so it stays out of that
          shrink calculation entirely. shrink-0 makes that explicit rather than relying on the
          absence of min-h-0 alone. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 shrink-0">
        <div className="flex flex-col gap-4 min-w-0">
          {step === 0 && (
            // No !h-auto here: Card's default h-full is what we want this time — it lets this
            // column stretch to match the Order Summary sidebar's height (CSS Grid's own
            // align-items: stretch default makes both grid-item wrappers the same height
            // already; h-full just lets the Card fill that height instead of only its own
            // content). shrink-0 still guards against the separate, unrelated collapse bug
            // (StickyFormShell's flex-col ancestor being allowed to squeeze this smaller than
            // its content) — that risk is specific to shrinking below content, not growing
            // taller to match a sibling, so it's safe to combine with h-full here.
            <Card className="shrink-0">
              <h3 className="font-semibold text-text!">Order Details</h3>
              <p className="text-sm text-text-faint mb-4">Enter basic information for the sales order</p>

              {/* Customer gets its own full-width highlighted box above the field grid,
                  matching the reference layout (commande/salesorder/index_v2.php). */}
              <div className="rounded-lg bg-surface-alt border border-border p-3 mb-4">
                <Field label="Customer" required>
                  <SearchableSelect
                    value={customerId}
                    onChange={setCustomerId}
                    options={customerSelectOptions}
                    placeholder={customersLoading ? 'Loading…' : 'Select a third party'}
                    onAddNew={() => setShowCustomerModal(true)}
                    addNewLabel="Add New Customer"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Order Date" required>
                  <div className="flex items-center gap-2">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
                    <button type="button" onClick={() => setDate(today)} className="shrink-0 rounded-md border border-input-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover">
                      Now
                    </button>
                  </div>
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-text">
                    Warehouse<span className="text-danger">*</span>
                  </span>
                  <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={inputClasses}>
                    <option value="">Select a warehouse</option>
                    {formOptions?.warehouses?.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Field label="Project">
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!customerId} className={inputClasses}>
                    <option value="">{!customerId ? 'Select a customer first' : projectsLoading ? 'Loading…' : '-- Select --'}</option>
                    {projects?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ref} — {p.title}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Expected Delivery Date">
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClasses} />
                </Field>
                <Field label="Customer Reference">
                  <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} placeholder="Ref. customer" className={inputClasses} />
                </Field>
                <Field label="Availability Delay">
                  <select value={availabilityId} onChange={(e) => setAvailabilityId(e.target.value)} className={inputClasses}>
                    <option value="">Select an availability delay</option>
                    {availabilityDelays?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.text}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="flex flex-col gap-1">
                  <span className="text-sm text-text">Stock Reserve</span>
                  <label
                    className="flex items-center gap-1.5 text-sm text-text-muted whitespace-nowrap py-2"
                    title="Not sent — handleCreateOrder() has no reserve-stock input to accept it"
                  >
                    <input type="checkbox" checked={reserveStock} onChange={(e) => setReserveStock(e.target.checked)} className="rounded border-input-border text-brand focus:ring-brand/30" />
                    Reserve Stock
                  </label>
                </div>
                {/* Bank account/Availability delay/Shipping method/Payment Terms/Payment Type: all real,
                    accepted fields on the create endpoint (fk_account, availability_id, shipping_method_id,
                    cond_reglement_id, mode_reglement_id), backed by 5 real dictionary endpoints — the same
                    llx_bank_account/llx_c_paiement/llx_c_availability/llx_c_shipment_mode/llx_c_payment_term
                    tables commande/salesorder/index_v2.php's own select_comptes()/select_types_paiements()/
                    selectAvailabilityDelay()/selectShippingMethod()/select_conditions_paiements() calls read.
                    Bank account and Shipping method pre-select the chosen customer's own stored default
                    (useCustomerDefaults) when one exists, same as legacy's customer-change auto-fill. */}
                <Field label="Bank Account">
                  <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={inputClasses}>
                    <option value="">Select a bank account</option>
                    {bankAccounts?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.text}
                        {customerDefaults?.fkAccount != null && String(customerDefaults.fkAccount) === b.id ? ' (customer default)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-text">
                    Payment Type<span className="text-danger">*</span>
                  </span>
                  <select value={paymentTypeId} onChange={(e) => setPaymentTypeId(e.target.value)} className={inputClasses}>
                    <option value="">Select a payment type</option>
                    {paymentTypes?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.text}
                      </option>
                    ))}
                  </select>
                </div>
                <Field label="Shipping Method">
                  <select value={shippingMethodId} onChange={(e) => setShippingMethodId(e.target.value)} className={inputClasses}>
                    <option value="">Select a shipping method</option>
                    {shippingMethods?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.text}
                        {customerDefaults?.shippingMethodId != null && String(customerDefaults.shippingMethodId) === s.id ? ' (customer default)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Payment Terms">
                  <select value={paymentTermId} onChange={(e) => setPaymentTermId(e.target.value)} className={inputClasses}>
                    <option value="">Select payment terms</option>
                    {paymentTerms?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.text}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-text">
                    Currency<span className="text-danger">*</span>
                  </span>
                  <select
                    value={currencyCode}
                    onChange={(e) => {
                      setCurrencyCode(e.target.value)
                      // Same-currency orders always convert 1:1 — a real rate for
                      // anything else only arrives via useCustomerDefaults above
                      // (multicurrency_tx, sourced from the customer's own stored
                      // rate or MultiCurrency::getIdAndTxFromCode()), so picking a
                      // currency the current customer has no rate for leaves this
                      // at 1.0 rather than guessing a conversion.
                      if (!e.target.value) setExchangeRate('1.0')
                    }}
                    className={inputClasses}
                  >
                    <option value="">Zambian Kwacha (ZMW) — default</option>
                    {lookups?.currencies?.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Field label="Note (Private)">
                  <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} placeholder="Enter private note…" rows={2} className={inputClasses} />
                </Field>
                <Field label="Note (Public)">
                  <textarea value={notePublic} onChange={(e) => setNotePublic(e.target.value)} placeholder="Enter public note…" rows={2} className={inputClasses} />
                </Field>
              </div>
            </Card>
          )}

          {step === 1 && (
            // h-full (Card's default, kept here) + shrink-0: h-full lets this column stretch to
            // match the Order Summary sidebar via CSS Grid's own align-items: stretch — safe
            // here specifically because grid stretch only ever GROWS the shorter item in a row
            // to match the tallest one's natural content height, never shrinks the tallest item
            // below its own content. shrink-0 guards a different, real risk: StickyFormShell's
            // content wrapper is `flex flex-col min-h-0` (deliberate — see that file's comment,
            // it lets a card that WANTS internal scrolling shrink below its content), and this
            // card doesn't want that. It has overflow-hidden (for the rounded-corner table
            // clipping), and overflow anything-but-visible is exactly what resets a flex item's
            // automatic minimum size to 0 — without shrink-0 the outer flex context could still
            // compress this card toward zero height once the page grows tall enough, and
            // overflow-hidden would clip away everything that didn't fit instead of showing a
            // scrollbar. Same root-cause class as ThirdPartyCreateForm.tsx's Card bug — never
            // fix this in Card itself.
            <Card className="shrink-0 !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="font-semibold text-text!">Item Table</h3>
                  <p className="text-sm text-text-faint">Add products or services to this order</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-4 py-2.5">Product / Service</th>
                      <th className="font-medium px-4 py-2.5 w-32">VAT</th>
                      <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                      <th className="font-medium px-4 py-2.5 w-28">Unit Price (Incl.)</th>
                      <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                      <th className="font-medium px-4 py-2.5 w-20">Disc. %</th>
                      <th className="font-medium px-4 py-2.5 w-28">Cost Price</th>
                      <th className="font-medium px-4 py-2.5 w-32 text-right">Total (Incl.)</th>
                      <th className="w-24 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Entry row — builds one line at a time, "Add" appends it to the added-lines
                        list below. Matches the reference layout's own #lines-tbody-modern +
                        OrderManager.addLineFromInline() pattern (commande/salesorder/index_v2.php /
                        js/salesorder.js) instead of this app's earlier every-row-directly-editable
                        table. Cost Price is real on the product/Dolibarr side but this endpoint's
                        addline() call hardcodes pa_ht to 0 — kept here for parity with the reference
                        layout, but not sent on submit (see mutationFn above). */}
                    <tr className="border-b border-border align-top bg-surface-alt/50">
                      <td className="px-4 py-2 space-y-1">
                        <SearchableSelect
                          value={draftProductId}
                          onChange={pickDraftProduct}
                          options={productOptions}
                          placeholder="Select Predefined Product/Services"
                          onAddNew={() => setShowProductModal(true)}
                          addNewLabel="Add New Product"
                        />
                        <input
                          type="text"
                          value={draftDescription}
                          onChange={(e) => setDraftDescription(e.target.value)}
                          placeholder="Description"
                          className={inputClasses}
                        />
                      </td>
                      <td className="px-4 py-2">
                        {/* Read-only, matching the reference layout's own line_vat_input field
                            exactly (readonly text, "16%(A)") — VAT is always derived from the
                            selected product there, never freely typed. */}
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
                          className={inputClasses}
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
                          className={inputClasses}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} step="0.01" value={draftQty} onChange={(e) => setDraftQty(Number(e.target.value))} className={inputClasses} />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={draftDiscountPct}
                          onChange={(e) => setDraftDiscountPct(Number(e.target.value))}
                          className={inputClasses}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={draftCostPrice}
                          onChange={(e) => setDraftCostPrice(Number(e.target.value))}
                          title="Not sent on submit — this endpoint's addline() call hardcodes cost price to 0"
                          className={inputClasses}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                        {formatMoney(draftQty * draftUnitPrice * (1 - draftDiscountPct / 100) * (1 + draftVatRate / 100))}
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
                      const lineExclDiscount = line.qty * line.unitPrice * (1 - line.discountPct / 100)
                      const lineIncl = lineExclDiscount * (1 + line.vatRate / 100)
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
                          <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{line.discountPct}%</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{line.costPrice ? formatMoney(line.costPrice) : '—'}</td>
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
              {lines.length === 0 && <p className="px-4 py-3 text-sm text-text-faint">Add Product.</p>}
            </Card>
          )}

          {step === 2 && (
            // No !h-auto — same reasoning as the Order Details card above: h-full lets this
            // column stretch to match the Order Summary sidebar's height via grid's stretch
            // default, which is safe (it only grows the shorter side, never shrinks the taller
            // one). shrink-0 still guards against StickyFormShell's outer flex-col context.
            <Card className="shrink-0">
              <h3 className="font-semibold text-text!">Complete Order</h3>
              <p className="text-sm text-text-faint mb-4">Review everything below, then create the order</p>

              <h4 className="font-semibold text-text! mb-2">Order Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 mb-6">
                <div>
                  <p className="text-xs text-text-faint">Customer</p>
                  <p className="text-sm text-text!">{selectedCustomerName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Order Date</p>
                  <p className="text-sm text-text!">{date || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Warehouse</p>
                  <p className="text-sm text-text!">{selectedWarehouseName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Project</p>
                  <p className="text-sm text-text!">{selectedProjectLabel || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Expected Delivery Date</p>
                  <p className="text-sm text-text!">{deliveryDate || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Customer Reference</p>
                  <p className="text-sm text-text!">{refCustomer || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Availability Delay</p>
                  <p className="text-sm text-text!">{selectedAvailabilityName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Stock Reserve</p>
                  <p className="text-sm text-text!">{reserveStock ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Bank Account</p>
                  <p className="text-sm text-text!">{selectedBankAccountName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Payment Type</p>
                  <p className="text-sm text-text!">{selectedPaymentTypeName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Shipping Method</p>
                  <p className="text-sm text-text!">{selectedShippingMethodName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Payment Terms</p>
                  <p className="text-sm text-text!">{selectedPaymentTermName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Currency</p>
                  <p className="text-sm text-text!">{currencyCode || 'Zambian Kwacha (ZMW)'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Note (Private)</p>
                  <p className="text-sm text-text!">{notePrivate || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-faint">Note (Public)</p>
                  <p className="text-sm text-text!">{notePublic || '—'}</p>
                </div>
              </div>

              {/* Reference-only recap, deliberately plain (no header row shading/uppercase, no
                  border box) so it doesn't read as another editable grid like the Items step's
                  own Item Table — this is just a quick glance-back, not a place to work. */}
              <h4 className="font-semibold text-text! mb-2 border-t border-border pt-4">Product Information ({lines.length})</h4>
              {/* max-h + overflow-y-auto: caps how much this reference table can push the page
                  down once there are enough lines — it scrolls internally past that point
                  instead of the Card (and the page) just growing without bound. */}
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-faint border-b border-border">
                      <th className="font-medium py-1.5 pr-3">Product</th>
                      <th className="font-medium py-1.5 pr-3 text-center">VAT</th>
                      <th className="font-medium py-1.5 pr-3 text-right">Unit Price</th>
                      <th className="font-medium py-1.5 pr-3 text-center">Qty</th>
                      <th className="font-medium py-1.5 pr-3text-center">Disc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 text-text-faint">
                          No lines added.
                        </td>
                      </tr>
                    )}
                    {lines.map((line) => (
                      <tr key={line.key} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-3 text-text!">{line.description}</td>
                        <td className="py-1.5 pr-3 text-center tabular-nums text-text-muted">
                          {line.vatRate}%{line.vatCode ? `(${line.vatCode})` : ''}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-text-muted">{formatMoney(line.unitPrice)}</td>
                        <td className="py-1.5 pr-3 text-center tabular-nums text-text-muted">{formatNumber(line.qty)}</td>
                        <td className="py-1.5 text-center tabular-nums text-text-muted">{line.discountPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Order Summary — persists across every step, matching the reference wizard's own
            always-visible sidebar. Total (Incl. Tax) and Total Amount both show the same
            value on purpose (matches the reference layout's own redundant total-display
            pattern, kept for fidelity rather than dropping the "duplicate"). */}
        <div className="lg:sticky lg:top-0">
          {/* No !h-auto — this is the other half of the equal-height pair: h-full lets the
              sidebar stretch to match whichever main-column card is active (Order Details,
              Item Table, or Complete Order), instead of leaving a gap under it when its own
              content is shorter. */}
          <Card className="shrink-0">
            <h3 className="font-semibold text-text! mb-3">Order Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Items</span>
                <span className="tabular-nums text-text!">{lines.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total Qty</span>
                <span className="tabular-nums text-text!">{formatNumber(totalQty)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Subtotal (Excl. Tax)</span>
                <span className="tabular-nums text-text!">{formatMoney(total)} ZMW</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total Tax</span>
                <span className="tabular-nums text-text!">{formatMoney(totalTax)} ZMW</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-text-muted">Total (Incl. Tax)</span>
                <span className="font-bold tabular-nums text-info">{formatMoney(total + totalTax)} ZMW</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total Amount</span>
                <span className="font-bold tabular-nums text-success">{formatMoney(total + totalTax)} ZMW</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface-alt border border-border p-3">
              <p className="text-xs text-text-faint mb-2">You can save this order as draft and complete it later.</p>
              <button
                type="button"
                disabled={createMutation.isPending || !customerId}
                onClick={() => handleSubmit(false)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
              >
                <Save size={14} /> Save Draft
              </button>
            </div>
          </Card>
        </div>
      </div>
      </StickyFormShell>

      {showCustomerModal && (
        <QuickCustomerCreateModal
          onClose={() => setShowCustomerModal(false)}
          onCreated={(created) => {
            setCustomerId(created.id)
            setShowCustomerModal(false)
          }}
        />
      )}
      {showProductModal && (
        <QuickProductCreateModal
          onClose={() => setShowProductModal(false)}
          onCreated={() => setShowProductModal(false)}
        />
      )}
    </>
  )
}
