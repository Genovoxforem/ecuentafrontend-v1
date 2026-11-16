import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { ROUTES } from '../../../routes'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { AssetApiError } from '../assetService'
import { useAssetOptions } from '../assetList.data'
import { useAssetAction, useAssetCard } from '../assetCard.data'
import { METHOD_LABEL, MODE_LABEL, fmtDate, int, isoDate, money, previousMonth, type AssetCard, type AssetOptions, type DepMethod } from '../assetModels'
import { AssetKpi, Banner, Cur, FormDialog, KpiRow, LifecycleBadge, NoticeStrip, Badge, AssetSubNav, ClassicViewLink } from './AssetUi'
import { DANGER_BTN, DANGER_GHOST_BTN, GHOST_BTN, PRIMARY_BTN, failureText, ledgerPiecePath, useNotice, type FormItem, type FormValues } from '../assetUiHelpers'

// The five tabs after Overview are read by a click, so they load with it (their own chunk).
const AssetCardTab = lazy(() => import('./AssetCardTabs'))

type TabKey = 'overview' | 'schedule' | 'insurance' | 'movements' | 'ledger' | 'history'
const TAB_KEYS: TabKey[] = ['overview', 'schedule', 'insurance', 'movements', 'ledger', 'history']
type Policy = AssetCard['policies'][number]
type Claim = AssetCard['claims'][number]

type Dialog =
  | { kind: 'edit' }
  | { kind: 'service' }
  | { kind: 'post' }
  | { kind: 'move' }
  | { kind: 'dispose' }
  | { kind: 'reverse'; piece: number }
  | { kind: 'units'; period: string }
  | { kind: 'policy'; policy: Policy | null }
  | { kind: 'claim'; claim: Claim | null }

const today = () => isoDate(new Date())
// A value as the form's text; an id of 0 is "none" (the empty choice of the select).
const str = (v: unknown, id = false) => (v === null || v === undefined || (id && Number(v) === 0) ? '' : String(v))

function DetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => (
            <tr key={k} className="border-b border-border last:border-0">
              <td className="w-56 px-4 py-2 align-top text-text-muted">{k}</td>
              <td className="px-4 py-2 text-text capitalize">{v}</td>
            </tr>
          ))}
      </tbody>
    </table>
  )
}

function Overview({ a }: { a: AssetCard }) {
  const v = a.vehicle
  const hasVehicle = Object.values(v).some(Boolean)
  const facid = a.purchase?.url ? /[?&]facid=(\d+)/.exec(a.purchase.url)?.[1] : undefined
  const purchase = a.purchase ? (
    <>
      {facid ? (
        <Link to={ROUTES.vendorInvoiceDetail.replace(':id', facid)} className="text-brand hover:underline">
          {a.purchase.ref}
        </Link>
      ) : (
        a.purchase.ref
      )}{' '}
      · {a.purchase.supplier || ''} · {money(a.purchase.amount)} ·{' '}
      {a.purchase.bound_account ? (
        <>
          bound to <span className="font-mono text-xs">{a.purchase.bound_account}</span>
        </>
      ) : (
        <Badge tone="warn">line not bound yet</Badge>
      )}
    </>
  ) : null
  const capitalisation = a.acq_piece_num ? (
    <Link to={ledgerPiecePath(a.acq_piece_num)} className="text-brand hover:underline">
      piece #{a.acq_piece_num}
    </Link>
  ) : (
    ''
  )
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="!h-auto !p-0">
          <DetailTable
            rows={[
              ['Type', a.type],
              ['Category', a.category],
              ['Group', a.group],
              ['Location', a.location],
              ['Serial / tag', a.serial_number],
              ['Acquired', fmtDate(a.acquisition_date)],
              ['In service', fmtDate(a.in_service_date)],
              ['Purchase', purchase],
              ['Disposed', a.disposal ? `${fmtDate(a.disposal.date)} · ${a.disposal.kind} · ${a.disposal.gain_loss >= 0 ? 'gain ' : 'loss '}${money(Math.abs(a.disposal.gain_loss))}` : ''],
              ['Capitalisation', capitalisation],
              ['Description', a.description],
            ]}
          />
        </Card>
        <Card className="!h-auto !p-0">
          <div className="px-4 pt-3 text-sm">
            <b className="text-text!">Ledger accounts</b> <span className="text-text-muted">(from the type)</span>
          </div>
          <DetailTable
            rows={[
              ['Asset cost', a.accounts.asset || '—'],
              ['Accumulated depreciation', a.accounts.accum || '—'],
              ['Depreciation expense', a.accounts.expense || '—'],
              ['Gain on disposal', a.accounts.gain || '—'],
              ['Loss on disposal', a.accounts.loss || '—'],
            ]}
          />
        </Card>
      </div>
      {hasVehicle && (
        <Card className="!h-auto !p-0">
          <div className="px-4 pt-3 text-sm">
            <b className="text-text!">Vehicle</b>
          </div>
          <DetailTable
            rows={[
              ['Licence plate', v.licence_plate],
              ['Make', v.manufacturer],
              ['Model year', v.model_year],
              ['Type', v.vehicle_type],
              ['Chassis', v.chassis_no],
              ['Engine', v.engine_no],
              ['Driver', v.driver],
              ['Fuel', v.fuel_type],
              ['Colour', v.colour],
              ['Registered', v.registration_date],
              ['Registration expiry', v.expiry_date],
            ]}
          />
        </Card>
      )}
    </div>
  )
}

