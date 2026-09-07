import { CalendarClock, X, ExternalLink } from 'lucide-react'
import { useEventDetail } from '../calendarApi.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { Avatar } from '../../../shared/components/Avatar'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === '' || value === null || value === undefined) return null
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border last:border-0 text-sm">
      <span className="text-text-faint shrink-0">{label}</span>
      <span className="text-text! text-right">{value}</span>
    </div>
  )
}

// Native "view event" panel backed by the real api_action=getEventDetails
// endpoint (see calendarApi.queries.ts's useEventDetail) — a real,
// already-existing endpoint that was going unused while every event
// chip/row instead linked straight out to the legacy card.php page. Keeps
// that legacy link too (footer), just no longer as the only way to see an
// event's details.
export function EventDetailModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useEventDetail(eventId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl bg-surface border border-border shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-10 h-10 rounded-lg grid place-items-center bg-brand text-white">
              <CalendarClock size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text! truncate">{data?.label ?? 'Event'}</h3>
              {data && <p className="text-xs text-text-faint truncate">{data.typeLabel}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <LegacyLoadingCard label="Loading event…" />
          ) : isError || !data ? (
            <LegacyErrorCard title="Couldn't load event" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
          ) : (
            <div className="space-y-4">
              <div>
                <Row label="Status" value={<span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{data.statusLabel}</span>} />
                <Row label="Start" value={data.datepFormatted} />
                <Row label="End" value={data.datefFormatted} />
                <Row label="All day" value={data.fullDayEvent ? 'Yes' : undefined} />
                <Row label="Priority" value={data.priority > 0 ? data.priority : undefined} />
                <Row label="Location" value={data.location} />
                <Row label="Busy" value={data.busy ? 'Yes' : undefined} />
                <Row label="Project" value={data.projectTitle} />
                <Row
                  label="Third-party"
                  value={
                    data.thirdpartyName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={data.thirdpartyName} size={16} className="text-[8px]" color="bg-teal-500" /> {data.thirdpartyName}
                      </span>
                    ) : undefined
                  }
                />
                <Row label="Contact" value={data.contactName} />
                <Row
                  label="Owner"
                  value={
                    data.userOwner ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={data.userOwner} size={16} className="text-[8px]" /> {data.userOwner}
                      </span>
                    ) : undefined
                  }
                />
              </div>

              {data.userAssigned.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-faint mb-1.5">Assigned to</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.userAssigned.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 text-brand text-xs font-medium px-2.5 py-1">
                        <Avatar name={u.name} size={14} className="text-[7px]" /> {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.description && (
                <div className="rounded-md border border-border bg-surface-alt p-3">
                  <p className="text-xs font-semibold text-text-faint mb-1">Description</p>
                  <p className="text-sm text-text! whitespace-pre-wrap">{data.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {data && (
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border shrink-0">
            <a href={stripBackendPrefix(data.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-text-faint hover:text-brand">
              Open in legacy app <ExternalLink size={12} />
            </a>
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
