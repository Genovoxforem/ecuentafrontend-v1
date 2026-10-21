import { useEffect, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  CalendarDays,
  PencilLine,
  UserCheck,
  Eye,
  Lock,
  ChevronDown,
  PlayCircle,
  Search,
  ChevronRight,
  Plus,
  List,
  Mail,
  MailOpen,
  Loader2,
  HelpCircle,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Rows3,
  Rows2,
  Truck,
  Ticket as TicketIcon,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TICKET_STATUS_FILTERS, useChangeTicketStatus, useTicketTypeOptions, useTicketsList, useTicketStats, type TicketRow } from '../tickets.queries'
import { useAgendaFilterOptions } from '../../agenda/calendarApi.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'

const PAGE_SIZES = [10, 15, 25, 50]

type SortKey = 'ref' | 'subject' | 'type' | 'thirdParty' | 'author' | 'assignedTo' | 'dateCreate' | 'status'

// This page's real backend (ticket/ticket_list_ajax.php) paginates
// server-side, so sorting applies within the loaded page only — same
// caveat as this app's other server-paginated lists (ContactListPage.tsx).
function sortValue(t: TicketRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return t.ref
    case 'subject':
      return t.subject
    case 'type':
      return t.type ?? ''
    case 'thirdParty':
      return t.thirdParty ?? ''
    case 'author':
      return t.author
    case 'assignedTo':
      return t.assignedTo ?? ''
    case 'dateCreate':
      return t.dateCreate
    case 'status':
      return t.status
  }
}

// Reference's own status colors, straight from ticket_stats_ajax.php's real
// $statusDefs array — reused per-row here (the list endpoint's own `status`
// field is a pre-rendered <span class="badge..."> with no color attribute,
// but its fk_statut code matches this same map 1:1).
const STATUS_COLOR: Record<number, string> = {
  0: '#6c757d',
  1: '#17a2b8',
  2: '#fd7e14',
  3: '#007bff',
  5: '#ffc107',
  7: '#e83e8c',
  8: '#28a745',
  9: '#dc3545',
}

// Same real $statusDefs array also carries a Font Awesome icon per status —
// mapped to its closest lucide equivalent for the pill row below.
const STATUS_ICON: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  'fa-list': List,
  'fa-envelope': Mail,
  'fa-envelope-open': MailOpen,
  'fa-user-check': UserCheck,
  'fa-spinner': Loader2,
  'fa-question-circle': HelpCircle,
  'fa-pause-circle': PauseCircle,
  'fa-check-circle': CheckCircle2,
  'fa-times-circle': XCircle,
}

// The classic list's quick status menu (its Actions column) — same codes,
// labels and icons; closed (8) and cancelled (9) tickets show a lock instead.
const QUICK_STATUSES: Array<{ code: number; label: string; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { code: 0, label: 'Unread', icon: Mail },
  { code: 1, label: 'Read', icon: MailOpen },
  { code: 2, label: 'Assigned', icon: UserCheck },
  { code: 3, label: 'In Progress', icon: PlayCircle },
  { code: 5, label: 'Waiting for feedback', icon: HelpCircle },
  { code: 7, label: 'On Hold', icon: PauseCircle },
  { code: 8, label: 'Solved/Closed', icon: CheckCircle2 },
  { code: 9, label: 'Cancelled', icon: XCircle },
]

