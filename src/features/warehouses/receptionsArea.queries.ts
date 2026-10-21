/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchReceptionsFapi, receptionRowFromApi, type ReceptionListRow } from './receptionList.queries'

export interface ReceptionLinkRow {
  ref: string
  id: number
  customerName: string
  socid: number | null
  poRef: string
  poId: number | null
}

export interface PendingPurchaseOrderRow {
  ref: string
  id: number
  customerName: string
  socid: number | null
}

export interface ReceptionsAreaData {
  receptionsToValidate: ReceptionLinkRow[]
  latestReceptions: ReceptionLinkRow[]
  purchaseOrdersToProcess: PendingPurchaseOrderRow[]
}

// The three blocks of the receptions home, from the same two lists the other pages use: reception/fapi/list.php
// (status 0 = to validate, status 1 = the latest validated ones) and fourn/commande/fapi/list.php (purchase orders
// at status 3 sent / 4 partly received = still to process).
export function useReceptionsArea() {
  return useQuery({
    queryKey: ['warehouses', 'receptionsArea'],
    queryFn: async (): Promise<ReceptionsAreaData> => {
      const [draft, validated, orders] = await Promise.all([
        fetchReceptionsFapi({ status: 0 }),
        fapiGet<any>('/reception/fapi/list.php', { status: 1, limit: 3, sort: 'date', direction: 'desc' }).then((d) => ((d.items ?? []) as any[]).map(receptionRowFromApi)),
        fapiGet<any>('/fourn/commande/fapi/list.php', { status: '3,4', limit: 100 }),
      ])
      const link = (r: ReceptionListRow): ReceptionLinkRow => ({ ref: r.ref, id: r.id, customerName: r.thirdPartyName, socid: r.socid, poRef: r.poRef, poId: r.poId })
      return {
        receptionsToValidate: draft.map(link),
        latestReceptions: validated.map(link),
        purchaseOrdersToProcess: ((orders.items ?? []) as any[]).map((o) => ({ ref: o.ref ?? '', id: Number(o.id), customerName: o.supplier?.name ?? '', socid: o.supplier?.id != null ? Number(o.supplier.id) : null })),
      }
    },
    staleTime: 1000 * 30,
  })
}
