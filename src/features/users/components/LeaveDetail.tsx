import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useLeaveCard } from '../leave.queries'

// Real via holiday/card.php?id=N (see leaveCardParser.ts). Read-only: the
// card's Cancel / Approve / Refuse actions are state-changing legacy form
// actions and are not carried over.
export function LeaveDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useLeaveCard(id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <CalendarDays size={20} className="text-brand" /> Leave request
          {data?.status && <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">{data.status}</span>}
        </h2>
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <ArrowLeft size={14} /> Back to list
        </button>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading leave request…" />}
      {isError && <LegacyErrorCard title="Couldn't load leave request" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <Card className="!h-auto">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {data.fields.map((f, i) => (
              <div key={`${f.label}-${i}`}>
                <dt className="text-xs font-medium text-text-faint mb-1">{f.label}</dt>
                <dd className="text-sm text-text! whitespace-pre-line">{f.value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  )
}
