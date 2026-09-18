import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Tag, Search, Plus, Folder } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProjectCategoriesList } from '../projectCategories.queries'
import { ROUTES } from '../../../routes'

// Real categories/tag-sidebarlist-ajax.php?type_id=6 data (see
// projectCategories.queries.ts) — a flat list, not the real page's tree
// view, since this endpoint's own columns carry no parent/hierarchy field
// to reconstruct one from.
export function ProjectCategoriesListPage() {
  const { data, isLoading, isError, error } = useProjectCategoriesList()
  const [nameInput, setNameInput] = useState('')
  const [name, setName] = useState('')

  const filtered = useMemo(() => (data ?? []).filter((c) => c.label.toLowerCase().includes(name.trim().toLowerCase())), [data, name])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tag size={20} className="text-brand" /> Projects tags/categories area
        </h2>
        <Link to={ROUTES.projectCategoryCreate} className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white hover:bg-brand-hover" title="New tag/category">
          <Plus size={16} />
        </Link>
      </div>

      {isError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load categories.'}</Card>}

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-text-faint mb-1">Name:</label>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setName(nameInput)}
              className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full"
            />
          </div>
          <button type="button" onClick={() => setName(nameInput)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Search size={14} /> Search
          </button>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text!">Tags/Categories</h3>
        </div>
        <div>
          {isLoading ? (
            <p className="px-4 py-4 text-sm text-text-faint italic">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-4 text-sm text-text-faint italic">No tags/categories on this level created.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <Folder size={14} className="text-text-faint shrink-0" />
                  {c.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `#${c.color.replace('#', '')}` }} />}
                  <span className="text-text!">{c.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}
