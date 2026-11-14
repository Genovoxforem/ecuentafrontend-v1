import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Download, Plus } from 'lucide-react'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { downloadSemicolonCsv } from '../../../utils/csvDownload'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useSetupList, useSetupWrite } from '../assetSetup.data'
import { METHOD_LABEL, int, type DepMethod, type SetupEntity, type SetupItem } from '../assetModels'
import { AssetKpi, Badge, EmptyState, FormDialog, KpiRow, NoticeStrip, PageHeading, Segmented, AssetSubNav, ClassicViewLink } from './AssetUi'
import { DANGER_GHOST_BTN, GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, failureText, useNotice, type FieldSpec, type FormItem, type FormValues } from '../assetUiHelpers'

// The four Fixed Asset setup pages (classic asset/setup/types.php, categories.php, groups.php, insurers.php) are one component here, as they
// are one script there (asset/js/setup.js): the columns, the form fields and their wording are that script's schema, the data is
// asset/api/setup.php?entity=…&action=list, and a save / toggle / delete is a POST to the same address.
interface Schema {
  title: string
  blurb: string
  noun: string
  plural: string
  search: string
  cols: Array<{ key: string; header: string; mono?: boolean; muted?: boolean; main?: boolean; asTyped?: boolean; render?: (value: unknown, item: SetupItem) => ReactNode }>
  fields: Array<FieldSpec | { section: string }>
}

const METHOD_OPTIONS = (Object.keys(METHOD_LABEL) as DepMethod[]).map((m) => ({ id: m, label: METHOD_LABEL[m] }))

function ruleText(it: SetupItem): string {
  const lifeMonths = Number(it.life_months) || 0
  const rate = Number(it.rate) || 0
  const units = Number(it.total_units) || 0
  const residual = Number(it.residual_pct) ? ` · ${it.residual_pct}% residual` : ''
  if (it.method === 'linear') return lifeMonths ? `${Math.round((lifeMonths / 12) * 10) / 10} yrs${residual}` : 'life not set'
  if (it.method === 'declining') return rate ? `${rate}% / yr${residual}` : 'rate not set'
  if (it.method === 'units') return units ? `${int(units)} ${it.unit_label || 'units'}` : 'units not set'
  return ''
}

