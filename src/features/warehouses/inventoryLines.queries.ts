/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { InventoryLineStatus, InventoryLinesPage } from './inventoryLines'

// product/stock/fapi/inventory.php: GET ?id= gives the lines (expected and counted quantity, `counted` false for a
// line nobody counted yet) and the allowed actions; POST ?action=set_line {id, line_id, qty_view} saves one count
// (null marks it uncounted again), ?action=record {id, confirm:true} writes the stock corrections (a dry run
// without confirm) and ?action=cancel cancels. The endpoint has no action to add or delete a line (a validated
// inventory is frozen with the stock it found), so those two are reported to the backend team as missing.
const INV = '/product/stock/fapi/inventory.php'

function invalidateLines(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryLines', id] })
  queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryDetail', id] })
  queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryList'] })
}

const STATUS: Record<number, InventoryLineStatus> = { 0: 'draft', 1: 'validated', 2: 'closed', 9: 'closed' }

export function useInventoryLinesPage(id: string | undefined, page: number) {
  return useQuery<InventoryLinesPage>({
    queryKey: ['warehouses', 'inventoryLines', id, page],
    queryFn: async () => {
      const d = await fapiGet<any>(INV, { id })
      const status = STATUS[Number(d.inventory?.status)] ?? 'closed'
      const allowed = new Map<string, boolean>(((d.available_actions ?? []) as any[]).map((a) => [a.action, Boolean(a.allowed)]))
      return {
        token: '',
        status,
        canUpdateStock: Boolean(allowed.get('set_line')),
        warehouseOptions: [],
        productOptions: [],
        lines: ((d.lines ?? []) as any[]).map((l) => ({
          lineId: Number(l.line_id),
          warehouseId: l.warehouse_id ? Number(l.warehouse_id) : null,
          warehouseRef: l.warehouse_ref ?? '',
          productId: l.product_id ? Number(l.product_id) : null,
          productRef: l.product_ref ?? '',
          productLabel: l.product_label ?? '',
          expectedQty: Number(l.qty_expected) || 0,
          stockQtySnapshot: String(l.qty_expected ?? ''),
          realQty: l.qty_counted === null || l.qty_counted === undefined ? '' : String(l.qty_counted),
        })),
        page: 0,
        hasNextPage: false,
      }
    },
    enabled: !!id,
  })
}

export interface AddInventoryLineInput {
  id: string
  fkWarehouse: string
  fkProduct: string
  qty: string
}

// No API action exists for this yet (see the header); the form reports that instead of pretending.
export function useAddInventoryLineReal() {
  return useMutation({
    mutationFn: async (_input: AddInventoryLineInput) => {
      throw new Error('Adding a line to a count needs an inventory API action that does not exist yet.')
    },
  })
}

export interface SaveInventoryLinesInput {
  id: string
  page: number
  lines: { lineId: number; realQty: string; stockQtySnapshot: string }[]
}

// Saves each count that changed: an empty box marks the line uncounted, a number is the counted quantity.
export function useUpdateInventoryLinesReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveInventoryLinesInput) => {
      const current = await fapiGet<any>(INV, { id: input.id })
      const before = new Map<number, string>(((current.lines ?? []) as any[]).map((l) => [Number(l.line_id), l.qty_counted === null || l.qty_counted === undefined ? '' : String(l.qty_counted)]))
      for (const line of input.lines) {
        if ((before.get(line.lineId) ?? '') === line.realQty) continue
        await fapiPost(INV, { id: Number(input.id), line_id: line.lineId, qty_view: line.realQty === '' ? null : Number(line.realQty) }, { action: 'set_line' })
      }
    },
    onSuccess: (_data, input) => invalidateLines(queryClient, input.id),
  })
}

// No API action exists for this yet (see the header).
export function useDeleteInventoryLineReal() {
  return useMutation({
    mutationFn: async (_input: { id: string; page: number; lineId: number }) => {
      throw new Error('Removing a line from a count needs an inventory API action that does not exist yet.')
    },
  })
}

// "Make movements and close": posts the corrections for every counted line that differs from the expected stock.
// A line left uncounted is untouched; one counted as zero removes the stock.
export function useCloseInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; page: number }) => {
      await fapiPost(INV, { id: Number(input.id), confirm: true }, { action: 'record' })
    },
    onSuccess: (_data, input) => invalidateLines(queryClient, input.id),
  })
}

export function useCancelInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fapiPost(INV, { id: Number(id) }, { action: 'cancel' })
    },
    onSuccess: (_data, id) => invalidateLines(queryClient, id),
  })
}
