import { useState } from 'react'
import { Tag, Plus, Search, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useCategories, useCreateCategory, type CategoryType } from '../categories.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// The classic tags/categories page (see categories.queries.ts): the tag tree
// from categories/api/index.php and the real "new tag" form behind the + button.
// Shared between Customer Tags/Categories (type=2) and Contact Tags/Categories
// (type=4) — the same UI over the same table, filtered by category type.
export function CategoriesPage({ type, title }: { type: CategoryType; title: string }) {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error: queryError } = useCategories(type, search)
  const createCategory = useCreateCategory(type)

  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  const items = data?.items ?? []

  function handleSave() {
    if (!label.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    createCategory.mutate(
      { label: label.trim() },
      {
        onSuccess: () => {
          setLabel('')
          setShowForm(false)
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not save this tag — please try again.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tag size={20} className="text-brand" /> {title}
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover">
          {showForm ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {showForm && (
        <Card className="!h-auto">
          {error && <p className="mb-3 whitespace-pre-line text-sm font-medium text-danger">{error}</p>}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Name</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
            </div>
            <button type="button" disabled={createCategory.isPending} onClick={handleSave} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              Save
            </button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <label className="text-sm text-text-muted">Name:</label>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls + ' w-full pl-8'} placeholder="Search" />
        </div>
      </div>

      <Card className="!h-auto space-y-2">
        {isLoading ? (
          <p className="text-sm text-text-faint italic">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-danger">{queryError instanceof Error ? queryError.message : 'Could not load tags/categories.'}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-faint italic">{search ? `No tags/categories match "${search}".` : 'No tag/category of this type created'}</p>
        ) : (
          items.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <div className="flex-1 flex items-center justify-between rounded-md bg-brand/10 px-3 py-1.5 text-sm text-text!" title={c.description ?? undefined}>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color ? `#${c.color}` : '#397db9' }} />
                  {c.fullLabel}
                </span>
              </div>
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded bg-brand text-white text-xs font-bold">{c.itemCount}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
