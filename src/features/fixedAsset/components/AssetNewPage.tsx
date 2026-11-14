import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { ROUTES } from '../../../routes'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useAssetOptions, useCreateAsset, useSupplierLines } from '../assetList.data'
import { METHOD_LABEL, MODE_LABEL, fmtDate, int, money, num, round2, type AcqMode, type AssetTypeOption, type DepMethod, type SupplierLine } from '../assetModels'
import { Banner, DynamicForm, EmptyState, NoticeStrip, PageHeading, AssetSubNav, ClassicViewLink } from './AssetUi'
import { assetViewPath, GHOST_BTN, PRIMARY_BTN, failureText, useDebounced, useNotice, visibleValues, type FormItem, type FormValues } from '../assetUiHelpers'

const STEPS = ['Source', 'Details', 'Depreciation', 'Review']
const MODE_TEXT: Record<AcqMode, string> = {
  purchase: 'Pick the line of a validated supplier invoice. Its cost and date are copied, and the line is bound to the asset account when it goes into service — no double posting.',
  manual: 'Bought outside the purchase module (cash, donation, transfer). Capitalising posts Dr asset / Cr the account you choose.',
  opening: 'Already owned when you started using ecuenta. Enter the original cost and the depreciation charged so far; capitalising posts the opening balance.',
}