function QuickStatus({ ticket }: { ticket: TicketRow }) {
  const [open, setOpen] = useState(false)
  const change = useChangeTicketStatus()
  if (ticket.statusCode === 8 || ticket.statusCode === 9) {
    return (
      <span title="Closed tickets can't be changed here" className="inline-flex p-1 text-text-faint">
        <Lock size={13} />
      </span>
    )
  }
  const current = QUICK_STATUSES.find((s) => s.code === ticket.statusCode)
  const CurrentIcon = current?.icon ?? List
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        type="button"
        title="Change status"
        aria-label={`Change status of ${ticket.ref}`}
        disabled={change.isPending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-0.5 rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-50"
      >
        {change.isPending ? <Loader2 size={14} className="animate-spin" /> : <CurrentIcon size={14} />}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-surface py-1 text-left shadow-xl">
          {QUICK_STATUSES.map((s) => {
            const isCurrent = s.code === ticket.statusCode
            return (
              <button
                key={s.code}
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  setOpen(false)
                  change.mutate(
                    { trackId: ticket.trackId, status: s.code },
                    { onError: (err) => window.alert(`Could not change status: ${err instanceof Error ? err.message : 'Unknown error'}`) },
                  )
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs ${isCurrent ? 'font-semibold text-brand cursor-default' : 'text-text hover:bg-surface-hover'}`}
              >
                <span style={{ color: STATUS_COLOR[s.code] }} className="inline-flex">
                  <s.icon size={13} />
                </span>
                {s.label}
                {isCurrent && <span className="text-text-faint">(current)</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Request Type (c_ticket_type) is an open, admin-configurable dictionary
// with no confirmed JSON API (see TicketCreateForm.tsx's own header
// comment) — so instead of a fixed label→color lookup that breaks the
// moment a new type is added, this derives a stable color from the real
// label text itself, the same "deterministic, not fabricated" approach
// Avatar.tsx already uses for its per-row initials color.
const TYPE_PALETTE = ['#6366f1', '#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#ec4899', '#14b8a6', '#a855f7']
function typeColor(label: string): string {
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  return TYPE_PALETTE[hash % TYPE_PALETTE.length]
}

// Real via ticket/ticket_list_ajax.php (list + "My Assigned Tickets", same
// endpoint with mode=mine) and ticket/ticket_stats_ajax.php (stat cards +
// per-status colors/icons/counts) — both confirmed genuine JSON with real
// permission checks (hasRight('ticket','read')). Search, date-range and
// assigned/created-by filters all POST straight to that same endpoint's own
// real search_* / datefilter params (confirmed live), not client-side
// guessing — see tickets.queries.ts's useTicketsList for the exact fields.
export function TicketsList({ defaultMine = false, projectId, embedded = false }: { defaultMine?: boolean; projectId?: number; embedded?: boolean }) {
  // "Open (All)" first, as the classic Ticket / List / My Tickets menu entries open it.
  const [status, setStatus] = useState('openall')
  const [typeCode, setTypeCode] = useState('')
  const [mine, setMine] = useState(defaultMine)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [dense, setDense] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(15)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: stats } = useTicketStats(projectId)
  const { data: filterOptions } = useAgendaFilterOptions()
  const { data: typeOptions } = useTicketTypeOptions()
  const { data, isLoading, isError, error, refetch } = useTicketsList(
    { status, mine, dateFrom, dateTo, assignedToUserId: assignedFilter, createdByUserId: createdByFilter, search, typeCode, projectId },
    page,
    pageSize,
  )
  const rows = data?.rows ?? []
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<TicketRow, SortKey>(rows, sortValue)
  const cellPad = dense ? 'py-1.5' : 'py-2'

  function getExportData() {
    return {
      headers: ['Ref', 'Author', 'Subject', 'Request Type', 'Third Party', 'Jobcards', 'Created', 'Close Date', 'Assigned To', 'Status'],
      rows: sortedRows.map((t) => [t.ref, t.author, t.subject, t.type ?? '', t.thirdParty ?? '', t.jobcards, t.dateCreate, t.dateClose, t.assignedTo ?? '', t.status]),
    }
  }

  function resetPage() {
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {embedded ? (
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">
            <TicketIcon size={15} className="text-brand" /> List of tickets
          </h3>
          <Link to={ROUTES.ticketNew} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover shrink-0">
            <Plus size={13} /> New
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-xs text-text-faint [[data-theme=blue-metal]_&]:hidden">
              Ticket <ChevronRight size={11} /> List of Tickets
            </p>
            <h2 className="flex items-center gap-2 text-xl font-bold text-text!">
              <TicketIcon size={20} className="text-brand" /> List of Tickets
            </h2>
            <p className="text-xs text-text-faint [[data-theme=blue-metal]_&]:hidden">Manage and track all your support tickets in one place.</p>
          </div>
          <Link to={ROUTES.ticketNew} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover shrink-0">
            <Plus size={15} /> New Ticket
          </Link>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { label: 'Total Tickets', value: stats.total, icon: ClipboardList, color: 'bg-blue-500' },
              { label: 'Created Today', value: stats.today, icon: CalendarDays, color: 'bg-emerald-500' },
              { label: 'My Tickets', value: stats.createdByMe, today: stats.createdByMeToday, icon: PencilLine, color: 'bg-amber-500' },
              { label: 'Assigned to Me', value: stats.assignedToMe, today: stats.assignedToMeToday, icon: UserCheck, color: 'bg-violet-500' },
            ] as const
          ).map((s) => (
            <Card key={s.label} className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{s.label}</p>
                <p className="mt-1 text-xl font-bold text-text!">{s.value}</p>
                {'today' in s && <p className="mt-0.5 text-xs text-text-faint">Today: {s.today}</p>}
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${s.color}`}>
                <s.icon size={20} />
              </span>
            </Card>
          ))}
        </div>
      )}

      {stats && (
        <div className="flex flex-wrap gap-2">
          {stats.byStatus.map((s) => {
            const active = status === s.code || (status === '-1' && s.code === 'all')
            const value = s.code === 'all' ? '-1' : s.code
            const Icon = STATUS_ICON[s.icon] ?? List
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => {
                  resetPage()
                  setStatus(value)
                }}
                style={active ? { backgroundColor: s.color, borderColor: s.color } : { borderColor: s.color, color: s.color }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'text-white' : 'bg-transparent'}`}
              >
                <Icon size={12} /> {s.label} <span className={`rounded-full px-1.5 ${active ? 'bg-white/25' : 'bg-current/10'}`}>{s.count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium ${
            showFilters ? 'bg-brand text-white border-brand' : 'border-input-border text-text-muted hover:bg-surface-hover'
          }`}
        >
          <Filter size={13} /> Filter
        </button>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            resetPage()
            setDateFrom(e.target.value)
          }}
          className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
        />
        <span className="text-text-faint text-sm">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            resetPage()
            setDateTo(e.target.value)
          }}
          className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
        />
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => {
              resetPage()
              setSearchInput(e.target.value)
            }}
            placeholder="Search by subject, ref, customer, jobcard…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) => {
            resetPage()
            setPageSize(Number(e.target.value))
          }}
          className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setDense((v) => !v)}
          title={dense ? 'Comfortable rows' : 'Compact rows'}
          className="flex items-center justify-center h-9 w-9 rounded-md border border-input-border text-text-muted hover:bg-surface-hover"
        >
          {dense ? <Rows3 size={15} /> : <Rows2 size={15} />}
        </button>
      </div>

      {showFilters && (
        <Card className="!h-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            Status
            <select
              value={status}
              onChange={(e) => {
                resetPage()
                setStatus(e.target.value)
              }}
              className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm"
            >
              {TICKET_STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-text-muted">
            Request type
            <select
              value={typeCode}
              onChange={(e) => {
                resetPage()
                setTypeCode(e.target.value)
              }}
              className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm"
            >
              <option value="">Any</option>
              {(typeOptions ?? []).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => {
                resetPage()
                setMine(e.target.checked)
              }}
              className="rounded border-input-border"
            />
            My tickets only
          </label>
          <label className="flex items-center gap-2 text-sm text-text-muted">
            Assigned to
            <select
              value={assignedFilter}
              onChange={(e) => {
                resetPage()
                setAssignedFilter(e.target.value)
              }}
              className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm"
            >
              <option value="">Anyone</option>
              {(filterOptions?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-text-muted">
            Created by
            <select
              value={createdByFilter}
              onChange={(e) => {
                resetPage()
                setCreatedByFilter(e.target.value)
              }}
              className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm"
            >
              <option value="">Anyone</option>
              {(filterOptions?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </Card>
      )}

      {isLoading && <LegacyLoadingCard label="Loading tickets…" />}
      {isError && <LegacyErrorCard title="Couldn't load tickets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="flex justify-end">
            <TableExportButtons title="Tickets" getExportData={getExportData} />
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                  <Th sortKey="author" sort={sort} onSort={toggleSort}>Author</Th>
                  <Th sortKey="subject" sort={sort} onSort={toggleSort}>Subject</Th>
                  <Th sortKey="type" sort={sort} onSort={toggleSort}>Request Type</Th>
                  <Th sortKey="thirdParty" sort={sort} onSort={toggleSort}>Third-Party</Th>
                  <Th>Jobcards</Th>
                  <Th sortKey="dateCreate" sort={sort} onSort={toggleSort}>Creation Date</Th>
                  <Th>Close Date</Th>
                  <Th sortKey="assignedTo" sort={sort} onSort={toggleSort}>Assigned To</Th>
                  <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                  <Th align="center">Actions</Th>
                </TheadRow>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-4 text-text-faint italic">
                      No tickets found.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((t) => {
                    const jobcardChips = t.jobcards ? t.jobcards.split(',').map((j) => j.trim()).filter(Boolean) : []
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0 align-top">
                        <td className={`px-3 ${cellPad} text-text! whitespace-nowrap`}>
                          <Link to={ROUTES.ticketDetail.replace(':id', String(t.id))} className="flex items-center gap-1.5 text-brand hover:underline font-medium">
                            <TicketIcon size={13} className="shrink-0" /> {t.ref}
                          </Link>
                        </td>
                        <td className={`px-3 ${cellPad}`}>
                          {t.author ? (
                            t.authorUserId ? (
                              <Link to={ROUTES.userDetail.replace(':id', t.authorUserId)} className="flex items-center gap-2 hover:underline">
                                <Avatar name={t.author} size={22} color="bg-indigo-500" /> <span className="text-brand">{t.author}</span>
                              </Link>
                            ) : (
                              <span className="flex items-center gap-2 text-text-muted">
                                <Avatar name={t.author} size={22} color="bg-indigo-500" /> {t.author}
                              </span>
                            )
                          ) : (
                            <span className="text-text-faint">—</span>
                          )}
                        </td>
                        <td className={`px-3 ${cellPad} text-text-muted`}>{t.subject}</td>
                        <td className={`px-3 ${cellPad}`}>
                          {t.type ? (
                            <span
                              style={{ backgroundColor: `${typeColor(t.type)}22`, color: typeColor(t.type) }}
                              className="inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                            >
                              {t.type}
                            </span>
                          ) : (
                            <span className="text-text-faint">—</span>
                          )}
                        </td>
                        <td className={`px-3 ${cellPad}`}>
                          {t.thirdParty ? (
                            <div>
                              {t.thirdPartySocid ? (
                                <Link to={ROUTES.customerDetail.replace(':id', t.thirdPartySocid)} className="flex items-center gap-2 hover:underline">
                                  <Avatar name={t.thirdParty} size={22} color="bg-brand" /> <span className="text-brand">{t.thirdParty}</span>
                                </Link>
                              ) : (
                                <span className="flex items-center gap-2 text-text-muted">
                                  <Avatar name={t.thirdParty} size={22} color="bg-brand" /> {t.thirdParty}
                                </span>
                              )}
                              {t.thirdPartySubtitle && <p className="text-xs text-text-faint pl-7">{t.thirdPartySubtitle}</p>}
                            </div>
                          ) : (
                            <span className="text-text-faint">—</span>
                          )}
                        </td>
                        <td className={`px-3 ${cellPad}`}>
                          {jobcardChips.length === 0 ? (
                            <span className="text-text-faint">—</span>
                          ) : (
                            // Every linked job card, as the classic list prints them.
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {jobcardChips.map((j) => (
                                <span key={j} className="inline-flex items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                                  <Truck size={12} className="text-text-faint" /> {j}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className={`px-3 ${cellPad} text-text-muted whitespace-nowrap`}>{t.dateCreate}</td>
                        <td className={`px-3 ${cellPad} text-text-muted whitespace-nowrap`}>{t.dateClose || '—'}</td>
                        <td className={`px-3 ${cellPad}`}>
                          {t.assignedTo ? (
                            t.assignedToUserId ? (
                              <Link to={ROUTES.userDetail.replace(':id', t.assignedToUserId)} className="flex items-center gap-2 hover:underline">
                                <Avatar name={t.assignedTo} size={22} color="bg-indigo-500" /> <span className="text-brand">{t.assignedTo}</span>
                              </Link>
                            ) : (
                              <span className="flex items-center gap-2 text-text-muted">
                                <Avatar name={t.assignedTo} size={22} color="bg-indigo-500" /> {t.assignedTo}
                              </span>
                            )
                          ) : (
                            <span className="text-text-faint">—</span>
                          )}
                        </td>
                        <td className={`px-3 ${cellPad}`}>
                          <span
                            style={{ backgroundColor: `${STATUS_COLOR[t.statusCode] ?? '#6c757d'}22`, color: STATUS_COLOR[t.statusCode] ?? '#6c757d' }}
                            className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className={`px-3 ${cellPad} text-center`}>
                          <div className="flex items-center justify-center gap-1">
                            <Link to={ROUTES.ticketDetail.replace(':id', String(t.id))} title="View" className="inline-flex p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                              <Eye size={14} />
                            </Link>
                            <QuickStatus ticket={t} />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </Card>

          <ListPagination page={page + 1} perPage={pageSize} total={data.filtered} onPageChange={(p) => setPage(p - 1)} />
        </>
      )}
    </div>
  )
}
