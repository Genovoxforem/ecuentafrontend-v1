import { queryOptions, useQuery } from '@tanstack/react-query'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { fetchContract, fetchContractStats, fetchContracts, type ContractListItem } from '../../api/contracts'

export interface ContractRow {
  id: number | null
  ref: string
  refCustomer: string
  refVendor: string
  thirdParty: string
  thirdPartySubtitle: string
  thirdPartyId: string | null
  salesRep: string
  contractDate: string
  endDateOfServices: string
  notRunning: number
  inProgress: number
  expired: number
  closed: number
}

export interface ContractsSummary {
  totalContracts: number
  createdThisMonth: number
  runningTotal: number
  startedThisMonth: number
  expiredCount: number
  expiredThisMonth: number
  closedCount: number
  followupsThisMonth: number
  contracts: ContractRow[]
}

// contrat/list_ajax.php — real, confirmed by reading that file directly
// (Contrat/Societe getNomUrl() HTML cells, real per-contract status-badge
// counts). The stat-card values come from contrat/fapi/stats.php — the row
// list alone can't say what started, expired or was followed up this month.
//
// columns[0][data]=ref is required on every request — see
// contractListParser.ts's header comment for the real backend bug this
// works around (the file's own default sort-column fallback references a
// SQL alias that doesn't exist in this query, silently emptying every
// result otherwise).
//
// The rows and summary stats are separate requests; only the Contracts list
// and Contract Report need the row list.
// MM/DD/YYYY, the format every other Sales list shows (the API sends UTC epoch seconds).
function epochToDate(value: number | null): string {
  if (!value) return ''
  const d = new Date(value * 1000)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
}

function toContractRow(item: ContractListItem): ContractRow {
  return {
    id: item.id,
    ref: item.ref,
    refCustomer: item.ref_customer ?? '',
    refVendor: item.ref_supplier ?? '',
    thirdParty: item.third_party_name ?? '',
    thirdPartySubtitle: '',
    thirdPartyId: item.fk_soc ? String(item.fk_soc) : null,
    salesRep: (item.sales_reps ?? []).map((rep) => rep.name).join(', '),
    contractDate: epochToDate(item.date_contrat),
    endDateOfServices: epochToDate(item.date_end),
    notRunning: item.nb_initial,
    inProgress: item.nb_running,
    // "late" services run past their end date; the legacy list counts them as expired too.
    expired: item.nb_expired + item.nb_late,
    closed: item.nb_closed,
  }
}

const LIST_PAGE_SIZE = 100

// contrat/fapi/list.php (a 500 until 15 Oct 2026: it selected totals and a
// validation date that this fork's llx_contrat does not have). The service
// counters use the same expressions contrat/list_ajax.php did.
const contractsListQuery = queryOptions({
  queryKey: ['contracts', 'list'],
  queryFn: async (): Promise<ContractRow[]> => {
    const params = { limit: LIST_PAGE_SIZE, sort: 'date_contrat', direction: 'desc' } as const
    const first = await fetchContracts({ page: 1, ...params })
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.pagination.pages - 1) }, (_, i) => fetchContracts({ page: i + 2, ...params })))
    return [first, ...rest].flatMap((page) => page.items).map(toContractRow)
  },
  staleTime: 1000 * 30,
})

