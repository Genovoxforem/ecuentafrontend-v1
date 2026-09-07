import { Tags, ExternalLink } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { useAgendaFilterOptions } from '../calendarApi.queries'

// The category list itself is real, already-fetched data — the same
// getFilters response the Agenda page's own filter panel uses (see
// calendarApi.queries.ts) — so this reads it directly rather than
// re-fetching or fabricating anything. Creating/renaming a category has no
// JSON API on this backend though: that's the generic Dolibarr
// categories/index.php?type=actioncomm controller (Categorie::TYPE_ACTIONCOMM,
// confirmed in categories/class/categorie.class.php), a classic
// server-rendered CRUD page with no json_encode anywhere in it — so editing
// stays an honest link out instead of a fake "Add" button here.
const LEGACY_CATEGORIES_URL = '/categories/index.php?type=actioncomm'

export function EventCategoriesPage() {
  const { data, isLoading, isError, error, refetch } = useAgendaFilterOptions()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Tags size={20} className="text-brand" /> Tags / Categories
      </h2>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
          <p className="text-xs text-text-faint">Real event/action categories from this backend. Adding or renaming one has no JSON API here — manage that in the legacy app.</p>
          <a
            href={stripBackendPrefix(LEGACY_CATEGORIES_URL)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
          >
            Manage Categories <ExternalLink size={12} />
          </a>
        </div>
        <div className="p-4">
          {isLoading ? (
            <LegacyLoadingCard label="Loading categories…" />
          ) : isError || !data ? (
            <LegacyErrorCard title="Couldn't load categories" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
          ) : data.categories.length === 0 ? (
            <p className="text-sm text-text-faint italic text-center py-4">No event categories on this backend yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {data.categories.map((c) => (
                <li key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 text-brand text-sm font-medium px-3 py-1">
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}