// ---- dialogs: fields and starting values of each action (asset/js/view.js) -------------------------------------------------
function editForm(a: AssetCard, opts: AssetOptions): { items: FormItem[]; initial: FormValues } {
  const locked = a.lifecycle !== 'draft'
  const items: FormItem[] = [
    { key: 'label', label: 'Name', required: true, full: true },
    { key: 'category_id', label: 'Category', type: 'select', options: opts.categories, blank: '— none —' },
    { key: 'serial_number', label: 'Serial / tag' },
    { key: 'location', label: 'Location' },
    { key: 'custodian_id', label: 'Custodian', type: 'select', options: opts.users, blank: '— none —' },
  ]
  if (!locked) {
    items.push(
      { section: 'Value & depreciation (editable while draft)' },
      { key: 'type_id', label: 'Type', type: 'select', options: opts.types, required: true },
      { key: 'group_id', label: 'Group', type: 'select', options: opts.groups, blank: '— none —' },
      { key: 'cost', label: 'Cost', type: 'num', disabled: a.acq_mode === 'purchase' },
      { key: 'residual_value', label: 'Residual value', type: 'num' },
      { key: 'acquisition_date', label: 'Acquired', type: 'date' },
      { key: 'in_service_date', label: 'In service', type: 'date' },
      { key: 'opening_accum', label: 'Opening accumulated depreciation', type: 'num', show: () => a.acq_mode === 'opening' },
      { key: 'method', label: 'Method', type: 'select', options: [{ id: '', label: 'Type default' }, ...(Object.keys(METHOD_LABEL) as DepMethod[]).map((m) => ({ id: m, label: METHOD_LABEL[m] }))] },
      { key: 'life_months', label: 'Useful life (months)', type: 'num' },
      { key: 'rate', label: 'Annual rate %', type: 'num' },
      { key: 'total_units', label: 'Lifetime units', type: 'num' },
    )
  }
  items.push(
    { section: 'Vehicle' },
    { key: 'licence_plate', label: 'Licence plate' },
    { key: 'manufacturer', label: 'Make' },
    { key: 'model_year', label: 'Model year' },
    { key: 'vehicle_type', label: 'Vehicle type' },
    { key: 'chassis_no', label: 'Chassis' },
    { key: 'engine_no', label: 'Engine' },
    { key: 'driver', label: 'Driver' },
    { key: 'fuel_type', label: 'Fuel' },
    { key: 'colour', label: 'Colour' },
    { key: 'registration_date', label: 'Registered', type: 'date' },
    { key: 'expiry_date', label: 'Registration expiry', type: 'date' },
    { section: 'Notes' },
    { key: 'description', label: 'Description', type: 'textarea', full: true },
    { key: 'note_private', label: 'Private note', type: 'textarea', full: true },
  )
  const src: Record<string, unknown> = { ...a, ...a.vehicle, method: a.own_method || '', life_months: a.own_life, rate: a.own_rate, total_units: a.own_units }
  const initial: FormValues = {}
  for (const i of items) {
    if ('section' in i) continue
    const v = src[i.key]
    initial[i.key] = i.type === 'date' ? str(v).slice(0, 10) : str(v, i.key.endsWith('_id'))
  }
  return { items, initial }
}