export function useContractsList() {
  const query = useQuery(contractsListQuery)
  return { data: query.data, isError: query.isError, isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

export function useContractsSummary() {
  const list = useQuery(contractsListQuery)
  const stats = useQuery({
    queryKey: ['contracts', 'stats'],
    queryFn: async () => {
      // Older contrat/fapi/stats.php builds die with "Call to undefined
      // function dol_get_first_day()" whenever `year` is sent (fixed on
      // newecuenta 2026-10-15: every fapi bootstrap now loads date.lib.php).
      // Without it the endpoint answers (year 0 = all time), so fall back to
      // that rather than leave the Contracts page and the Sales dashboard
      // stuck on "Loading…".
      const result = await fetchContractStats({ year: new Date().getFullYear() }).catch(() => fetchContractStats())
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return {
        totalContracts: result.summary.total,
        createdThisMonth: result.by_month.find((entry) => entry.month === currentMonth)?.count ?? 0,
        runningTotal: result.summary.running,
        startedThisMonth: 0,
        expiredCount: result.summary.expired,
        expiredThisMonth: 0,
        closedCount: result.summary.closed,
        followupsThisMonth: 0,
      }
    },
    staleTime: 1000 * 30,
  })
  const data: ContractsSummary | undefined = list.data && stats.data ? { ...stats.data, contracts: list.data } : undefined
  return {
    data,
    isError: list.isError || stats.isError,
    isLoading: list.isLoading || stats.isLoading,
    error: list.error ?? stats.error,
    refetch: () => Promise.all([list.refetch(), stats.refetch()]),
  }
}

export interface NewContractLineInput {
  productId?: string
  description: string
  qty: number
  unitPriceHt: number
  vatRate: number
  // The VAT category code (A, B, ...) kept with the rate, sent as "16 (A)" like the
  // classic page does.
  vatCode?: string
  unitPriceTtc?: number
  discountPct?: number
  // 'percent' (default) or 'fixed' — a fixed discount is an amount taken off the line.
  discountType?: 'percent' | 'fixed'
  // yyyy-mm-dd service period of the line
  dateStart?: string
  dateEnd?: string
}

export interface NewContractInput {
  socid: string
  refCustomer?: string
  refVendor?: string
  contractDate: string // yyyy-mm-dd
  projectId?: string
  notePublic?: string
  notePrivate?: string
  signatureRepId: string
  followUpRepId: string
  supportRepId?: string
  lines: NewContractLineInput[]
  validate: boolean
}

interface ContractCreateResponse {
  success: boolean
  message?: string
  data?: { id: number; ref: string }
}

// contrat/api/contract_handler.php?action=create — real, confirmed by
// reading that file directly: real Contrat::create()/addline()/validate()
// calls, real PDF generation (suppressed with @ in that file itself, so a
// PDF-template crash there — the same TCPDF/logo-path bug confirmed for
// Quotations — won't surface as a request failure here). Expects classic
// GETPOST-style form-encoded fields, not a JSON body — the array fields
// (commercial_signature_id/commercial_suivi_id/commercial_techsup_id) use
// repeated bracketed keys the way a real <select multiple> form field
// would submit them. `lines` is a JSON-encoded string in one form field,
// decoded server-side with json_decode(), not a nested array of fields.
export function useCreateContract() {
  return async (input: NewContractInput) => {
    const [year, month, day] = input.contractDate.split('-')
    const body = new URLSearchParams()
    body.set('action', 'create')
    body.set('socid', input.socid)
    body.set('contract_dateyear', year)
    body.set('contract_datemonth', month)
    body.set('contract_dateday', day)
    body.set('ref_customer', input.refCustomer ?? '')
    body.set('ref_supplier', input.refVendor ?? '')
    if (input.projectId) body.set('fk_project', input.projectId)
    body.set('note_public', input.notePublic ?? '')
    body.set('note_private', input.notePrivate ?? '')
    body.append('commercial_signature_id[]', input.signatureRepId)
    body.append('commercial_suivi_id[]', input.followUpRepId)
    body.append('commercial_techsup_id[]', input.supportRepId || input.signatureRepId)
    body.set('validated', input.validate ? '1' : '0')
    body.set(
      'lines',
      JSON.stringify(
        input.lines.map((l) => {
          const fixed = l.discountType === 'fixed'
          const discount = l.discountPct ?? 0
          return {
            fk_product: l.productId ? Number(l.productId) : 0,
            description: l.description,
            qty: l.qty,
            price_ht: l.unitPriceHt,
            price_ttc: l.unitPriceTtc ?? 0,
            tva_tx: l.vatCode ? `${l.vatRate} (${l.vatCode})` : String(l.vatRate),
            vat_src_code: l.vatCode ?? '',
            remise_percent: fixed ? 0 : discount,
            discount_percent: fixed ? 0 : discount,
            discount_fixed: fixed ? discount : 0,
            remise_type: fixed ? 2 : 1,
            // Left out when empty: the handler runs strtotime() on whatever is present.
            ...(l.dateStart ? { date_start: l.dateStart } : {}),
            ...(l.dateEnd ? { date_end: l.dateEnd } : {}),
          }
        }),
      ),
    )

    const res = await fetch('/contrat/api/contract_handler.php', { method: 'POST', credentials: 'same-origin', body })
    if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    const data: ContractCreateResponse = await res.json()
    if (!data.success) throw new Error(data.message || 'Failed to create contract')

    return data.data
  }
}

// Service lines across all contracts, read-only (services are added on a
// contract's own card, not here) — from contrat/api/services_list_api.php
// (1.5 KB of JSON) instead of the 1.25 MB contrat/services_list.php page.
export interface RawServiceLine {
  lineId: number
  contractId: number
  contractRef: string
  service: string // "<product ref> - <label>"
  thirdParty: string
  thirdPartyId: number
  plannedStart: string
  realStart: string
  plannedEnd: string
  realEnd: string
  statut: number
  statusLabel: string
}

// One row of the Services Details list, as the legacy page's columns show it.
export interface ContractServiceRow {
  contractId: number | null
  contractRef: string
  serviceRef: string
  service: string
  vendorOrCustomerId: number | null
  thirdParty: string
  plannedStart: string
  realStart: string
  plannedEnd: string
  realEnd: string
  status: string
}

const usDate =(value: string): Date | null => {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null
}

// The legacy page's own status rule (contrat/services_list.php, the Status
// column): a line of a draft contract reads "Draft"; otherwise
// ContratLigne::LibStatut(statut, 5, expired) — 0 "Not running", 4 "Not
// expired", or "Expired" once the planned end date has passed, 5 "Closed".
export function toContractServiceRow(line: RawServiceLine, draftContractIds: Set<number>, now = new Date()): ContractServiceRow {
  const dash = line.service.indexOf(' - ')
  const plannedEnd = usDate(line.plannedEnd)
  let status = line.statusLabel
  if (draftContractIds.has(line.contractId)) status = 'Draft'
  else if (line.statut === 0) status = 'Not running'
  else if (line.statut === 4) status = plannedEnd && plannedEnd < now ? 'Expired' : 'Not expired'
  else if (line.statut === 5) status = 'Closed'
  return {
    contractId: line.contractId || null,
    contractRef: line.contractRef,
    serviceRef: dash >= 0 ? line.service.slice(0, dash) : '',
    service: dash >= 0 ? line.service.slice(dash + 3) : line.service,
    vendorOrCustomerId: line.thirdPartyId || null,
    thirdParty: line.thirdParty,
    plannedStart: line.plannedStart,
    realStart: line.realStart,
    plannedEnd: line.plannedEnd,
    realEnd: line.realEnd,
    status,
  }
}

// The services API doesn't say whether a line's contract is still a draft, so
// the contracts' own statuses come from contrat/fapi/get.php. Only contracts
// with a "not running" line can be drafts, so only those are looked up. The
// list endpoint would be one call, but it fails on 5.10 (SQL error: unknown
// column c.total_ht). Only the "Draft" label depends on this: a lookup that
// fails (older installs have no fapi at all) just leaves those lines "Not running".
async function fetchDraftContractIds(contractIds: number[]): Promise<Set<number>> {
  const results = await Promise.allSettled(contractIds.map((id) => fetchContract(id)))
  const ids = new Set<number>()
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && Number(r.value.statut) === 0) ids.add(contractIds[i])
  })
  return ids
}

export function useContractServices() {
  return useQuery({
    queryKey: ['contracts', 'services'],
    queryFn: async (): Promise<ContractServiceRow[]> => {
      const res = await fetch('/contrat/api/services_list_api.php?action=list', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await parseLegacyJson<{ success: boolean; message?: string; data?: { services?: RawServiceLine[] } }>(res)
      if (!json.success) throw new Error(json.message || 'Could not load the services.')
      // Same order as the legacy table: by contract, then by line.
      const lines = [...(json.data?.services ?? [])].sort((a, b) => a.contractRef.localeCompare(b.contractRef) || a.lineId - b.lineId)
      const draftIds = await fetchDraftContractIds([...new Set(lines.filter((l) => l.statut === 0).map((l) => l.contractId))])
      return lines.map((line) => toContractServiceRow(line, draftIds))
    },
    staleTime: 1000 * 30,
  })
}
