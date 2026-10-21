import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X, LoaderCircle, Plus, Trash2, FileText, ListChecks, Users, StickyNote, Calculator, Layers } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { api } from '../../../api/axios'
import { Card, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell, WizardStep } from '../../../shared/components/layout/StickyFormShell'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import type { SearchableSelectOption } from '../../../shared/components/forms/SearchableSelect'
import { Avatar } from '../../../shared/components/Avatar'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useProductOptions, useVatRateOptions } from '../../products/products.queries'
import { useUsersSummary } from '../../users/users.queries'
import { useAuth } from '../../auth/AuthContext'
import { useCreateContract } from '../contracts.queries'
import { RepField } from './ContractCreateFromCustomerForm'
import { todayIso } from '../../../shared/localCollection'
import { formatMoney } from '../../../utils/format'

interface ProjectOption {
  id: string
  ref: string
  title: string
}

// GET /api/projects.php — same real, working endpoint used by Purchase
// Order/Sales Order/Quotation Create forms elsewhere in this app (queries
// llx_projet WHERE fk_statut = 1, not order-type-specific).
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

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

// One line of the Item Table, with what the classic page's row has: the product, its service
// period, a description, quantity, VAT category, both unit prices, a discount and the total.
interface ContractLine {
  key: number
  productId: string
  description: string
  qty: number
  vatRate: number
  vatCode: string
  unitPrice: number // excl. tax
  // What the user is typing in the inc.-tax box; null the rest of the time, when the box
  // shows the price worked out from the excl.-tax one.
  ttcDraft: string | null
  discountType: 'percent' | 'fixed'
  discount: number
  dateStart: string
  dateEnd: string
}

// The lines another screen can start this form with (a Sales Order's own lines).
export interface ContractLineSeed {
  productId: string
  description: string
  qty: number
  vatRate: number
  unitPrice: number
  discountPct: number
}

let lineKeySeq = 0
function newLine(seed?: ContractLineSeed): ContractLine {
  return {
    key: lineKeySeq++,
    productId: seed?.productId ?? '',
    description: seed?.description ?? '',
    qty: seed?.qty ?? 1,
    vatRate: seed?.vatRate ?? 0,
    vatCode: '',
    unitPrice: seed?.unitPrice ?? 0,
    ttcDraft: null,
    discountType: 'percent',
    discount: seed?.discountPct ?? 0,
    dateStart: '',
    dateEnd: '',
  }
}

