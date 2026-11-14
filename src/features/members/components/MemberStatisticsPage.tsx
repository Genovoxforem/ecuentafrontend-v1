import { useState } from 'react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { MEMBER_PAGES, useMemberTables } from '../membersClassic.data'
import { MemberClassicTable } from './MemberClassicTable'

// The six tabs of adherents/stats: Subscriptions, Country, Region, State/Province, City, By nature. Each tab is its own classic page.
const TABS = [
  { key: 'subscriptions', label: 'Subscriptions', path: MEMBER_PAGES.statsSubscriptions, title: 'Statistics on subscriptions' },
  { key: 'country', label: 'Country', path: MEMBER_PAGES.statsCountry, title: 'Members statistics by country' },
  { key: 'region', label: 'Region', path: MEMBER_PAGES.statsRegion, title: 'Members statistics by region' },
  { key: 'state', label: 'State/Province', path: MEMBER_PAGES.statsState, title: 'Members statistics by state/province' },
  { key: 'town', label: 'City', path: MEMBER_PAGES.statsTown, title: 'Members statistics by town' },
  { key: 'nature', label: 'By nature', path: MEMBER_PAGES.statsNature, title: 'Members statistics by nature' },
] as const

function StatsTab({ path, title }: { path: string; title: string }) {
  const { data, isLoading, isError, error, refetch } = useMemberTables(path)
  if (isLoading) return <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />
  if (isError) return <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data || data.length === 0) return <LegacyErrorCard title={`Couldn't read ${title.toLowerCase()}`} message="The backend page has no statistics table." onRetry={() => refetch()} />
  return (
    <div className="space-y-3">
      {data.map((t, i) => (
        <MemberClassicTable key={i} table={t} title={title} />
      ))}
    </div>
  )
}

export function MemberStatisticsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('subscriptions')
  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${t.key === tab ? 'border-brand text-brand font-medium' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <StatsTab key={active.key} path={active.path} title={active.title} />
      {active.key === 'subscriptions' && <p className="text-xs text-text-faint italic">The classic page also draws two charts here (Number of subscriptions, Amount of subscriptions); they are not drawn in this app.</p>}
    </div>
  )
}
