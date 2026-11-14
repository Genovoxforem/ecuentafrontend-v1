import { Fragment, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { useTerminalCount } from '../terminalCount.data'
import { ChevronsLeft, LoaderCircle, Check, CircleAlert, Settings, Palette, Receipt, Utensils, Monitor, Ellipsis } from 'lucide-react'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { ParametersSetupTab } from './ParametersSetupTab'
import { AppearanceSetupTab } from './AppearanceSetupTab'
import { ReceiptSetupTab } from './ReceiptSetupTab'
import { BarSetupTab } from './BarSetupTab'
import { TerminalSetupTab } from './TerminalSetupTab'
import { OtherSetupTab } from './OtherSetupTab'
import type { TabHandle } from './tabHandle'

type TabKey = string
const TAB_ICONS: Record<string, typeof Settings> = { PARAMETERS: Settings, APPEARANCE: Palette, RECEIPT: Receipt, 'BAR RESTAURANT': Utensils, OTHER: Ellipsis }
const tabIcon = (t: string) => TAB_ICONS[t] ?? Monitor
const tabLabel = (t: string) => t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
const terminalKey = (n: number) => `TERMINAL ${n}`
// The classic page has one Terminal tab per terminal set in Parameters (TAKEPOS_NUM_TERMINALS, see terminalCount.data.ts); one is shown, with placeholders for the rest, until that answers.
export function TerminalSetupPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>(terminalKey(1))
  const [savedMsg, setSavedMsg] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const parametersRef = useRef<TabHandle>(null)
  const appearanceRef = useRef<TabHandle>(null)
  const receiptRef = useRef<TabHandle>(null)
  const barRef = useRef<TabHandle>(null)
  const terminalRefs = useRef<Record<number, TabHandle | null>>({})
  const otherRef = useRef<TabHandle>(null)
  const { data: terminalTotal, isLoading: terminalCountLoading } = useTerminalCount()
  const terminals = Array.from({ length: terminalTotal ?? 1 }, (_, i) => i + 1)
  const TABS: TabKey[] = ['PARAMETERS', 'APPEARANCE', 'RECEIPT', 'BAR RESTAURANT', ...terminals.map(terminalKey), 'OTHER']

  const terminalNo = /^TERMINAL (\d+)$/.exec(tab)
  const activeHandle: TabHandle | null | undefined = terminalNo
    ? terminalRefs.current[Number(terminalNo[1])]
    : { PARAMETERS: parametersRef, APPEARANCE: appearanceRef, RECEIPT: receiptRef, 'BAR RESTAURANT': barRef, OTHER: otherRef }[tab as 'OTHER']?.current

  async function handleSave() {
    const activeRef = { current: activeHandle }
    if (!activeRef.current) return
    setSaving(true)
    setSaveError('')
    try {
      await activeRef.current.save()
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
    } catch (e) {
      // e.g. no classic session to post the form with (the settings are read from the API, the save goes to the classic page)
      setSaveError(e instanceof Error ? e.message : 'Could not save these settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <StickyFormShell
      header={
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-text!">Point of Sales module setup (TakePOS)</h2>
            {/* The classic page's blue "back to module list" button; the module list is Settings > Other setup > Available App/Modules. */}
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.otherSetup}?tab=modules`)}
              title="Back to module list"
              aria-label="Back to module list"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand text-white hover:bg-brand-hover"
            >
              <ChevronsLeft size={18} strokeWidth={2.5} color="#ffffff" aria-hidden="true" />
            </button>
          </div>
          <div role="tablist" className="mt-3 flex items-stretch overflow-x-auto overflow-y-hidden border-t border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const Icon = tabIcon(t)
              return (
                <Fragment key={t}>
                {/* The number of terminals comes from Parameters: show placeholders until it is known, so the bar does not grow tab by tab. */}
                {t === 'OTHER' && terminalCountLoading && (
                  <span aria-hidden="true" className="flex shrink-0 items-center gap-4 px-4">
                    <span className="h-4 w-20 animate-pulse rounded bg-surface-alt" />
                    <span className="h-4 w-20 animate-pulse rounded bg-surface-alt" />
                  </span>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:border-border hover:text-text'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {tabLabel(t)}
                </button>
                </Fragment>
              )
            })}
          </div>
        </div>
      }
      headerClassName="py-3"
      scrollsInternally={false}
      footerLeft={
        saveError ? (
          <span className="flex items-center gap-1.5 text-sm text-danger"><CircleAlert size={14} /> {saveError}</span>
        ) : savedMsg ? (
          <span className="flex items-center gap-1.5 text-sm text-success"><Check size={14} /> Saved</span>
        ) : null
      }
      footerRight={
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
      }
    >
      <div style={{ display: tab === 'PARAMETERS' ? 'block' : 'none' }}>
        <ParametersSetupTab ref={parametersRef} />
      </div>
      <div style={{ display: tab === 'APPEARANCE' ? 'block' : 'none' }}>
        <AppearanceSetupTab ref={appearanceRef} />
      </div>
      <div style={{ display: tab === 'RECEIPT' ? 'block' : 'none' }}>
        <ReceiptSetupTab ref={receiptRef} />
      </div>
      <div style={{ display: tab === 'BAR RESTAURANT' ? 'block' : 'none' }}>
        <BarSetupTab ref={barRef} />
      </div>
      {terminals.map((n) => (
        <div key={n} style={{ display: tab === terminalKey(n) ? 'block' : 'none' }}>
          <TerminalSetupTab ref={(h) => { terminalRefs.current[n] = h }} terminal={n} />
        </div>
      ))}
      <div style={{ display: tab === 'OTHER' ? 'block' : 'none' }}>
        <OtherSetupTab ref={otherRef} />
      </div>
    </StickyFormShell>
  )
}
