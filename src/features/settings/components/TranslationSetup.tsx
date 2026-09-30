import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Languages, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import {
  TRANSLATION_PAGE_SIZE,
  useAddTranslationOverride,
  useDeleteTranslationOverride,
  useToggleTranslationOverwrite,
  useTranslationOverwrites,
  useTranslationSearch,
  useUpdateTranslationOverride,
  type TranslationSearchParams,
} from '../translation.queries'
import type { TranslationOption, TranslationOverride, TranslationSearchRow } from '../translationParser'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Switch({ checked, busy, onChange }: { checked: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Enable usage of overwritten translation"
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-60 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}
    >
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function LanguageSelect({ value, options, onChange, placeholder }: { value: string; options: TranslationOption[]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Language" className={selectCls}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value}
        </option>
      ))}
    </select>
  )
}

// One search result. An overwritten string can be edited or deleted; a string that can be
// overwritten gets an inline field to do so; the rest are shown as they are.
function SearchResultRow({ row }: { row: TranslationSearchRow }) {
  const add = useAddTranslationOverride()
  const update = useUpdateTranslationOverride()
  const remove = useDeleteTranslationOverride()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.value)
  const working = add.isPending || update.isPending || remove.isPending
  const error = (add.error ?? update.error ?? remove.error) as Error | null

  function startEditing() {
    setDraft(row.value)
    add.reset()
    update.reset()
    setEditing(true)
  }

  function save() {
    if (!draft.trim()) return
    const done = { onSuccess: () => setEditing(false) }
    if (row.overwriteId) update.mutate({ rowId: row.overwriteId, value: draft }, done)
    else add.mutate({ language: row.language, key: row.key, value: draft }, done)
  }

  async function handleDelete() {
    if (!row.overwriteId) return
    if (!(await confirm({ title: 'Delete overwritten string?', message: `Restore the original translation of "${row.key}"?`, confirmLabel: 'Delete' }))) return
    remove.mutate({ rowId: row.overwriteId, entity: row.overwriteEntity })
  }

  return (
    <>
      <tr className="border-b border-border last:border-0 align-top">
        <td className="py-2.5 pr-4 text-text-muted whitespace-nowrap">{row.language}</td>
        <td className="py-2.5 pr-4 text-text! break-all">{row.key}</td>
        <td className="py-2.5 pr-4 text-text-muted">
          {editing ? (
            <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="New translation string" className={inputCls} autoFocus />
          ) : (
            <>
              {row.value}
              {row.originalValue && <span className="block text-xs text-text-faint mt-0.5">Original: {row.originalValue}</span>}
            </>
          )}
        </td>
        <td className="py-2.5 text-right whitespace-nowrap">
          {editing ? (
            <div className="flex items-center gap-1 justify-end">
              <button type="button" title="Save" disabled={working || !draft.trim()} onClick={save} className="p-1 rounded text-success hover:bg-success-bg disabled:opacity-50">
                {working ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button type="button" title="Cancel" disabled={working} onClick={() => setEditing(false)} className="p-1 rounded text-text-muted hover:bg-surface-alt disabled:opacity-50">
                <X size={14} />
              </button>
            </div>
          ) : row.overwriteId ? (
            <div className="flex items-center gap-1 justify-end">
              <button type="button" title="Edit" disabled={working} onClick={startEditing} className="p-1 rounded text-text-muted hover:text-brand hover:bg-surface-alt disabled:opacity-50">
                <Pencil size={14} />
              </button>
              <button type="button" title="Delete" disabled={working} onClick={handleDelete} className="p-1 rounded text-danger hover:bg-danger-bg disabled:opacity-50">
                {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ) : row.canOverwrite ? (
            <button type="button" title="Overwrite" onClick={startEditing} className="inline-flex items-center gap-1 rounded-md border border-input-border px-2 py-1 text-xs font-medium text-text hover:bg-surface-alt">
              <Plus size={12} /> Overwrite
            </button>
          ) : null}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={4} className="pb-2 text-sm text-danger-fg" role="alert">
            {error.message}
          </td>
        </tr>
      )}
    </>
  )
}

