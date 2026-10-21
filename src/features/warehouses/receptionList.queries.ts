/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchAllPages, pickNum, pickNumOrNull, pickStr, usDate } from '../../api/fapiRow'

// reception/fapi/list.php (16 Oct 2026): receptions with their supplier (name, town, zip), vendor reference, planned
// delivery date and status (0 draft, 1 validated, 2 processed, -1 cancelled); `status` filters in the query.
// Replaces the reception/list.php scrape. Row fields are read defensively: newecuenta holds no receptions yet.
export interface ReceptionListRow {
  id: number
  ref: string
  refVendor: string
  thirdPartyName: string
  socid: number | null
  city: string
  zip: string
  plannedDeliveryDate: string
  status: string
  billed: string
  statusCode: number
  poId: number | null
  poRef: string
}

export function receptionRowFromApi(r: any): ReceptionListRow {
  const origin = ((r.origins ?? []) as any[])[0]
  return {
    id: pickNum(r, 'id'),
    ref: pickStr(r, 'ref'),
    refVendor: pickStr(r, 'ref_supplier', 'ref_vendor'),
    thirdPartyName: pickStr(r, 'supplier.name', 'thirdparty.name', 'company'),
    socid: pickNumOrNull(r, 'supplier.id', 'thirdparty.id', 'socid'),
    city: pickStr(r, 'supplier.town', 'thirdparty.town', 'town'),
    zip: pickStr(r, 'supplier.zip', 'thirdparty.zip', 'zip'),
    plannedDeliveryDate: usDate(r.date_delivery ?? r.planned_delivery),
    status: pickStr(r, 'status_label'),
    billed: pickStr(r, 'billed_label') || (r.billed ? 'Yes' : 'No'),
    statusCode: pickNum(r, 'status', 'fk_statut'),
    poId: origin ? pickNumOrNull(origin, 'id', 'fk_source') : null,
    poRef: origin ? pickStr(origin, 'ref') : '',
  }
}

export async function fetchReceptionsFapi(params: Record<string, unknown> = {}): Promise<ReceptionListRow[]> {
  const items = await fetchAllPages((page) => fapiGet<any>('/reception/fapi/list.php', { page, limit: 100, ...params }))
  return items.map(receptionRowFromApi)
}

export function useReceptionList(statusFilter?: number) {
  return useQuery({
    queryKey: ['warehouses', 'receptionList', statusFilter],
    queryFn: () => fetchReceptionsFapi(statusFilter !== undefined ? { status: statusFilter } : {}),
    staleTime: 1000 * 30,
  })
}
