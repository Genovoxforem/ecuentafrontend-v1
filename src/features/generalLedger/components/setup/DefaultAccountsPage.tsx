import { useState } from 'react'
import { Landmark, Info, Loader2, Save, RotateCcw, Check } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useChartOfAccountsTree, useUpdateDefaultAccounts, useSetDefaultAccountsToReference, flattenCoaTree, DEFAULT_ACCOUNT_GROUPS } from '../../generalLedgerSetup.queries'

const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 outline-none focus:ring-2 focus:ring-brand/30'

// accountancy/admin/defaultaccounts.php — a single settings form mapping
// 30 real Dolibarr constants (each field's real name confirmed against the
// live page — see generalLedgerSetup.queries.ts's own header comment) to
// business functions. Real, live-verified write: fetches a fresh copy of
// the real form immediately before every save and only overrides the
// field(s) actually changed here, so the other 29+ fields' current values
// (never read into this page — that would mean scraping the page for
// display data) pass through untouched. Round-tripped live before shipping
// this (changed one field, confirmed only that one changed, reverted,
// confirmed clean) — see this session's own notes.
export function DefaultAccountsPage() {
  const { data: coaTree, isLoading, isError, error, refetch } = useChartOfAccountsTree()
  const update = useUpdateDefaultAccounts()
  const setReference = useSetDefaultAccountsToReference()
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading chart of accounts…" />
  if (isError || !coaTree) return <LegacyErrorCard title="Couldn't load accounts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const accountOptions = flattenCoaTree(coaTree)
  const hasChanges = Object.keys(changes).length > 0

  function setField(key: string, value: string) {
    setSaved(false)
    setChanges((c) => (value ? { ...c, [key]: value } : Object.fromEntries(Object.entries(c).filter(([k]) => k !== key))))
  }

  function save() {
    update.mutate(changes, {
      onSuccess: () => {
        setChanges({})
        setSaved(true)
      },
    })
  }

  function applyReference() {
    if (!window.confirm('This will overwrite current default accounts with reference values. Continue?')) return
    setReference.mutate(undefined, {
      onSuccess: () => {
        setChanges({})
        setSaved(true)
      },
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Landmark size={20} className="text-brand" /> Default Accounts
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">accountancy/admin/defaultaccounts.php</code>. Every dropdown below is genuinely saved on submit — real Dolibarr constants, real Chart of
          Accounts options. There's no JSON way to read back each field's <em>current</em> value without scraping the page (this app doesn't do that), so selects start blank rather than showing
          a guessed value; leave a field blank to keep whatever it's already set to on the backend.
        </p>
      </Card>

      {DEFAULT_ACCOUNT_GROUPS.map((group) => (
        <Card key={group.heading} className="!h-auto">
          <p className="text-sm font-semibold text-text! mb-3">{group.heading}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {group.fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-xs text-text-faint">{f.label}</span>
                <select value={changes[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} className={selectCls}>
                  <option value="">— Leave unchanged —</option>
                  {accountOptions.map((a) => (
                    <option key={a.id} value={a.text.split('-')[0]}>
                      {a.text}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!hasChanges || update.isPending} onClick={save} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes {hasChanges && `(${Object.keys(changes).length})`}
        </button>
        <button
          type="button"
          disabled={setReference.isPending}
          onClick={applyReference}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
        >
          {setReference.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Set As Default (Reference)
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <Check size={14} /> Saved
          </span>
        )}
      </div>
      {update.isError && <p className="text-sm text-danger">{update.error instanceof Error ? update.error.message : 'Failed to save.'}</p>}
      {setReference.isError && <p className="text-sm text-danger">{setReference.error instanceof Error ? setReference.error.message : 'Failed to apply reference defaults.'}</p>}
    </div>
  )
}
