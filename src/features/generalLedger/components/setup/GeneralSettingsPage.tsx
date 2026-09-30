import { useState, type ComponentType } from 'react'
import { ChevronUp, Link2, Loader2, Save, Settings } from 'lucide-react'
import { StickyFormShell } from '../../../../shared/components/layout/StickyFormShell'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useGeneralSettings, useSaveSettingValues, useToggleSetting, type GeneralSettings, type SettingRow } from '../../generalSettings.queries'

const inputCls = 'w-40 text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-brand/30'

// mm/dd/yyyy (the backend's own format) <-> yyyy-mm-dd (native date input).
const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

function Switch({ on, busy, onClick, label }: { on: boolean; busy: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-700'}`}
    >
      {busy ? (
        <Loader2 size={14} className="mx-auto animate-spin text-white" />
      ) : (
        <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-1'}`} />
      )}
    </button>
  )
}

function SettingsCard({
  icon: Icon,
  iconClassName,
  heading,
  description,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  iconClassName: string
  heading: string
  description: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-surface-alt border border-border rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-surface-hover">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${iconClassName}`}>
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text!">{heading}</p>
            <p className="text-xs text-text-faint">{description}</p>
          </div>
        </div>
        <ChevronUp size={16} className={`shrink-0 text-text-faint transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && <div className="px-4 pb-3.5 divide-y divide-border">{children}</div>}
    </div>
  )
}

function Settings_({ data }: { data: GeneralSettings }) {
  const toggle = useToggleSetting()
  const save = useSaveSettingValues()
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(data.rows.filter((r) => r.kind !== 'toggle').map((r) => [r.name, r.value])))
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const flip = (row: SettingRow) => {   
    setBusy(row.name)
    setSaved(null)
    toggle.mutate(row, { onSettled: () => setBusy(null) })
  }
  const saveValues = () => {
    setSaved(null)
    save.mutate({ token: data.token, values }, { onSuccess: (msg) => setSaved(msg || 'Setup saved.') })
  }

  // The backend prints the first five settings under general options and the
  // rest (from the binding-sort switches on) under binding options.
  const split = data.rows.findIndex((r) => r.name.includes('SORT_VENTILATION_TODO'))
  const general = split < 0 ? data.rows : data.rows.slice(0, split)
  const binding = split < 0 ? [] : data.rows.slice(split)

  const renderRow = (row: SettingRow) => (
    <div key={row.name} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <p className="min-w-0 text-sm font-medium text-text!">{row.label}</p>
      <div className="shrink-0">
        {row.kind === 'toggle' && <Switch on={row.value === '1'} busy={busy === row.name} onClick={() => flip(row)} label={row.label} />}
        {row.kind === 'text' && <input value={values[row.name] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [row.name]: e.target.value }))} className={`${inputCls} w-24`} aria-label={row.label} />}
        {row.kind === 'date' && <input type="date" value={toIso(values[row.name] ?? '')} onChange={(e) => setValues((v) => ({ ...v, [row.name]: toUs(e.target.value) }))} className={inputCls} aria-label={row.label} />}
        {row.kind === 'select' && (
          <select value={values[row.name] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [row.name]: e.target.value }))} className={inputCls} aria-label={row.label}>
            {row.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )

  return (
    <StickyFormShell
      scrollsInternally
      header={null}
      headerClassName="!hidden"
      footerLeft={null}
      footerRight={
        <button
          type="button"
          onClick={saveValues}
          disabled={save.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
        </button>
      }
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand to-cyan-500 px-5 py-5 sm:px-6 sm:py-6 shrink-0">
        <div className="relative flex items-center gap-4">
          <span className="shrink-0 w-12 h-12 rounded-xl bg-white/15 backdrop-blur grid place-items-center text-white">
            <Settings size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">Configuration of the module accounting (double entry)</h2>
            <p className="text-sm text-white/80 mt-0.5">On/off switches apply as soon as you flip them; the values below are saved with Save Changes.</p>
          </div>
        </div>
      </div>

      {saved && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-3.5 py-3 text-sm text-success-fg shrink-0">{saved}</div>}
      {(toggle.isError || save.isError) && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-3 text-sm text-danger shrink-0">
          {(toggle.error ?? save.error) instanceof Error ? (toggle.error ?? save.error)!.message : 'The setting was not saved.'}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 -mr-1">
        <SettingsCard icon={Settings} iconClassName="bg-brand/10 text-brand" heading="General Options" description="General options of the accounting module.">
          {general.map(renderRow)}
        </SettingsCard>
        {binding.length > 0 && (
          <SettingsCard
            icon={Link2}
            iconClassName="bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400"
            heading="Binding Options"
            description="Automatic binding and transfer rules."
          >
            {binding.map(renderRow)}
          </SettingsCard>
        )}
      </div>
    </StickyFormShell>
  )
}

// accountancy/admin/index.php — the real accounting module configuration:
// every switch shows the backend's current state and flips through the page's
// own link; the account lengths, start-binding date and default transfer
// period are saved with the page's own update form.
export function GeneralSettingsPage() {
  const { data, isLoading, isError, error, refetch } = useGeneralSettings()
  if (isLoading) return <LegacyLoadingCard label="Loading accounting settings…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the accounting settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return <Settings_ data={data} />
}
