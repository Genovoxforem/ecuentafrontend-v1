import { Tags } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAgendaFilterOptions } from '../calendarApi.queries'

// The category list is real data: the same getFilters response the Agenda page's own filter panel uses (calendarApi.queries.ts). Adding or
// renaming a category has no JSON API: categories/fapi/list.php serves customer, supplier, contact, product, project, account, user and member
// only (13 Nov 2026, "event" / "actioncomm" answer 422). The app never links to a backend .php page, so the action stays inert.

export function EventCategoriesPage() {
  const { data, isLoading, isError, error, refetch } = useAgendaFilterOptions()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Tags size={20} className="text-brand" /> Tags / Categories
      </h2>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
          <p className="text-xs text-text-faint">Real event/action categories from this backend. Adding or renaming one has no JSON API on this backend yet.</p>
          <button
            type="button"
            disabled
            title="No JSON API exists to add or rename event categories"
            className="flex items-center gap-1.5 shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white opacity-60 cursor-not-allowed"
          >
            Add category
          </button>
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