function InvoicePicker({ selected, onPick }: { selected: SupplierLine | null; onPick: (line: SupplierLine) => void }) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const lines = useSupplierLines(q)
  const items = lines.data?.items ?? []
  return (
    <div className="mt-4 space-y-3">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier invoices: ref, supplier, product…" aria-label="Search supplier invoice lines" className={inputClasses} />
      {lines.isLoading && <p className="text-sm text-text-muted">Loading invoice lines…</p>}
      {lines.isError && <p className="text-sm text-danger">{failureText(lines.error, 'Could not load the invoice lines.')}</p>}
      {lines.data && items.length === 0 && <p className="text-sm text-text-muted">No unlinked invoice lines found.</p>}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-3 py-2" />
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Line</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Amount (excl. tax)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.line_id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <input type="radio" name="inv" checked={selected?.line_id === it.line_id} onChange={() => onPick(it)} aria-label={`Use ${it.ref} line`} />
                  </td>
                  <td className="px-3 py-2">
                    <b>{it.ref}</b> <span className="text-text-muted">{it.ref_supplier || ''}</span>
                  </td>
                  <td className="px-3 py-2">{it.supplier}</td>
                  <td className="px-3 py-2">{it.description}</td>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(it.date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// New asset (classic asset/new.php): 1 source, 2 details, 3 depreciation, 4 review; saves the asset as a DRAFT (asset/api/assets.php
// action=save) and opens its card, where Put in service starts the depreciation. The steps, fields, hints and checks are the classic page's.
export function AssetNewPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const navigate = useNavigate()
  const options = useAssetOptions()
  const create = useCreateAsset()
  const { notice, show } = useNotice()
  const [step, setStep] = useState(1)
  const [v, setV] = useState<FormValues>({ acq_mode: 'purchase' })
  const [invoice, setInvoice] = useState<SupplierLine | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const opts = options.data
  const mode = (v.acq_mode as AcqMode) || 'purchase'
  const type: AssetTypeOption | null = useMemo(() => opts?.types.find((t) => String(t.id) === v.type_id) ?? null, [opts, v.type_id])
  const currency = opts?.currency ?? ''
  const set = (key: string, value: string) => setV((cur) => ({ ...cur, [key]: value }))

  // ---- step 2: details ----------------------------------------------------------------------------------------------
  const detailItems: FormItem[] = opts
    ? [
        { key: 'label', label: 'Asset name', required: true, placeholder: 'e.g. Toyota Hilux 2.8 GD-6', full: true },
        { key: 'type_id', label: 'Type', type: 'select', options: opts.types, blank: '— choose —', required: true, hint: 'The type sets the method, life and ledger accounts.' },
        { key: 'category_id', label: 'Category', type: 'select', options: opts.categories, blank: '— none —' },
        { key: 'group_id', label: 'Group', type: 'select', options: opts.groups, blank: '— none —' },
        { key: 'location', label: 'Location', placeholder: 'Head office' },
        { key: 'custodian_id', label: 'Custodian', type: 'select', options: opts.users, blank: '— none —' },
        { key: 'serial_number', label: 'Serial / asset tag', placeholder: 'SN-001' },
        { section: 'Value and dates' },
        { key: 'cost', label: `Acquisition cost (${currency})`, type: 'num', required: true, disabled: mode === 'purchase', hint: mode === 'purchase' ? 'From the invoice line' : '' },
        { key: 'acquisition_date', label: mode === 'opening' ? 'Take-on date' : 'Acquisition date', type: 'date', required: true, hint: mode === 'opening' ? 'The date the opening balance is posted.' : '' },
        { key: 'in_service_date', label: 'In-service date', type: 'date', required: true, hint: 'Depreciation starts this month (or next month if after the 15th).' },
        { key: 'opening_accum', label: 'Depreciation charged before take-on', type: 'num', show: () => mode === 'opening', hint: 'Accumulated depreciation already in your old books.' },
        { section: 'Vehicle (optional)' },
        { key: 'licence_plate', label: 'Licence plate' },
        { key: 'manufacturer', label: 'Make' },
        { key: 'model_year', label: 'Model year' },
        { key: 'chassis_no', label: 'Chassis no.' },
        { key: 'engine_no', label: 'Engine no.' },
        { key: 'fuel_type', label: 'Fuel' },
        { section: 'Notes' },
        { key: 'description', label: 'Description', type: 'textarea', full: true },
      ]
    : []

  // ---- step 3: depreciation -----------------------------------------------------------------------------------------
  const depItems: FormItem[] = [
    { key: 'method', label: 'Method', type: 'select', options: (Object.keys(METHOD_LABEL) as DepMethod[]).map((m) => ({ id: m, label: METHOD_LABEL[m] + (m === type?.method ? ' (type default)' : '') })) },
    { key: 'life_months', label: 'Useful life (months)', type: 'num', show: (x) => x.method !== 'declining' },
    { key: 'rate', label: 'Annual rate %', type: 'num', show: (x) => x.method === 'declining' },
    { key: 'total_units', label: `Lifetime ${type?.unit_label || 'units'}`, type: 'num', show: (x) => x.method === 'units' },
    { key: 'residual_value', label: `Residual value (${currency})`, type: 'num', hint: `Never depreciated${type?.residual_pct ? ` — type default ${type.residual_pct}%` : ''}` },
  ]

  // Opening the depreciation step: pre-fill from the type, as the classic page does (what the user already typed stays).
  function enterDepreciation() {
    const t = type
    const cost = num(v.cost)
    setV((cur) => ({
      method: t?.method || 'linear',
      life_months: t?.life_months != null ? String(t.life_months) : '',
      rate: t?.rate != null ? String(t.rate) : '',
      total_units: t?.total_units != null ? String(t.total_units) : '',
      residual_value: String(round2((cost * (t?.residual_pct || 0)) / 100)),
      ...cur,
    }))
  }

  function collectDetails(): FormValues {
    return { ...v, ...visibleValues(detailItems, v) }
  }

  function next() {
    setErrors({})
    if (step === 1) {
      if (mode === 'purchase' && !invoice) return show('Choose the supplier invoice line.', 'bad')
      // The dates of the details step start at the invoice date / today and are kept in the values, so what is shown is what is saved.
      setV((cur) => ({
        ...cur,
        acquisition_date: cur.acquisition_date || opts!.today,
        in_service_date: cur.in_service_date || cur.acquisition_date || opts!.today,
      }))
      return setStep(2)
    }
    if (step === 2) {
      const x = collectDetails()
      const miss: Record<string, string> = {}
      for (const k of ['label', 'type_id', 'acquisition_date', 'in_service_date']) if (!x[k]) miss[k] = 'Required'
      if (mode !== 'purchase' && !(num(x.cost) > 0)) miss.cost = 'Enter the cost'
      if (x.in_service_date && x.acquisition_date && mode !== 'opening' && x.in_service_date < x.acquisition_date) miss.in_service_date = 'Before the acquisition date'
      if (mode === 'opening' && num(x.opening_accum) > num(x.cost)) miss.opening_accum = 'Cannot exceed cost'
      setErrors(miss)
      if (Object.keys(miss).length) return show('Please complete the highlighted fields.', 'bad')
      setV(x)
      enterDepreciation()
      return setStep(3)
    }
    if (step === 3) {
      const x = visibleValues(depItems, v)
      const e: Record<string, string> = {}
      if (x.method !== 'declining' && !(num(x.life_months) > 0)) e.life_months = 'Required'
      if (x.method === 'declining' && !(num(x.rate) > 0)) e.rate = 'Required'
      if (x.method === 'units' && !(num(x.total_units) > 0)) e.total_units = 'Required'
      if (num(x.residual_value) >= num(v.cost)) e.residual_value = 'Must be below the cost'
      setErrors(e)
      if (Object.keys(e).length) return show('Please complete the highlighted fields.', 'bad')
      setV((cur) => ({ ...cur, ...x }))
      return setStep(4)
    }
  }

  function back() {
    setErrors({})
    setStep((s) => s - 1)
  }

  async function save() {
    const body: Record<string, unknown> = { ...v }
    // The classic page sends only the fields it shows: the cost comes from the invoice line, the opening depreciation only exists for an
    // opening balance, and a method's own fields (months / rate / units) only for that method. The pre-filled hidden ones are not sent.
    if (mode === 'purchase') delete body.cost
    // The classic page posts the chosen line's id as the number the lines answer carries; the form values hold it as text.
    if (mode === 'purchase' && invoice) body.invoice_line_id = invoice.line_id
    if (mode !== 'opening') delete body.opening_accum
    const shown = visibleValues(depItems, v)
    for (const k of ['life_months', 'rate', 'total_units']) if (!(k in shown)) delete body[k]
    try {
      const reply = await create.mutateAsync(body)
      navigate(`${assetViewPath(reply.data.id)}?created=1`)
    } catch (e) {
      show(failureText(e, 'Could not create the asset.'), 'bad')
    }
  }

  if (options.isLoading) return <LegacyLoadingCard label="Loading…" />
  if (options.isError) return <LegacyErrorCard title="Couldn't load the asset options" message={options.error instanceof Error ? options.error.message : 'Unknown error.'} onRetry={() => options.refetch()} />
  if (!opts) return null
  if (opts.types.length === 0) {
    return (
      <Card className="!h-auto">
        <EmptyState title="No asset type yet">
          Create a type first in{' '}
          <Link to={ROUTES.fixedAssetTypes} className="text-brand hover:underline">
            Setup → Types
          </Link>
          ; it carries the depreciation rules and ledger accounts.
        </EmptyState>
      </Card>
    )
  }

  const typeIncomplete = step === 3 && type && type.accounts_ok === false
  const reviewRows: Array<[string, string]> = [
    ['Source', MODE_LABEL[mode] + (invoice ? ` — ${invoice.ref} (${invoice.supplier})` : '')],
    ['Name', v.label],
    ['Type', type?.label ?? ''],
    ['Cost', `${money(num(v.cost))} ${currency}`],
    ['Acquired', fmtDate(v.acquisition_date)],
    ['In service', fmtDate(v.in_service_date)],
    ['Method', `${METHOD_LABEL[v.method as DepMethod] ?? ''}${v.method === 'declining' ? ` ${v.rate}%/yr` : ` · ${v.life_months} months`}`],
    ['Residual value', `${money(num(v.residual_value))} ${currency}`],
  ]
  if (mode === 'opening') reviewRows.push(['Opening accumulated depreciation', `${money(num(v.opening_accum))} ${currency}`])

  return (
    <div className="space-y-4">
      <PageHeading icon={icon} title="New asset" action={<ClassicViewLink view="list" />}>
        Register an asset from a supplier invoice, a manual purchase or an opening balance.
      </PageHeading>
      <AssetSubNav group="main" active="new" />
      <NoticeStrip notice={notice} />

      <Card className="!h-auto flex-row flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-4">
          {STEPS.map((s, i) => {
            const n = i + 1
            return (
              <li key={s} aria-current={n === step ? 'step' : undefined} className={`flex items-center gap-2 text-sm ${n === step ? 'font-semibold text-text!' : 'text-text-muted'}`}>
                <b className={`grid h-6 w-6 place-items-center rounded-full text-xs ${n < step ? 'bg-success-bg text-success-fg' : n === step ? 'bg-brand text-white' : 'bg-surface-hover text-text-muted'}`}>{n < step ? '✓' : n}</b>
                {s}
              </li>
            )
          })}
        </ol>
        <span className="text-sm text-text-muted">
          Next reference: <b className="text-text!">{opts.next_ref}</b>
        </span>
      </Card>

      <Card className="!h-auto">
        {step === 1 && (
          <>
            <h3 className="mb-3 text-lg font-semibold text-text!">How was this asset acquired?</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(MODE_LABEL) as AcqMode[]).map((m) => (
                <label key={m} className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 ${mode === m ? 'border-brand bg-brand/5' : 'border-border'}`}>
                  <span className="flex items-center gap-2 font-semibold text-text!">
                    <input
                      type="radio"
                      name="mode"
                      value={m}
                      checked={mode === m}
                      onChange={() => {
                        setV((cur) => ({ ...cur, acq_mode: m, ...(m !== 'purchase' ? { invoice_line_id: '' } : {}) }))
                        if (m !== 'purchase') setInvoice(null)
                      }}
                    />
                    {MODE_LABEL[m]}
                  </span>
                  <span className="text-sm text-text-muted">{MODE_TEXT[m]}</span>
                </label>
              ))}
            </div>
            {mode === 'purchase' && (
              <InvoicePicker
                selected={invoice}
                onPick={(line) => {
                  setInvoice(line)
                  setV((cur) => ({ ...cur, invoice_line_id: String(line.line_id), cost: String(line.amount), acquisition_date: line.date, ...(cur.label ? {} : { label: line.description }) }))
                }}
              />
            )}
          </>
        )}

        {step === 2 && (
          <DynamicForm
            items={detailItems}
            values={v}
            onChange={(k, val) => {
              set(k, val)
              // Picking a type fills its default category when none is chosen yet.
              if (k === 'type_id') {
                const t = opts.types.find((x) => String(x.id) === val)
                if (t?.category_id && !v.category_id) set('category_id', String(t.category_id))
              }
            }}
            errors={errors}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-text!">Depreciation</h3>
              <p className="text-sm text-text-muted">
                Pre-filled from the <b>{type?.label ?? ''}</b> type; change anything that differs for this asset.
              </p>
            </div>
            {typeIncomplete && (
              <Banner tone="warn">
                This type has no complete ledger accounts yet — set them in{' '}
                <Link to={ROUTES.fixedAssetTypes} className="underline">
                  Setup → Types
                </Link>{' '}
                before putting the asset in service.
              </Banner>
            )}
            <DynamicForm items={depItems} values={v} onChange={set} errors={errors} />
            <DepreciationHint v={v} unitLabel={type?.unit_label || 'unit'} currency={currency} />
          </div>
        )}

        {step === 4 && (
          <>
            <h3 className="mb-3 text-lg font-semibold text-text!">Review</h3>
            <table className="w-full text-sm">
              <tbody>
                {reviewRows.map(([k, val]) => (
                  <tr key={k} className="border-b border-border last:border-0">
                    <td className="w-64 px-3 py-2 text-text-muted">{k}</td>
                    <td className="px-3 py-2 font-semibold text-text!">{val || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <Banner>
                The asset is saved as a <b>draft</b>. Open it and choose <b>Put in service</b> to start depreciation
                {mode === 'purchase' ? ' (the invoice line is then bound to the asset account).' : ' and post the capitalisation entry.'}
              </Banner>
            </div>
          </>
        )}

        <div className="mt-5 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" className={GHOST_BTN} onClick={back}>
              ← Back
            </button>
          ) : (
            <Link to={ROUTES.fixedAssetList} className={GHOST_BTN}>
              Cancel
            </Link>
          )}
          {step < 4 ? (
            <button type="button" className={PRIMARY_BTN} onClick={next}>
              {step === 3 ? 'Review →' : 'Continue →'}
            </button>
          ) : (
            <button type="button" className={PRIMARY_BTN} onClick={save} disabled={create.isPending}>
              {create.isPending && <Loader2 size={14} className="animate-spin" />} {create.isPending ? 'Saving…' : 'Create asset'}
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}

// The one-line estimate under the depreciation fields (same wording and maths as the classic page).
function DepreciationHint({ v, unitLabel, currency }: { v: FormValues; unitLabel: string; currency: string }) {
  const cost = num(v.cost)
  const res = num(v.residual_value)
  const base = cost - res - num(v.opening_accum)
  let text: ReactNode = null
  if (v.method === 'linear' && num(v.life_months) > 0) {
    text = (
      <>
        About <b>{money(base / num(v.life_months))}</b> {currency} per month for {int(num(v.life_months))} months.
      </>
    )
  } else if (v.method === 'declining' && num(v.rate) > 0) {
    text = (
      <>
        First month <b>{money(((cost - num(v.opening_accum)) * num(v.rate)) / 1200)}</b> {currency}, decreasing every month until the residual value.
      </>
    )
  } else if (v.method === 'units' && num(v.total_units) > 0) {
    text = (
      <>
        <b>{money(base / num(v.total_units))}</b> {currency} per {unitLabel} used — usage is entered each month.
      </>
    )
  }
  return text ? <Banner>{text}</Banner> : null
}
