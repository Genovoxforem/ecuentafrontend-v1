import { useEffect, useState, type ComponentType } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useAssetOptions } from '../assetList.data'
import { useDepreciationPreview, usePostDepreciation } from '../depreciationRun.data'
import { METHOD_LABEL, int, money, previousMonth, type DepreciationResult } from '../assetModels'
import { AssetKpi, Badge, Banner, Cur, EmptyState, KpiRow, NoticeStrip, PageHeading, Segmented, AssetSubNav, ClassicViewLink } from './AssetUi'
import { assetViewPath, ledgerPiecePath, PRIMARY_BTN, GHOST_BTN, TD, TDR, TH, THR, failureText, useNotice } from '../assetUiHelpers'

type Filter = '' | 'due' | 'blocked' | 'up_to_date'
const FILTERS: Array<[Filter, string]> = [['', 'All'], ['due', 'Due'], ['blocked', 'Blocked'], ['up_to_date', 'Up to date']]

// Depreciation run (classic asset/depreciation.php): preview the unposted months of every in-service asset up to a period, tick the assets to
// post and post them (asset/api/depreciation.php, action preview / post). One ledger piece per asset per month in journal AS; an asset that
// fails is rolled back and shown in the result.
export function DepreciationRunPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const [params, setParams] = useSearchParams()
  const period = params.get('period') || previousMonth()
  const preview = useDepreciationPreview(period)
  const post = usePostDepreciation()
  const options = useAssetOptions()
  const confirm = useConfirm()
  const { notice, show } = useNotice()
  const [filter, setFilter] = useState<Filter>('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [result, setResult] = useState<DepreciationResult | null>(null)
  const currency = options.data?.currency
  const data = preview.data

  // Every due asset starts ticked whenever a preview arrives (a new period, or coming back from a result).
  useEffect(() => {
    if (data) setSelected(new Set(data.rows.filter((r) => r.status === 'due').map((r) => r.id)))
  }, [data])

  const rows = data?.rows ?? []
  const shown = rows.filter((r) => !filter || r.status === filter)
  const selectedAmount = rows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount, 0)
  const locked = !!data?.lock

  function toggle(id: number, on: boolean) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function doPost() {
    const ids = [...selected]
    const ok = await confirm({
      title: `Post depreciation up to ${period}?`,
      message: `Posts every unposted month up to ${period} for ${ids.length} asset(s). Each asset is its own transaction; an asset that fails is rolled back and reported. Already-posted months are never posted twice.`,
      confirmLabel: 'Post to ledger',
      variant: 'default',
    })
    if (!ok) return
    try {
      const reply = await post.mutateAsync({ period, ids })
      setResult(reply.data)
      show(reply.message || 'Depreciation posted.', reply.data.summary.failed ? 'bad' : 'ok')
    } catch (e) {
      show(failureText(e, 'Could not post the depreciation.'), 'bad')
      preview.refetch()
    }
  }

  function backToPreview() {
    setResult(null)
    preview.refetch()
  }

  return (
    <div className="space-y-4">
      <PageHeading icon={icon} title="Depreciation run" action={<ClassicViewLink view="list" />}>
        Preview and post the monthly depreciation of every asset in service.
      </PageHeading>
      <AssetSubNav group="main" active="depreciation" />
      <NoticeStrip notice={notice} />

      <Card className="!h-auto flex-row flex-wrap items-end justify-between gap-3">
        <label className="flex max-w-[220px] flex-col gap-1 text-sm text-text">
          Post up to and including
          <input
            type="month"
            value={period}
            onChange={(e) => {
              if (!e.target.value) return
              setResult(null)
              setParams({ period: e.target.value }, { replace: true })
            }}
            className={inputClasses}
          />
        </label>
        {locked ? <Banner tone="bad">🔒 {data?.lock}</Banner> : <p className="text-sm text-text-muted">Each asset catches up on any earlier unposted months. One ledger piece per asset per month, journal AS.</p>}
      </Card>

      {preview.isLoading && <LegacyLoadingCard label="Loading the depreciation preview…" />}
      {preview.isError && <LegacyErrorCard title="Couldn't load the depreciation preview" message={preview.error instanceof Error ? preview.error.message : 'Unknown error.'} onRetry={() => preview.refetch()} />}

      {data && (
        <>
          {result ? (
            <KpiRow>
              <AssetKpi label="Assets posted" value={int(result.summary.assets_posted)} tone="ok" />
              <AssetKpi label="Amount posted" value={<Cur value={result.summary.amount} currency={currency} />} note="Dr expense / Cr accumulated" />
              <AssetKpi label="Failed" value={int(result.summary.failed)} note="rolled back, nothing written" tone={result.summary.failed ? 'bad' : undefined} />
            </KpiRow>
          ) : (
            <KpiRow>
              <AssetKpi label="In service" value={int(data.totals.assets)} note="assets" />
              <AssetKpi label="Due" value={int(data.totals.due)} note={`${int(data.totals.months)} month(s) · ${money(data.totals.amount)}`} tone={data.totals.due ? 'warn' : 'ok'} />
              <AssetKpi label="Blocked" value={int(data.totals.blocked)} note="missing account, usage or lock" tone={data.totals.blocked ? 'bad' : undefined} />
              <AssetKpi label="Up to date" value={int(data.totals.up_to_date)} />
            </KpiRow>
          )}

          <Card className="!h-auto !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              {result ? <b className="text-text!">Result</b> : <Segmented label="Status" options={FILTERS} value={filter} onChange={setFilter} />}
              {result ? (
                <button type="button" className={GHOST_BTN} onClick={backToPreview}>
                  ← Back to preview
                </button>
              ) : data.can_post ? (
                <button type="button" className={PRIMARY_BTN} onClick={doPost} disabled={selected.size === 0 || locked || post.isPending}>
                  {post.isPending && <Loader2 size={14} className="animate-spin" />} Post {int(selected.size)} asset(s) · {money(selectedAmount)}
                </button>
              ) : (
                <span className="text-sm text-text-muted">You need the “Run and post depreciation” right.</span>
              )}
            </div>

            {result ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className={TH}>Asset</th>
                      <th className={TH}>Months posted</th>
                      <th className={THR}>Amount</th>
                      <th className={TH}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className={TD}>
                          <Link to={`${assetViewPath(r.id)}?tab=schedule`} className="font-semibold text-brand hover:underline">
                            {r.ref}
                          </Link>
                        </td>
                        <td className={TD}>
                          {r.posted.length
                            ? r.posted.map((p, i) => (
                                <span key={p.piece_num}>
                                  {i > 0 && ', '}
                                  <Link to={ledgerPiecePath(p.piece_num)} className="text-brand hover:underline">
                                    {p.period}
                                  </Link>
                                </span>
                              ))
                            : '—'}
                        </td>
                        <td className={TDR}>{money(r.amount)}</td>
                        <td className={TD}>{r.posted.length ? <Badge tone="ok">Posted</Badge> : <Badge tone={r.error ? 'bad' : 'neutral'}>{r.skipped}</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : shown.length === 0 ? (
              <EmptyState title={rows.length ? 'Nothing in this filter' : 'No asset in service'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {data.can_post && (
                        <th className="w-8 px-4 py-2.5">
                          <input
                            type="checkbox"
                            aria-label="Select all due"
                            checked={rows.filter((r) => r.status === 'due').length > 0 && rows.filter((r) => r.status === 'due').every((r) => selected.has(r.id))}
                            onChange={(e) => setSelected(new Set(e.target.checked ? rows.filter((r) => r.status === 'due').map((r) => r.id) : []))}
                          />
                        </th>
                      )}
                      <th className={TH}>Asset</th>
                      <th className={TH}>Type / method</th>
                      <th className={TH}>Last posted</th>
                      <th className={TH}>Months due</th>
                      <th className={THR}>Amount</th>
                      <th className={THR}>NBV</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        {data.can_post && (
                          <td className="px-4 py-2.5 align-top">
                            <input type="checkbox" checked={selected.has(r.id)} disabled={r.status !== 'due'} onChange={(e) => toggle(r.id, e.target.checked)} aria-label={`Post ${r.ref}`} />
                          </td>
                        )}
                        <td className={TD}>
                          <Link to={`${assetViewPath(r.id)}?tab=schedule`} className="font-semibold text-brand hover:underline">
                            {r.ref}
                          </Link>{' '}
                          {r.label}
                        </td>
                        <td className={TD}>
                          {r.type}
                          <div className="text-xs text-text-muted">{METHOD_LABEL[r.method] ?? r.method}</div>
                        </td>
                        <td className={TD}>{r.last_posted || '—'}</td>
                        <td className={`${TD} whitespace-nowrap`}>{r.months.length ? `${r.months[0]}${r.months.length > 1 ? ` – ${r.months[r.months.length - 1]} (${r.months.length})` : ''}` : '—'}</td>
                        <td className={TDR}>{money(r.amount)}</td>
                        <td className={TDR}>{money(r.nbv)}</td>
                        <td className={TD}>
                          {r.status === 'due' ? (
                            <Badge tone="warn">Due</Badge>
                          ) : r.status === 'blocked' ? (
                            <>
                              <Badge tone="bad" title={r.blocked.join(' · ')}>
                                Blocked
                              </Badge>
                              <div className="mt-1 text-xs text-text-muted">{r.blocked.join(' · ')}</div>
                            </>
                          ) : (
                            <Badge tone="ok">Up to date</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
