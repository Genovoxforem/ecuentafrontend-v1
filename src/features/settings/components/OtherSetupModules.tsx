import { useStickyTop } from '../useStickyTop'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, CircleCheck, CircleX, CloudDownload, Eraser, Info, LayoutGrid, List, RefreshCw, RotateCw, Settings } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { ModuleInfoDialog } from './ModuleInfoDialog'
import { useAdminModules, type AdminModule, type ModuleFilters } from '../adminSetup.data'

const inputCls = 'h-10 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// The filters of the classic admin/modules.php (Keyword, Origin, Version, Status, Refresh); the answer is filtered by the endpoint's search_* parameters.
// The Origin list of the classic page: NativeModules, External - [All publishers], External - [Unknown publishers], then External - <publisher> for each publisher
// the installed external modules name; the endpoint filters on all of them (search_nature = core | external | unknown | external_<publisher>).
const PUB = 'external_'
const ORIGIN_BASE = [
  { value: '', label: 'Origin' },
  { value: 'core', label: 'NativeModules' },
  { value: 'external', label: 'External - [All publishers]' },
  { value: 'unknown', label: 'External - [Unknown publishers]' },
]
const VERSIONS = [
  { value: '', label: 'Version' },
  { value: 'stable', label: 'Stable' },
  { value: 'experimental', label: 'Experimental' },
  { value: 'development', label: 'Development' },
]
const STATUSES = [
  { value: '', label: 'Status' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

// Section headings and their order as the classic page prints them (family -> title). A family it does not know is shown under its own name.
const FAMILIES: Array<[string, string]> = [
  ['hr', 'Human Resource Management (HR)'],
  ['crm', 'Customer Relationship Management (CRM)'],
  ['srm', 'Vendor Relationship Management (VRM)'],
  ['financial', 'Financial Modules (Accounting/Treasury)'],
  ['products', 'Product Management (PM)'],
  ['projects', 'Projects/Collaborative work'],
  ['ecm', 'Electronic Content Management (ECM)'],
  ['technic', 'Multi-modules tools'],
  ['portal', 'Websites and other frontal application'],
  ['interface', 'Interfaces with external systems'],
  ['base', 'System'],
]
const familyTitle = (f: string) => FAMILIES.find(([k]) => k === f)?.[1] ?? (f ? f.charAt(0).toUpperCase() + f.slice(1) : 'Other')
const familyRank = (f: string) => {
  const i = FAMILIES.findIndex(([k]) => k === f)
  return i === -1 ? FAMILIES.length : i
}

// The Version column of the classic page: blank for a stable core module, the stage word for experimental / development / deprecated, else the version number.
const versionText = (m: AdminModule) => {
  const stage = m.versionStatus
  if (stage === 'experimental' || stage === 'development' || stage === 'deprecated') return stage.charAt(0).toUpperCase() + stage.slice(1)
  return m.version && m.version !== 'ecuenta' ? m.version : ''
}

// A module whose setup has a page in this app opens it from the gear; the others have only the classic setup page, which the app does not link to.
const setupRoute = (m: AdminModule) => (/^modTakePos$/i.test(m.className) ? ROUTES.takeposTerminalSetup : null)

const th = 'px-3 py-2.5 text-left text-sm font-semibold text-text'
const viewBtn = (on: boolean) => `inline-flex h-9 w-9 items-center justify-center rounded-md ${on ? 'bg-brand text-white' : 'border border-input-border bg-surface-2 text-text-muted hover:bg-surface-hover'}`

// The read-only status switch (the API cannot enable or disable a module).
function StatusSwitch({ enabled, locked = false }: { enabled: boolean; locked?: boolean }) {
  return (
    <span
      role="img"
      data-status={enabled ? 'on' : 'off'}
      data-locked={locked ? 'true' : undefined}
      aria-label={locked ? 'Always enabled' : enabled ? 'Enabled' : 'Disabled'}
      title={locked ? 'Always enabled: this module cannot be switched off' : enabled ? 'Enabled' : 'Disabled'}
      className={`relative inline-block h-4 w-7 rounded-full align-middle ${locked ? 'bg-text-faint' : enabled ? 'bg-brand' : 'border border-brand bg-transparent'}`}
    >
      <span className={`absolute top-0.5 h-3 w-3 rounded-full ${enabled ? 'right-0.5 bg-white' : 'left-0.5 bg-brand'}`} />
    </span>
  )
}

// The Users & Groups module is always on in the classic page (a grey, locked switch).
const isLocked = (m: AdminModule) => m.className === 'modUser'

// The Log icon opens the module's info dialog (ModuleInfoDialog), like the classic page.
function LogButton({ module: m, onOpen }: { module: AdminModule; onOpen: (m: AdminModule) => void }) {
  return (
    <button type="button" aria-label={`Log ${m.name}`} title={`Log: details of ${m.name}`} onClick={() => onOpen(m)} className="inline-flex rounded p-1 text-brand brightness-150 hover:bg-brand/10">
      <Info size={18} />
    </button>
  )
}

// The small icons the classic page shows under Log and Reload: no API behind them yet (AN-186), so they show muted.
function MutedIcon({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <span role="img" aria-label={label} title={title} className="inline-flex text-brand brightness-150">
      {children}
    </span>
  )
}

// The catalogue as the classic Modules/Application setup page lists it: filter bar, then one table per family in the module's own order. Read-only: switching a module
// on or off, installing and reloading are writes the API does not expose, so the Status column shows whether the module is active and cannot change it.
export function OtherSetupModules() {
  const [filters, setFilters] = useState<ModuleFilters>({ keyword: '', nature: '', version: '', status: '' })
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminModules(filters)
  // The publishers named by the modules seen so far (kept while a filter narrows the list), for the Origin options.
  const publishers = useRef<Set<string>>(new Set())
  for (const m of data ?? []) if (m.publisher) publishers.current.add(m.publisher)
  const originOptions = [...ORIGIN_BASE, ...[...publishers.current].sort().map((n) => ({ value: PUB + n, label: `External - ${n}` }))]
  // List (the default) or Kanban cards, like the two views of the classic page (mode=common / mode=commonkanban).
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const stickyTop = useStickyTop()
  const [infoFor, setInfoFor] = useState<AdminModule | null>(null)
  // What a click on Enable / Disable says: the module actions have no API yet (AN-186), so nothing is changed and the bar tells the user so.
  const [bulkNotice, setBulkNotice] = useState<{ title: string; text: string } | null>(null)
  // Ticked modules, for the bulk bar. Enable / Disable need a write the API does not have (AN-186), so only Clear Selection acts.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })

  const groups = useMemo(() => {
    const byFamily = new Map<string, AdminModule[]>()
    for (const m of data ?? []) byFamily.set(m.family, [...(byFamily.get(m.family) ?? []), m])
    return [...byFamily.entries()]
      .map(([family, modules]) => [family, [...modules].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))] as const)
      .sort((a, b) => familyRank(a[0]) - familyRank(b[0]) || a[0].localeCompare(b[0]))
  }, [data])

  const set = (patch: Partial<ModuleFilters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <div>
      <div className="sticky z-20 bg-surface pb-3 pt-2" style={{ top: stickyTop }}>
        <div className="flex flex-wrap items-center gap-2">
        <input value={filters.keyword} onChange={(e) => set({ keyword: e.target.value })} placeholder="Keyword" aria-label="Keyword" className={`${inputCls} w-64`} />
        <select value={filters.nature} onChange={(e) => set({ nature: e.target.value })} aria-label="Origin" className={`${inputCls} w-56`}>
          {originOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={filters.version} onChange={(e) => set({ version: e.target.value })} aria-label="Version" className={`${inputCls} w-56`}>
          {VERSIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status" className={`${inputCls} w-56`}>
          {STATUSES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-input-border bg-surface-2 px-4 text-sm font-medium text-text hover:bg-surface-hover">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
        {selected.size > 0 && (
          <div className="ml-6 flex items-center gap-2 rounded-md bg-white px-2 py-1 text-slate-700 shadow-sm">
            <span className="mr-2 text-sm font-medium text-slate-500">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => setBulkNotice({ title: 'Enable modules', text: `Enabling the ${selected.size} selected module(s) is not available yet: the API has no action to enable a module (AN-186). Nothing was changed.` })}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1 text-sm font-medium text-white hover:bg-brand-hover"
            >
              <CircleCheck size={16} color="#ffffff" /> Enable
            </button>
            <button
              type="button"
              onClick={() => setBulkNotice({ title: 'Disable modules', text: `Disabling the ${selected.size} selected module(s) is not available yet: the API has no action to disable a module (AN-186). Nothing was changed.` })}
              className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1 text-sm font-medium text-white hover:opacity-90"
            >
              <CircleX size={16} color="#ffffff" /> Disable
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(new Set())
                setBulkNotice(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1 text-sm font-medium text-white hover:bg-brand-hover"
            >
              <Eraser size={16} color="#ffffff" /> ClearSelection
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {data && <span className="text-xs text-text-faint">{data.length} modules</span>}
          <button type="button" disabled aria-label="Check for the latest version" title="Check for the latest version: no API for it yet" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input-border bg-surface-2 text-text-muted opacity-50">
            <CloudDownload size={16} />
          </button>
          <button type="button" aria-label="List view" title="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={viewBtn(view === 'list')}>
            <List size={16} color={view === 'list' ? '#ffffff' : 'currentColor'} />
          </button>
          <button type="button" aria-label="Kanban view" title="Kanban view" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={viewBtn(view === 'kanban')}>
            <LayoutGrid size={16} color={view === 'kanban' ? '#ffffff' : 'currentColor'} />
          </button>
        </div>
        </div>

      </div>

      {isLoading && <LegacyLoadingCard label="Loading modules…" />}
      {isError && <LegacyErrorCard title="Couldn't load the modules" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && groups.length === 0 && <p className="py-8 text-center text-sm italic text-text-faint">No module matches.</p>}

      {data &&
        groups.map(([family, modules]) => (
          <section key={family} className="mb-8">
            <h3 data-family={family} className="mb-2 text-2xl font-normal text-text!">
              {familyTitle(family)}
            </h3>
            {view === 'kanban' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {modules.map((m) => {
                  const setup = setupRoute(m)
                  return (
                    <div key={m.className} data-card={m.className} className="overflow-hidden rounded-lg border border-border bg-surface">
                      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                        <span className="flex min-w-0 items-center gap-2 font-semibold text-text!">
                          <Boxes size={16} className="shrink-0 text-text-faint" /> <span className="truncate">{m.name}</span>
                        </span>
                        <span data-dot={m.enabled ? 'on' : 'off'} title={m.enabled ? 'Enabled' : 'Disabled'} className={`h-3 w-3 shrink-0 rounded-full ${m.enabled ? 'bg-success' : 'bg-text-faint'}`} />
                      </div>
                      <p className="min-h-16 px-4 py-3 text-sm text-text">{m.description}</p>
                      {/* The four icons of the classic card: Log, Setup, status switch, Reload. Log and Reload have no API (AN-186), Setup only a page for TakePOS: those show muted. */}
                      <div className="flex items-center gap-4 border-t border-dashed border-border px-4 py-3">
<LogButton module={m} onOpen={setInfoFor} />
                        {setup ? (
                          <Link to={setup} aria-label={`Setup ${m.name}`} title={`Setup ${m.name}`} className="inline-flex text-brand brightness-150 hover:brightness-200">
                            <Settings size={18} />
                          </Link>
                        ) : (
                          <span role="img" aria-label="Setup" title="Setup: the setup page of this module has no page in this app" className="inline-flex text-brand brightness-150">
                            <Settings size={18} />
                          </span>
                        )}
                        <StatusSwitch enabled={m.enabled} locked={isLocked(m)} />
                        <span role="img" aria-label="Reload" title="Reload: no API to reload a module yet (AN-186)" className="inline-flex text-brand brightness-150">
                          <RotateCw size={16} />
                        </span>
                        {versionText(m) && <span className="ml-auto text-xs text-text-muted">{versionText(m)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-8 px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select all ${familyTitle(family)}`}
                        checked={modules.filter((m) => !isLocked(m)).length > 0 && modules.filter((m) => !isLocked(m)).every((m) => selected.has(m.className))}
                        onChange={(e) => toggle(modules.filter((m) => !isLocked(m)).map((m) => m.className), e.target.checked)}
                      />
                    </th>
                    <th className={th}>Module/Application</th>
                    <th className={th}>Description</th>
                    <th className={`${th} text-center`}>Log</th>
                    <th className={th}>Version</th>
                    <th className={`${th} text-center`}>Status</th>
                    <th className={`${th} text-center`}>Setup</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => {
                    const setup = setupRoute(m)
                    return (
                      // two modules can share an id (modPaybox and modEcuentaPos are both 50000 on newecuenta): the class name is the key
                      <tr key={m.className} className="border-b border-border last:border-0 hover:bg-surface-hover">
                        <td className="px-3 py-3.5">
                          <input type="checkbox" aria-label={`Select ${m.name}`} disabled={isLocked(m)} title={isLocked(m) ? 'This module is always enabled' : undefined} checked={selected.has(m.className)} onChange={(e) => toggle([m.className], e.target.checked)} />
                        </td>
                        <td className="px-3 py-3.5 text-text!">
                          <span className="flex items-center gap-2">
                            <Boxes size={14} className="shrink-0 text-text-faint" /> {m.name}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-text-muted capitalize">{m.description}</td>
                        <td className="px-3 py-3.5 text-center">
                          <LogButton module={m} onOpen={setInfoFor} />
                        </td>
                        <td className="px-3 py-3.5 text-text-muted">{versionText(m)}</td>
                        <td className="px-3 py-3.5 text-center">
                          <span className="inline-flex flex-col items-center gap-1">
                            <StatusSwitch enabled={m.enabled} locked={isLocked(m)} />
                            {!isLocked(m) && (
                              <MutedIcon label="Reload" title="Reload: no API to reload a module yet (AN-186)">
                                <RotateCw size={16} />
                              </MutedIcon>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          {setup ? (
                            <Link to={setup} aria-label={`Setup ${m.name}`} title={`Setup ${m.name}`} className="inline-flex text-brand brightness-150 hover:brightness-200">
                              <Settings size={18} />
                            </Link>
                          ) : (
                            <MutedIcon label="Setup" title="Setup: the setup page of this module has no page in this app">
                              <Settings size={18} />
                            </MutedIcon>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}
          </section>
        ))}
      {bulkNotice && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-32" onClick={() => setBulkNotice(null)}>
          <div role="dialog" aria-modal="true" aria-label={bulkNotice.title} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-text!">{bulkNotice.title}</h2>
            <p className="mb-5 text-sm text-text-muted">{bulkNotice.text}</p>
            <div className="flex justify-end">
              <button type="button" autoFocus onClick={() => setBulkNotice(null)} className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {infoFor && <ModuleInfoDialog module={infoFor} onClose={() => setInfoFor(null)} />}
    </div>
  )
}
