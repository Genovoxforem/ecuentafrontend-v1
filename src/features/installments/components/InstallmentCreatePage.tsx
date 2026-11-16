import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { AssetKpi, Banner, Cur, DynamicForm, EmptyState, FormDialog, KpiRow, NoticeStrip, PageHeading, Segmented } from '../../fixedAsset/components/AssetUi'
import { DANGER_GHOST_BTN, GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, THR, useDebounced, useNotice, type FormItem, type FormValues } from '../../fixedAsset/assetUiHelpers'
import { fmtDate, isoDate, money, num } from '../../fixedAsset/assetModels'
import { ROUTES } from '../../../routes'
import { applyInterest, fetchInvoiceForPlan, fetchProducts, previewPlan, savePlan, useInstallmentCustomers, useInstallmentTemplates, useOpenInvoices, usePaymentOptions } from '../installments.data'
import { invoiceApiPost, LINES_API, WIZARD_API } from '../installmentService'
import { apiFailure, planPath } from '../installmentHelpers'
import type { CustomerHit, InvoiceForPlan, PlanTemplate, PreviewRow, PreviewTotals, ProductHit } from '../installmentModels'
import { InstallmentSubNav, StatusBadge } from './InstallmentUi'

const STEPS = ['Customer & invoice', 'Invoice items', 'Installment plan', 'Schedule', 'Summary']

interface State {
  step: number
  mode: 'existing' | 'new'
  invoice: InvoiceForPlan | null
  customer: CustomerHit | null
  ref_client: string
  invoice_date: string
  mode_reglement_id: string
  template_id: string
  kind: string
  count: string
  frequency: string
  first_due: string
  grace_days: string
  advance_percent: string
  interest_rate: string
  note: string
  rows: PreviewRow[]
  rowsMode: 'percent' | 'amount'
  totals: PreviewTotals | null
  errors: Record<string, string[]>
}

const today = () => isoDate(new Date())

