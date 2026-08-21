import { useState } from 'react'
import { Languages, Search, X, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLocalCollection, nextLocalRef } from '../../../shared/localCollection'
import { useLanguageOptions } from '../../users/users.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}>
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

interface Override {
  ref: string
  language: string
  key: string
  value: string
}
const OVERRIDES_KEY = ['local', 'translation-overrides'] as const

type Tab = 'search' | 'overwrite'

export function TranslationSetup() {
  const { data: languages, isLoading: languagesLoading } = useLanguageOptions()
  const [tab, setTab] = useState<Tab>('search')
  const [enableOverwrite, setEnableOverwrite] = useState(true)

  const [searchLanguage, setSearchLanguage] = useState('en_US')
  const [searchKey, setSearchKey] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const [overrides, updateOverrides] = useLocalCollection<Override[]>(OVERRIDES_KEY, [])
  const [newLanguage, setNewLanguage] = useState('en_US')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [error, setError] = useState('')

  function handleAddOverride() {
    setError('')
    if (!newKey.trim()) return setError('Key is required!')
    if (!newValue.trim()) return setError('Translation string is required!')
    updateOverrides((cur) => [{ ref: nextLocalRef('TR'), language: newLanguage, key: newKey.trim(), value: newValue.trim() }, ...cur])
    setNewKey('')
    setNewValue('')
  }

  function removeOverride(ref: string) {
    updateOverrides((cur) => cur.filter((o) => o.ref !== ref))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Languages size={20} className="text-brand" /> Translation
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Enable usage of overwritten translation</span>
          <Toggle checked={enableOverwrite} onChange={setEnableOverwrite} />
        </div>
      </div>

      <p className="text-sm text-text-muted">
        Current language: <span className="font-semibold text-text!">{navigator.language.replace('-', '_') || 'en_US'}</span>
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('search')}
          className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-md ${tab === 'search' ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted border border-border hover:bg-surface-hover'}`}
        >
          Search a translation key or string
        </button>
        <button
          type="button"
          onClick={() => setTab('overwrite')}
          className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-md ${tab === 'overwrite' ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted border border-border hover:bg-surface-hover'}`}
        >
          Overwrite a translation string
        </button>
      </div>

      {tab === 'search' ? (
        <Card className="!h-auto">
          <h3 className="text-sm font-semibold text-text! mb-3">Search a translation key or string</h3>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="w-40">
              <label className="block text-xs text-text-faint mb-1">Language</label>
              <select value={searchLanguage} onChange={(e) => setSearchLanguage(e.target.value)} className={selectCls} disabled={languagesLoading}>
                {(languages ?? [{ code: 'en_US', label: 'English (United States)' }]).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-text-faint mb-1">Key</label>
              <input value={searchKey} onChange={(e) => setSearchKey(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-text-faint mb-1">Current Translation String</label>
              <input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className={inputCls} />
            </div>
            <button type="button" onClick={() => setHasSearched(true)} className="h-9 w-9 flex items-center justify-center rounded-md bg-brand text-white hover:bg-brand-hover shrink-0">
              <Search size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchKey('')
                setSearchValue('')
                setHasSearched(false)
              }}
              className="h-9 w-9 flex items-center justify-center rounded-md bg-danger text-white hover:opacity-90 shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          <div className="rounded-md border border-dashed border-border py-12 text-center">
            <p className="text-sm text-text-faint italic">
              {hasSearched
                ? `No results — this backend has no endpoint for browsing/searching translation strings yet (the reference app reads these directly off its server's .lang files, ~12,759 strings across 101 files; no REST equivalent exists in this app's custom API layer).`
                : 'Enter a key or string above and search.'}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="!h-auto">
          <h3 className="text-sm font-semibold text-text! mb-3">Overwrite a translation string</h3>
          <p className="text-xs text-text-faint mb-4">
            No overwrite endpoint exists on this backend either — these are kept in this browser session only (see the list below), not written back to any language file.
          </p>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="w-40">
              <label className="block text-xs text-text-faint mb-1">Language</label>
              <select value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} className={selectCls} disabled={languagesLoading}>
                {(languages ?? [{ code: 'en_US', label: 'English (United States)' }]).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-text-faint mb-1">Key</label>
              <input value={newKey} onChange={(e) => setNewKey(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-text-faint mb-1">New Translation String</label>
              <input value={newValue} onChange={(e) => setNewValue(e.target.value)} className={inputCls} />
            </div>
            <button type="button" onClick={handleAddOverride} className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover shrink-0">
              <Plus size={14} /> Add
            </button>
          </div>
          {error && <p className="text-sm font-medium text-danger mb-3">{error}</p>}

          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 pr-4">Language</th>
                <th className="font-medium py-2 pr-4">Key</th>
                <th className="font-medium py-2 pr-4">Overwritten String</th>
                <th className="font-medium py-2 w-9" />
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-text-faint italic">
                    No overrides yet.
                  </td>
                </tr>
              ) : (
                overrides.map((o) => (
                  <tr key={o.ref} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-text-muted whitespace-nowrap">{o.language}</td>
                    <td className="py-2.5 pr-4 text-text! whitespace-nowrap">{o.key}</td>
                    <td className="py-2.5 pr-4 text-text-muted">{o.value}</td>
                    <td className="py-2.5">
                      <button type="button" onClick={() => removeOverride(o.ref)} className="p-1 rounded text-danger hover:bg-danger-bg">
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
      )}
    </div>
  )
}
