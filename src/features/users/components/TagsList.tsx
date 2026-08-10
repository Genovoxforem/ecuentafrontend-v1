import { useState } from 'react'
import { Tags, Plus, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'

interface TagRow {
  name: string
  color: string
  count: number
}

// Visual scaffold, matching the reference "Users tags/categories area" —
// static placeholder tags rather than a real category collection, since
// tags aren't modeled anywhere in this app yet.
const TAGS: TagRow[] = [
  { name: 'Full-time', color: 'bg-blue-500', count: 12 },
  { name: 'Part-time', color: 'bg-amber-500', count: 3 },
  { name: 'Contractor', color: 'bg-violet-500', count: 2 },
  { name: 'Trainee', color: 'bg-emerald-500', count: 1 },
]

export function TagsList() {
  const [search, setSearch] = useState('')
  const filtered = TAGS.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tags size={20} className="text-brand" /> Users Tags/Categories
        </h2>
        <button type="button" className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add Tag
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name"
              className={`${inputClasses} pl-8`}
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {filtered.length === 0 && <p className="py-4 text-sm text-text-faint italic">No tags match "{search}".</p>}
          {filtered.map((tag) => (
            <div key={tag.name} className="flex items-center gap-3 py-3">
              <span className={`w-2.5 h-2.5 rounded-full ${tag.color}`} />
              <span className="flex-1 text-sm text-text!">{tag.name}</span>
              <span className="inline-flex items-center justify-center min-w-6 rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-text-muted">{tag.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
