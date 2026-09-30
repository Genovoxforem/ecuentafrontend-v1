import { useState } from 'react'
import { ArrowUpDown, Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { DEFAULT_VALUE_MODES, useAddDefaultValue, useDefaultValuesPage, useDeleteDefaultValue, useToggleDefaultValues, useUpdateDefaultValue, type DefaultValueMode } from '../defaultValues.queries'
import type { DefaultValueRule, DefaultValuesPage } from '../defaultValuesParser'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// The tab names, notes and column hints below are the wording of the backend's own page
// (admin/defaultvalues.php); the rules and the switch are read from and written to it.
const TABS: Record<DefaultValueMode, { label: string; valueLabel: string; urlHint: string; fieldHint: string; valueHint: string; note?: string }> = {
  createform: { label: 'Default Values (to use on forms)', valueLabel: 'Value', urlHint: 'societe/card.php', fieldHint: 'HTML field name', valueHint: '' },
  filters: { label: 'Default Search Filters', valueLabel: 'Value', urlHint: 'societe/list.php', fieldHint: 'HTML field name', valueHint: '' },
  sortorder: {
    label: 'Default Sort Orders',
    valueLabel: 'Sort Order',
    urlHint: 'societe/list.php',
    fieldHint: 'field or alias.field',
    valueHint: 'ASC or DESC',
    note: 'Warning, setting a default sort order may result in a technical error when going on the list page if field is an unknown field. If you experience such an error, come back to this page to remove the default sort order and restore default behavior.',
  },
  focus: { label: 'Default Focus Fields', valueLabel: '', urlHint: 'societe/card.php', fieldHint: 'HTML field name', valueHint: '' },
  mandatory: {
    label: 'Mandatory Form Fields',
    valueLabel: '',
    urlHint: 'societe/card.php',
    fieldHint: 'HTML field name',
    valueHint: '',
    note: "Warning, feature supported on text fields only. Also an URL parameter action=create or action=edit must be set OR page name must end with 'new.php' to trigger this feature.",
  },
}

function Switch({ checked, busy, onChange }: { checked: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Enable customization of default values"
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-60 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}
    >
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function RuleRow({ rule, mode, page, busy }: { rule: DefaultValueRule; mode: DefaultValueMode; page: DefaultValuesPage; busy: boolean }) {
  const update = useUpdateDefaultValue(mode)
  const remove = useDeleteDefaultValue(mode)
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(rule.page)
  const [field, setField] = useState(rule.field)
  const [value, setValue] = useState(rule.value ?? '')
  const working = busy || update.isPending || remove.isPending

  function startEdit() {
    setUrl(rule.page)
    setField(rule.field)
    setValue(rule.value ?? '')
    update.reset()
    setEditing(true)
  }

  function save() {
    if (!url.trim() || !field.trim()) return
    update.mutate({ rowId: rule.rowId, page: url, field, value }, { onSuccess: () => setEditing(false) })
  }

  async function handleDelete() {
    if (!(await confirm({ title: 'Delete rule?', message: `Delete the rule for "${rule.page}" / "${rule.field}"?`, confirmLabel: 'Delete' }))) return
    remove.mutate({ rowId: rule.rowId, entity: rule.entity })
  }

  const error = (update.error ?? remove.error) as Error | null

  return (
    <>
      <tr className="border-b border-border last:border-0">
        {editing ? (
          <>
            <td className="py-2 pr-4">
              <input value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Relative URL" className={inputCls} />
            </td>
            <td className="py-2 pr-4">
              <input value={field} onChange={(e) => setField(e.target.value)} aria-label="Field" className={inputCls} />
            </td>
            {page.hasValue && (
              <td className="py-2 pr-4">
                <input value={value} onChange={(e) => setValue(e.target.value)} aria-label={TABS[mode].valueLabel} className={inputCls} />
              </td>
            )}
            <td className="py-2">
              <div className="flex items-center gap-1 justify-end">
                <button type="button" title="Save" disabled={working || !url.trim() || !field.trim()} onClick={save} className="p-1 rounded text-success hover:bg-success-bg disabled:opacity-50">
                  {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button type="button" title="Cancel" disabled={working} onClick={() => setEditing(false)} className="p-1 rounded text-text-muted hover:bg-surface-alt disabled:opacity-50">
                  <X size={14} />
                </button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="py-2.5 pr-4 text-text! break-all">{rule.page}</td>
            <td className="py-2.5 pr-4 text-text-muted break-all">{rule.field}</td>
            {page.hasValue && <td className="py-2.5 pr-4 text-text-muted break-all">{rule.value}</td>}
            <td className="py-2.5">
              <div className="flex items-center gap-1 justify-end">
                <button type="button" title="Edit" disabled={working} onClick={startEdit} className="p-1 rounded text-text-muted hover:text-brand hover:bg-surface-alt disabled:opacity-50">
                  <Pencil size={14} />
                </button>
                <button type="button" title="Delete" disabled={working} onClick={handleDelete} className="p-1 rounded text-danger hover:bg-danger-bg disabled:opacity-50">
                  {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </td>
          </>
        )}
      </tr>
      {error && (
        <tr>
          <td colSpan={page.hasValue ? 4 : 3} className="pb-2 text-sm text-danger-fg" role="alert">
            {error.message}
          </td>
        </tr>
      )}
    </>
  )
}

function RulesTable({ mode, page }: { mode: DefaultValueMode; page: DefaultValuesPage }) {
  const add = useAddDefaultValue(mode)
  const tab = TABS[mode]
  const [url, setUrl] = useState('')
  const [field, setField] = useState('')
  const [value, setValue] = useState('')
  const [missing, setMissing] = useState('')

  function handleAdd() {
    if (!url.trim()) return setMissing('Relative URL is required.')
    if (!field.trim()) return setMissing('Field is required.')
    setMissing('')
    add.mutate(
      { page: url, field, value },
      {
        onSuccess: () => {
          setUrl('')
          setField('')
          setValue('')
        },
      },
    )
  }

  const columns = page.hasValue ? 4 : 3
  const message = missing || (add.error instanceof Error ? add.error.message : '')

  return (
    <Card className="!h-auto">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 pr-4">Relative URL</th>
              <th className="font-medium py-2 pr-4">Field</th>
              {page.hasValue && <th className="font-medium py-2 pr-4">{tab.valueLabel}</th>}
              <th className="font-medium py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2 pr-4">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={tab.urlHint} aria-label="Relative URL" className={inputCls} />
              </td>
              <td className="py-2 pr-4">
                <input value={field} onChange={(e) => setField(e.target.value)} placeholder={tab.fieldHint} aria-label="Field" className={inputCls} />
              </td>
              {page.hasValue && (
                <td className="py-2 pr-4">
                  <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={tab.valueHint} aria-label={tab.valueLabel} className={inputCls} />
                </td>
              )}
              <td className="py-2 text-right">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!page.enabled || add.isPending}
                  title={page.enabled ? undefined : 'Enable customization of default values first'}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60 whitespace-nowrap"
                >
                  {add.isPending && <Loader2 size={14} className="animate-spin" />} Add
                </button>
              </td>
            </tr>
            {message && (
              <tr>
                <td colSpan={columns} className="py-2 text-sm text-danger-fg" role="alert">
                  {message}
                </td>
              </tr>
            )}
            {page.rules.length === 0 && (
              <tr>
                <td colSpan={columns} className="py-4 text-text-faint italic">
                  No rules defined.
                </td>
              </tr>
            )}
            {page.rules.map((rule) => (
              <RuleRow key={rule.rowId} rule={rule} mode={mode} page={page} busy={add.isPending} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function DefaultValuesSetup() {
  const [mode, setMode] = useState<DefaultValueMode>('createform')
  const { data: page, isLoading, isError, error, refetch } = useDefaultValuesPage(mode)
  const toggle = useToggleDefaultValues(mode)
  const tab = TABS[mode]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ArrowUpDown size={20} className="text-brand" /> Default values/filters/sorting
        </h2>
        {page && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Enable customization of default values</span>
            <Switch checked={page.enabled} busy={toggle.isPending} onChange={(v) => toggle.mutate(v)} />
          </div>
        )}
      </div>
      <p className="text-sm text-text-muted">Here you may define the default value you wish to use when creating a new record, and/or default filters or the sort order when you list records.</p>
      {toggle.isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{toggle.error instanceof Error ? toggle.error.message : 'The setting could not be changed.'}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border">
        {DEFAULT_VALUE_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${mode === m ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {TABS[m].label}
          </button>
        ))}
      </div>

      {tab.note && <p className="text-sm text-warning-fg bg-warning-bg border border-border rounded-md px-3 py-2">{tab.note}</p>}

      {isLoading ? (
        <LegacyLoadingCard label="Loading rules…" />
      ) : isError || !page ? (
        <LegacyErrorCard title="Couldn't load the rules" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <RulesTable key={mode} mode={mode} page={page} />
      )}
    </div>
  )
}
