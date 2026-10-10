import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Check, X, Info, Plus, Trash2, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { resolveLegacyRoute } from '../../../shared/legacyRoute'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { Avatar } from '../../../shared/components/Avatar'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useProductOptions } from '../../products/products.queries'
import { PartialInvoiceError, useCreateInvoiceReturningId, useCreateInvoice, useCreateTypedInvoice, useInvoiceCreateContext, type NewInvoiceInput, type NewInvoiceLine } from '../invoiceCreate.queries'
import { CREDIT_NOTE_REASONS, useCreateCreditNote } from '../salesInvoiceActions.queries'
import { convertToRecurringInvoice } from '../salesInvoiceTabs.queries'
import { useInvoicesSummary } from '../invoices.queries'
import { formatMoney } from '../../../utils/format'
import { useWarehousePickerOptions } from '../../warehouses/warehouseExtras.queries'
import { useProjectsList } from '../../projects/projects.queries'
import { useGeneralSettings } from '../../settings/settings.queries'
import { useBankAccountOptions, useCustomerInvoiceDefaults, useInvoiceCurrencies, usePaymentTerms } from '../invoiceFormOptions.queries'

// The five kinds of invoice the classic "Create Detailed Invoice" page offers.
// Each one is saved the way the backend can really save it:
//  - Standard: the invoice API (compta/facture/api/unified_invoice_api.php), in one step.
//  - Lpo / Export: the classic form's own POST (type 6 / 7, Ref No, LPO No, incoterms),
//    then the lines — see invoiceCreate.queries.ts. Offered when the backend's ZRA module is on.
//  - Template invoice: a standard draft converted into a recurring template
//    (compta/sales/api/recurring_invoice.php), which removes the draft.
//  - Credit note: made from the invoice it corrects (compta/sales/api/invoice.php,
//    action=createcreditnote) — the classic page only enables it once a customer is chosen.
type InvoiceKind = 'standard' | 'lpo' | 'export' | 'template' | 'credit'

const KINDS: { key: InvoiceKind; label: string; info: string }[] = [
  { key: 'standard', label: 'Standard invoice', info: 'An ordinary invoice for goods or services.' },
  { key: 'lpo', label: 'Lpo', info: 'An invoice raised against a customer’s local purchase order — needs the Ref No and LPO No.' },
  { key: 'export', label: 'Export', info: 'An invoice for goods sold for export.' },
  { key: 'template', label: 'Template invoice', info: 'A recurring invoice: the invoice below is saved as a template that the backend turns into a real invoice on a schedule.' },
  { key: 'credit', label: 'Credit note', info: 'Corrects an invoice you already issued — choose the invoice to correct.' },
]

// Real llx_c_paiement codes/labels (queried directly against the DB) — no
// dictionary endpoint exists for this on the backend, so it's a static list
// like BASE_CURRENCIES/INCOTERMS_OPTIONS elsewhere in this app rather than
// a live fetch, but the codes themselves are real and match what
// fk_mode_reglement actually stores.
const PAYMENT_TYPES = [
  { code: '01', label: 'Cash' },
  { code: '03', label: 'Cash/Credit' },
  { code: '02', label: 'Credit' },
  { code: 'CB', label: 'Credit card' },
  { code: '05', label: 'Debit card' },
  { code: '04', label: 'Bank cheque' },
  { code: '08', label: 'Bank transfer' },
  { code: '06', label: 'Mobile money' },
  { code: '07', label: 'Other' },
]

interface LineState extends NewInvoiceLine {
  key: number
}

let lineKeySeq = 0
function newLine(): LineState {
  return { key: lineKeySeq++, productId: '', label: '', qty: 1, unitPriceHt: 0, vatRate: 0 }
}

// The credit-note section's own fields (the invoice list that feeds its picker is
// loaded only while that type is open — see CreditNoteFields).
interface CreditState {
  sourceId: string
  createtype: 'lines' | 'remaining'
  reason: string
  notePrivate: string
}
const EMPTY_CREDIT: CreditState = { sourceId: '', createtype: 'lines', reason: CREDIT_NOTE_REASONS[0], notePrivate: '' }

