import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Download, Plus } from 'lucide-react'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { ROUTES } from '../../../routes'
import { downloadSemicolonCsv } from '../../../utils/csvDownload'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { fetchAssetsForExport, useAssetList, useAssetOptions, type AssetListQuery } from '../assetList.data'
import { fmtDate, int, money } from '../assetModels'
import { AssetKpi, Cur, KpiRow, LifecycleBadge, NoticeStrip, PageHeading, Segmented, EmptyState, AssetSubNav, ClassicViewLink } from './AssetUi'
import { assetViewPath, GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, THR, useDebounced, useNotice, failureText } from '../assetUiHelpers'

const PAGE_SIZE = 50
const LIFECYCLES: Array<[string, string]> = [['', 'All'], ['draft', 'Draft'], ['in_service', 'In service'], ['disposed', 'Disposed']]

function SortTh({ label, sortKey, sort, dir, onSort, right }: { label: string; sortKey: string; sort: string; dir: 'asc' | 'desc'; onSort: (key: string) => void; right?: boolean }) {
  const on = sort === sortKey
  return (
    <th className={right ? THR : TH} aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-text">
        {label}
        {on && (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  )
}

// Fixed assets (classic asset/assets.php, newecuenta): the totals tiles, the search, type, group and lifecycle filters, the sortable list, the
// CSV and the New asset button, all on asset/api/assets.php (action=list, options). Search, filters, sort and paging are done by the server.
export function AssetListPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const [type, setType] = useState('')
  const [group, setGroup] = useState('')
  const [lifecycle, setLifecycle] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('ref')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  const { notice, show } = useNotice()
  const options = useAssetOptions()

  const query: AssetListQuery = { q, type, group, lifecycle, page, limit: PAGE_SIZE, sort, dir }
  const list = useAssetList(query)
  const data = list.data
  const filtered = !!(q || type || group || lifecycle)
  const currency = options.data?.currency

  function onSort(key: string) {
    setDir(sort === key && dir === 'asc' ? 'desc' : 'asc')
    setSort(key)
  }

  async function exportCsv() {
    try {
      const all = await fetchAssetsForExport(query)
      downloadSemicolonCsv(
        'assets.csv',
        [
          ['ref', 'Ref'], ['label', 'Asset'], ['type', 'Type'], ['group', 'Group'], ['location', 'Location'], ['serial_number', 'Serial'], ['licence_plate', 'Plate'], ['lifecycle', 'Status'],
          ['acquisition_date', 'Acquired'], ['in_service_date', 'In service'], ['disposal_date', 'Disposed'], ['cost', 'Cost'], ['accumulated', 'Accumulated'], ['nbv', 'NBV'],
        ],
        all.items as unknown as Array<Record<string, unknown>>,
      )
    } catch (e) {
      show(failureText(e, 'Could not export the assets.'), 'bad')
    }
  }

  const t = data?.totals
  const lc = t?.by_lifecycle ?? {}

  return (
    <div className="space-y-4">
      <InBanner>
        {data?.rights.write && (
          <Link to={ROUTES.fixedAssetNew} className={PRIMARY_BTN}>
            <Plus size={14} /> New asset
          </Link>
        )}
      </InBanner>

      <PageHeading icon={icon} title="Fixed assets" action={<ClassicViewLink view="list" />}>
        Every asset with its cost, depreciation to date and net book value.
      </PageHeading>
      <AssetSubNav group="main" active="list" />
      <NoticeStrip notice={notice} />

      {list.isLoading && <LegacyLoadingCard label="Loading fixed assets…" />}
      {list.isError && <LegacyErrorCard title="Couldn't load fixed assets" message={list.error instanceof Error ? list.error.message : 'Unknown error.'} onRetry={() => list.refetch()} />}

      {data && t && (
        <>
          <KpiRow>
            <AssetKpi label="Assets" value={int(t.count)} note={`${int(lc.in_service ?? 0)} in service · ${int(lc.draft ?? 0)} draft · ${int(lc.disposed ?? 0)} disposed`} />
            <AssetKpi label="Cost" value={<Cur value={t.cost} currency={currency} />} note="acquisition value" />
            <AssetKpi label="Accumulated depreciation" value={<Cur value={t.accumulated} currency={currency} />} note="posted to date" />
            <AssetKpi label="Net book value" value={<Cur value={t.nbv} currency={currency} />} note="cost − depreciation" tone="ok" />
          </KpiRow>

          <Card className="!h-auto !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search ref, name, serial, plate, location…"
                  aria-label="Search assets"
                  className={`${inputClasses} !w-72`}
                />
                <select
                  aria-label="Type"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value)
                    setPage(1)
                  }}
                  className={`${inputClasses} !w-auto`}
                >
                  <option value="">All types</option>
                  {(options.data?.types ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Group"
                  value={group}
                  onChange={(e) => {
                    setGroup(e.target.value)
                    setPage(1)
                  }}
                  className={`${inputClasses} !w-auto`}
                >
                  <option value="">All groups</option>
                  {(options.data?.groups ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Segmented
                  label="Status"
                  options={LIFECYCLES}
                  value={lifecycle}
                  onChange={(v) => {
                    setLifecycle(v)
                    setPage(1)
                  }}
                />
              </div>
              <button type="button" onClick={exportCsv} className={GHOST_BTN}>
                <Download size={14} /> CSV
              </button>
            </div>

            {data.items.length === 0 ? (
              <EmptyState title={filtered ? 'No asset matches' : 'No assets yet'}>
                {data.rights.write ? (
                  <>
                    Register the first one with{' '}
                    <Link to={ROUTES.fixedAssetNew} className="text-brand hover:underline">
                      New asset
                    </Link>
                    .
                  </>
                ) : (
                  'Assets appear here once registered.'
                )}
              </EmptyState>
            ) : (
              <div className={`overflow-x-auto ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <SortTh label="Ref" sortKey="ref" sort={sort} dir={dir} onSort={onSort} />
                      <SortTh label="Asset" sortKey="label" sort={sort} dir={dir} onSort={onSort} />
                      <th className={TH}>Type</th>
                      <th className={TH}>Group / location</th>
                      <SortTh label="Acquired" sortKey="date" sort={sort} dir={dir} onSort={onSort} />
                      <th className={TH}>Status</th>
                      <SortTh label="Cost" sortKey="cost" sort={sort} dir={dir} onSort={onSort} right />
                      <th className={THR}>Accum. dep.</th>
                      <th className={THR}>NBV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className={TD}>
                          <Link to={assetViewPath(a.id)} className="font-semibold text-brand hover:underline">
                            {a.ref}
                          </Link>
                        </td>
                        <td className={TD}>
                          {a.label}
                          {(a.serial_number || a.licence_plate) && <div className="text-xs text-text-muted">{[a.serial_number, a.licence_plate].filter(Boolean).join(' · ')}</div>}
                        </td>
                        <td className={TD}>{a.type || '—'}</td>
                        <td className={TD}>
                          {a.group || '—'}
                          {a.location && <div className="text-xs text-text-muted">{a.location}</div>}
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>{fmtDate(a.acquisition_date || a.in_service_date)}</td>
                        <td className={TD}>
                          <LifecycleBadge lifecycle={a.lifecycle} />
                        </td>
                        <td className={TDR}>{money(a.cost)}</td>
                        <td className={TDR}>{money(a.accumulated)}</td>
                        <td className={`${TDR} font-bold`}>{money(a.nbv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <ListPagination page={data.pagination.page} perPage={data.pagination.limit} total={data.pagination.total} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
