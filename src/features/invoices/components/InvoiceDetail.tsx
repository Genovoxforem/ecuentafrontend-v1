import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Receipt, Users2, RefreshCcw, StickyNote, Paperclip, CalendarClock, BookOpen, Truck } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, StatusPill, type PillTone } from '../../../shared/components/dashboard/DashboardKit'
import { useTheme } from '../../../context/ThemeContext'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useInvoiceNotes, useInvoiceAgendaCount } from '../invoiceDetail.queries'
import { useSalesInvoice } from '../salesInvoice.queries'
import { AgendaTab } from './invoiceDetail/agendaTab'
import { DocumentsTab } from './invoiceDetail/documentsTab'
import { InvoiceMainTab } from './invoiceDetail/mainTab'
import { ContactsTab, NotesTab, StandingOrdersTab } from './invoiceDetail/notesContactsTabs'
import { LedgerEntryTab, ShipmentGrnTab } from './invoiceDetail/shipmentLedgerTabs'

const TABS = [
  { key: 'invoice', label: 'Customer Invoice', icon: Receipt },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'standingorders', label: 'Direct Debit Orders', icon: RefreshCcw },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
  { key: 'shipment', label: 'Shipment / GRN', icon: Truck },
  { key: 'ledgerentry', label: 'LedgerEntry', icon: BookOpen },
] as const

type TabKey = (typeof TABS)[number]['key']

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
  const isBlueMetal = theme === 'blue-metal'
  const [tab, setTab] = useState<TabKey>('invoice')
  // compta/sales/api/invoice.php — the real, reliable JSON API backing
  // compta/sales/card.php (see salesInvoiceApi.ts) — is the source for the
  // header and the Customer Invoice tab; the other tabs load their own data
  // (see invoiceDetail.queries.ts). The Notes and Events/Agenda badges are the
  // classic tab bar's own counts — how many of the two notes are filled in,
  // and how many events — read from those tabs' small JSON answers rather
  // than by downloading compta/facture/card.php (1.5 MB) just for two numbers.
  const { data, isLoading, isError, error, refetch } = useSalesInvoice(id)
  const { data: notes } = useInvoiceNotes(id)
  const { data: agendaCount } = useInvoiceAgendaCount(id)
  const notesBadge = notes ? [notes.notePublic, notes.notePrivate].filter(Boolean).length : 0

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading invoice…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load invoice" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  const inv = data.invoice

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 pl-8 pr-8 border-b border-border">
              <div>
                <Link to={ROUTES.invoiceList} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text mb-1.5">
                  <ChevronLeft size={14} /> Sales Invoices
                </Link>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text!">{inv.ref}</h2>
                  {inv.status_label && (isBlueMetal ? (
                    <StatusPill tone={statusBadgeTone(inv.status_color)}>{inv.status_label}</StatusPill>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeCls(inv.status_color)}`}>{inv.status_label}</span>
                  ))}
                </div>
                <p className="text-xs text-text-faint mt-1">
                  Ref. customer: {inv.ref_client || '—'} · Third-party:{' '}
                  {data.customer.id ? (
                    <Link to={ROUTES.customerDetail.replace(':id', data.customer.id)} className="text-brand hover:underline">
                      {data.customer.name}
                    </Link>
                  ) : (
                    data.customer.name || '—'
                  )}
                </p>
              </div>
            </div>
            <div className="border-t border-border">
              <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6" style={{ scrollBehavior: 'smooth' }}>
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    {label}
                    {key === 'notes' && !!notesBadge && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{notesBadge}</span>
                    )}
                    {key === 'documents' && data.invoice.nb_files > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{data.invoice.nb_files}</span>
                    )}
                    {key === 'agenda' && !!agendaCount && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{agendaCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'invoice' && <InvoiceMainTab data={data} />}
        {tab === 'contacts' && <ContactsTab id={id} />}
        {tab === 'standingorders' && <StandingOrdersTab id={id} />}
        {tab === 'notes' && <NotesTab id={id} />}
        {tab === 'documents' && <DocumentsTab id={id} />}
        {tab === 'agenda' && <AgendaTab id={id} />}
        {tab === 'shipment' && <ShipmentGrnTab id={id} />}
        {tab === 'ledgerentry' && <LedgerEntryTab id={id} />}
      </div>
    </div>
  )
}

// status_color from the real API is one of gray/green/... — mapped to this
// app's own badge tone classes rather than trusting arbitrary color names.
function statusBadgeCls(color: string): string {
  switch (color) {
    case 'green':
      return 'bg-success-bg text-success-fg'
    case 'red':
      return 'bg-danger-bg text-danger-fg'
    case 'orange':
    case 'yellow':
      return 'bg-warning-bg text-warning-fg'
    default:
      return 'bg-surface-hover text-text-muted'
  }
}

function statusBadgeTone(color: string): PillTone {
  switch (color) {
    case 'green':
      return 'success'
    case 'red':
      return 'danger'
    case 'orange':
    case 'yellow':
      return 'warning'
    default:
      return 'neutral'
  }
}