// yyyy-MM-dd -> dd/MM/yyyy, the format the credit-note endpoint reads.
const ddmmyyyy = (iso: string) => iso.split('-').reverse().join('/')

// Invoices of the chosen customer that can be corrected: validated or paid.
function CreditNoteFields({ customerId, value, onChange }: { customerId: string; value: CreditState; onChange: (patch: Partial<CreditState>) => void }) {
  const { data: summary, isLoading, isError } = useInvoicesSummary()
  const sources = (summary?.rows ?? []).filter((r) => String(r.socid) === customerId && (r.rawStatut === 1 || r.rawStatut === 2))

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
      <Field label="Invoice to correct" required>
        <select value={value.sourceId} onChange={(e) => onChange({ sourceId: e.target.value })} disabled={!customerId} className={inputClasses}>
          <option value="">{!customerId ? 'Choose a customer first' : isLoading ? 'Loading…' : isError ? 'Could not load the invoices' : sources.length === 0 ? 'This customer has no invoice to correct' : 'Select an invoice'}</option>
          {sources.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.ref} — {r.invoiceDateLabel || r.invoiceDate} — {formatMoney(r.amountInclTax)} ({r.statusLabel || r.status})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Credit note for" required>
        <select value={value.createtype} onChange={(e) => onChange({ createtype: e.target.value as CreditState['createtype'] })} className={inputClasses}>
          <option value="lines">All lines of the invoice to correct</option>
          <option value="remaining">The remaining unpaid amount</option>
        </select>
      </Field>
      <Field label="Reason" required>
        <select value={value.reason} onChange={(e) => onChange({ reason: e.target.value })} className={inputClasses}>
          {CREDIT_NOTE_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2 xl:col-span-3">
        <Field label="Private note">
          <input type="text" value={value.notePrivate} onChange={(e) => onChange({ notePrivate: e.target.value })} className={inputClasses} />
        </Field>
      </div>
    </div>
  )
}

