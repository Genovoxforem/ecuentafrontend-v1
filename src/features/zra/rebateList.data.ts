import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { usDateFromIso } from '../../utils/dates'

// custom/zra/fapi/rebate_list.php (key-authenticated), the "Rebate Invoices (Value Credit Notes)" list. Checked live on newecuenta 5 Nov 2026
// (value credit notes are now enabled there; on 26 Oct it still answered 409): 1 rebate, answered as
//   data: { items: [{id, ref, date "2026-10-30", statut, status_label, socid, third_party_name, source_refs "IN-V-26-0005", rebate_percentage 10,
//           total_ttc -2.5, rebate_reason, zra_status "<ZRA's message>", zra_error "894", zra_synced false, url "/compta/sales/card.php?id=49"}],
//           totals: {count, total_ttc, synced, pending, failed, scope}, pagination: {page, limit, total, pages}, can_sync }
// Compared with the classic custom/zra/rebate_list.php row by row: Ref CR-V-26-0001, Date 10/30/2026, Customer Walking, Against Invoice(s)
// IN-V-26-0005, Rebate % 10.00%, Amount TTC -2.50, Status Validated, ZRA Status "Failed (894)", ZRA Message "Connection to ZRA API refused Check
// Connection." - the same values. The classic list has no filter form; the API also takes socid, search and zra_status, which are not used.
// Not seen: the classic wording of the ZRA Status for a synced or a still pending rebate (only a failed one exists), so those two use the
// API's own words (totals.synced / pending / failed). The classic "Against Invoice(s)" cell links to the source invoice: since 11 Nov 2026 the row also
// carries source_invoice_ids (the ids of the source invoices, CR-V-26-0001 -> source_refs "IN-V-26-0005", source_invoice_ids [47]), so each ref links to its
// invoice. When the refs and the ids cannot be paired one to one (a count that differs) the refs stay text.
export interface RebateListRow {
  id: number
  ref: string
  invoiceId: string
  date: string
  customerId: number | null
  customerName: string
  sourceRefs: string
  // the refs of the source invoices, each with its id when the answer pairs them
  sourceInvoices: Array<{ ref: string; id: number | null }>
  percent: string
  totalTtc: string
  status: string
  zraStatus: string
  zraMessage: string
  synced: boolean
}

interface FapiRebate {
  id: number
  ref: string
  date: string
  status_label?: string
  socid?: number
  third_party_name?: string
  source_refs?: string
  source_invoice_ids?: number[]
  rebate_percentage?: number
  total_ttc?: number
  zra_status?: string
  zra_error?: string | number | null
  zra_synced?: boolean
  url?: string
}

interface FapiRebatePage {
  items?: FapiRebate[]
  totals?: { count?: number; total_ttc?: number; synced?: number; pending?: number; failed?: number }
  pagination?: { total?: number }
  can_sync?: boolean
}

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// A failed rebate carries ZRA's own error code ("894"); a synced one has zra_synced; anything else has not been sent yet.
function zraStatusOf(r: FapiRebate): string {
  if (r.zra_synced) return 'Synced'
  const code = r.zra_error == null ? '' : String(r.zra_error).trim()
  if (code && code !== '0' && code !== '000') return `Failed (${code})`
  return 'Pending'
}

// source_refs is the text of the refs ("IN-V-26-0005", several joined by commas) and source_invoice_ids the ids of those invoices in the same order.
export function sourceInvoicesOf(r: Pick<FapiRebate, 'source_refs' | 'source_invoice_ids'>): Array<{ ref: string; id: number | null }> {
  const refs = (r.source_refs ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const ids = r.source_invoice_ids ?? []
  return refs.map((ref, i) => ({ ref, id: ids.length === refs.length ? ids[i] : null }))
}

export function mapRebate(r: FapiRebate): RebateListRow {
  return {
    id: r.id,
    ref: r.ref,
    invoiceId: new URLSearchParams((r.url ?? '').split('?')[1] ?? '').get('id') ?? String(r.id),
    date: usDateFromIso(r.date),
    customerId: r.socid ?? null,
    customerName: r.third_party_name ?? '',
    sourceRefs: r.source_refs ?? '',
    sourceInvoices: sourceInvoicesOf(r),
    percent: r.rebate_percentage == null ? '' : `${r.rebate_percentage.toFixed(2)}%`,
    totalTtc: r.total_ttc == null ? '' : money(r.total_ttc),
    status: r.status_label ?? '',
    zraStatus: zraStatusOf(r),
    zraMessage: r.zra_status ?? '',
    synced: !!r.zra_synced,
  }
}

export function useRebateList(page: number, limit: number) {
  return useQuery({
    queryKey: ['zra', 'rebates', 'list', page, limit],
    queryFn: async (): Promise<{ rows: RebateListRow[]; total: number }> => {
      const d = await fapiGet<FapiRebatePage>('/custom/zra/fapi/rebate_list.php', { page, limit })
      const rows = (d.items ?? []).map(mapRebate)
      return { rows, total: Number(d.pagination?.total) || rows.length }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}