const SCHEMAS: Record<SetupEntity, Schema> = {
  types: {
    title: 'Asset types',
    blurb: 'Templates for new assets: depreciation method, useful life, residual value and the ledger accounts used for every posting.',
    noun: 'type',
    plural: 'types',
    search: 'Search types…',
    cols: [
      { key: 'label', header: 'Type', main: true },
      {
        key: 'method',
        header: 'Method',
        render: (v, it) =>
          v ? (
            <>
              {METHOD_LABEL[v as DepMethod] ?? String(v)}
              <div className="text-xs text-text-muted">{ruleText(it)}</div>
            </>
          ) : (
            <span className="text-text-muted">—</span>
          ),
      },
      { key: 'account_asset', header: 'Asset a/c', mono: true },
      { key: 'account_accum', header: 'Accum. dep. a/c', mono: true },
      { key: 'account_expense', header: 'Dep. expense a/c', mono: true },
    ],
    fields: [
      { key: 'label', label: 'Name', required: true, max: 128, placeholder: 'e.g. Motor vehicles' },
      { key: 'category_id', label: 'Default category', type: 'select', blank: '— none —' },
      { section: 'Depreciation' },
      { key: 'method', label: 'Method', type: 'select', options: METHOD_OPTIONS },
      { key: 'life_months', label: 'Useful life (months)', type: 'num', placeholder: '60', show: (x) => x.method === 'linear' || x.method === 'units' },
      { key: 'rate', label: 'Annual rate %', type: 'num', placeholder: '25', show: (x) => x.method === 'declining' },
      { key: 'total_units', label: 'Lifetime units', type: 'num', placeholder: '300000', show: (x) => x.method === 'units' },
      { key: 'unit_label', label: 'Unit', placeholder: 'km', max: 16, show: (x) => x.method === 'units' },
      { key: 'residual_pct', label: 'Residual value %', type: 'num', placeholder: '0' },
      { section: 'Ledger accounts' },
      { key: 'account_asset', label: 'Asset (cost)', type: 'account' },
      { key: 'account_accum', label: 'Accumulated depreciation', type: 'account' },
      { key: 'account_expense', label: 'Depreciation expense', type: 'account' },
      { key: 'account_income', label: 'Appreciation / income', type: 'account' },
      { key: 'account_gain', label: 'Gain on disposal', type: 'account' },
      { key: 'account_loss', label: 'Loss on disposal', type: 'account' },
      { section: 'Notes' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
  },
  categories: {
    title: 'Asset categories',
    blurb: 'Depreciation (or appreciation) rate classes, e.g. for tax wear-and-tear schedules.',
    noun: 'category',
    plural: 'categories',
    search: 'Search categories…',
    cols: [
      { key: 'label', header: 'Category', main: true },
      { key: 'rate', header: 'Rate', render: (v) => (v === null || v === undefined ? '' : `${v} % / year`) },
      { key: 'direction', header: 'Direction', render: (v) => (v === '1' ? <Badge tone="info">Appreciation ↑</Badge> : <Badge>Depreciation ↓</Badge>) },
    ],
    fields: [
      { key: 'label', label: 'Name', required: true, max: 200, placeholder: 'e.g. Wear & tear class 2' },
      { key: 'rate', label: 'Rate % per year', type: 'num', required: true, placeholder: '25' },
      { key: 'direction', label: 'Direction', type: 'select', options: [{ id: '0', label: 'Depreciation (value goes down)' }, { id: '1', label: 'Appreciation (value goes up)' }] },
    ],
  },
  groups: {
    title: 'Asset groups',
    blurb: 'Organise assets by site, department or fleet.',
    noun: 'group',
    plural: 'groups',
    search: 'Search groups…',
    cols: [
      { key: 'name', header: 'Group', main: true },
      { key: 'reference', header: 'Reference', mono: true },
      { key: 'description', header: 'Description', muted: true },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true, max: 200, placeholder: 'e.g. Lusaka head office' },
      { key: 'reference', label: 'Reference', max: 200, placeholder: 'GRP-001' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  insurers: {
    title: 'Insurance companies',
    blurb: 'Insurance companies that cover your assets and settle claims.',
    noun: 'insurer',
    plural: 'insurers',
    search: 'Search insurers…',
    cols: [
      { key: 'name', header: 'Company', main: true },
      { key: 'contact', header: 'Contact' },
      { key: 'phone', header: 'Phone' },
      { key: 'email', header: 'E-mail', asTyped: true },
      { key: 'account', header: 'Ledger a/c', mono: true },
    ],
    fields: [
      { key: 'name', label: 'Company name', required: true, max: 255 },
      { key: 'contact', label: 'Contact person', max: 255 },
      { key: 'phone', label: 'Phone', max: 64 },
      { key: 'email', label: 'E-mail', type: 'email', max: 128 },
      { key: 'address', label: 'Address', max: 255 },
      { key: 'account', label: 'Ledger account (claims receivable)', type: 'account' },
    ],
  },
}

// Values a new record starts with: the field's own default (method linear, direction 0), otherwise empty.
const DEFAULTS: Record<string, string> = { method: 'linear', direction: '0' }

export function AssetSetupPage({ entity, icon }: { entity: SetupEntity; icon: ComponentType<{ size?: number; className?: string }> }) {
  const schema = SCHEMAS[entity]
  const list = useSetupList(entity)
  const write = useSetupWrite(entity)
  const confirm = useConfirm()
  const { notice, show } = useNotice()
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editor, setEditor] = useState<{ item: SetupItem | null } | null>(null)

  const items = list.data?.items ?? []
  const meta = list.data?.meta
  const can = !!meta?.can_setup
  const avail = meta?.fields ?? []
  const hasToggle = entity === 'insurers' || avail.includes('active')
  const isActive = (it: SetupItem) => (entity === 'insurers' ? it.status !== 'D' : it.active === undefined ? true : !!it.active)
  const categories = useMemo(() => {
    const extra = list.data?.extra
    return extra && !Array.isArray(extra) ? (extra.categories ?? []) : []
  }, [list.data])

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((it) => {
      if (showFilter === 'active' && !isActive(it)) return false
      if (showFilter === 'inactive' && isActive(it)) return false
      if (!q) return true
      return schema.cols.some((c) => String(it[c.key] ?? '').toLowerCase().includes(q))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, showFilter, schema, entity])

  const active = items.filter(isActive).length
  const used = items.filter((it) => (it.in_use ?? 0) > 0).length
  const nameKey = schema.cols[0].key

  // Only the fields the backend has for the entity are shown; the section headings stay as the classic form draws them.
  const formItems: FormItem[] = schema.fields
    .filter((f) => 'section' in f || avail.includes(f.key))
    .map((f) => {
      if ('section' in f) return f
      if (f.key === 'category_id') return { ...f, options: categories.map((c) => ({ id: c.id, label: `${c.label} (${c.rate}%)` })) }
      return f
    })

  function initialValues(it: SetupItem | null): FormValues {
    const v: FormValues = {}
    for (const f of schema.fields) {
      if ('section' in f) continue
      const own = it ? it[f.key] : undefined
      v[f.key] = own === null || own === undefined ? (it ? '' : (DEFAULTS[f.key] ?? '')) : String(own)
    }
    return v
  }

  async function run(action: 'save' | 'toggle' | 'delete', body: Record<string, unknown>) {
    try {
      const reply = await write.mutateAsync({ action, body })
      show(reply.message || 'Done')
    } catch (e) {
      show(failureText(e, 'The change was not saved.'), 'bad')
    }
  }

  async function remove(it: SetupItem) {
    const ok = await confirm({ title: `Delete ${schema.noun}?`, message: `${String(it[nameKey] ?? '')} will be removed permanently.` })
    if (ok) await run('delete', { id: it.id })
  }

  function exportCsv() {
    const cols = ['id', ...avail, 'in_use']
    downloadSemicolonCsv(
      `asset-${entity}.csv`,
      cols.map((c) => [c, c]),
      items as Array<Record<string, unknown>>,
    )
  }

  return (
    <div className="space-y-4">
      <InBanner>
        {can && (
          <button type="button" className={PRIMARY_BTN} onClick={() => setEditor({ item: null })}>
            <Plus size={14} /> New {schema.noun}
          </button>
        )}
      </InBanner>

      <PageHeading icon={icon} title={schema.title} action={<ClassicViewLink view={entity} />}>
        {schema.blurb}
      </PageHeading>
      <AssetSubNav group="setup" active={entity} />
      <NoticeStrip notice={notice} />

      {list.isLoading && <LegacyLoadingCard label={`Loading ${schema.title.toLowerCase()}…`} />}
      {list.isError && <LegacyErrorCard title={`Couldn't load ${schema.title.toLowerCase()}`} message={list.error instanceof Error ? list.error.message : 'Unknown error.'} onRetry={() => list.refetch()} />}

      {meta && (
        <>
          {meta.schema_pending.length > 0 && (
            <p className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-2.5 text-sm text-warning-fg">
              Some fields ({meta.schema_pending.join(', ')}) need the asset v2 database update. An administrator applies it by opening the classic asset page, or by disabling and re-enabling the Asset module.
            </p>
          )}
          {meta.global && <p className="rounded-lg border border-info/30 bg-info-bg px-4 py-2.5 text-sm text-info-fg">Categories are shared by every company on this installation.</p>}

          <KpiRow>
            <AssetKpi label="Total" value={int(items.length)} note={items.length === 1 ? schema.noun : schema.plural} />
            {hasToggle && <AssetKpi label="Active" value={int(active)} note={`${int(items.length - active)} inactive`} />}
            <AssetKpi label="In use" value={int(used)} note="linked to assets or invoices" />
          </KpiRow>

          <Card className="!h-auto !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={schema.search} aria-label="Search" className={`${inputClasses} !w-64`} />
                {hasToggle && (
                  <Segmented
                    label="Status"
                    options={[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']]}
                    value={showFilter}
                    onChange={setShowFilter}
                  />
                )}
              </div>
              <button type="button" className={GHOST_BTN} onClick={exportCsv}>
                <Download size={14} /> CSV
              </button>
            </div>

            {rows.length === 0 ? (
              items.length ? (
                <EmptyState title="No match">Change the search or filter.</EmptyState>
              ) : (
                <EmptyState title={`No ${schema.noun} yet`}>{can ? 'Create the first one to get started.' : 'Ask an administrator to set these up.'}</EmptyState>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {schema.cols.map((c) => (
                        <th key={c.key} className={TH}>
                          {c.header}
                        </th>
                      ))}
                      <th className={TH}>Status</th>
                      <th className={`${TH} text-right`}>Used by</th>
                      {can && <th className={TH} />}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((it) => (
                      <tr key={it.id} className="border-b border-border last:border-0">
                        {schema.cols.map((c) => {
                          const v = it[c.key]
                          const cell = c.render ? (
                            c.render(v, it)
                          ) : v === '' || v === null || v === undefined ? (
                            <span className="text-text-muted">—</span>
                          ) : (
                            <span className={`${c.mono ? 'font-mono text-xs' : ''} ${c.muted ? 'text-text-muted' : ''} ${c.asTyped ? 'normal-case' : ''}`}>{String(v)}</span>
                          )
                          return (
                            <td key={c.key} className={TD}>
                              {c.main ? <b>{cell}</b> : cell}
                            </td>
                          )
                        })}
                        <td className={TD}>{isActive(it) ? <Badge tone="ok">Active</Badge> : <Badge>Inactive</Badge>}</td>
                        <td className={TDR}>{it.in_use ? int(it.in_use) : <span className="text-text-muted">0</span>}</td>
                        {can && (
                          <td className={`${TD} whitespace-nowrap text-right`}>
                            <div className="inline-flex gap-1.5">
                              <button type="button" className={GHOST_BTN} aria-label={`Edit ${String(it[nameKey] ?? '')}`} onClick={() => setEditor({ item: it })}>
                                Edit
                              </button>
                              {hasToggle && (
                                <button type="button" className={GHOST_BTN} disabled={write.isPending} onClick={() => run('toggle', { id: it.id })}>
                                  {isActive(it) ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                              <button
                                type="button"
                                className={DANGER_GHOST_BTN}
                                aria-label={`Delete ${String(it[nameKey] ?? '')}`}
                                disabled={!!it.in_use || write.isPending}
                                title={it.in_use ? 'In use — deactivate instead' : undefined}
                                onClick={() => remove(it)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {editor && (
        <FormDialog
          key={editor.item?.id ?? 'new'}
          title={editor.item ? `Edit ${schema.noun}` : `New ${schema.noun}`}
          items={formItems}
          initial={initialValues(editor.item)}
          okLabel={editor.item ? 'Save' : 'Create'}
          onClose={() => setEditor(null)}
          onSave={async (values) => {
            const reply = await write.mutateAsync({ action: 'save', body: { ...(editor.item ? { id: editor.item.id } : {}), ...values } })
            show(reply.message || 'Saved')
          }}
        />
      )}
    </div>
  )
}
