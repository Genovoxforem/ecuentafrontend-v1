import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket as TicketIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useTicketsList, useTicketStats } from '../tickets.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'

const PAGE_SIZE = 20
const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

// Real via ticket/ticket_list_ajax.php (list + "My Assigned Tickets", same
// endpoint with mode=mine) and ticket/ticket_stats_ajax.php (stat cards) —
// both confirmed genuine JSON with real permission checks
// (hasRight('ticket','read')).
export function TicketsList({ defaultMine = false }: { defaultMine?: boolean }) {
  const [status, setStatus] = useState('')
  const [mine, setMine] = useState(defaultMine)
  const [page, setPage] = useState(0)
  const { data: stats } = useTicketStats()
  const { data, isLoading, isError, error, refetch } = useTicketsList({ status, mine }, page, PAGE_SIZE)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <TicketIcon size={20} className="text-brand" /> Tickets
      </h2>

      {stats && (
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
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setPage(0)
            setStatus(e.target.value)
          }}
          className={selectCls}
        >
          <option value="">All statuses</option>
          <option value="openall">Open</option>
          <option value="closeall">Closed</option>
          {(stats?.byStatus ?? [])
            .filter((s) => s.code !== 'all')
            .map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => {
              setPage(0)
              setMine(e.target.checked)
            }}
            className="rounded border-input-border"
          />
          My tickets only
        </label>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading tickets…" />}
      {isError && <LegacyErrorCard title="Couldn't load tickets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">Subject</th>
                  <th className="font-medium px-3 py-2">Type</th>
                  <th className="font-medium px-3 py-2">Third Party</th>
                  <th className="font-medium px-3 py-2">Author</th>
                  <th className="font-medium px-3 py-2">Assigned To</th>
                  <th className="font-medium px-3 py-2">Created</th>
                  <th className="font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                      No tickets found.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">
                        <Link to={ROUTES.ticketDetail.replace(':id', String(t.id))} className="text-brand hover:underline">
                          {t.ref}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-muted">{t.subject}</td>
                      <td className="px-3 py-2 text-text-muted">{t.type || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{t.thirdParty || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{t.author}</td>
                      <td className="px-3 py-2 text-text-muted">{t.assignedTo || '—'}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{t.dateCreate}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{t.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>{data.filtered} tickets</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-border disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span>Page {page + 1}</span>
              <button
                type="button"
                disabled={(page + 1) * PAGE_SIZE >= data.filtered}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-md border border-border disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
