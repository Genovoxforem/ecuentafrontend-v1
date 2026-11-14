import { useMemo, useState, type ComponentType } from 'react'
import { Loader2, Pencil, Search, X } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { DICTIONARIES, useAccountDictionary, useUpdateAccountCodes, type AccountDictionary, type DictionaryRow } from '../../accountDictionaries.data'

const th = 'font-semibold px-3 py-2.5 text-left text-xs text-text whitespace-nowrap'
const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function EditPanel({ dictionary, row, accounts, onClose }: { dictionary: AccountDictionary; row: DictionaryRow; accounts: Array<{ value: string; label: string }>; onClose: () => void }) {
  const config = DICTIONARIES[dictionary]
  const update = useUpdateAccountCodes(dictionary)
  const [codes, setCodes] = useState(row.codes)
  const [error, setError] = useState('')
  // a code already on the row stays selectable even when the chart does not list it
  const options = [{ value: '', label: '—' }, ...accounts]
  for (const c of codes) if (c && !options.some((o) => o.value === c)) options.push({ value: c, label: c })

  async function save() {
    setError('')
    try {
      await update.mutateAsync({ id: row.key, codes })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the accounting account.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-base font-bold text-text!">Edit {config.title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <p className="text-sm text-text-muted">{row.cells.slice(0, 3).filter(Boolean).join(' · ')}</p>
          {error && <p className="text-sm text-danger">{error}</p>}
          {config.codeFields.map((f, i) => (
            <div key={f.name}>
              <p className="mb-1 text-xs font-medium text-text-faint">{f.label}</p>
              <SearchableSelect value={codes[i] ?? ''} onChange={(v) => setCodes(codes.map((c, j) => (j === i ? v : c)))} options={options} placeholder="—" />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={update.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              {update.isPending && <Loader2 size={14} className="animate-spin" />} Modify
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Vat accounts, Tax accounts and Expense report accounts (accountancy/fapi/vat_accounts.php, tax_accounts.php, expensereport_accounts.php): the dictionary
// with the accounting account(s) of each row, and the pencil that sets them.
export function AccountDictionaryPage({ dictionary, icon: Icon }: { dictionary: AccountDictionary; icon: ComponentType<{ size?: number; className?: string }> }) {
  const config = DICTIONARIES[dictionary]
  const { data, isLoading, isError, error, refetch } = useAccountDictionary(dictionary)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<DictionaryRow | null>(null)
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.rows ?? []).filter((r) => !q || r.cells.some((c) => c.toLowerCase().includes(q)))
  }, [data, search])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {config.title}
        {data && <span className="text-sm font-normal text-text-muted">({data.rows.length})</span>}
      </h2>
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search" className={`${inputCls} pl-9`} />
      </div>
      {isLoading && <LegacyLoadingCard label={`Loading ${config.title.toLowerCase()}…`} />}
      {isError && <LegacyErrorCard title={`Couldn't load ${config.title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {config.headers.map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={config.headers.length + 1} className="px-3 py-6 text-center italic text-text-faint">
                    No record found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key} className="border-b border-border last:border-0">
                    {r.cells.map((c, i) => (
                      <td key={i} className="px-3 py-2 text-text-muted">
                        {c}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      <button type="button" title="Edit" onClick={() => setEditing(r)} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-brand">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
      {editing && data && <EditPanel key={editing.key} dictionary={dictionary} row={editing} accounts={data.accounts} onClose={() => setEditing(null)} />}
    </div>
  )
}
