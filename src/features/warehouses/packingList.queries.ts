import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fetchAllPages, pickNum, pickNumOrNull, pickStr, usDate } from '../../api/fapiRow'

const PACKING = '/expedition/fapi/packing.php'

/* eslint-disable @typescript-eslint/no-explicit-any */
// expedition/fapi/packing.php (16 Oct 2026): the packing records (llx_packing) with their shipment, the packers
// (the comma-separated pack_employ column read back as an array) and the delivery status; writes are
// ?action=set_delivery_status {id, delivery_status} and ?action=delete {id}. The classic delivery/card.php
// pack_list page it replaces had an unescaped, unauthenticated pack_id in its SQL. Shapes are read defensively:
// newecuenta holds no shipments, so no packing row has been seen yet.
export const DELIVERY_STATUS_LABEL: Record<number, string> = {
  0: 'Delivery In Progress',
  1: 'Ready To Deliver',
  2: 'Delivered',
  3: 'Returned',
  4: 'Not Delivered',
}

export interface PackingRow {
  packId: number
  ref: string
  shipmentId: number | null
  orderStatus: string
  packingDate: string
  deliveryStatus: number
}

export function usePackingList() {
  return useQuery({
    queryKey: ['warehouses', 'packingList'],
    queryFn: async (): Promise<PackingRow[]> => {
      const items = await fetchAllPages((page) => fapiGet<any>(PACKING, { page, limit: 100 }))
      return items.map(
        (r): PackingRow => ({
          packId: pickNum(r, 'id', 'pack_id'),
          ref: pickStr(r, 'ref', 'shipment.ref', 'shipment_ref'),
          shipmentId: pickNumOrNull(r, 'shipment.id', 'shipment_id', 'fk_expedition'),
          orderStatus: pickStr(r, 'status_label', 'order_status', 'shipment.status_label'),
          packingDate: usDate(r.packed_date ?? r.date_packed ?? r.date_creation),
          deliveryStatus: pickNum(r, 'delivery_status', 'dele_status'),
        }),
      )
    },
    staleTime: 1000 * 30,
  })
}

export function useUpdatePackingDeliveryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ packId, deliveryStatus }: { packId: number; deliveryStatus: number }) => {
      await fapiPost(PACKING, { id: packId, delivery_status: deliveryStatus }, { action: 'set_delivery_status' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] }),
  })
}

export function useDeletePacking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (packId: number) => {
      await fapiPost(PACKING, { id: packId }, { action: 'delete' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] }),
  })
}
