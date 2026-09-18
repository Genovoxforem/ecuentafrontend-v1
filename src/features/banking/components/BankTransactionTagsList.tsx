import { useState } from 'react'
import { Tags, Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { useBankTransactionCategories, useAddBankTransactionCategory, useUpdateBankTransactionCategory, useDeleteBankTransactionCategory } from '../banking.queries'

// compta/bank/categ.php — manages llx_bank_categ (bank *transaction* tags,
// distinct from the account-level Categories page — see
// BankAccountCategoriesList.tsx). No JSON API, but a genuine classic
// form-POST list with real add/edit/delete — see
// bankTransactionCategParser.ts / banking.queries.ts.
export function BankTransactionTagsList() {
  const { data, isLoading, isError, error, refetch } = useBankTransactionCategories()
  const addCategory = useAddBankTransactionCategory()
  const updateCategory = useUpdateBankTransactionCategory()
  const deleteCategory = useDeleteBankTransactionCategory()

  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd() {
    if (!newLabel.trim()) return
    setFormError(null)
    try {
      await addCategory.mutateAsync(newLabel.trim())
      setNewLabel('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add this tag.')
    }
  }

  function startEdit(id: number, label: string) {
    setEditingId(id)
    setEditingLabel(label)
    setFormError(null)
  }

  async function handleUpdate() {
    if (editingId === null || !editingLabel.trim()) return
    setFormError(null)
    try {
      await updateCategory.mutateAsync({ id: editingId, label: editingLabel.trim() })
      setEditingId(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this tag.')
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this tag? This cannot be undone.')) return
    setFormError(null)
    try {
      await deleteCategory.mutateAsync(id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not delete this tag.')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Tags size={20} className="text-brand" /> Tags/Categories of transactions
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading…" />}
      {isError && <LegacyErrorCard title="Couldn't load this list" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <Card className="!p-0 overflow-hidden">
          {formError && <p className="px-3 pt-3 text-sm text-danger">{formError}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-3 py-2 text-left font-medium text-text-muted w-20">Ref.</th>
                <th className="px-3 py-2 text-left font-medium text-text-muted">Label</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-3 py-2 text-text-faint">—</td>
                <td className="px-3 py-2">
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="New tag label…"
                    className={inputClasses}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={addCategory.isPending || !newLabel.trim()}
                    className="flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    <Plus size={13} /> Add
                  </button>
                </td>
              </tr>

              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-text-faint italic">
                    No tags yet.
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text-muted">{r.id}</td>
                    <td className="px-3 py-2">
                      {editingId === r.id ? (
                        <input
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                          className={inputClasses}
                          autoFocus
                        />
                      ) : (
                        <span className="text-text!">{r.label}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingId === r.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleUpdate}
                            disabled={updateCategory.isPending}
                            title="Save"
                            className="p-1 rounded text-success-fg hover:bg-surface-hover disabled:opacity-60"
                          >
                            <Check size={14} />
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} title="Cancel" className="p-1 rounded text-text-faint hover:bg-surface-hover">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-text-faint">
                          <button type="button" onClick={() => startEdit(r.id, r.label)} title="Modify" className="p-1 rounded hover:bg-surface-hover hover:text-text">
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={deleteCategory.isPending}
                            title="Delete"
                            className="p-1 rounded hover:bg-surface-hover hover:text-danger disabled:opacity-60"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