// The card of one asset (classic asset/view.php) on asset/api/assets.php (action=get and the card's actions). The values, tabs, buttons,
// dialogs and their wording are the classic page's.
export function AssetCardPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const confirm = useConfirm()
  const { notice, show } = useNotice()
  const card = useAssetCard(id)
  const options = useAssetOptions()
  const act = useAssetAction(id)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const a = card.data
  const opts = options.data
  const requested = search.get('tab') as TabKey | null
  const tab: TabKey = TAB_KEYS.includes(requested as TabKey) ? (requested as TabKey) : 'overview'
  const created = search.get('created')

  // After "Create asset" the wizard opens the card with ?created=1: say so once, then drop it from the address.
  useEffect(() => {
    if (!a || !created) return
    show(`${a.ref} created as a draft. Put it in service when ready.`)
    const next = new URLSearchParams(search)
    next.delete('created')
    setSearch(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id, created])

  const perform = async (action: string, body?: Record<string, unknown>) => {
    const reply = await act.mutateAsync({ action, body })
    show(reply.message || 'Done')
    return reply
  }

  // Dispose: when months of depreciation are still unposted the backend refuses with 409 and lists them in errors.due; the classic page offers
  // to post them first and send the disposal again with catch_up.
  async function dispose(x: FormValues) {
    try {
      await perform('dispose', x)
    } catch (e) {
      if (e instanceof AssetApiError && e.status === 409 && Array.isArray(e.errors.due)) {
        const ok = await confirm({
          title: 'Catch up depreciation first?',
          message: `${e.message}\n\nThe missing months are posted first, then the disposal.`,
          confirmLabel: `Post ${e.errors.due.length} month(s) and dispose`,
          variant: 'default',
        })
        if (!ok) throw new Error('Cancelled')
        await perform('dispose', { ...x, catch_up: 1 })
        return
      }
      throw e
    }
  }

  async function removeDraft() {
    if (!a) return
    const ok = await confirm({ title: `Delete ${a.ref}?`, message: 'The draft asset and its notes are removed permanently.' })
    if (!ok) return
    try {
      await act.mutateAsync({ action: 'delete' })
      navigate(ROUTES.fixedAssetList)
    } catch (e) {
      show(failureText(e, 'Could not delete the asset.'), 'bad')
    }
  }

  async function removePolicy(policyId: number) {
    const ok = await confirm({ title: 'Remove policy?', message: 'The policy is removed from this asset.', confirmLabel: 'Remove' })
    if (!ok) return
    try {
      await perform('policy_delete', { policy_id: policyId })
    } catch (e) {
      show(failureText(e, 'Could not remove the policy.'), 'bad')
    }
  }

  const dueMonths = useMemo(() => {
    if (!a) return 0
    const now = isoDate(new Date()).slice(0, 7)
    return a.schedule.rows.filter((r) => r.status === 0 && r.amount > 0 && r.period < now).length
  }, [a])

  if (!id) return <LegacyErrorCard title="Couldn't open the asset" message="No asset id in the address." onRetry={() => navigate(ROUTES.fixedAssetList)} />
  if (card.isLoading || options.isLoading) return <LegacyLoadingCard label="Loading the asset…" />
  if (card.isError) return <LegacyErrorCard title="Couldn't load the asset" message={card.error instanceof Error ? card.error.message : 'Unknown error.'} onRetry={() => card.refetch()} />
  if (!a || !opts) return null

  const r = a.rights
  const pct = a.cost ? Math.round((a.accumulated / a.cost) * 100) : 0
  const methodNote = a.method === 'declining' ? `${a.rate}% / year` : a.method === 'units' ? `${int(a.total_units)} ${a.unit_label ?? ''}` : a.life_months ? `${Math.round((a.life_months / 12) * 10) / 10} years` : ''
  const tabs: Array<[TabKey, string]> = [
    ['overview', 'Overview'],
    ['schedule', 'Depreciation'],
    ['insurance', `Insurance & claims (${a.policies.length + a.claims.length})`],
    ['movements', 'Transfers'],
    ['ledger', `Ledger (${a.ledger.length})`],
    ['history', 'History'],
  ]

  // ---- the open dialog ----
  let dialogEl: ReactNode = null
  const close = () => setDialog(null)
  if (dialog?.kind === 'edit') {
    const f = editForm(a, opts)
    dialogEl = (
      <FormDialog
        title={`Edit ${a.ref}`}
        items={f.items}
        initial={f.initial}
        intro={a.lifecycle !== 'draft' ? <Banner>Value and depreciation fields are locked once the asset is in service — reverse the postings to change them.</Banner> : undefined}
        onClose={close}
        onSave={(x) => {
          if (a.acq_mode === 'purchase') delete x.cost
          return perform('save', x)
        }}
      />
    )
  } else if (dialog?.kind === 'service') {
    const credit = a.acq_mode === 'opening' ? 'Opening balance (equity) account' : 'Credit account (bank, payable or clearing)'
    dialogEl = (
      <FormDialog
        title={`Put ${a.ref} in service`}
        items={a.acq_mode === 'purchase' ? [] : [{ key: 'credit_account', label: credit, type: 'account', required: true }]}
        initial={{}}
        okLabel="Put in service"
        intro={
          <div>
            From {fmtDate(a.in_service_date)} the asset depreciates {(METHOD_LABEL[a.method] ?? '').toLowerCase()}.{' '}
            {a.acq_mode === 'purchase' ? (
              <>
                The supplier invoice line is bound to the asset account <span className="font-mono text-xs">{a.accounts.asset || '?'}</span>, so the purchase journal posts the cost — nothing is posted twice.
              </>
            ) : (
              <>
                This posts the capitalisation entry in the asset journal: <b>Dr {a.accounts.asset || '?'}</b>
                {a.acq_mode === 'opening' && a.opening_accum ? ` / Cr ${a.accounts.accum || '?'} (${money(a.opening_accum)})` : ''} / Cr the account below.
              </>
            )}
          </div>
        }
        onClose={close}
        onSave={(x) => perform('put_in_service', x)}
      />
    )
  } else if (dialog?.kind === 'post') {
    const def = previousMonth()
    dialogEl = (
      <FormDialog
        title="Post depreciation"
        items={[{ key: 'period', label: 'Up to and including month (YYYY-MM)', required: true, placeholder: def }]}
        initial={{ period: def }}
        okLabel="Post"
        intro={`Every unposted month up to the chosen month is posted, one ledger piece per month (Dr ${a.accounts.expense || '?'} / Cr ${a.accounts.accum || '?'}).`}
        onClose={close}
        onSave={(x) => perform('post_depreciation', x)}
      />
    )
  } else if (dialog?.kind === 'move') {
    dialogEl = (
      <FormDialog
        title={`Transfer ${a.ref}`}
        items={[
          { key: 'date', label: 'Date', type: 'date', required: true },
          { key: 'to_group', label: 'To group', type: 'select', options: opts.groups, blank: '— unchanged —' },
          { key: 'to_location', label: 'To location' },
          { key: 'to_custodian', label: 'To custodian', type: 'select', options: opts.users, blank: '— unchanged —' },
          { key: 'note', label: 'Note', type: 'textarea', full: true },
        ]}
        initial={{ date: today(), to_location: a.location ?? '' }}
        okLabel="Record transfer"
        onClose={close}
        onSave={(x) => perform('move', x)}
      />
    )
  } else if (dialog?.kind === 'dispose') {
    dialogEl = (
      <FormDialog
        title={`Dispose of ${a.ref}`}
        items={[
          { key: 'date', label: 'Disposal date', type: 'date', required: true },
          { key: 'kind', label: 'Kind', type: 'select', options: [{ id: 'sale', label: 'Sale' }, { id: 'scrap', label: 'Scrap / write-off' }] },
          { key: 'proceeds', label: 'Sale amount (excl. tax)', type: 'num', show: (x) => x.kind === 'sale' },
          { key: 'fk_facture', label: 'Customer invoice id (optional)', type: 'num', show: (x) => x.kind === 'sale', hint: 'If you invoiced the sale, its lines are bound to the gain account.' },
          { key: 'proceeds_account', label: 'Money received in (when no invoice)', type: 'account', show: (x) => x.kind === 'sale' && !x.fk_facture },
          { key: 'note', label: 'Note', type: 'textarea', full: true },
        ]}
        initial={{ date: today(), kind: 'sale' }}
        okLabel="Review & dispose"
        intro={
          <div>
            NBV today <b>{money(a.nbv)}</b>. The disposal entry removes cost <span className="font-mono text-xs">{a.accounts.asset || '?'}</span> and accumulated depreciation{' '}
            <span className="font-mono text-xs">{a.accounts.accum || '?'}</span>, and books the gain to <span className="font-mono text-xs">{a.accounts.gain || '?'}</span> or the loss to{' '}
            <span className="font-mono text-xs">{a.accounts.loss || '?'}</span>.
          </div>
        }
        onClose={close}
        onSave={dispose}
      />
    )
  } else if (dialog?.kind === 'reverse') {
    const piece = dialog.piece
    dialogEl = (
      <FormDialog
        title={`Reverse piece #${piece}?`}
        items={[{ key: 'reason', label: 'Reason', required: true, full: true }]}
        initial={{}}
        okLabel="Reverse"
        danger
        intro="A mirror entry is posted (the original stays for the audit trail) and the depreciation month becomes planned again."
        onClose={close}
        onSave={(x) => perform('reverse', { piece_num: piece, reason: x.reason })}
      />
    )
  } else if (dialog?.kind === 'units') {
    const p = dialog.period
    dialogEl = (
      <FormDialog
        title={`Usage for ${p}`}
        items={[{ key: 'units', label: `${a.unit_label ?? 'Units'} used in ${p}`, type: 'num', required: true }]}
        initial={{ units: str(a.schedule.rows.find((x) => x.period === p)?.units) }}
        onClose={close}
        onSave={(x) => perform('set_units', { period: p, units: x.units })}
      />
    )
  } else if (dialog?.kind === 'policy') {
    const p = dialog.policy
    dialogEl = (
      <FormDialog
        title={p ? 'Edit policy' : 'New policy'}
        items={[
          { key: 'insurer_id', label: 'Insurer', type: 'select', options: opts.insurers, blank: '— choose —', required: true },
          { key: 'policy_no', label: 'Policy no.' },
          { key: 'cover', label: 'Cover amount', type: 'num' },
          { key: 'premium', label: 'Premium', type: 'num' },
          { key: 'start', label: 'Start', type: 'date' },
          { key: 'end', label: 'End', type: 'date' },
          { key: 'note', label: 'Note', type: 'textarea', full: true },
        ]}
        initial={p ? { insurer_id: str(p.insurer_id), policy_no: str(p.policy_no), cover: str(p.cover), premium: str(p.premium), start: str(p.start), end: str(p.end), note: str(p.note) } : {}}
        intro={
          opts.insurers.length ? undefined : (
            <Banner tone="warn">
              No insurer yet — add one in{' '}
              <Link to={ROUTES.fixedAssetInsuranceCompany} className="underline">
                Setup → Insurers
              </Link>
              .
            </Banner>
          )
        }
        onClose={close}
        onSave={(x) => perform('policy_save', { policy_id: p ? p.id : 0, ...x })}
      />
    )
  } else if (dialog?.kind === 'claim') {
    const c = dialog.claim
    dialogEl = (
      <FormDialog
        title={c ? 'Edit claim' : 'New claim'}
        items={[
          { key: 'date', label: 'Claim date', type: 'date', required: true },
          { key: 'reference', label: 'Reference' },
          { key: 'policy_id', label: 'Policy', type: 'select', options: a.policies.map((p) => ({ id: p.id, label: `${p.insurer || ''} ${p.policy_no || ''}`.trim() })), blank: '— none —' },
          { key: 'status', label: 'Status', type: 'select', options: [{ id: 'open', label: 'Open' }, { id: 'settled', label: 'Settled' }, { id: 'rejected', label: 'Rejected' }] },
          { key: 'claimed', label: 'Amount claimed', type: 'num' },
          { key: 'settled', label: 'Amount settled', type: 'num', show: (x) => x.status === 'settled' },
          { key: 'description', label: 'What happened', type: 'textarea', full: true },
        ]}
        initial={c ? { date: str(c.date), reference: str(c.reference), policy_id: str(c.policy_id, true), status: str(c.status), claimed: str(c.claimed), settled: str(c.settled), description: str(c.description) } : { date: today(), status: 'open' }}
        onClose={close}
        onSave={(x) => perform('claim_save', { claim_id: c ? c.id : 0, ...x })}
      />
    )
  }

  const warnings: ReactNode[] = []
  if (a.missing_accounts.length) {
    warnings.push(
      <Banner key="acc" tone="warn">
        The asset type is missing ledger accounts: <b>{a.missing_accounts.join(', ')}</b>.{' '}
        <Link to={ROUTES.fixedAssetTypes} className="underline">
          Set them in Setup → Types
        </Link>
        .
      </Banner>,
    )
  }
  if (a.schedule.warnings.length && a.lifecycle !== 'draft') {
    warnings.push(
      <Banner key="sch" tone="warn">
        {a.schedule.warnings.join(' ')}
      </Banner>,
    )
  }
  if (a.lifecycle === 'in_service' && dueMonths) warnings.push(<Banner key="due">{dueMonths} past month(s) of depreciation are not posted yet.</Banner>)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AssetSubNav group="main" />
        <ClassicViewLink view="list" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={ROUTES.fixedAssetList} className={GHOST_BTN}>
            <ArrowLeft size={14} /> All assets
          </Link>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-text!">
            {a.ref} · {a.label} <LifecycleBadge lifecycle={a.lifecycle} />
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {a.lifecycle !== 'disposed' && r.write && (
            <button type="button" className={GHOST_BTN} onClick={() => setDialog({ kind: 'edit' })}>
              Edit
            </button>
          )}
          {a.lifecycle === 'draft' && r.acquire && (
            <button type="button" className={PRIMARY_BTN} onClick={() => setDialog({ kind: 'service' })}>
              Put in service
            </button>
          )}
          {a.lifecycle === 'in_service' && r.post && (
            <button type="button" className={PRIMARY_BTN} onClick={() => setDialog({ kind: 'post' })}>
              Post depreciation
            </button>
          )}
          {a.lifecycle === 'in_service' && r.write && (
            <button type="button" className={GHOST_BTN} onClick={() => setDialog({ kind: 'move' })}>
              Transfer
            </button>
          )}
          {a.lifecycle === 'in_service' && r.dispose && (
            <button type="button" className={DANGER_BTN} onClick={() => setDialog({ kind: 'dispose' })}>
              Dispose / sell
            </button>
          )}
          {a.lifecycle === 'draft' && r.delete && (
            <button type="button" className={DANGER_GHOST_BTN} onClick={removeDraft}>
              Delete
            </button>
          )}
        </div>
      </div>

      <NoticeStrip notice={notice} />
      {warnings}

      <KpiRow>
        <AssetKpi label="Cost" value={<Cur value={a.cost} currency={opts.currency} />} note={MODE_LABEL[a.acq_mode] ?? ''} />
        <AssetKpi label="Accumulated depreciation" value={<Cur value={a.accumulated} currency={opts.currency} />} note={`${pct}% of cost${a.opening_accum ? ` · incl. ${money(a.opening_accum)} opening` : ''}`} />
        <AssetKpi label="Net book value" value={<Cur value={a.nbv} currency={opts.currency} />} note={`residual ${money(a.residual_value)}`} tone="ok" />
        <AssetKpi label="Method" value={METHOD_LABEL[a.method] ?? a.method} note={methodNote} />
      </KpiRow>

      <nav aria-label="Asset sections" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-current={tab === k ? 'page' : undefined}
            onClick={() => setSearch(k === 'overview' ? {} : { tab: k }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <Overview a={a} />
      ) : (
        <Suspense fallback={<LegacyLoadingCard label="Loading…" />}>
          <AssetCardTab
            tab={tab}
            card={a}
            onReverse={(piece) => setDialog({ kind: 'reverse', piece })}
            onUnits={(period) => setDialog({ kind: 'units', period })}
            onPolicy={(policy) => setDialog({ kind: 'policy', policy })}
            onPolicyDelete={removePolicy}
            onClaim={(claim) => setDialog({ kind: 'claim', claim })}
          />
        </Suspense>
      )}
      {dialogEl}
    </div>
  )
}
