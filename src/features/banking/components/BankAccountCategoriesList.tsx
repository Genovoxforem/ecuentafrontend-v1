import { Tags } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useBankAccountCategoriesList } from '../banking.queries'
import { formatDate } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

// Real via categories/tag-sidebarlist-ajax.php?type_id=5 (Categorie::
// TYPE_ACCOUNT) — the exact same generic llx_categorie list already used
// for Users Tags this session. Create has no real API (classic
// categories/card.php?action=create&type=bank_account form-POST), so this
// stays read-only, same convention as Users Tags.
export function BankAccountCategoriesList() {
  const { data: categories, isLoading, isError, error, refetch } = useBankAccountCategoriesList()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Tags size={20} className="text-brand" /> Categories
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading categories…" />}
      {isError && <LegacyErrorCard title="Couldn't load categories" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {categories && (
        <Card>
          <div className="divide-y divide-border">
            {categories.length === 0 && <p className="py-4 text-sm text-text-faint italic">No categories found.</p>}
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color ? `#${c.color}` : '#397db9' }} />
                <span className="flex-1 text-sm text-text!">{c.name}</span>
                <span className="text-xs text-text-faint">{c.createdAt ? formatDate(c.createdAt) : '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
