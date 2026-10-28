import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useInvoiceAgenda } from '../../invoiceDetail.queries'
import { EmptyState } from './InvoiceDetailShared'

// Same list-page routing used by Sales Orders' own Agenda tab for Related
// Objects links — no generic "object by ID" router exists in this app, so
// these point to the relevant list rather than a specific detail page.
function agendaNativeRouteForUrl(url: string): string | null {
  if (!url) return null
  if (url.includes('/compta/facture/card.php') || url.includes('/compta/sales/card.php')) return ROUTES.invoiceList
  if (url.includes('/contrat/')) return ROUTES.contractList
  if (url.includes('/comm/propal/')) return ROUTES.quotationList
  if (url.includes('/commande/card.php')) return ROUTES.orderList
  if (url.includes('/fourn/commande')) return ROUTES.purchaseOrderList
  if (url.includes('/fourn/facture')) return ROUTES.vendorInvoiceList
  return null
}

// Real page shows every server date twice — "PHP Time (server)" (the raw
// value already scraped into creationDate/etc.) plus "Client time (user)",
// computed client-side by converting from the company's configured
// TimeZone (scraped from the topbar panel, e.g. "UTC") to the viewer's own
// browser timezone. Only handles the confirmed UTC case — falls back to the
// plain server value for any other company timezone rather than guessing.
function parseServerDateAsUtc(value: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim())
  if (!m) return null
  const [, mm, dd, yyyy, hh, min, ampm] = m
  let hour = parseInt(hh, 10) % 12
  if (ampm.toUpperCase() === 'PM') hour += 12
  return new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), hour, parseInt(min, 10)))
}

function formatLikeDolibarr(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  let hh = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  const ampm = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12 || 12
  return `${mm}/${dd}/${yyyy} ${String(hh).padStart(2, '0')}:${min} ${ampm}`
}

function AgendaDualTime({ value, timezone }: { value: string; timezone: string }) {
  if (!value) return <span className="text-text-faint">—</span>
  const utcDate = timezone.trim().toUpperCase() === 'UTC' ? parseServerDateAsUtc(value) : null
  if (!utcDate) return <>{value}</>
  return (
    <>
      {value} <span className="text-text-faint font-normal">PHP Time (server)</span>
      {' / '}
      {formatLikeDolibarr(utcDate)} <span className="text-text-faint font-normal">Client time (user)</span>
    </>
  )
}

function AgendaInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

function AgendaEventByAvatar({ name }: { name: string }) {
  if (!name) return null
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-semibold shrink-0">{initials}</span>
      {name}
    </span>
  )
}

// The invoice's Events/Agenda (compta/facture/fapi/agenda.php, see
// useInvoiceAgenda) — header metadata (Created by/Creation date/Latest
// modification date/Validated by/Validation date) plus the "Actions on
// invoice" table (Ref./Date/Owner/Label/Related Objects/Status), matching
// Sales Orders' own Agenda tab.
export function AgendaTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceAgenda(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <AgendaInfoRow label="Created by" value={<AgendaEventByAvatar name={data.createdBy} />} />
        <AgendaInfoRow label="Creation date" value={<AgendaDualTime value={data.creationDate} timezone={data.timezone} />} />
        <AgendaInfoRow label="Latest modification date" value={<AgendaDualTime value={data.latestModificationDate} timezone={data.timezone} />} />
        {data.validatedBy && <AgendaInfoRow label="Validated by" value={<AgendaEventByAvatar name={data.validatedBy} />} />}
        {data.validationDate && <AgendaInfoRow label="Validation date" value={<AgendaDualTime value={data.validationDate} timezone={data.timezone} />} />}
        {data.closingDate && <AgendaInfoRow label="Closing date" value={<AgendaDualTime value={data.closingDate} timezone={data.timezone} />} />}
        <AgendaInfoRow label="Zra Message" value={data.zraMessage} />
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <CalendarClock size={14} className="text-brand" />
          <h3 className="font-semibold text-text!">Actions on invoice</h3>
        </div>
        {data.events.length === 0 ? (
          <EmptyState icon={CalendarClock} message="No events recorded for this invoice." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Ref.</th>
                  <th className="font-medium py-2 px-3">Date</th>
                  <th className="font-medium py-2 px-3">Owner</th>
                  <th className="font-medium py-2 px-3">Label</th>
                  <th className="font-medium py-2 px-3">Related Objects</th>
                  <th className="font-medium py-2 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event, i) => {
                  const relatedRoute = agendaNativeRouteForUrl(event.relatedObjectUrl)
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 px-4 text-text!">{event.ref}</td>
                      <td className="py-2 px-3 text-text-muted whitespace-nowrap">{event.date}</td>
                      <td className="py-2 px-3 text-text-muted">
                        <AgendaEventByAvatar name={event.owner} />
                      </td>
                      <td className="py-2 px-3 text-text-muted">{event.label}</td>
                      <td className="py-2 px-3">
                        {relatedRoute ? (
                          <Link to={relatedRoute} title="Open in this app" className="text-brand hover:underline">
                            {event.relatedObjectRef}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{event.relatedObjectRef || '—'}</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center text-text-muted">{event.statusLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
