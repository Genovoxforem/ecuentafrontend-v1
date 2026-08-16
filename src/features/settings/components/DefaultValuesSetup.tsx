import { useState } from 'react'
import { ArrowUpDown, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLocalCollection, nextLocalRef } from '../../../shared/localCollection'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}>
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

interface Rule {
  ref: string
  relativeUrl: string
  field: string
  value: string
  environment: string
}

// No default-values/filters/sorting endpoint exists on this backend (this
// is a Dolibarr llx_default_values-table page — no REST equivalent in this
// app's custom /api/* layer), so every tab is a local-only, session-scoped
// rule list rather than something that actually changes any form's
// behavior — same "genuinely add/remove, honestly doesn't persist or do
// anything server-side" convention as Manual Tree folders and leave
// requests elsewhere in this app.
const TABS = [
  { key: 'defaults', label: 'Default Values (to use on forms)', valueLabel: 'Value' },
  { key: 'search', label: 'Default Search Filters', valueLabel: 'Value' },
  { key: 'sort', label: 'Default Sort Orders', valueLabel: 'Sort Order (ASC/DESC)' },
  { key: 'focus', label: 'Default Focus Fields', valueLabel: 'Value' },
  { key: 'mandatory', label: 'Mandatory Form Fields', valueLabel: 'Value' },
] as const
type TabKey = (typeof TABS)[number]['key']

function RuleTable({ tabKey, valueLabel }: { tabKey: TabKey; valueLabel: string }) {
  const [rules, updateRules] = useLocalCollection<Rule[]>(['local', 'default-values', tabKey], [])
  const [relativeUrl, setRelativeUrl] = useState('')
  const [field, setField] = useState('')
  const [value, setValue] = useState('')
  const [environment, setEnvironment] = useState('1')

  function handleAdd() {
    if (!relativeUrl.trim() || !field.trim()) return
    updateRules((cur) => [{ ref: nextLocalRef('DV'), relativeUrl: relativeUrl.trim(), field: field.trim(), value: value.trim(), environment }, ...cur])
    setRelativeUrl('')
    setField('')
    setValue('')
  }

  function remove(ref: string) {
    updateRules((cur) => cur.filter((r) => r.ref !== ref))
  }

  return (
    <Card className="!h-auto">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 pr-4">Relative URL</th>
              <th className="font-medium py-2 pr-4">Field</th>
              <th className="font-medium py-2 pr-4">{valueLabel}</th>
              <th className="font-medium py-2 pr-4">Environment</th>
              <th className="font-medium py-2 w-9" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2 pr-4">
                <input value={relativeUrl} onChange={(e) => setRelativeUrl(e.target.value)} className={inputCls} />
              </td>
              <td className="py-2 pr-4">
                <input value={field} onChange={(e) => setField(e.target.value)} className={inputCls} />
              </td>
              <td className="py-2 pr-4">
                <input value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} />
              </td>
              <td className="py-2 pr-4">
                <input value={environment} onChange={(e) => setEnvironment(e.target.value)} className={inputCls + ' max-w-16'} />
              </td>
              <td className="py-2">
                <button type="button" onClick={handleAdd} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover whitespace-nowrap">
                  Add
                </button>
              </td>
            </tr>
            {rules.map((r) => (
              <tr key={r.ref} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-4 text-text!">{r.relativeUrl}</td>
                <td className="py-2.5 pr-4 text-text-muted">{r.field}</td>
                <td className="py-2.5 pr-4 text-text-muted">{r.value}</td>
                <td className="py-2.5 pr-4 text-text-muted">{r.environment}</td>
                <td className="py-2.5">
                  <button type="button" onClick={() => remove(r.ref)} className="p-1 rounded text-danger hover:bg-danger-bg">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function DefaultValuesSetup() {
  const [tab, setTab] = useState<TabKey>('defaults')
  const [enabled, setEnabled] = useState(true)
  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ArrowUpDown size={20} className="text-brand" /> Default values/filters/sorting
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Enable customization of default values</span>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>
      </div>
      <p className="text-sm text-text-muted">Here you may define the default value you wish to use when creating a new record, and/or default filters or the sort order when you list records.</p>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${
              tab === t.key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <RuleTable tabKey={activeTab.key} valueLabel={activeTab.valueLabel} />
    </div>
  )
}
