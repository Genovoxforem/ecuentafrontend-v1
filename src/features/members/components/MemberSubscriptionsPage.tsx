import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { MEMBER_PAGES, useMemberTables } from '../membersClassic.data'

// The blank last column of the classic table holds its edit pencil; the app has no edit for it.
const HIDDEN_COLUMNS = ['']

// adherents/subscription/list.php — "List of subscriptions". The classic "New subscription" link opens the members list
// (adherents/list.php?status=-1,1): a subscription is added from a member, so the button goes to the members list too.
export function MemberSubscriptionsPage() {
  const { data, isLoading, isError, error, refetch } = useMemberTables(MEMBER_PAGES.subscriptions)
  const table = data?.[0]
  return (
    <div className="space-y-4">
      <InBanner>
        <Link to={ROUTES.memberList} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={14} /> New subscription
        </Link>
      </InBanner>
      {isLoading && <LegacyLoadingCard label="Loading subscriptions…" />}
      {isError && <LegacyErrorCard title="Couldn't load subscriptions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && !table && <LegacyErrorCard title="Couldn't read the subscriptions" message="The backend page has no subscriptions table." onRetry={() => refetch()} />}
      {table && <LegacyReportTable title="List of subscriptions" table={table} hiddenColumns={HIDDEN_COLUMNS} />}
    </div>
  )
}
