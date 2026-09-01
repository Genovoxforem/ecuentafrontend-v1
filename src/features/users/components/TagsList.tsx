import { useState } from 'react'
import { Tags, Search, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { useUserTagsList } from '../userGroupsAndTags.queries'
import { formatDate } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { DisabledFormModal } from '../../../shared/components/forms/DisabledFormModal'

// Real via categories/tag-sidebarlist-ajax.php?type_id=7 (Categorie::
// TYPE_USER — see userGroupsAndTags.queries.ts's header comment). The
// reference page's per-tag member-count badge has no JSON source (only
// categories/index.php's own server-rendered tree computes it, via a PHP
// class method with no ajax equivalent), so this shows each tag's real
// creation date instead of a fabricated/scraped count. "Add Tag" has no
// real API either (categories/card.php is a classic form-POST-and-redirect
// page) — kept as a legacy-system link rather than a fake in-app form.
export function TagsList() {
  const { data: tags, isLoading, isError, error, refetch } = useUserTagsList()
  const [search, setSearch] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)
  const filtered = (tags ?? []).filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tags size={20} className="text-brand" /> Users Tags/Categories
        </h2>
        <button type="button" onClick={() => setShowAddTag(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add Tag
        </button>
      </div>

      {showAddTag && (
        <DisabledFormModal
          icon={Tags}
          title="Add Tag"
          sourcePath="categories/card.php?action=create&type=7"
          fields={[
            { label: 'Label', required: true },
            { label: 'Color', type: 'text' },
            { label: 'Parent Category', type: 'select' },
            { label: 'Description', type: 'textarea' },
          ]}
          onClose={() => setShowAddTag(false)}
        />
      )}

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

        {isLoading && <LegacyLoadingCard label="Loading tags…" />}
        {isError && <LegacyErrorCard title="Couldn't load tags" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {tags && (
          <div className="divide-y divide-border">
            {filtered.length === 0 && <p className="py-4 text-sm text-text-faint italic">No tags match "{search}".</p>}
            {filtered.map((tag) => (
              <div key={tag.id} className="flex items-center gap-3 py-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ? `#${tag.color}` : '#397db9' }} />
                <span className="flex-1 text-sm text-text!">{tag.name}</span>
                <span className="text-xs text-text-faint">{tag.createdAt ? formatDate(tag.createdAt) : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
