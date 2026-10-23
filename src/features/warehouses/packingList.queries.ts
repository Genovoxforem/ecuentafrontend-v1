import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fetchAllPages, pickNum, pickNumOrNull, pickStr, usDate } from '../../api/fapiRow'

const PACKING = '/expedition/fapi/packing.php'

/* eslint-disable @typescript-eslint/no-explicit-any */
// expedition/fapi/packing.php (16 Oct 2026): the packing records (llx_packing) with their shipment, the packers
// (the comma-separated pack_employ column read back as an array) and the delivery status; writes are
// ?action=set_delivery_status {packing_id, delivery_status} and ?action=delete {packing_id} (a bare id is refused with
// 422 "packing_id is required"). The classic delivery/card.php
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
  packers: Packer[]
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
          packers: ((r.packers ?? []) as any[]).map(packerFrom),
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
      await fapiPost(PACKING, { packing_id: packId, delivery_status: deliveryStatus }, { action: 'set_delivery_status' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] }),
  })
}

export function useDeletePacking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (packId: number) => {
      await fapiPost(PACKING, { packing_id: packId }, { action: 'delete' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] }),
  })
}

export interface Packer {
  id: number
  label: string
}

const packerFrom = (p: any): Packer => ({ id: pickNum(p, 'id', 'user_id'), label: pickStr(p, 'name', 'fullname', 'login') || `#${pickNum(p, 'id', 'user_id')}` })

export interface PackingDetail {
  packers: Packer[]
  lines: { ref: string; label: string; qty: number }[]
}

// GET ?shipment=&detail=1 is the printable packing list: the shipment's lines and who packs it. Fields are read under
// the likely spellings, since no packing record exists on newecuenta to capture a real answer from.
export function usePackingDetail(shipmentId: number | null) {
  return useQuery({
    queryKey: ['warehouses', 'packingList', 'detail', shipmentId],
    enabled: shipmentId !== null,
    retry: false,
    queryFn: async (): Promise<PackingDetail> => {
      const d = await fapiGet<any>(PACKING, { shipment: shipmentId!, detail: 1 })
      const rec = d.items?.[0] ?? d.packing ?? d
      const lines: any[] = d.lines ?? rec.lines ?? d.items_list ?? []
      return {
        packers: ((rec.packers ?? d.packers ?? []) as any[]).map(packerFrom),
        lines: lines.map((l) => ({ ref: pickStr(l, 'product.ref', 'product_ref', 'ref'), label: pickStr(l, 'product.label', 'product_label', 'label', 'description'), qty: pickNum(l, 'qty', 'quantity') })),
      }
    },
  })
}

// POST ?action=create {shipment}: opens the packing record of a shipment. A shipment that already has one is refused.
export function useCreatePacking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (shipmentId: number) => {
      await fapiPost(PACKING, { shipment: shipmentId }, { action: 'create' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] }),
  })
}

// POST ?action=assign_packer | remove_packer {packing_id, user_id}. pack_employ is one varchar(500) of user ids, so the server
// refuses a duplicate and refuses to overflow the column (409) rather than truncating.
export function usePackerAssignment() {
  const queryClient = useQueryClient()
  const done = () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'packingList'] })
  const assign = useMutation({
    mutationFn: async ({ packId, userId }: { packId: number; userId: number }) => {
      await fapiPost(PACKING, { packing_id: packId, user_id: userId }, { action: 'assign_packer' })
    },
    onSuccess: done,
  })
  const remove = useMutation({
    mutationFn: async ({ packId, userId }: { packId: number; userId: number }) => {
      await fapiPost(PACKING, { packing_id: packId, user_id: userId }, { action: 'remove_packer' })
    },
    onSuccess: done,
  })
  return { assign, remove }
}

// core/fapi/users.php: the people who can be assigned as packers.
export function usePackerCandidates() {
  return useQuery({
    queryKey: ['warehouses', 'packingList', 'users'],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<Packer[]> => {
      const d = await fapiGet<{ items?: any[] }>('/core/fapi/users.php', { limit: 500 })
      return (d.items ?? []).map((u) => ({ id: pickNum(u, 'id'), label: [pickStr(u, 'firstname'), pickStr(u, 'lastname')].filter(Boolean).join(' ') || pickStr(u, 'login') }))
    },
  })
}