function SearchTab({ fallbackLanguages, currentLanguage }: { fallbackLanguages: TranslationOption[]; currentLanguage: string }) {
  const [form, setForm] = useState({ language: '', key: '', value: '' })
  const [applied, setApplied] = useState<TranslationSearchParams>({ language: '', key: '', value: '', page: 0 })
  const { data, isLoading, isError, error, refetch, isFetching } = useTranslationSearch(applied)
  const languages = data?.languageOptions.length ? data.languageOptions : fallbackLanguages
  const shownLanguage = form.language || currentLanguage

  function search(e?: React.FormEvent) {
    e?.preventDefault()
    setApplied({ language: form.language, key: form.key.trim(), value: form.value.trim(), page: 0 })
  }

  function clear() {
    setForm({ language: '', key: '', value: '' })
    setApplied({ language: '', key: '', value: '', page: 0 })
  }

  const matches = data?.matches ?? 0
  const pages = Math.max(1, Math.ceil(matches / TRANSLATION_PAGE_SIZE))
  const first = matches === 0 ? 0 : applied.page * TRANSLATION_PAGE_SIZE + 1
  const last = Math.min(matches, (applied.page + 1) * TRANSLATION_PAGE_SIZE)

  return (
    <Card className="!h-auto">
      <h3 className="text-sm font-semibold text-text! mb-3">
        Search a translation key or string
        {data && data.matches > 0 && (
          <span className="ml-2 font-normal text-text-faint">
            ({data.matches} / {data.totalStrings} - {data.files} files)
          </span>
        )}
      </h3>
      <form onSubmit={search} className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-40">
          <label className="block text-xs text-text-faint mb-1">Language</label>
          <LanguageSelect value={shownLanguage} options={languages} onChange={(v) => setForm((f) => ({ ...f, language: v }))} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-text-faint mb-1">Key</label>
          <input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} className={inputCls} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-text-faint mb-1">Current Translation String</label>
          <input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className={inputCls} />
        </div>
        <button type="submit" title="Search" className="h-9 w-9 flex items-center justify-center rounded-md bg-brand text-white hover:bg-brand-hover shrink-0">
          {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </button>
        <button type="button" title="Clear" onClick={clear} className="h-9 w-9 flex items-center justify-center rounded-md bg-danger text-white hover:opacity-90 shrink-0">
          <X size={15} />
        </button>
      </form>

      {isLoading ? (
        <LegacyLoadingCard label="Searching translations…" />
      ) : isError || !data ? (
        <LegacyErrorCard title="Couldn't search the translations" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-4">Language</th>
                  <th className="font-medium py-2 pr-4">Key</th>
                  <th className="font-medium py-2 pr-4">Current Translation String</th>
                  <th className="font-medium py-2 w-28" />
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-text-faint italic">
                      No translation matches.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => <SearchResultRow key={`${row.language}:${row.key}:${row.value}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
          {matches > 0 && (
            <div className="flex items-center justify-between gap-3 pt-3 text-sm text-text-muted">
              <span>
                {first}–{last} of {matches}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={applied.page === 0 || isFetching}
                  onClick={() => setApplied((a) => ({ ...a, page: a.page - 1 }))}
                  className="p-1.5 rounded-md border border-input-border hover:bg-surface-alt disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2">
                  {applied.page + 1} / {pages}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={applied.page + 1 >= pages || isFetching}
                  onClick={() => setApplied((a) => ({ ...a, page: a.page + 1 }))}
                  className="p-1.5 rounded-md border border-input-border hover:bg-surface-alt disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function OverrideRow({ row }: { row: TranslationOverride }) {
  const update = useUpdateTranslationOverride()
  const remove = useDeleteTranslationOverride()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.value)
  const working = update.isPending || remove.isPending
  const error = (update.error ?? remove.error) as Error | null

  async function handleDelete() {
    if (!(await confirm({ title: 'Delete overwritten string?', message: `Restore the original translation of "${row.key}"?`, confirmLabel: 'Delete' }))) return
    remove.mutate({ rowId: row.rowId, entity: row.entity })
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2.5 pr-4 text-text-muted whitespace-nowrap">{row.language}</td>
        <td className="py-2.5 pr-4 text-text! whitespace-nowrap">{row.key}</td>
        <td className="py-2.5 pr-4 text-text-muted">
          {editing ? <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="New translation string" className={inputCls} autoFocus /> : row.value}
        </td>
        <td className="py-2.5">
          {editing ? (
            <div className="flex items-center gap-1 justify-end">
              <button
                type="button"
                title="Save"
                disabled={working || !draft.trim()}
                onClick={() => update.mutate({ rowId: row.rowId, value: draft }, { onSuccess: () => setEditing(false) })}
                className="p-1 rounded text-success hover:bg-success-bg disabled:opacity-50"
              >
                {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button type="button" title="Cancel" disabled={working} onClick={() => setEditing(false)} className="p-1 rounded text-text-muted hover:bg-surface-alt disabled:opacity-50">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 justify-end">
              <button
                type="button"
                title="Edit"
                disabled={working}
                onClick={() => {
                  setDraft(row.value)
                  update.reset()
                  setEditing(true)
                }}
                className="p-1 rounded text-text-muted hover:text-brand hover:bg-surface-alt disabled:opacity-50"
              >
                <Pencil size={14} />
              </button>
              <button type="button" title="Delete" disabled={working} onClick={handleDelete} className="p-1 rounded text-danger hover:bg-danger-bg disabled:opacity-50">
                {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={4} className="pb-2 text-sm text-danger-fg" role="alert">
            {error.message}
          </td>
        </tr>
      )}
    </>
  )
}

function OverwriteTab({ languages, enabled, rows }: { languages: TranslationOption[]; enabled: boolean; rows: TranslationOverride[] }) {
  const add = useAddTranslationOverride()
  const [form, setForm] = useState({ language: '', key: '', value: '' })
  const [missing, setMissing] = useState('')

  function submit() {
    if (!form.language) return setMissing('Language is required.')
    if (!form.key.trim()) return setMissing('Key is required.')
    if (!form.value.trim()) return setMissing('New translation string to show is required.')
    setMissing('')
    add.mutate(form, { onSuccess: () => setForm((f) => ({ ...f, key: '', value: '' })) })
  }

  const message = missing || (add.error instanceof Error ? add.error.message : '')

  return (
    <Card className="!h-auto">
      <h3 className="text-sm font-semibold text-text! mb-3">Overwrite a translation string</h3>
      <p className="text-sm text-text-muted mb-4">
        You can also override strings filling the following table. Choose your language from "Language" dropdown, insert the translation key string into "Key" and your new translation into "New translation string to show"
        (you can use the other tab to help you know which translation key to use).
      </p>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-40">
          <label className="block text-xs text-text-faint mb-1">Language</label>
          <LanguageSelect value={form.language} options={languages} onChange={(v) => setForm((f) => ({ ...f, language: v }))} placeholder="Select a language" />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-text-faint mb-1">Key</label>
          <input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} disabled={!enabled} className={inputCls} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-text-faint mb-1">New Translation String To Show</label>
          <input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} disabled={!enabled} className={inputCls} />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!enabled || add.isPending}
          title={enabled ? undefined : 'Enable usage of overwritten translation first'}
          className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60 shrink-0"
        >
          {add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
      </div>
      {message && (
        <p role="alert" className="text-sm font-medium text-danger mb-3">
          {message}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 pr-4">Language</th>
              <th className="font-medium py-2 pr-4">Key</th>
              <th className="font-medium py-2 pr-4">New Translation String To Show</th>
              <th className="font-medium py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-text-faint italic">
                  No overwritten strings.
                </td>
              </tr>
            ) : (
              rows.map((row) => <OverrideRow key={row.rowId} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// Setup > Translation (admin/translation.php): search the backend's translation strings and
// overwrite them, read from and written to the backend page itself.
export function TranslationSetup() {
  const { data: overwrites, isLoading, isError, error, refetch } = useTranslationOverwrites()
  const toggle = useToggleTranslationOverwrite()
  const [tab, setTab] = useState<'search' | 'overwrite'>('search')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Languages size={20} className="text-brand" /> Translation
        </h2>
        {overwrites && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Enable usage of overwritten translation</span>
            <Switch checked={overwrites.enabled} busy={toggle.isPending} onChange={(v) => toggle.mutate(v)} />
          </div>
        )}
      </div>

      {overwrites?.currentLanguage && (
        <p className="text-sm text-text-muted">
          Current user language: <span className="font-semibold text-text!">{overwrites.currentLanguage}</span>
        </p>
      )}
      {toggle.isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{toggle.error instanceof Error ? toggle.error.message : 'The setting could not be changed.'}</p>
        </Card>
      )}

      <div className="flex gap-2">
        {(
          [
            ['search', 'Search a translation key or string'],
            ['overwrite', 'Overwrite a translation string'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-md ${tab === key ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted border border-border hover:bg-surface-hover'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LegacyLoadingCard label="Loading translation settings…" />
      ) : isError || !overwrites ? (
        <LegacyErrorCard title="Couldn't load the translation settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : tab === 'search' ? (
        <SearchTab fallbackLanguages={overwrites.languageOptions} currentLanguage={overwrites.currentLanguage} />
      ) : (
        <OverwriteTab languages={overwrites.languageOptions} enabled={overwrites.enabled} rows={overwrites.rows} />
      )}
    </div>
  )
}
