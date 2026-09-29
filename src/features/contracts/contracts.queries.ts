import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseContractListRow, type RawContractListRow, type ContractListRow } from './contractListParser'
import { parseContractListStats, parseContractServiceRows } from './contractPagesParser'

export type ContractRow = ContractListRow

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

interface ContractListAjaxResponse {
  recordsTotal: number
  data: RawContractListRow[]
}

// contrat/list_ajax.php — real, confirmed by reading that file directly
// (Contrat/Societe getNomUrl() HTML cells, real per-contract status-badge
// counts). The eight stat-card values come from contrat/list.php's own
// server-rendered cards (see contractPagesParser.ts) — the row list alone can't
// say what started, expired or was followed up this month.
//
// columns[0][data]=ref is required on every request — see
// contractListParser.ts's header comment for the real backend bug this
// works around (the file's own default sort-column fallback references a
// SQL alias that doesn't exist in this query, silently emptying every
// result otherwise).
export function useContractsSummary() {
  const query = useQuery({
    queryKey: ['contracts', 'summary'],
    queryFn: async (): Promise<ContractsSummary> => {
      const body = new URLSearchParams({
        draw: '1',
        start: '0',
        length: '-1',
        'columns[0][data]': 'ref',
        'order[0][column]': '0',
        'order[0][dir]': 'desc',
      })
      const [res, statsDoc] = await Promise.all([
        fetch('/contrat/list_ajax.php', { method: 'POST', credentials: 'same-origin', body }),
        fetchLegacyDocument('/contrat/list.php'),
      ])
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: ContractListAjaxResponse = await res.json()
      return { ...parseContractListStats(statsDoc), contracts: json.data.map(parseContractListRow) }
    },
    staleTime: 1000 * 30,
  })
  return { data: query.data, isError: query.isError, isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

export interface NewContractLineInput {
  productId?: string
  description: string
  qty: number
  unitPriceHt: number
  vatRate: number
  discountPct?: number
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
        input.lines.map((l) => ({
          fk_product: l.productId ? Number(l.productId) : 0,
          description: l.description,
          qty: l.qty,
          price_ht: l.unitPriceHt,
          tva_tx: String(l.vatRate),
          remise_percent: l.discountPct ?? 0,
        })),
      ),
    )

    const res = await fetch('/contrat/api/contract_handler.php', { method: 'POST', credentials: 'same-origin', body })
    if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    const data: ContractCreateResponse = await res.json()
    if (!data.success) throw new Error(data.message || 'Failed to create contract')

    return data.data
  }
}

// Service lines across all contracts — contrat/services_list.php, a read-only
// list (services are added on a contract's own card, not here). The real page
// pages its rows, so ask for a large page.
export function useContractServices() {
  return useQuery({
    queryKey: ['contracts', 'services'],
    queryFn: async () => parseContractServiceRows(await fetchLegacyDocument('/contrat/services_list.php', new URLSearchParams({ limit: '1000' }))),
    staleTime: 1000 * 30,
  })
}
