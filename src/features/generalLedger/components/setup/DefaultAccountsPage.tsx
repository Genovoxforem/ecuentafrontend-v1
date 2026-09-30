import { useEffect, useMemo, useState } from 'react'
import { Landmark, Info, Loader2, Save, RotateCcw, Check } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../../shared/components/layout/StickyFormShell'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { useDefaultAccounts, useUpdateDefaultAccounts, useSetDefaultAccountsToReference } from '../../generalLedgerSetup.queries'
import type { DefaultAccountOption } from '../../defaultAccountsParser'

// General Ledger > Setup > Default accounts (accountancy/admin/defaultaccounts.php): the
// backend's own list of default accounts, with each field's stored account selected. Saving
// posts every field's current value, as the backend's form does.
export function DefaultAccountsPage() {
  const { data: page, isLoading, isError, error, refetch } = useDefaultAccounts()
  const update = useUpdateDefaultAccounts()
  const setReference = useSetDefaultAccountsToReference()
  const confirm = useConfirm()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const fields = useMemo(() => (page ? page.sections.flatMap((s) => s.fields) : []), [page])

  // Start from (and, after a save, return to) the values the backend holds.
  useEffect(() => {
    setValues(Object.fromEntries(fields.map((f) => [f.name, f.value])))
  }, [fields])

  // Select options are built once per distinct list, not once per field.
  const sharedOptions = useMemo(() => (page ? page.options.map((o) => ({ value: o.value, label: o.label })) : []), [page])
  const toOptions = (options: DefaultAccountOption[]) => options.map((o) => ({ value: o.value, label: o.label }))

  if (isLoading) return <LegacyLoadingCard label="Loading default accounts…" />
  if (isError || !page) {
    return <LegacyErrorCard title="Couldn't load the default accounts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  const changed = fields.filter((f) => (values[f.name] ?? f.value) !== f.value)
  const busy = update.isPending || setReference.isPending

  function setField(name: string, value: string) {
    setSaved(false)
    setValues((cur) => ({ ...cur, [name]: value }))
  }

  function save() {
    setSaved(false)
    update.mutate(Object.fromEntries(fields.map((f) => [f.name, values[f.name] ?? f.value])), { onSuccess: () => setSaved(true) })
  }

  async function applyReference() {
    const ok = await confirm({
      title: 'Overwrite Default Accounts?',
      message: 'This will overwrite current default accounts with reference values.',
      variant: 'default',
      confirmLabel: 'Continue',
    })
    if (!ok) return
    setSaved(false)
    setReference.mutate(undefined, { onSuccess: () => setSaved(true) })
  }

  const failure = update.error ?? setReference.error

  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Landmark size={20} className="text-brand" /> Default accounts
        </h2>
      }
      footerLeft={
        <button
          type="button"
          disabled={busy}
          onClick={applyReference}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
        >
          {setReference.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Set As Default (Reference)
        </button>
      }
      footerRight={
        <div className="flex items-center gap-3">
          {saved && (
            <span role="status" className="flex items-center gap-1.5 text-sm text-success">
              <Check size={14} /> Saved
            </span>
          )}
          <button
            type="button"
            disabled={changed.length === 0 || busy}
            onClick={save}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes {changed.length > 0 && `(${changed.length})`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {page.intro && (
          <Card className="!h-auto flex items-start gap-2 !bg-info-bg">
            <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
            <p className="text-sm text-info-fg">{page.intro}</p>
          </Card>
        )}

        {failure && (
          <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
            <p role="alert">{failure instanceof Error ? failure.message : 'The default accounts could not be saved.'}</p>
          </Card>
        )}

        <Card className="!h-auto !p-0 overflow-hidden">
          {page.sections.map((section) => (
            <div key={section.title}>
              {section.title && <div className="px-4 py-2 bg-surface text-sm font-semibold text-text! border-y border-border first:border-t-0">{section.title}</div>}
              {section.fields.map((f) => {
                const value = values[f.name] ?? f.value
                const options = f.options ? toOptions(f.options) : sharedOptions
                return (
                  <div key={f.name} className="grid grid-cols-1 md:grid-cols-2 items-center gap-x-6 gap-y-1.5 px-4 py-2.5 border-b border-border last:border-0">
                    <span className={`text-sm ${f.required ? 'text-danger' : 'text-text'}`}>
                      {f.label}
                      {f.required && ' *'}
                    </span>
                    <div className="w-full md:max-w-sm">
                      <SearchableSelect
                        value={value}
                        onChange={(v) => setField(f.name, v)}
                        options={f.required ? options : [{ value: '', label: '— None —' }, ...options]}
                        placeholder="Select an account…"
                      />
                      {f.required && !value && <p className="mt-1 text-xs text-danger">Required — no account is set.</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </Card>
      </div>
    </StickyFormShell>
  )
}
