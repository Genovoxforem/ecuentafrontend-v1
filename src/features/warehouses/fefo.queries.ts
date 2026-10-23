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
  // The other rights default to allowed when the endpoint does not report them; a refused write answers 403 either way.
  canWrite: boolean
  canApprove: boolean
  canReverse: boolean
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
        canWrite: first.rights?.can_write !== false && first.rights?.can_write !== 0,
        canApprove: first.rights?.can_approve !== false && first.rights?.can_approve !== 0,
        canReverse: first.rights?.can_reverse !== false && first.rights?.can_reverse !== 0,
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

export interface FefoRequest {
  id: string
  qty: number
  reason: string
  warehouse: string
  requestedBy: string
  requestedAt: string
  status: string
}

export interface FefoHistoryEntry {
  index: number
  qty: number
  reason: string
  warehouse: string
  by: string
  at: string
  reversed: boolean
}

export interface FefoLotDetail {
  quarantined: boolean
  quarantineReason: string
  requests: FefoRequest[]
  history: FefoHistoryEntry[]
}

const text = (v: unknown) => (v === undefined || v === null ? '' : String(v))

// GET ?action=lot&lot_id= adds the lot's full write-off history to a row. The state is one JSON document on the lot
// (requests awaiting approval, executed write-offs, the quarantine hold), read here under the spellings the
// endpoint and the legacy page use, since newecuenta holds no lots to capture a real answer from.
export function useFefoLotDetail(lotId: number | null) {
  return useQuery({
    queryKey: ['warehouses', 'fefo', 'lot', lotId],
    enabled: lotId !== null,
    queryFn: async (): Promise<FefoLotDetail> => {
      const d = await fapiGet<any>(FEFO, { action: 'lot', lot_id: lotId! })
      const state = d.writeoff ?? d.state ?? d
      const requests: any[] = state.requests ?? state.pending_requests ?? d.requests ?? []
      const history: any[] = state.history ?? state.writeoffs ?? d.history ?? []
      const quarantine = state.quarantine ?? d.quarantine ?? null
      // Requests and history name a warehouse by id; the lot's stock rows carry the names.
      const names = new Map<number, string>(((d.stock ?? []) as any[]).map((w) => [Number(w.warehouse_id), String(w.warehouse ?? '')]))
      const wh = (r: any) => pickStr(r, 'warehouse.ref', 'warehouse_ref', 'warehouse') || names.get(Number(r.warehouse_id ?? r.wh_id)) || ''
      return {
        quarantined: Boolean(quarantine?.active ?? quarantine?.held ?? (quarantine && !quarantine.released_at && Object.keys(quarantine).length > 0)) || Boolean(d.quarantined),
        quarantineReason: text(quarantine?.reason ?? quarantine?.quarantine_reason),
        requests: requests
          .map((r) => ({
            id: text(r.id ?? r.request_id),
            qty: pickNum(r, 'qty', 'quantity'),
            reason: text(r.reason),
            warehouse: wh(r),
            requestedBy: pickStr(r, 'requested_by_login', 'requested_by_name', 'by', 'user'),
            requestedAt: text(r.requested_at ?? r.date ?? r.created_at),
            status: text(r.status ?? 'pending'),
          }))
          .filter((r) => r.status === '' || r.status.toLowerCase() === 'pending'),
        history: history.map((h, i) => ({
          index: pickNumOrNull(h, 'history_index', 'index', 'history_idx', 'idx') ?? i,
          qty: pickNum(h, 'qty', 'quantity'),
          reason: text(h.reason ?? h.note),
          warehouse: wh(h),
          by: pickStr(h, 'user_login', 'by_name', 'by', 'user', 'executed_by'),
          at: text(h.at ?? h.date ?? h.created_at),
          reversed: Boolean(h.reversed ?? h.reversed_at),
        })),
      }
    },
    staleTime: 1000 * 15,
  })
}

type LotAction =
  | { action: 'request_writeoff'; lotId: number; warehouseId: number; qty: number; reason: string }
  | { action: 'approve_writeoff'; lotId: number; requestId: string }
  | { action: 'reject_writeoff'; lotId: number; requestId: string; note: string }
  | { action: 'reverse_writeoff'; lotId: number; historyIndex: number; note: string }
  | { action: 'set_quarantine'; lotId: number; reason: string }
  | { action: 'release_quarantine'; lotId: number; note: string }
  | { action: 'update_dates'; lotId: number; eatby: string; sellby: string; allowPast: boolean }

function body(a: LotAction): Record<string, unknown> {
  switch (a.action) {
    case 'request_writeoff':
      return { lot_id: a.lotId, warehouse_id: a.warehouseId, qty: a.qty, reason: a.reason }
    case 'approve_writeoff':
      return { lot_id: a.lotId, request_id: a.requestId }
    case 'reject_writeoff':
      return { lot_id: a.lotId, request_id: a.requestId, review_note: a.note }
    case 'reverse_writeoff':
      return { lot_id: a.lotId, history_idx: a.historyIndex, reversal_note: a.note }
    case 'set_quarantine':
      return { lot_id: a.lotId, quarantine_reason: a.reason }
    case 'release_quarantine':
      return { lot_id: a.lotId, release_note: a.note }
    case 'update_dates':
      // A date left out is cleared by the endpoint, as on the classic form, so both are always sent.
      return { lot_id: a.lotId, eatby: a.eatby, sellby: a.sellby, allow_past: a.allowPast || undefined }
  }
}

// One mutation for the approval workflow, the quarantine hold and the date correction: each is a POST to fefo.php
// with its action, and each can move stock or change a lot's status, so the list and the lot panel both refresh.
export function useFefoLotAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (a: LotAction) => fapiPost<any>(FEFO, body(a), { action: a.action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'fefo'] }),
  })
}
