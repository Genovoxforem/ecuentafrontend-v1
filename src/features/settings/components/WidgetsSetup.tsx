import { useState } from 'react'
import { Lightbulb, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLocalCollection } from '../../../shared/localCollection'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

const PAGE_OPTIONS = ['', 'Home']

// The reference app's own real widget catalog (its GET /admin/boxes.php
// content) — not fabricated, just reproduced from the screenshot, since
// this backend has no widgets/boxes endpoint of its own to fetch it from.
interface AvailableWidget {
  key: string
  label: string
  sourceFile: string
}
const AVAILABLE_WIDGETS: AvailableWidget[] = [
  { key: 'last_articles', label: 'Last Articles', sourceFile: '/Core/Boxes/Box_last_knowledgerecord.Php' },
  { key: 'last_modified_articles', label: 'Last Modified Articles', sourceFile: '/Core/Boxes/Box_last_modified_knowledgerecord.Php' },
  { key: 'accountancy_manual_entries', label: 'Latest Record In Accountancy Entered Manually Or Without Source Document', sourceFile: '/Core/Boxes/Box_accountancy_last_manual_entries.Php' },
  { key: 'accountancy_suspense', label: 'Count Accountancy Operation With Suspense Account', sourceFile: '/Core/Boxes/Box_accountancy_suspense_account.Php' },
]

interface ActivatedWidget {
  key: string
  label: string
  activatedOn: string
  order: number
}
const ACTIVATED_SEED: ActivatedWidget[] = [
  { key: 'birthdays_members', label: 'Birthdays Of This Month (Members)', activatedOn: 'Home', order: 1 },
  { key: 'latest_tickets', label: 'Latest Created Tickets', activatedOn: 'Home', order: 2 },
  { key: 'customers_outstanding', label: 'Customers With Oustanding Limit Reached', activatedOn: 'Home', order: 3 },
  { key: 'latest_customer_invoices', label: 'Latest Customer Invoices', activatedOn: 'Home', order: 4 },
  { key: 'open_projects', label: 'Open Projects', activatedOn: 'Home', order: 5 },
  { key: 'tasks', label: 'Tasks', activatedOn: 'Home', order: 6 },
  { key: 'box_oldest_actions', label: 'BoxOldestActions', activatedOn: 'Home', order: 7 },
  { key: 'latest_members', label: 'Latest Members', activatedOn: 'Home', order: 8 },
  { key: 'latest_modified_tickets', label: 'Latest Modified Tickets', activatedOn: 'Home', order: 9 },
  { key: 'latest_interventions', label: 'Latest Interventions', activatedOn: 'Home', order: 10 },
  { key: 'customer_invoices_graph', label: 'Customer Invoices Per Month (Graphics)', activatedOn: 'Home', order: 11 },
  { key: 'oldest_unpaid_invoices', label: 'Oldest Unpaid Customer Invoices', activatedOn: 'Home', order: 12 },
  { key: 'project_tasks_no_time', label: 'ProjectTasksWithoutTimeSpent', activatedOn: 'Home', order: 13 },
  { key: 'lead_funnel', label: 'Lead Funnel', activatedOn: 'Home', order: 14 },
]

const ACTIVATED_KEY = ['local', 'widgets-activated'] as const
const AVAILABLE_EXTRA_KEY = ['local', 'widgets-available-extra'] as const