// A number box that lets you clear it and retype. The typed text is kept while the box has
// focus (so "0." and an empty box survive), and the number it stands for goes up on every
// keystroke; on leaving the box shows the stored number again.
function NumberField({ value, onValue, className, min, max, step }: { value: number; onValue: (n: number) => void; className: string; min?: number; max?: number; step?: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft ?? String(Math.round(value * 10000) / 10000)}
      onChange={(e) => {
        setDraft(e.target.value)
        onValue(Number(e.target.value) || 0)
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => setDraft(null)}
      className={className}
    />
  )
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// Amounts of one line: a percentage discount comes off the gross, a fixed one is an amount.
function lineAmounts(l: ContractLine) {
  const gross = l.qty * l.unitPrice
  const net = Math.max(0, l.discountType === 'percent' ? gross * (1 - l.discount / 100) : gross - l.discount)
  const tax = net * (l.vatRate / 100)
  return { net, tax, total: net + tax }
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-sm text-text">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

// `fixedCustomerId`/`backTo` power ContractCreateFromOrderForm.tsx (a Sales
// Order's own real "Create contract" action) — same real
// customer-locked-field-not-a-different-page behavior already generalized
// this way for Quotations/Orders/Invoices/Purchase Orders/Supplier
// Proposals/Vendor Invoices. `initialLines` seeds this form's own real Item
// Table (which does submit real lines through useCreateContract, see
// handleSubmit below) from that order's real lines — the same real
// conversion Dolibarr's own contrat/card.php?origin=commande path performs
// (this app's actual live contract-creation page, contrat/index_v2.php,
// never reimplemented that copy — confirmed by reading it directly — so
// this is a genuine improvement over the legacy page, not a regression).
type ContractCreateFormProps = { fixedCustomerId?: string; backTo?: string; initialLines?: ContractLineSeed[] }

// The page banner's "New contract" button starts a blank form (the key remounts the form).
export function ContractCreateForm(props: ContractCreateFormProps = {}) {
  const [formKey, setFormKey] = useState(0)
  return (
    <>
      <InBanner>
        <button
          type="button"
          onClick={() => setFormKey((k) => k + 1)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> New contract
        </button>
      </InBanner>
      <ContractCreateFormBody key={formKey} {...props} />
    </>
  )
}

function ContractCreateFormBody({ fixedCustomerId, backTo, initialLines }: ContractCreateFormProps) {
  const today = todayIso()
  const { user } = useAuth()
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: fixedCustomer } = useCustomerDetail(fixedCustomerId)
  const { data: products } = useProductOptions()
  const { data: vatOptions } = useVatRateOptions()
  const { data: usersSummary, isLoading: usersLoading } = useUsersSummary()
  const { data: projects, isLoading: projectsLoading } = useProjectOptions()
  const createContract = useCreateContract()
  const navigate = useNavigate()
  const listLink = backTo ?? ROUTES.contractList

  const [thirdPartyId, setThirdPartyId] = useState(fixedCustomerId ?? '')
  const [refCustomer, setRefCustomer] = useState('')
  const [refVendor, setRefVendor] = useState('')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(today)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [followUpRepId, setFollowUpRepId] = useState(() => user?.id ?? '')
  const [signatureRepId, setSignatureRepId] = useState(() => user?.id ?? '')
  const [supportRepId, setSupportRepId] = useState('')
  const [lines, setLines] = useState<ContractLine[]>(() => (initialLines?.length ? initialLines.map((l) => newLine(l)) : [newLine()]))
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  // Every enabled user can be picked, labelled the way the classic page does.
  const rosterOptions: SearchableSelectOption[] = (usersSummary?.users ?? [])
    .filter((u) => u.status === 'Enabled')
    .map((u) => ({ value: String(u.id), label: `${u.name || u.login} (${u.isSuperAdmin ? 'All entities' : 'Master entity'})` }))
  // The roster comes from a separate call; until it answers (or if it cannot), the signed-in
  // user is still there to pick, so the default chips never sit on "Loading…".
  const userOptions: SearchableSelectOption[] =
    user && !rosterOptions.some((o) => o.value === String(user.id))
      ? [{ value: String(user.id), label: `${`${user.firstname} ${user.lastname}`.trim() || user.login}${user.admin ? ' (All entities)' : ''}` }, ...rosterOptions]
      : rosterOptions

  // Services first (a contract sells services), products after.
  const serviceOptions = (products ?? []).filter((p) => p.type === 'service')
  const productOptions = (products ?? []).filter((p) => p.type !== 'service')

  function updateLine(key: number, patch: Partial<ContractLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProduct(key: number, productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    updateLine(key, {
      productId,
      description: product?.label ?? '',
      unitPrice: product ? product.priceExclTax : 0,
      ttcDraft: null,
      vatRate: product ? product.vatRatePct : 0,
      vatCode: product ? product.vatCode : '',
    })
  }

  function pickVat(key: number, value: string) {
    const option = vatOptions?.find((v) => v.value === value)
    if (option) updateLine(key, { vatRate: option.rate, vatCode: option.code })
  }

  // The unit price in tax terms follows the VAT rate: typing it works the excl.-tax price back.
  function setPriceTtc(line: ContractLine, text: string) {
    const ttc = Number(text)
    updateLine(line.key, { ttcDraft: text, unitPrice: Number.isFinite(ttc) ? ttc / (1 + line.vatRate / 100) : 0 })
  }

  // Only lines with a description are saved, so only those count in the totals.
  const filledLines = lines.filter((l) => l.description.trim())
  const totals = filledLines.reduce(
    (sum, l) => {
      const a = lineAmounts(l)
      return { excl: sum.excl + a.net, tax: sum.tax + a.tax, qty: sum.qty + l.qty }
    },
    { excl: 0, tax: 0, qty: 0 },
  )

  async function handleSubmit(validate: boolean) {
    setFormError('')
    if (!thirdPartyId) {
      setFormError('Third-party is required.')
      return
    }
    if (!followUpRepId || !signatureRepId) {
      setFormError('Both the following-up and the signing sales representative are required.')
      return
    }
    if (validate && filledLines.length === 0) {
      setFormError('Please add at least one service line.')
      return
    }
    if (filledLines.some((l) => l.dateStart && l.dateEnd && l.dateEnd < l.dateStart)) {
      setFormError('A line ends before it starts.')
      return
    }
    setPending(true)
    try {
      await createContract({
        socid: thirdPartyId,
        refCustomer,
        refVendor,
        contractDate: date,
        projectId: projectId || undefined,
        notePublic,
        notePrivate,
        signatureRepId,
        followUpRepId,
        supportRepId: supportRepId || undefined,
        lines: filledLines.map((l) => ({
          productId: l.productId || undefined,
          description: l.description,
          qty: l.qty,
          unitPriceHt: l.unitPrice,
          unitPriceTtc: round2(l.unitPrice * (1 + l.vatRate / 100)),
          vatRate: l.vatRate,
          vatCode: l.vatCode || undefined,
          discountPct: l.discount,
          discountType: l.discountType,
          dateStart: l.dateStart || undefined,
          dateEnd: l.dateEnd || undefined,
        })),
        validate,
      })
      navigate(listLink)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create contract.')
    } finally {
      setPending(false)
    }
  }

  return (
    <StickyFormShell
      wizard={[{title:'Contract Details',subtitle:'Customer, dates & notes'},{title:'Items & Totals',subtitle:'Add products/services'}]}
      header={<></>}
      footerLeft={
        <Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            Save As Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create Contract
          </button>
        </>
      }
    >
      <WizardStep n={0}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-stretch">
        <div className="space-y-4 min-w-0">
          <Card className="!h-auto">
            <SectionHeading icon={FileText}>Customer &amp; Contract Details</SectionHeading>
            <p className="text-xs text-text-faint mt-0.5">Customer, references, date &amp; project</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 mt-3">
              <Field label="Third-party" required>
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
                  <select value={thirdPartyId} onChange={(e) => setThirdPartyId(e.target.value)} className={inputClasses}>
                    <option value="">{customersLoading ? 'Loading…' : 'Select a third party'}</option>
                    {customers?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Ref. customer">
                <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
              </Field>
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
                  <option value="">{projectsLoading ? 'Loading…' : 'Select a project'}</option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.ref})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card className="!h-auto">
            <SectionHeading icon={Users}>Additional Information</SectionHeading>
            <p className="text-xs text-text-faint mt-0.5">Sales representatives &amp; support</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 mt-3">
              <RepField label="Sales representative following-up contract" required userId={followUpRepId} onChange={setFollowUpRepId} options={userOptions} loading={usersLoading} />
              <RepField label="Sales representative signing contract" required userId={signatureRepId} onChange={setSignatureRepId} options={userOptions} loading={usersLoading} />
              <RepField label="Sales representative following-up contract (Support)" userId={supportRepId} onChange={setSupportRepId} options={userOptions} loading={usersLoading} />
            </div>
          </Card>
        </div>

        {/* Same height as the two cards beside it: the note boxes share what is left. */}
        <Card className="!h-full flex flex-col">
          <SectionHeading icon={StickyNote}>Notes</SectionHeading>
          <div className="mt-3 flex flex-1 flex-col gap-3">
            <Field label="Note (public)" className="flex-1">
              <textarea value={notePublic} onChange={(e) => setNotePublic(e.target.value)} placeholder="Add any additional notes here..." className={`${inputClasses} flex-1 min-h-[96px] resize-none`} />
            </Field>
            <Field label="Note (private)" className="flex-1">
              <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} className={`${inputClasses} flex-1 min-h-[96px] resize-none`} />
            </Field>
          </div>
        </Card>
      </div>
      </WizardStep>

      <WizardStep n={1}>
      {/* The table takes the full width; the summary cards sit on a row of their own under it. */}
      <div className="space-y-4">
        <Card className="!p-0 !h-auto overflow-hidden min-w-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <SectionHeading icon={ListChecks}>Item Table</SectionHeading>
              <p className="text-xs text-text-faint mt-0.5">Add services to this contract</p>
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, newLine()])}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
            >
              <Plus size={13} /> Add line
            </button>
          </div>
          {/* Many lines scroll inside the card (column headings stay put) and leave room for the summary under it. */}
          <div className="overflow-auto h-[calc(100vh-525px)] min-h-[140px]">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2.5 min-w-[230px]">Product/Service</th>
                  <th className="font-medium px-3 py-2.5 min-w-[150px]">Description</th>
                  <th className="font-medium px-3 py-2.5 w-24">Qty</th>
                  <th className="font-medium px-3 py-2.5 w-32">VAT %</th>
                  <th className="font-medium px-3 py-2.5 w-32">Unit Price (Excl.)</th>
                  <th className="font-medium px-3 py-2.5 w-32">Unit Price (Inc. Tax)</th>
                  <th className="font-medium px-3 py-2.5 w-40">Disc.</th>
                  <th className="font-medium px-3 py-2.5 w-28 text-right">Total TTC</th>
                  <th className="font-medium px-3 py-2.5 w-14 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const lineTtc = lineAmounts(line).total
                  const vatValue = vatOptions?.find((v) => v.rate === line.vatRate && (line.vatCode ? v.code === line.vatCode : true))?.value ?? ''
                  return (
                    <tr key={line.key} className="border-b border-border align-top">
                      <td className="px-3 py-2 space-y-1.5">
                        <select value={line.productId} onChange={(e) => pickProduct(line.key, e.target.value)} className={inputClasses}>
                          <option value="">Custom line</option>
                          {serviceOptions.length > 0 && (
                            <optgroup label="Services">
                              {serviceOptions.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {productOptions.length > 0 && (
                            <optgroup label="Products">
                              {productOptions.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint">
                          <label className="flex items-center gap-1">
                            Start Date:
                            <input type="date" value={line.dateStart} onChange={(e) => updateLine(line.key, { dateStart: e.target.value })} className={`${inputClasses} !w-[140px] !px-2 !py-1 text-xs`} />
                          </label>
                          <label className="flex items-center gap-1">
                            End Date:
                            <input
                              type="date"
                              value={line.dateEnd}
                              min={line.dateStart || undefined}
                              onChange={(e) => updateLine(line.key, { dateEnd: e.target.value })}
                              className={`${inputClasses} !w-[140px] !px-2 !py-1 text-xs`}
                            />
                          </label>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} placeholder="Description" className={inputClasses} />
                      </td>
                      <td className="px-3 py-2">
                        <NumberField min={0} value={line.qty} onValue={(n) => updateLine(line.key, { qty: n })} className={inputClasses} />
                      </td>
                      <td className="px-3 py-2">
                        {vatOptions && vatOptions.length > 0 ? (
                          <select value={vatValue} onChange={(e) => pickVat(line.key, e.target.value)} className={inputClasses}>
                            {vatValue === '' && <option value="">{line.vatRate}%</option>}
                            {vatOptions.map((v) => (
                              <option key={v.value} value={v.value}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <NumberField min={0} max={100} value={line.vatRate} onValue={(n) => updateLine(line.key, { vatRate: n })} className={inputClasses} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <NumberField min={0} step="0.01" value={line.unitPrice} onValue={(n) => updateLine(line.key, { unitPrice: n, ttcDraft: null })} className={inputClasses} />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.ttcDraft ?? round2(line.unitPrice * (1 + line.vatRate / 100)).toFixed(2)}
                          onChange={(e) => setPriceTtc(line, e.target.value)}
                          onBlur={() => updateLine(line.key, { ttcDraft: null })}
                          className={inputClasses}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <NumberField min={0} step="0.01" value={line.discount} onValue={(n) => updateLine(line.key, { discount: n })} className={inputClasses} />
                          <select
                            value={line.discountType}
                            onChange={(e) => updateLine(line.key, { discountType: e.target.value as 'percent' | 'fixed' })}
                            title="% takes a percentage off; P takes a fixed amount off"
                            className={`${inputClasses} !w-16 shrink-0`}
                          >
                            <option value="percent">%</option>
                            <option value="fixed">P</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text!">{formatMoney(lineTtc)}</td>
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
        </Card>

        {/* Totals in the bottom-left corner and the order summary in the bottom-right, under the table. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <Card className="!h-full">
            <SectionHeading icon={Layers}>Totals</SectionHeading>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg bg-surface px-3 py-3 text-center">
                <p className="text-xs text-text-muted">Total Quantity</p>
                <p className="text-xl font-bold text-text! tabular-nums">{totals.qty}</p>
              </div>
              <div className="rounded-lg bg-surface px-3 py-3 text-center">
                <p className="text-xs text-text-muted">Items</p>
                <p className="text-xl font-bold text-text! tabular-nums">{filledLines.length}</p>
              </div>
            </div>
          </Card>
          <Card className="!h-full">
            <SectionHeading icon={Calculator}>Order Summary</SectionHeading>
            <p className="text-xs text-text-faint mt-0.5">Totals &amp; VAT</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Total (excl. tax)</dt>
                <dd className="tabular-nums text-text!">{formatMoney(totals.excl)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Total tax</dt>
                <dd className="tabular-nums text-text!">{formatMoney(totals.tax)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="font-semibold text-text!">Total (inc. tax)</dt>
                <dd className="text-lg font-bold tabular-nums text-text!">{formatMoney(totals.excl + totals.tax)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
      </WizardStep>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
