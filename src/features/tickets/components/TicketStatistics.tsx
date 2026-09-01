import { BarChart3 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useTicketStats } from '../tickets.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

// Real via ticket/ticket_stats_ajax.php — same endpoint used for the List
// page's stat cards, shown here as the dedicated "Statistics" nav item's
// full status breakdown.
export function TicketStatistics() {
  const { data: stats, isLoading, isError, error, refetch } = useTicketStats()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Ticket Statistics
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading statistics…" />}
      {isError && <LegacyErrorCard title="Couldn't load statistics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { label: 'Total', value: stats.total },
                { label: 'Created Today', value: stats.today },
                { label: 'Created By Me', value: stats.createdByMe },
                { label: 'Assigned To Me', value: stats.assignedToMe },
              ] as const
            ).map((s) => (
              <Card key={s.label} className="!h-auto text-center">
                <p className="text-xl font-bold text-text!">{s.value}</p>
                <p className="text-xs text-text-faint uppercase tracking-wide">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="!h-auto">
            <p className="font-semibold text-text! mb-3">By Status</p>
            <div className="space-y-2">
              {stats.byStatus
                .filter((s) => s.code !== 'all')
                .map((s) => (
                  <div key={s.code} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="flex-1 text-sm text-text!">{s.label}</span>
                    <span className="text-sm font-semibold text-text-muted">{s.count}</span>
                  </div>
                ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
