import { useRef, useState } from 'react'
import { LoaderCircle, Check } from 'lucide-react'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { ParametersSetupTab } from './ParametersSetupTab'
import { AppearanceSetupTab } from './AppearanceSetupTab'
import { ReceiptSetupTab } from './ReceiptSetupTab'
import { BarSetupTab } from './BarSetupTab'
import { TerminalSetupTab } from './TerminalSetupTab'
import { OtherSetupTab } from './OtherSetupTab'
import type { TabHandle } from './tabHandle'

type TabKey = 'PARAMETERS' | 'APPEARANCE' | 'RECEIPT' | 'BAR RESTAURANT' | 'TERMINAL 1' | 'TERMINAL 2' | 'OTHER'
const TABS: TabKey[] = ['PARAMETERS', 'APPEARANCE', 'RECEIPT', 'BAR RESTAURANT', 'TERMINAL 1', 'TERMINAL 2', 'OTHER']

// Real page: takepos/admin/{setup,appearance,receipt,bar,terminal,other}.php
// — the 7 tabs of the real "Point of Sales module setup" screen. Each tab
// is its own real classic page (no shared JSON API across them — see each
// tab's own *.queries.ts for exactly which fields are real toggles via
// core/ajax/constantonoff.php vs classic form-POST vs, on Other, a genuine
// second real JSON API of its own). Laid out to match a live screenshot of
// the real page: flat tab bar (no pill buttons), one continuous field grid
// per tab (no section cards on the real page), same field order. One
// shared Save button in the sticky footer delegates to whichever tab is
// active via a small imperative-handle contract (TabHandle) — matches the
// real page's own one-Save-button-per-tab-load behavior, since navigating
// tabs there reloads the whole page too.
export function TerminalSetupPage() {
  const [tab, setTab] = useState<TabKey>('TERMINAL 1')
  const [savedMsg, setSavedMsg] = useState(false)
  const [saving, setSaving] = useState(false)

  const parametersRef = useRef<TabHandle>(null)
  const appearanceRef = useRef<TabHandle>(null)
  const receiptRef = useRef<TabHandle>(null)
  const barRef = useRef<TabHandle>(null)
  const terminal1Ref = useRef<TabHandle>(null)
  const terminal2Ref = useRef<TabHandle>(null)
  const otherRef = useRef<TabHandle>(null)

  const activeRef: React.RefObject<TabHandle | null> = {
    PARAMETERS: parametersRef,
    APPEARANCE: appearanceRef,
    RECEIPT: receiptRef,
    'BAR RESTAURANT': barRef,
    'TERMINAL 1': terminal1Ref,
    'TERMINAL 2': terminal2Ref,
    OTHER: otherRef,
  }[tab]

  async function handleSave() {
    if (!activeRef.current) return
    setSaving(true)
    try {
      await activeRef.current.save()
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <StickyFormShell
      header={
        <div>
          <h2 className="text-lg font-bold text-text!">Point of Sales module setup (TakePOS)</h2>
          <div className="flex gap-5 mt-3 border-b border-border overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`pb-2 text-xs font-semibold tracking-wide border-b-2 -mb-px whitespace-nowrap ${
                  tab === t ? 'text-brand border-brand' : 'text-text-muted border-transparent hover:text-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      }
      headerClassName="py-3"
      scrollsInternally={false}
      footerLeft={savedMsg ? <span className="flex items-center gap-1.5 text-sm text-success"><Check size={14} /> Saved</span> : null}
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
      <div style={{ display: tab === 'TERMINAL 1' ? 'block' : 'none' }}>
        <TerminalSetupTab ref={terminal1Ref} terminal={1} />
      </div>
      <div style={{ display: tab === 'TERMINAL 2' ? 'block' : 'none' }}>
        <TerminalSetupTab ref={terminal2Ref} terminal={2} />
      </div>
      <div style={{ display: tab === 'OTHER' ? 'block' : 'none' }}>
        <OtherSetupTab ref={otherRef} />
      </div>
    </StickyFormShell>
  )
}