// Saves through the classic page's own JSON endpoint (see invoiceCreate.queries.ts)
// against llx_facture/llx_facturedet. Payment Terms, Bank account, Project and
// Currency are real (dictionary/scraped options, sent as cond_reglement_id,
// fk_account, projectid, multicurrency_*); Incoterms and Doc template are saved
// only for Lpo / Export invoices, whose classic form POST carries them — the
// single-call invoice API ignores them, so they are shown disabled for the rest.
// `fixedCustomerId` powers InvoiceCreateFromCustomerForm.tsx (reached from a
// specific customer's own Customer tab, "Create invoice or credit note"
// button) — same real customer-locked-field-not-a-different-page behavior
// confirmed for Quotations (see QuotationCreateForm.tsx's own comment),
// generalized here the same way rather than duplicated. `initialLines`
// powers InvoiceCreateFromOrderForm.tsx (the order's own real "Create
// Invoice" action) — seeds the Item Table from that order's real lines,
// same real conversion Dolibarr's own compta/facture/card.php?origin=
// commande does, without copying that PHP page's code.
export function InvoiceCreateForm({ fixedCustomerId, backTo, initialLines }: { fixedCustomerId?: string; backTo?: string; initialLines?: NewInvoiceLine[] } = {}) {
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: fixedCustomer } = useCustomerDetail(fixedCustomerId)
  const { data: products } = useProductOptions()
  const createInvoice = useCreateInvoice()
  const createTyped = useCreateTypedInvoice()
  const createDraftForTemplate = useCreateInvoiceReturningId()
  const { data: createContext, isLoading: contextLoading, isError: contextError, error: contextErr } = useInvoiceCreateContext()
  const { data: warehouses = [] } = useWarehousePickerOptions()
  // Like the classic page, the first open warehouse is the default.
  const warehouseId = String(warehouses.find((w) => w.open)?.id ?? warehouses[0]?.id ?? '')
  const navigate = useNavigate()
  const listLink = backTo ?? ROUTES.invoiceList

  const today = new Date().toISOString().slice(0, 10)

  const [kind, setKind] = useState<InvoiceKind>('standard')
  const [customerId, setCustomerId] = useState(fixedCustomerId ?? '')
  const [refClient, setRefClient] = useState('')
  const [date, setDate] = useState(today)
  const [paymentModeCode, setPaymentModeCode] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [projectId, setProjectId] = useState('')
  // Lpo / Export
  const [refNo, setRefNo] = useState('')
  const [lpoNo, setLpoNo] = useState('')
  const [incotermId, setIncotermId] = useState('')
  const [incotermLocation, setIncotermLocation] = useState('')
  const [model, setModel] = useState('')
  // Template invoice
  const [tplTitle, setTplTitle] = useState('')
  const [tplFrequency, setTplFrequency] = useState('1')
  const [tplUnit, setTplUnit] = useState<'d' | 'm' | 'y'>('m')
  const [tplDate, setTplDate] = useState(today)
  const [tplHour, setTplHour] = useState('0')
  const [tplMax, setTplMax] = useState('0')
  const [tplAutoValidate, setTplAutoValidate] = useState(false)
  const [tplNewPrice, setTplNewPrice] = useState(false)
  const [tplPdf, setTplPdf] = useState(true)
  // Credit note
  const [credit, setCredit] = useState<CreditState>(EMPTY_CREDIT)
  const createCreditNote = useCreateCreditNote(credit.sourceId || undefined)

  const { data: settings } = useGeneralSettings()
  const [currency, setCurrency] = useState('')
  const [currencyRate, setCurrencyRate] = useState(1)
  const { data: paymentTerms } = usePaymentTerms()
  const { data: bankAccounts } = useBankAccountOptions()
  const { data: currencies } = useInvoiceCurrencies()
  const { data: projects } = useProjectsList('all')
  const { data: customerDefaults } = useCustomerInvoiceDefaults(customerId)
  const baseCurrency = settings?.currency ?? ''
  const customerName = customers?.find((c) => c.id === customerId)?.name
  // Projects of the chosen third party (or not tied to one), like the classic page's project picker.
  const projectOptions = (projects?.items ?? []).filter((p) => !p.thirdPartyName || !customerName || p.thirdPartyName === customerName)
  const classicSaved = kind === 'lpo' || kind === 'export'

  // Like the classic page: payment terms default to "Due Upon Receipt"; picking a
  // customer fills in that customer's bank account and currency.
  useEffect(() => {
    if (!paymentTermId && paymentTerms?.length) setPaymentTermId((paymentTerms.find((t) => /due upon receipt/i.test(t.text)) ?? paymentTerms[0]).id)
  }, [paymentTerms, paymentTermId])
  useEffect(() => {
    if (!customerDefaults) return
    if (customerDefaults.fkAccount && customerDefaults.fkAccount !== '0') setBankAccountId(customerDefaults.fkAccount)
    setCurrency(customerDefaults.multicurrencyCode ?? baseCurrency)
    setCurrencyRate(customerDefaults.multicurrencyCode && customerDefaults.multicurrencyCode !== baseCurrency ? customerDefaults.multicurrencyTx : 1)
  }, [customerDefaults, baseCurrency])
  useEffect(() => {
    setProjectId('')
    // The invoice to correct belongs to one customer.
    setCredit((prev) => ({ ...prev, sourceId: '' }))
  }, [customerId])
  const shownCurrency = currency || baseCurrency
  const [lines, setLines] = useState<LineState[]>(() => (initialLines?.length ? initialLines.map((l) => ({ ...l, key: lineKeySeq++ })) : [newLine()]))
  const [formError, setFormError] = useState('')
  const [createdInvoice, setCreatedInvoice] = useState<{ id: number; ref: string } | null>(null)

  function kindUnavailable(k: InvoiceKind): string | undefined {
    if (k !== 'lpo' && k !== 'export') return undefined
    if (contextLoading) return 'Checking which invoice types this backend offers…'
    if (contextError) return contextErr instanceof Error ? contextErr.message : 'Could not read the backend’s invoice form.'
    if (k === 'lpo' && !createContext?.hasLpo) return 'The backend offers Lpo invoices only when its ZRA module is on.'
    if (k === 'export' && !createContext?.hasExport) return 'The backend offers Export invoices only when its ZRA module is on.'
    return undefined
  }

  function updateLine(key: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProduct(key: number, productId: string) {
    const product = products?.find((p) => p.id === productId)
    updateLine(key, { productId, label: product?.label ?? '', unitPriceHt: product ? product.priceExclTax : 0 })
  }

  const totalHt = lines.reduce((sum, l) => sum + l.qty * l.unitPriceHt, 0)
  const totalVat = lines.reduce((sum, l) => sum + l.qty * l.unitPriceHt * (l.vatRate / 100), 0)

  const pending = createInvoice.isPending || createTyped.isPending || createDraftForTemplate.isPending || createCreditNote.isPending
  const submitLabel = kind === 'credit' ? 'Create credit note' : kind === 'template' ? 'Create template' : 'Create draft'

  function showFailure(err: unknown, fallback: string) {
    if (err instanceof PartialInvoiceError) setCreatedInvoice({ id: err.invoiceId, ref: err.invoiceRef })
    setFormError(err instanceof Error ? err.message : fallback)
  }

  function handleSubmit() {
    setFormError('')
    setCreatedInvoice(null)
    if (!customerId) {
      setFormError('Customer is required.')
      return
    }

    if (kind === 'credit') {
      if (!credit.sourceId) {
        setFormError('Choose the invoice to correct.')
        return
      }
      createCreditNote.mutate(
        { createtype: credit.createtype, cnDate: ddmmyyyy(date), notePublic: credit.reason, notePrivate: credit.notePrivate },
        {
          onSuccess: (result) => navigate((result.redirect && resolveLegacyRoute(result.redirect)) || listLink),
          onError: (err) => showFailure(err, 'Could not create the credit note — please try again.'),
        },
      )
      return
    }

    if (!paymentModeCode) {
      setFormError('Payment Type is required.')
      return
    }
    if (!lines.some((l) => l.label.trim() && l.qty > 0)) {
      setFormError('At least one line with a product/description and quantity is required.')
      return
    }
    if (kind === 'lpo' && (!refNo.trim() || !lpoNo.trim())) {
      setFormError('Ref No and LPO No are required for an Lpo invoice.')
      return
    }
    if (kind === 'template' && !tplTitle.trim()) {
      setFormError('The template needs a title.')
      return
    }
    if (kind === 'template' && !(Number(tplFrequency) >= 1)) {
      setFormError('Frequency must be 1 or more.')
      return
    }

    const input: NewInvoiceInput = {
      customerId,
      date,
      refClient,
      paymentModeCode,
      paymentTermId,
      bankAccountId,
      projectId,
      currency: shownCurrency,
      currencyRate,
      warehouseId,
      lines: lines.filter((l) => l.label.trim() && l.qty > 0).map(({ key: _key, ...l }) => l),
    }

    if (kind === 'lpo' || kind === 'export') {
      createTyped.mutate(
        { ...input, type: kind === 'lpo' ? 6 : 7, refNo: kind === 'lpo' ? refNo : undefined, lpoNo: kind === 'lpo' ? lpoNo : undefined, incotermId, incotermLocation, model, baseCurrency },
        {
          onSuccess: (result) => navigate(result.id ? ROUTES.invoiceDetail.replace(':id', String(result.id)) : listLink),
          onError: (err) => showFailure(err, 'Could not create this invoice — please try again.'),
        },
      )
      return
    }

    if (kind === 'template') {
      createDraftForTemplate.mutate(input, {
        onSuccess: async (draft) => {
          const [y, m, d] = tplDate.split('-')
          try {
            await convertToRecurringInvoice(String(draft.id), {
              title: tplTitle.trim(),
              frequency: tplFrequency,
              unitFrequency: tplUnit,
              reday: d,
              remonth: m,
              reyear: y,
              rehour: tplHour,
              nbGenMax: tplMax,
              autoValidate: tplAutoValidate,
              useNewPrice: tplNewPrice,
              generatePdf: tplPdf,
            })
            navigate(ROUTES.invoiceTemplates)
          } catch (err) {
            setCreatedInvoice({ id: draft.id, ref: draft.ref })
            setFormError(`The draft invoice ${draft.ref || `#${draft.id}`} was saved, but it could not be turned into a template: ${err instanceof Error ? err.message : 'unknown error'}`)
          }
        },
        onError: (err) => showFailure(err, 'Could not create this invoice — please try again.'),
      })
      return
    }

    createInvoice.mutate(input, {
      onSuccess: () => navigate(listLink),
      onError: (err) => showFailure(err, 'Could not create this invoice — please try again.'),
    })
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> New invoice
        </h2>
      }
      footerLeft={
        <Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} {submitLabel}
        </button>
      }
    >
      <Card className="!h-auto shrink-0 bg-surface-hover! grid grid-cols-1 sm:grid-cols-2 items-start gap-4">
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
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClasses}>
              <option value="">{customersLoading ? 'Loading…' : 'Select a third party'}</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div>
          <p className="text-sm text-danger">Ref.*</p>
          <p className="text-sm text-text-faint mt-1">Draft</p>
        </div>
      </Card>

      <Card className="!h-auto shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-danger">Type*</span>
          <Info size={13} className="text-text-faint" aria-hidden />
        </div>
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Invoice type">
          {KINDS.map((t) => {
            const unavailable = kindUnavailable(t.key)
            const active = kind === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={Boolean(unavailable)}
                title={unavailable ?? t.info}
                onClick={() => {
                  setKind(t.key)
                  setFormError('')
                }}
                className={`px-3 py-1.5 rounded-md text-sm border disabled:opacity-50 disabled:cursor-not-allowed ${
                  active ? 'border-brand text-brand bg-brand/5' : 'border-border text-text-muted hover:bg-surface-hover'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {kind === 'credit' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Credit note date" required>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
              </Field>
            </div>
            <CreditNoteFields customerId={customerId} value={credit} onChange={(patch) => setCredit((prev) => ({ ...prev, ...patch }))} />
          </>
        ) : (
          <>
            {kind === 'lpo' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                <Field label="Ref No" required>
                  <input type="text" value={refNo} onChange={(e) => setRefNo(e.target.value)} className={inputClasses} />
                </Field>
                <Field label="LPO No" required>
                  <input type="text" value={lpoNo} onChange={(e) => setLpoNo(e.target.value)} className={inputClasses} />
                </Field>
              </div>
            )}
            {kind === 'template' && (
              <div className="mb-4 rounded-lg border border-border p-4">
                <p className="mb-3 text-sm font-medium text-text!">Template schedule</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                  <Field label="Template title" required>
                    <input type="text" value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} className={inputClasses} />
                  </Field>
                  <Field label="Frequency" required>
                    <div className="flex gap-2">
                      <input type="number" min={1} value={tplFrequency} onChange={(e) => setTplFrequency(e.target.value)} className={`${inputClasses} w-24 shrink-0`} />
                      <select value={tplUnit} onChange={(e) => setTplUnit(e.target.value as 'd' | 'm' | 'y')} className={inputClasses}>
                        <option value="d">Day(s)</option>
                        <option value="m">Month(s)</option>
                        <option value="y">Year(s)</option>
                      </select>
                    </div>
                  </Field>
                  <Field label="Next generation date" required>
                    <input type="date" value={tplDate} onChange={(e) => setTplDate(e.target.value)} className={inputClasses} />
                  </Field>
                  <Field label="Hour">
                    <input type="number" min={0} max={23} value={tplHour} onChange={(e) => setTplHour(e.target.value)} className={inputClasses} />
                  </Field>
                  <Field label="Max generations (0 = unlimited)">
                    <input type="number" min={0} value={tplMax} onChange={(e) => setTplMax(e.target.value)} className={inputClasses} />
                  </Field>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={tplAutoValidate} onChange={(e) => setTplAutoValidate(e.target.checked)} /> Auto-validate generated invoices
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={tplNewPrice} onChange={(e) => setTplNewPrice(e.target.checked)} /> Use current product prices
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={tplPdf} onChange={(e) => setTplPdf(e.target.checked)} /> Generate PDF
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Ref. customer">
                <input type="text" value={refClient} onChange={(e) => setRefClient(e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Invoice date" required>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Payment Terms" required>
                <select value={paymentTermId} onChange={(e) => setPaymentTermId(e.target.value)} className={inputClasses}>
                  {(paymentTerms ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.text}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Payment Type" required>
                <select value={paymentModeCode} onChange={(e) => setPaymentModeCode(e.target.value)} className={inputClasses}>
                  <option value="">Select a payment type</option>
                  {PAYMENT_TYPES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bank account">
                <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={inputClasses}>
                  <option value="">Select a bank account</option>
                  {(bankAccounts ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Project">
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
                  <option value="">Select a project</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.ref})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Incoterms">
                {classicSaved ? (
                  <div className="flex gap-2">
                    <select value={incotermId} onChange={(e) => setIncotermId(e.target.value)} className={inputClasses}>
                      <option value="">Select a incoterms</option>
                      {(createContext?.incoterms ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {incotermId && <input type="text" value={incotermLocation} onChange={(e) => setIncotermLocation(e.target.value)} placeholder="Location" className={`${inputClasses} w-32 shrink-0`} />}
                  </div>
                ) : (
                  <select disabled title="Incoterms are saved only for Lpo and Export invoices — the single-call invoice API does not take them." className={`${inputClasses} disabled:opacity-60`}>
                    <option>Select a incoterms</option>
                  </select>
                )}
              </Field>
              <Field label="Doc template">
                {classicSaved ? (
                  <select value={model || createContext?.defaultModel || ''} onChange={(e) => setModel(e.target.value)} className={inputClasses}>
                    {(createContext?.models ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select disabled title="The template can be chosen for Lpo and Export invoices — the single-call invoice API always uses the default one." className={`${inputClasses} disabled:opacity-60`}>
                    <option>{createContext?.defaultModel || 'crabe'}</option>
                  </select>
                )}
              </Field>
              <Field label="Currency">
                <div className="flex items-center gap-2">
                  <select
                    value={shownCurrency}
                    onChange={(e) => {
                      setCurrency(e.target.value)
                      if (e.target.value === baseCurrency) setCurrencyRate(1)
                    }}
                    className={inputClasses}
                  >
                    {(currencies ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.text}
                      </option>
                    ))}
                  </select>
                  {shownCurrency && baseCurrency && shownCurrency !== baseCurrency && (
                    <input
                      type="number"
                      min={0}
                      step="0.0001"
                      value={currencyRate}
                      onChange={(e) => setCurrencyRate(Number(e.target.value))}
                      title={`1 ${baseCurrency} = ? ${shownCurrency}`}
                      className={`${inputClasses} w-28 shrink-0`}
                    />
                  )}
                </div>
              </Field>
            </div>
          </>
        )}
      </Card>

      {kind !== 'credit' && (
        <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
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
                  <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                  <th className="font-medium px-4 py-2.5 w-20">VAT %</th>
                  <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 w-28 text-right">Total TTC</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const lineTtc = line.qty * line.unitPriceHt * (1 + line.vatRate / 100)
                  return (
                    <tr key={line.key} className="border-b border-border align-top">
                      <td className="px-4 py-2 space-y-1">
                        <select value={line.productId} onChange={(e) => pickProduct(line.key, e.target.value)} className={inputClasses}>
                          <option value="">Custom line</option>
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
                        <input type="number" min={0} value={line.qty} onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })} className={inputClasses} />
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
          <div className="p-4 border-t border-border">
            <h3 className="font-semibold text-text! mb-2">Totals</h3>
            <div className="grid grid-cols-3 gap-3 text-sm max-w-md">
              <div>
                <p className="text-text-muted">Total (Excl. Tax):</p>
                <p className="font-semibold text-text! tabular-nums">{formatMoney(totalHt)}</p>
              </div>
              <div>
                <p className="text-text-muted">Total Tax:</p>
                <p className="font-semibold text-text! tabular-nums">{formatMoney(totalVat)}</p>
              </div>
              <div>
                <p className="text-text-muted">Total (Inc. Tax):</p>
                <p className="font-semibold text-text! tabular-nums">{formatMoney(totalHt + totalVat)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {formError && (
        <p className="text-sm text-danger">
          {formError}
          {createdInvoice && createdInvoice.id > 0 && (
            <>
              {' '}
              <Link to={ROUTES.invoiceDetail.replace(':id', String(createdInvoice.id))} className="font-medium underline">
                Open invoice {createdInvoice.ref || `#${createdInvoice.id}`}
              </Link>
            </>
          )}
        </p>
      )}
    </StickyFormShell>
  )
}