export function WidgetsSetup() {
  const [activated, updateActivated] = useLocalCollection<ActivatedWidget[]>(ACTIVATED_KEY, ACTIVATED_SEED)
  // Widgets moved back out of "activated" (via Disable) land here instead of
  // straight back into the static catalog above — keeps AVAILABLE_WIDGETS a
  // stable reference list either way.
  const [returnedToAvailable, updateReturned] = useLocalCollection<AvailableWidget[]>(AVAILABLE_EXTRA_KEY, [])

  const activatedKeys = new Set(activated.map((a) => a.key))
  const availableList = [...AVAILABLE_WIDGETS, ...returnedToAvailable].filter((w) => !activatedKeys.has(w.key))

  const [pendingPage, setPendingPage] = useState<Record<string, string>>({})
  const [maxLines, setMaxLines] = useState('')
  const [enableFileCache, setEnableFileCache] = useState('No')
  const [saved, setSaved] = useState(false)

  function handleActivate() {
    const toActivate = availableList.filter((w) => pendingPage[w.key])
    if (toActivate.length === 0) return
    updateActivated((cur) => [
      ...cur,
      ...toActivate.map((w, i) => ({ key: w.key, label: w.label, activatedOn: pendingPage[w.key], order: cur.length + i + 1 })),
    ])
    updateReturned((cur) => cur.filter((w) => !toActivate.some((t) => t.key === w.key)))
    setPendingPage({})
  }

  function disableWidget(key: string) {
    const widget = activated.find((a) => a.key === key)
    updateActivated((cur) => cur.filter((a) => a.key !== key).map((a, i) => ({ ...a, order: i + 1 })))
    // Widgets from the static catalog reappear in `availableList` on their
    // own once removed from `activated` — only ones with no catalog entry
    // (i.e. originally seeded into "activated") need restoring here.
    if (widget && !AVAILABLE_WIDGETS.some((w) => w.key === key)) {
      updateReturned((cur) => (cur.some((w) => w.key === key) ? cur : [...cur, { key: widget.key, label: widget.label, sourceFile: '' }]))
    }
  }

  function moveWidget(key: string, direction: -1 | 1) {
    updateActivated((cur) => {
      const sorted = [...cur].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((a) => a.key === key)
      const swapWith = idx + direction
      if (idx < 0 || swapWith < 0 || swapWith >= sorted.length) return cur
      const next = [...sorted]
      ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
      return next.map((a, i) => ({ ...a, order: i + 1 }))
    })
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const sortedActivated = [...activated].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Lightbulb size={20} className="text-brand" /> Widgets
      </h2>
      <p className="text-sm text-text-muted">
        Widgets are components showing some information that you can add to personalize some pages. You can choose between showing the widget or not by selecting target page and clicking
        "Activate", or by clicking the trashcan to disable it. Only elements from enabled modules are shown.
      </p>

      <Card className="!h-auto">
        <h3 className="text-base font-semibold text-text! mb-3">Widgets available</h3>
        {availableList.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4">All widgets are activated.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-4">Widget</th>
                  <th className="font-medium py-2 pr-4">Note/Parameters</th>
                  <th className="font-medium py-2 pr-4">Source File</th>
                  <th className="font-medium py-2 text-right">Activate On</th>
                </tr>
              </thead>
              <tbody>
                {availableList.map((w) => (
                  <tr key={w.key} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-brand">{w.label}</td>
                    <td className="py-2.5 pr-4 text-text-faint">—</td>
                    <td className="py-2.5 pr-4 text-text-muted font-mono text-xs">{w.sourceFile}</td>
                    <td className="py-2.5 text-right">
                      <select
                        value={pendingPage[w.key] ?? ''}
                        onChange={(e) => setPendingPage((cur) => ({ ...cur, [w.key]: e.target.value }))}
                        className={selectCls + ' max-w-32 inline-block'}
                      >
                        {PAGE_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p || '—'}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" onClick={handleActivate} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Activate
        </button>
      </Card>

      <Card className="!h-auto">
        <h3 className="text-base font-semibold text-text! mb-3">Widgets activated</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 pr-4">Widget</th>
                <th className="font-medium py-2 pr-4">Note/Parameters</th>
                <th className="font-medium py-2 pr-4">Activated On</th>
                <th className="font-medium py-2 pr-4">Default Order</th>
                <th className="font-medium py-2 text-right">Disable</th>
              </tr>
            </thead>
            <tbody>
              {sortedActivated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-text-faint italic">
                    No widgets activated.
                  </td>
                </tr>
              ) : (
                sortedActivated.map((w, i) => (
                  <tr key={w.key} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-brand">{w.label}</td>
                    <td className="py-2.5 pr-4 text-text-faint">—</td>
                    <td className="py-2.5 pr-4 text-text-muted">{w.activatedOn}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-text!">{w.order}</span>
                        <div className="flex flex-col">
                          <button type="button" disabled={i === 0} onClick={() => moveWidget(w.key, -1)} className="text-text-muted hover:text-brand disabled:opacity-30">
                            <ArrowUp size={12} />
                          </button>
                          <button type="button" disabled={i === sortedActivated.length - 1} onClick={() => moveWidget(w.key, 1)} className="text-text-muted hover:text-brand disabled:opacity-30">
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <button type="button" onClick={() => disableWidget(w.key)} className="p-1 rounded text-danger hover:bg-danger-bg">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto">
        <h3 className="text-base font-semibold text-text! mb-3">Other</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2.5 pr-4 text-text-muted w-72">Max. Number Of Lines For Widgets</td>
              <td className="py-2.5">
                <input value={maxLines} onChange={(e) => setMaxLines(e.target.value)} className={inputCls + ' max-w-xs'} />
              </td>
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-text-muted">Enable File Cache</td>
              <td className="py-2.5">
                <select value={enableFileCache} onChange={(e) => setEnableFileCache(e.target.value)} className={selectCls + ' max-w-xs'}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (session-only — no widgets/boxes endpoint exists on this backend yet).</Card>}

      <div className="flex justify-start">
        <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
          Save
        </button>
      </div>
    </div>
  )
}
