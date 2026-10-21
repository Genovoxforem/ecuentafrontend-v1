/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fetchAllPages, isoDate, pickNum, pickNumOrNull, pickStr } from '../../api/fapiRow'

const FEFO = '/product/stock/fapi/fefo.php'

export type FefoStatus = 'Expired' | 'Expiring Soon' | 'No Date' | 'OK'

export interface FefoLotRow {
  key: string
  productId: number | null
  ref: string
  label: string
  lotId: number | null
  lotSerial: string
  warehouseId: number | null
  warehouse: string
  qty: number
  eatByDate: string
  sellByDate: string
  daysLeft: number | null
  status: FefoStatus
}

export interface FefoData {
  rows: FefoLotRow[]
  warehouses: string[]
  counters: { expiredLots: number; expiredQty: number; expiringLots: number; expiringQty: number; noExpiryLots: number }
  canWriteOff: boolean
}

const STATUS: Record<string, FefoStatus> = { expired: 'Expired', expiring: 'Expiring Soon', ok: 'OK', no_date: 'No Date' }

// GET product/stock/fapi/fefo.php?warn_days=: one row per lot per warehouse in expiry order (earliest first, no
// date last), the status worked out by the server (expired / expiring / ok / no_date) and counters over everything
// in stock that do not move with the status filter. The write-off history, approval and quarantine hold live in one
// JSON column on llx_product_lot, which the endpoint adds on first write. Row fields are read defensively: newecuenta
// holds no lots in stock yet.
export function useFefoLots(warnDays: number) {
  return useQuery({
    queryKey: ['warehouses', 'fefo', warnDays],
    queryFn: async (): Promise<FefoData> => {
      const first = await fapiGet<any>(FEFO, { warn_days: warnDays, page: 1, limit: 100 })
      const rest = first.pagination?.pages > 1 ? await fetchAllPages((page) => fapiGet<any>(FEFO, { warn_days: warnDays, page, limit: 100 })) : (first.items ?? [])
      const rows = (rest as any[]).map((r, i): FefoLotRow => {
        const status = STATUS[pickStr(r, 'status', 'expiry_status')] ?? 'No Date'
        return {
          key: `${pickStr(r, 'lot_id', 'id')}-${pickStr(r, 'warehouse.id', 'warehouse_id')}-${i}`,
          productId: pickNumOrNull(r, 'product.id', 'product_id'),
          ref: pickStr(r, 'product.ref', 'product_ref', 'ref'),
          label: pickStr(r, 'product.label', 'product_label', 'label'),
          lotId: pickNumOrNull(r, 'lot_id', 'id'),
          lotSerial: pickStr(r, 'batch', 'lot', 'lot_serial'),
          warehouseId: pickNumOrNull(r, 'warehouse.id', 'warehouse_id'),
          warehouse: pickStr(r, 'warehouse.ref', 'warehouse_ref', 'warehouse'),
          qty: pickNum(r, 'qty', 'stock_physique', 'quantity'),
          eatByDate: isoDate(r.eatby ?? r.eat_by),
          sellByDate: isoDate(r.sellby ?? r.sell_by),
          daysLeft: pickNumOrNull(r, 'days_left', 'days_to_expiry'),
          status,
        }
      })
      const c = first.counters ?? {}
      return {
        rows,
        warehouses: ((first.warehouses ?? []) as any[]).map((w) => String(w.ref ?? w.label ?? '')).filter(Boolean),
        counters: { expiredLots: Number(c.expired_lots) || 0, expiredQty: Number(c.expired_qty) || 0, expiringLots: Number(c.expiring_lots) || 0, expiringQty: Number(c.expiring_qty) || 0, noExpiryLots: Number(c.no_expiry_lots) || 0 },
        canWriteOff: Boolean(first.rights?.can_writeoff),
      }
    },
    staleTime: 1000 * 30,
  })
}

// POST ?action=writeoff removes stock of a lot as a recorded write-off (a stock movement the endpoint labels with the
// movement type it used); the quantity is refused above what the lot holds in that warehouse.
export function useWriteOffLot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { lotId: number; warehouseId: number; qty: number; reason: string }) =>
      fapiPost<any>(FEFO, { lot_id: input.lotId, warehouse_id: input.warehouseId, qty: input.qty, reason: input.reason }, { action: 'writeoff' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'fefo'] }),
  })
}