// Create an installment plan (classic installment/create.php, one page, five steps): pick or create the invoice, add its items (new invoice
// only), choose the plan, edit the schedule and save it as a draft or validate it. Every figure comes from installment/api/plans.php
// (action=preview / save); a new invoice goes through the standard invoice wizard and lines endpoints.
export function InstallmentCreatePage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const navigate = useNavigate()
  const preInvoice = Number(useSearchParams()[0].get('invoice')) || 0
  const templates = useInstallmentTemplates()
  const options = usePaymentOptions()
  const { notice, show } = useNotice()
  const [busy, setBusy] = useState(false)
  const [validateAsk, setValidateAsk] = useState(false)
  const [st, setSt] = useState<State>({
    step: 1,
    mode: 'existing',
    invoice: null,
    customer: null,
    ref_client: '',
    invoice_date: today(),
    mode_reglement_id: '',
    template_id: '',
    kind: 'equal',
    count: '3',
    frequency: 'monthly',
    first_due: today(),
    grace_days: '0',
    advance_percent: '50',
    interest_rate: '0',
    note: '',
    rows: [],
    rowsMode: 'percent',
    totals: null,
    errors: {},
  })
  const patch = (p: Partial<State>) => setSt((cur) => ({ ...cur, ...p }))
  const tpls = templates.data?.items ?? []
  const interestProduct = templates.data?.settings.interest_product ?? 0

  // Defaults once the lists arrive: the payment mode, the grace days and the default template (as the classic page does).
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    if (seeded || !templates.data || !options.data) return
    const def = templates.data.items.find((t) => t.is_default)
    setSt((cur) => ({
      ...cur,
      mode_reglement_id: options.data?.defaults.mode_id ? String(options.data.defaults.mode_id) : cur.mode_reglement_id,
      grace_days: String(templates.data?.settings.grace_days ?? 0),
      template_id: def && def.lines.length ? String(def.id) : cur.template_id,
      interest_rate: def && def.lines.length ? String(def.interest_rate || 0) : cur.interest_rate,
    }))
    setSeeded(true)
  }, [seeded, templates.data, options.data])
  useEffect(() => {
    if (!preInvoice) return
    fetchInvoiceForPlan(preInvoice)
      .then((inv) => patch({ invoice: inv, mode: 'existing' }))
      .catch((e) => show(apiFailure(e), 'bad'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preInvoice])

  const rate = Math.max(0, num(st.interest_rate))
  const cur = st.invoice?.state.currency ?? options.data?.currency ?? 'ZMW'
  const reload = async (id: number) => {
    const inv = await fetchInvoiceForPlan(id)
    patch({ invoice: inv })
    return inv
  }
  const tpl = (id: string): PlanTemplate | undefined => tpls.find((t) => String(t.id) === id)

  async function guarded(job: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await job()
    } catch (e) {
      show(apiFailure(e), 'bad')
    } finally {
      setBusy(false)
    }
  }
  const back = () => patch({ step: st.step === 3 && st.mode === 'existing' ? 1 : st.step - 1 })

  // ---- step 1 -> 2/3
  async function next1() {
    if (st.mode === 'existing') {
      if (!st.invoice) throw new Error('Choose the invoice.')
      if (!st.invoice.can_plan) throw new Error(st.invoice.live_plan ? `This invoice already has plan ${st.invoice.live_plan.ref}.` : st.invoice.state.eligible_reason)
      patch({ step: 3 })
      return
    }
    if (!st.customer) throw new Error('Choose the customer.')
    if (!st.invoice_date) throw new Error('Choose the invoice date.')
    if (!st.mode_reglement_id) throw new Error('Choose the payment mode.')
    if (st.invoice?.state.draft) {
      patch({ step: 2 })
      return
    }
    const d = await invoiceApiPost<{ invoice_id: number; reference: string }>(WIZARD_API, {
      action: 'save_draft',
      payload: JSON.stringify({ socid: st.customer.id, type: 0, ref_client: st.ref_client, invoice_date: st.invoice_date, mode_reglement_id: st.mode_reglement_id, note_private: 'Created by the installment wizard' }),
    })
    show(`Draft invoice ${d.reference} created.`)
    await reload(d.invoice_id)
    patch({ step: 2 })
  }

  // ---- step 3 -> 4
  async function next3() {
    if (!st.first_due) throw new Error('Choose the first due date.')
    const isNew = st.mode === 'new'
    const r = isNew ? rate : 0
    if (!isNew) patch({ interest_rate: '0' })
    if (r > 100) throw new Error('Interest must be between 0 and 100 %.')
    const inv = st.invoice as InvoiceForPlan
    if (isNew && inv.state.draft) {
      await applyInterest(inv.id, r)
      await reload(inv.id)
    }
    const body: Record<string, unknown> = { interest_rate: r, invoice_id: inv.id, template_id: st.template_id, kind: st.kind, count: st.count, frequency: st.frequency, first_due: st.first_due, grace_days: st.grace_days, advance_percent: st.advance_percent }
    if (st.kind === 'percent' || st.kind === 'custom') {
      body.kind = 'equal'
      body.count = Math.max(1, Number(st.count) || 1)
    }
    const p = await previewPlan(body)
    patch({ rows: p.rows, totals: p.totals, errors: p.errors, rowsMode: 'percent', step: 4 })
  }

  async function recalc(rows: PreviewRow[], mode = st.rowsMode) {
    const p = await previewPlan({ invoice_id: st.invoice?.id, interest_rate: rate, mode, rows: rows.map(({ label, due_date, percent, amount }) => ({ label, due_date, percent, amount })) })
    patch({ rows: p.rows, totals: p.totals, errors: p.errors, rowsMode: mode })
    return p
  }
  async function next4() {
    const p = await recalc(st.rows)
    if (Object.keys(p.errors).length) throw new Error('The schedule does not balance yet.')
    patch({ step: 5 })
  }

  // ---- step 5
  async function save(validate: boolean) {
    const inv = st.invoice as InvoiceForPlan
    const r = await savePlan({
      invoice_id: inv.id,
      template_id: st.template_id,
      interest_rate: rate,
      frequency: st.frequency,
      grace_days: st.grace_days,
      note: st.note,
      mode: st.rowsMode,
      rows: st.rows.map(({ label, due_date, percent, amount }) => ({ label, due_date, percent, amount })),
      validate,
    })
    show(r.message ?? 'Plan saved.')
    navigate(planPath(r.data.id))
  }
  async function validateInvoiceThenSave() {
    const inv = st.invoice as InvoiceForPlan
    await invoiceApiPost(WIZARD_API, { action: 'validate_invoice', payload: JSON.stringify({ invoice_id: inv.id, pay_mode: 'none' }) })
    const fresh = await reload(inv.id)
    if (fresh.state.draft) throw new Error('The invoice was not validated.')
    if (!Math.round(fresh.state.remain * 100) || Math.abs(fresh.state.remain - (st.totals?.eligible ?? 0)) > 0.004) await recalc(st.rows)
    await save(true)
  }

  const isNewDraft = st.mode === 'new' && !!st.invoice?.state.draft

  return (
    <div className="space-y-4">
      <PageHeading icon={icon} title="Create installment plan">
        Split a new or existing invoice into dated installments.
      </PageHeading>
      <InstallmentSubNav active="new" />
      <NoticeStrip notice={notice} />

      <Card className="!h-auto">
        <ol className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {STEPS.map((s, i) => {
            const n = i + 1
            const skip = n === 2 && st.mode === 'existing'
            return (
              <li key={s} className={`flex items-center gap-2 text-sm ${skip ? 'opacity-55' : ''} ${n === st.step ? 'font-bold text-brand' : n < st.step ? 'text-text' : 'text-text-muted'}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${n === st.step ? 'bg-brand text-white' : n < st.step ? 'bg-success-bg text-success-fg' : 'bg-surface-hover'}`}>{n < st.step ? '✓' : n}</span>
                {s}
              </li>
            )
          })}
        </ol>
        {st.invoice && (
          <p className="mt-2 text-sm text-text-muted">
            Invoice <b className="text-text">{st.invoice.ref}</b> · eligible{' '}
            <b className="text-text">
              {money(st.invoice.state.remain)} {cur}
            </b>
          </p>
        )}
      </Card>

      <Card className="!h-auto">
        {st.step === 1 && (
          <Step1 st={st} patch={patch} modes={options.data?.modes ?? []} canNew={!!options.data?.rights.invoice_create} reload={reload} />
        )}
        {st.step === 2 && st.invoice && <Step2 invoice={st.invoice} reload={reload} onError={(e) => show(apiFailure(e), 'bad')} />}
        {st.step === 3 && st.invoice && <Step3 st={st} patch={patch} tpls={tpls} tpl={tpl} interestProduct={interestProduct} />}
        {st.step === 4 && st.totals && <Step4 st={st} patch={patch} recalc={recalc} cur={cur} onError={(e) => show(apiFailure(e), 'bad')} />}
        {st.step === 5 && st.totals && st.invoice && <Step5 st={st} cur={cur} isNewDraft={isNewDraft} />}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <div className="flex gap-2">
            {st.step > 1 && (
              <button type="button" className={GHOST_BTN} onClick={back} disabled={busy}>
                ← Back
              </button>
            )}
            <Link to={ROUTES.installmentList} className={GHOST_BTN}>
              Cancel
            </Link>
          </div>
          <div className="flex gap-2">
            {st.step < 5 && (
              <button type="button" className={PRIMARY_BTN} disabled={busy} onClick={() => guarded(st.step === 1 ? next1 : st.step === 2 ? async () => {
                if (!st.invoice?.lines.length) throw new Error('Add at least one item.')
                patch({ step: 3 })
              } : st.step === 3 ? next3 : next4)}>
                {busy && <Loader2 size={14} className="animate-spin" />} Continue →
              </button>
            )}
            {st.step === 5 && (
              <>
                <button type="button" className={GHOST_BTN} disabled={busy} onClick={() => guarded(() => save(false))}>
                  Save draft
                </button>
                {isNewDraft ? (
                  <button type="button" className={PRIMARY_BTN} disabled={busy || options.data?.rights.invoice_validate === false} onClick={() => setValidateAsk(true)}>
                    Create invoice and installment plan
                  </button>
                ) : (
                  <button type="button" className={PRIMARY_BTN} disabled={busy || !!st.invoice?.state.draft} onClick={() => guarded(() => save(true))}>
                    Validate plan
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {validateAsk && st.invoice && (
        <FormDialog
          title={`Validate invoice ${st.invoice.ref}?`}
          items={[]}
          initial={{}}
          okLabel="Validate and create plan"
          intro="The invoice gets its final number and is fiscalised as configured. This cannot be undone from here."
          onSave={async () => {
            await validateInvoiceThenSave()
          }}
          onClose={() => setValidateAsk(false)}
        />
      )}
    </div>
  )
}

type Patch = (p: Partial<State>) => void

// ---- Step 1 ---------------------------------------------------------------------------------------------------------------------
function Step1({ st, patch, modes, canNew, reload }: { st: State; patch: Patch; modes: Array<{ id: number; label: string }>; canNew: boolean; reload: (id: number) => Promise<InvoiceForPlan> }) {
  return (
    <div className="space-y-4">
      <Segmented<'existing' | 'new'>
        label="Invoice source"
        options={[
          ['existing', 'Existing invoice'],
          ['new', canNew ? 'New invoice' : 'New invoice (needs the invoice create right)'],
        ]}
        value={st.mode}
        onChange={(m) => {
          if (m === 'new' && !canNew) return
          patch({ mode: m, invoice: m === 'new' && st.invoice?.state.draft ? st.invoice : null })
        }}
      />
      {st.mode === 'existing' ? <ExistingPicker st={st} reload={reload} /> : <NewInvoiceForm st={st} patch={patch} modes={modes} />}
    </div>
  )
}

function ExistingPicker({ st, reload }: { st: State; reload: (id: number) => Promise<InvoiceForPlan> }) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const list = useOpenInvoices(q)
  const [error, setError] = useState('')
  const v = st.invoice
  return (
    <div className="space-y-3">
      <input className={inputClasses} aria-label="Search invoices" placeholder="Search invoice ref, customer ref or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {list.isLoading ? (
        <p className="text-sm text-text-muted">Loading invoices…</p>
      ) : (list.data?.items ?? []).length === 0 ? (
        <p className="text-sm text-text-muted">No open invoice without an installment plan matches.</p>
      ) : (
        <div className="max-h-96 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className={TH} />
                <th className={TH}>Invoice</th>
                <th className={TH}>Date</th>
                <th className={TH}>Customer</th>
                <th className={THR}>Total</th>
                <th className={THR}>Paid</th>
                <th className={THR}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((x) => (
                <tr key={x.id} className="border-b border-border last:border-0">
                  <td className={TD}>
                    <input
                      type="radio"
                      name="inv"
                      aria-label={`Use ${x.ref}`}
                      checked={v?.id === x.id}
                      onChange={() => {
                        setError('')
                        reload(x.id).catch((e) => setError(apiFailure(e)))
                      }}
                    />
                  </td>
                  <td className={`${TD} font-bold`}>{x.ref}</td>
                  <td className={TD}>{fmtDate(x.date)}</td>
                  <td className={TD}>{x.customer}</td>
                  <td className={TDR}>
                    <Cur value={x.total} currency={x.currency} />
                  </td>
                  <td className={TDR}>{money(x.paid)}</td>
                  <td className={`${TDR} font-bold`}>{money(x.remain)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <Banner tone="bad">{error}</Banner>}
      {v && (
        <div className="grid gap-4 lg:grid-cols-2">
          <table className="w-full text-sm">
            <tbody>
              {(
                [
                  ['Customer', `${v.customer.name}${v.customer.tpin ? ` · TPIN ${v.customer.tpin}` : ''}`],
                  ['Address', v.customer.address || '—'],
                  ['Invoice', `${v.ref}${v.ref_client ? ` · ${v.ref_client}` : ''}`],
                  ['Date / due', `${fmtDate(v.date)} / ${fmtDate(v.due)}`],
                  ['Currency', `${v.state.currency}${v.state.foreign ? ` @ ${v.state.rate}` : ''}`],
                ] as Array<[string, string]>
              ).map(([k, val]) => (
                <tr key={k} className="border-b border-border last:border-0">
                  <td className="w-36 py-2 text-text-muted">{k}</td>
                  <td className="py-2 text-text">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-3">
            <KpiRow>
              <AssetKpi label="Invoice total" value={<Cur value={v.state.total} currency={v.state.currency} />} />
              <AssetKpi label="Already paid" value={<Cur value={v.state.total - v.state.remain} currency={v.state.currency} />} note={`${v.payments.length} payment(s)`} />
              <AssetKpi label="Eligible for installments" value={<Cur value={v.state.remain} currency={v.state.currency} />} tone={v.state.remain > 0 ? 'ok' : 'bad'} />
            </KpiRow>
            {!v.can_plan && <Banner tone="bad">{v.live_plan ? `Already planned in ${v.live_plan.ref}` : v.state.eligible_reason}</Banner>}
          </div>
        </div>
      )}
    </div>
  )
}

function NewInvoiceForm({ st, patch, modes }: { st: State; patch: Patch; modes: Array<{ id: number; label: string }> }) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const found = useInstallmentCustomers(q, q.length >= 2)
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="col-span-full flex flex-col gap-1 text-sm text-text">
          Customer *
          <input className={inputClasses} aria-label="Customer" placeholder="Search customer name, code or TPIN…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        {q.length >= 2 && (
          <div className="col-span-full overflow-hidden rounded-lg border border-border">
            {(found.data?.items ?? []).length === 0 ? (
              <p className="p-3 text-sm text-text-muted">{found.isLoading ? 'Searching…' : 'No customer found.'}</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {found.data?.items.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className={TD}>
                        <button type="button" className={GHOST_BTN} onClick={() => patch({ customer: c, invoice: st.invoice && st.invoice.customer.id !== c.id ? null : st.invoice })}>
                          Select
                        </button>
                      </td>
                      <td className={`${TD} font-bold`}>{c.name}</td>
                      <td className={`${TD} text-text-muted`}>{c.code}</td>
                      <td className={`${TD} text-text-muted`}>{c.tpin}</td>
                      <td className={`${TD} text-text-muted`}>{c.town}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm text-text">
          Customer reference
          <input className={inputClasses} placeholder="PO / order no." value={st.ref_client} onChange={(e) => patch({ ref_client: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Invoice date *
          <input type="date" className={inputClasses} aria-label="Invoice date" value={st.invoice_date} onChange={(e) => patch({ invoice_date: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Payment mode *
          <select className={inputClasses} aria-label="Payment mode" value={st.mode_reglement_id} onChange={(e) => patch({ mode_reglement_id: e.target.value })}>
            <option value="">— choose —</option>
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {st.customer && (
        <Banner>
          Customer: <b>{st.customer.name}</b>
          {st.customer.tpin ? ` · TPIN ${st.customer.tpin}` : ''}
          {st.invoice ? ` · draft invoice ${st.invoice.ref}` : ''}
        </Banner>
      )}
      <p className="text-xs text-text-muted">A draft invoice is created through the standard invoice wizard API; items, VAT and totals use the normal invoice engine.</p>
    </div>
  )
}

// ---- Step 2 (new invoice items) -------------------------------------------------------------------------------------------------
function Step2({ invoice, reload, onError }: { invoice: InvoiceForPlan; reload: (id: number) => Promise<InvoiceForPlan>; onError: (e: unknown) => void }) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const [hits, setHits] = useState<ProductHit[]>([])
  const [picked, setPicked] = useState<ProductHit | null>(null)
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [disc, setDisc] = useState('0')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!q || picked) {
      setHits([])
      return
    }
    let live = true
    fetchProducts(q)
      .then((r) => live && setHits(r.items))
      .catch(onError)
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, picked])

  async function add() {
    if (!picked) return
    setAdding(true)
    try {
      await invoiceApiPost(LINES_API, { action: 'addLine', invoice_id: invoice.id, product_id: picked.id, qty: num(qty), price_ht: num(price), vat_rate: picked.vat_rate, dis_type: 1, discount_percent: num(disc) })
      await reload(invoice.id)
      setPicked(null)
      setSearch('')
      setPrice('')
    } catch (e) {
      onError(e)
    } finally {
      setAdding(false)
    }
  }
  async function remove(lineId: number) {
    try {
      await invoiceApiPost(LINES_API, { action: 'deleteLine', invoice_id: invoice.id, line_id: lineId })
      await reload(invoice.id)
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-text!">Items of {invoice.ref}</h3>
      <div className="grid items-end gap-3 sm:grid-cols-[2fr_90px_130px_100px_auto]">
        <label className="flex flex-col gap-1 text-sm text-text">
          Product / service
          <input
            className={inputClasses}
            aria-label="Product"
            placeholder="Search ref, label or barcode…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPicked(null)
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Qty
          <input className={inputClasses} aria-label="Quantity" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Unit price (excl.)
          <input className={inputClasses} aria-label="Unit price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Discount %
          <input className={inputClasses} aria-label="Discount" inputMode="decimal" value={disc} onChange={(e) => setDisc(e.target.value)} />
        </label>
        <button type="button" className={PRIMARY_BTN} disabled={!picked || adding} onClick={add}>
          Add item
        </button>
      </div>
      {hits.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {hits.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className={TD}>
                  <button
                    type="button"
                    className={GHOST_BTN}
                    onClick={() => {
                      setPicked(p)
                      setSearch(`${p.ref} — ${p.label}`)
                      setPrice(String(p.price_ht))
                    }}
                  >
                    Pick
                  </button>
                </td>
                <td className={TD}>
                  <b>{p.ref}</b> {p.label}
                </td>
                <td className={`${TD} text-text-muted`}>{p.type}</td>
                <td className={TDR}>{money(p.price_ht)}</td>
                <td className={`${TD} text-text-muted`}>VAT {p.vat_rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {invoice.lines.length === 0 ? (
        <EmptyState title="No items yet">Search a product or service above.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className={TH}>Item</th>
                <th className={THR}>Qty</th>
                <th className={THR}>Unit price</th>
                <th className={THR}>Disc. %</th>
                <th className={THR}>VAT %</th>
                <th className={THR}>Total excl.</th>
                <th className={THR}>Total incl.</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className={TD}>
                    <b>{l.product}</b> {l.label}
                  </td>
                  <td className={TDR}>{l.qty}</td>
                  <td className={TDR}>{money(l.unit_price)}</td>
                  <td className={TDR}>{l.discount}</td>
                  <td className={TDR}>{l.vat}</td>
                  <td className={TDR}>{money(l.total_ht)}</td>
                  <td className={TDR}>{money(l.total_ttc)}</td>
                  <td className={TD}>
                    {invoice.state.draft && (
                      <button type="button" className={DANGER_GHOST_BTN} aria-label={`Remove ${l.label}`} onClick={() => remove(l.id)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface font-bold">
                <td className={TDR} colSpan={5}>
                  Totals
                </td>
                <td className={TDR}>{money(invoice.total_ht)}</td>
                <td className={TDR}>{money(invoice.total_ttc)}</td>
                <td />
              </tr>
              <tr>
                <td className={`${TDR} text-text-muted`} colSpan={5}>
                  VAT
                </td>
                <td className={`${TDR} text-text-muted`} colSpan={2}>
                  {money(invoice.total_tva)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- Step 3 (plan) --------------------------------------------------------------------------------------------------------------
function Step3({ st, patch, tpls, tpl, interestProduct }: { st: State; patch: Patch; tpls: PlanTemplate[]; tpl: (id: string) => PlanTemplate | undefined; interestProduct: number }) {
  const isNew = st.mode === 'new'
  const tplOpts = [
    { id: '', label: '— no template (configure below) —' },
    ...tpls.map((t) => ({
      id: t.id,
      label: `${t.label}${t.lines.length ? ` (${t.lines.length} × ${t.lines.map((l) => `${Math.round(l.percent * 100) / 100}%`).join(' / ')})` : ''}${t.interest_rate ? ` + ${Math.round(t.interest_rate * 100) / 100}% interest` : ''}`,
    })),
  ]
  const items: FormItem[] = [
    { key: 'template_id', label: 'Installment plan template', type: 'select', options: tplOpts, full: true },
    {
      key: 'kind',
      label: 'Structure',
      type: 'select',
      options: [
        { id: 'full', label: 'Full payment' },
        { id: 'advance_balance', label: 'Advance + balance' },
        { id: 'equal', label: 'Equal installments' },
        { id: 'percent', label: 'Percentage-based (edit next step)' },
        { id: 'custom', label: 'Custom schedule (edit next step)' },
      ],
      show: (x) => !x.template_id,
    },
    { key: 'count', label: 'Number of installments', type: 'num', show: (x) => !x.template_id && ['equal', 'percent', 'custom'].includes(x.kind) },
    { key: 'advance_percent', label: 'Advance %', type: 'num', show: (x) => !x.template_id && x.kind === 'advance_balance' },
    {
      key: 'frequency',
      label: 'Payment frequency',
      type: 'select',
      options: [
        { id: 'weekly', label: 'Weekly' },
        { id: 'biweekly', label: 'Every 2 weeks' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'quarterly', label: 'Quarterly' },
        { id: 'custom', label: 'Every 30 days' },
      ],
      show: (x) => !x.template_id,
    },
    { key: 'first_due', label: 'First due date', type: 'date', required: true },
    { key: 'grace_days', label: 'Grace period (days)', type: 'num', hint: 'Added to every due date' },
    {
      key: 'interest_rate',
      label: 'Interest % (flat, on the principal)',
      type: 'num',
      disabled: !isNew,
      hint: isNew ? (interestProduct ? 'Calculated automatically and added to the invoice as an interest line' : 'Set the interest service in Settings › Accounting to charge interest') : 'Interest applies to new invoices only',
    },
    { key: 'note', label: 'Notes', type: 'textarea', full: true },
  ]
  const values: FormValues = {
    template_id: st.template_id,
    kind: st.kind,
    count: st.count,
    advance_percent: st.advance_percent,
    frequency: st.frequency,
    first_due: st.first_due,
    grace_days: st.grace_days,
    interest_rate: isNew ? st.interest_rate : '0',
    note: st.note,
  }
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-text!">Installment plan</h3>
      <DynamicForm
        items={items}
        values={values}
        onChange={(k, v) => {
          const p: Partial<State> = { [k]: v } as Partial<State>
          if (k === 'template_id' && isNew) p.interest_rate = String(tpl(v)?.interest_rate ?? 0)
          patch(p)
        }}
      />
    </div>
  )
}

// ---- Step 4 (schedule) ----------------------------------------------------------------------------------------------------------
function Step4({ st, patch, recalc, cur, onError }: { st: State; patch: Patch; recalc: (rows: PreviewRow[], mode?: 'percent' | 'amount') => Promise<unknown>; cur: string; onError: (e: unknown) => void }) {
  const t = st.totals as PreviewTotals
  const ok = Object.keys(st.errors).length === 0
  const edit = (i: number, p: Partial<PreviewRow>) => patch({ rows: st.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) })
  const rc = (rows = st.rows, mode?: 'percent' | 'amount') => recalc(rows, mode).catch(onError)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <b className="text-text!">Schedule</b>
          <Segmented<'percent' | 'amount'>
            label="Entry mode"
            options={[
              ['percent', 'Enter percentages'],
              ['amount', 'Enter amounts'],
            ]}
            value={st.rowsMode}
            onChange={(m) => patch({ rowsMode: m })}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={GHOST_BTN}
            onClick={() => {
              const last = st.rows[st.rows.length - 1]
              patch({ rows: [...st.rows, { label: `Installment ${st.rows.length + 1}`, due_date: last?.due_date || st.first_due, percent: 0, amount: 0 }], errors: { pending: ['New installment: set its share, then recalculate.'] } })
            }}
          >
            + Add installment
          </button>
          <button type="button" className={GHOST_BTN} onClick={() => rc()}>
            ⟳ Recalculate
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className={TH}>#</th>
              <th className={TH}>Description</th>
              <th className={TH}>Due date</th>
              <th className={THR}>%</th>
              <th className={THR}>Amount ({cur})</th>
              <th className={THR}>Principal</th>
              <th className={THR}>Interest</th>
              <th className={THR}>Paid</th>
              <th className={THR}>Outstanding</th>
              <th className={TH}>Status</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {st.rows.map((r, i) => {
              const err = (st.errors[`schedule[${i}]`] ?? []).join(' ')
              return (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className={TD}>{i + 1}</td>
                  <td className={TD}>
                    <input aria-label={`Description ${i + 1}`} className={inputClasses} value={r.label} onChange={(e) => edit(i, { label: e.target.value })} />
                  </td>
                  <td className={TD}>
                    <input type="date" aria-label={`Due date ${i + 1}`} className={inputClasses} value={r.due_date} onChange={(e) => edit(i, { due_date: e.target.value })} onBlur={() => rc()} />
                  </td>
                  <td className={TDR}>
                    <input aria-label={`Percentage ${i + 1}`} className={`${inputClasses} !w-24 text-right`} readOnly={st.rowsMode === 'amount'} value={Math.round(r.percent * 10000) / 10000} onChange={(e) => edit(i, { percent: num(e.target.value) })} onBlur={() => rc()} />
                  </td>
                  <td className={TDR}>
                    <input aria-label={`Amount ${i + 1}`} className={`${inputClasses} !w-32 text-right`} readOnly={st.rowsMode === 'percent'} value={Number(r.amount).toFixed(2)} onChange={(e) => edit(i, { amount: num(e.target.value) })} onBlur={() => rc()} />
                    {r.rounding_adjustment ? <div className="text-[11px] text-text-muted">incl. rounding {r.rounding_adjustment}</div> : null}
                  </td>
                  <td className={TDR}>{money(r.principal ?? r.amount)}</td>
                  <td className={TDR}>{money(r.interest ?? 0)}</td>
                  <td className={TDR}>0.00</td>
                  <td className={TDR}>{money(r.amount)}</td>
                  <td className={TD}>
                    <StatusBadge status="pending" />
                    {err && <div className="text-xs text-danger-fg">{err}</div>}
                  </td>
                  <td className={TD}>
                    <button type="button" aria-label={`Remove installment ${i + 1}`} disabled={st.rows.length < 2} className={DANGER_GHOST_BTN} onClick={() => rc(st.rows.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface font-bold">
              <td className={TDR} colSpan={3}>
                Total
              </td>
              <td className={TDR}>{Math.round(t.percent * 100) / 100}%</td>
              <td className={TDR}>{money(t.amount)}</td>
              <td className={TDR}>{money(t.principal)}</td>
              <td className={TDR}>{money(t.interest)}</td>
              <td />
              <td className={TDR}>{money(t.amount)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <Banner tone={ok ? 'info' : 'bad'}>
        {ok
          ? `Schedule balances: ${Math.round(t.percent * 100) / 100}% = ${money(t.amount)} ${cur} (eligible ${money(t.eligible)}${t.interest ? ` = principal ${money(t.principal)} + ${Math.round(t.interest_rate * 100) / 100}% interest ${money(t.interest)}` : ''}). The last installment absorbs any rounding.`
          : Object.entries(st.errors).filter(([k]) => !k.startsWith('schedule[')).map(([, v]) => v.join(' ')).join(' ') || 'Fix the highlighted installments.'}
      </Banner>
    </div>
  )
}

// ---- Step 5 (summary) -----------------------------------------------------------------------------------------------------------
function Step5({ st, cur, isNewDraft }: { st: State; cur: string; isNewDraft: boolean }): ReactNode {
  const t = st.totals as PreviewTotals
  const s = (st.invoice as InvoiceForPlan).state
  const rows: Array<[string, string]> = [
    ['Principal', `${money(t.principal)} ${cur}`],
    ['Interest', t.interest ? `${Math.round(t.interest_rate * 100) / 100}% = ${money(t.interest)} ${cur}` : 'None'],
    ['Total percentage', `${Math.round(t.percent * 100) / 100}%`],
    ['Total installment amount', `${money(t.amount)} ${cur}`],
    ['Allocated so far', '0.00'],
    ['Outstanding after creation', `${money(t.amount)} ${cur}`],
    ['First due date', fmtDate(t.first_due)],
    ['Final due date', fmtDate(t.last_due)],
    ['Notes', st.note || '—'],
  ]
  return (
    <div className="space-y-4">
      <KpiRow>
        <AssetKpi label="Invoice total" value={<Cur value={s.total} currency={s.currency} />} />
        <AssetKpi label="Existing payments" value={<Cur value={s.total - s.remain} currency={s.currency} />} />
        <AssetKpi label="Eligible amount" value={<Cur value={t.eligible} currency={s.currency} />} tone="ok" />
        <AssetKpi label="Installments" value={t.count} note={`${fmtDate(t.first_due)} → ${fmtDate(t.last_due)}`} />
      </KpiRow>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-border last:border-0">
              <td className="w-64 py-2 text-text-muted">{k}</td>
              <td className="py-2 font-bold text-text">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isNewDraft && (
        <Banner>
          “Create invoice and installment plan” validates draft invoice <b>{st.invoice?.ref}</b> with the normal invoice engine (numbering, stock and ZRA fiscalisation as configured), then activates the plan.
        </Banner>
      )}
    </div>
  )
}
