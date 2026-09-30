import { useEffect, useState } from 'react'
import { Lightbulb, ArrowUp, ArrowDown, Trash2, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useActivateWidgets, useDisableWidget, useMoveWidget, useSaveWidgetSettings, useWidgetsPage } from '../widgets.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

// Setup > Widgets (admin/boxes.php): the widgets the backend offers and has switched
// on, in their default order, plus its two settings. Everything shown is what the
// backend's own page shows, and every control sends that page's own request.
export function WidgetsSetup() {
  const { data: page, isLoading, isError, error, refetch } = useWidgetsPage()
  const activate = useActivateWidgets()
  const disable = useDisableWidget()
  const move = useMoveWidget()
  const saveSettings = useSaveWidgetSettings()
  const confirm = useConfirm()

  const [pendingPage, setPendingPage] = useState<Record<string, string>>({})
  const [maxLines, setMaxLines] = useState('')
  const [fileCache, setFileCache] = useState('0')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!page) return
    setMaxLines(page.maxLines)
    setFileCache(page.fileCache ?? '0')
  }, [page])

  if (isLoading) return <LegacyLoadingCard label="Loading widgets…" />
  if (isError || !page) {
    return <LegacyErrorCard title="Couldn't load widgets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  const failure = [activate, disable, move, saveSettings].find((m) => m.isError)?.error
  const busy = activate.isPending || disable.isPending || move.isPending || saveSettings.isPending

  function handleActivate() {
    if (!page) return
    const picks = page.available.filter((w) => pendingPage[w.boxId]).map((w) => ({ boxId: w.boxId, position: pendingPage[w.boxId], label: w.label }))
    if (picks.length === 0) return
    activate.mutate(picks, { onSuccess: () => setPendingPage({}) })
  }

  async function handleDisable(rowId: string, label: string) {
    if (!(await confirm({ title: 'Disable widget?', message: `Disable "${label}"?`, confirmLabel: 'Disable' }))) return
    disable.mutate(rowId)
  }

  function handleSave() {
    setSaved(false)
    saveSettings.mutate(
      { maxLines, fileCache: page?.fileCache === null ? null : fileCache },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Lightbulb size={20} className="text-brand" /> Widgets
      </h2>
      <p className="text-sm text-text-muted">
        Widgets are components showing some information that you can add to personalize some pages. You can choose between showing the widget or not by selecting target page and clicking
        "Activate", or by clicking the trashcan to disable it. Only elements from enabled modules are shown.
      </p>

      {failure && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{failure instanceof Error ? failure.message : 'The change could not be made.'}</p>
        </Card>
      )}

      <Card className="!h-auto">
        <h3 className="text-base font-semibold text-text! mb-3">Widgets available</h3>
        {page.available.length === 0 ? (
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
                {page.available.map((w) => (
                  <tr key={w.boxId} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-brand">{w.label}</td>
                    <td className="py-2.5 pr-4 text-text-faint">{w.note || '—'}</td>
                    <td className="py-2.5 pr-4 text-text-muted font-mono text-xs">{w.sourceFile}</td>
                    <td className="py-2.5 text-right">
                      <select
                        value={pendingPage[w.boxId] ?? ''}
                        onChange={(e) => setPendingPage((cur) => ({ ...cur, [w.boxId]: e.target.value }))}
                        aria-label={`Activate ${w.label} on`}
                        className={selectCls + ' max-w-40 inline-block'}
                      >
                        <option value="">—</option>
                        {page.positions.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
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
        <button
          type="button"
          onClick={handleActivate}
          disabled={busy || page.available.length === 0}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {activate.isPending && <Loader2 size={14} className="animate-spin" />} Activate
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
              {page.activated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-text-faint italic">
                    No widgets activated.
                  </td>
                </tr>
              ) : (
                page.activated.map((w, i) => {
                  const previous = page.activated[i - 1]
                  const next = page.activated[i + 1]
                  return (
                    <tr key={w.rowId} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 text-brand">{w.label}</td>
                      <td className="py-2.5 pr-4 text-text-faint">{w.note || '—'}</td>
                      <td className="py-2.5 pr-4 text-text-muted">{w.position}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-text!">{i + 1}</span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              title="Move up"
                              disabled={!previous || busy}
                              onClick={() => previous && move.mutate({ fromRowId: w.rowId, toRowId: previous.rowId })}
                              className="text-text-muted hover:text-brand disabled:opacity-30"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              disabled={!next || busy}
                              onClick={() => next && move.mutate({ fromRowId: w.rowId, toRowId: next.rowId })}
                              className="text-text-muted hover:text-brand disabled:opacity-30"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <button type="button" title="Disable" disabled={busy} onClick={() => handleDisable(w.rowId, w.label)} className="p-1 rounded text-danger hover:bg-danger-bg disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })
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
            {page.fileCache !== null && (
              <tr>
                <td className="py-2.5 pr-4 text-text-muted">Enable File Cache</td>
                <td className="py-2.5">
                  <select value={fileCache} onChange={(e) => setFileCache(e.target.value)} className={selectCls + ' max-w-xs'}>
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {saved && (
        <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">
          <p role="status">Settings saved.</p>
        </Card>
      )}

      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saveSettings.isPending && <Loader2 size={14} className="animate-spin" />} Save
        </button>
      </div>
    </div>
  )
}
