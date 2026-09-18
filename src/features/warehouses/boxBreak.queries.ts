import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// product/stock/uom/box_break_api.php — a real, complete 15-route REST API
// (found by grepping product/stock/ for json_encode; the page's own earlier
// comment wrongly claimed no such endpoint existed). Every route below is
// live-verified against the dev backend. Envelope is always {ok, data} or
// {ok:false, error}.

const BASE = '/product/stock/uom/box_break_api.php'

async function boxBreakGet<T>(route: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams({ route })
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v))
    }
  }
  const res = await fetch(`${BASE}?${qs.toString()}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  let json: { ok: boolean; data?: T; error?: string }
  try {
    json = await res.json()
  } catch {
    throw new Error(NOT_SIGNED_IN_MESSAGE)
  }
  if (!json.ok) throw new Error(json.error || 'Box Break request failed.')
  return json.data as T
}

async function boxBreakPost<T>(route: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}?route=${route}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let json: { ok: boolean; data?: T; error?: string }
  try {
    json = await res.json()
  } catch {
    throw new Error(NOT_SIGNED_IN_MESSAGE)
  }
  if (!json.ok) throw new Error(json.error || 'Box Break request failed.')
  return json.data as T
}

export interface BoxBreakProduct {
  id: number
  ref: string
  label: string
  uom_count: number
}
export function useBoxBreakProducts(search = '') {
  return useQuery({
    queryKey: ['boxBreak', 'products', search],
    queryFn: () => boxBreakGet<BoxBreakProduct[]>('products', { search }),
    staleTime: 1000 * 30,
  })
}

export interface BoxBreakWarehouse {
  id: number
  ref: string
  description: string
}
export function useBoxBreakWarehouses() {
  return useQuery({
    queryKey: ['boxBreak', 'warehouses'],
    queryFn: () => boxBreakGet<BoxBreakWarehouse[]>('warehouses'),
    staleTime: 1000 * 60,
  })
}

export interface BoxBreakUom {
  label: string
  full_label: string
  unit_label: string
  code: string
  qty: number
  is_base: number
  price: number | null
}
export function useBoxBreakUoms(fkProduct: number | undefined) {
  return useQuery({
    queryKey: ['boxBreak', 'uoms', fkProduct],
    queryFn: () => boxBreakGet<BoxBreakUom[]>('uoms', { fk_product: fkProduct }),
    enabled: !!fkProduct,
  })
}

export interface BoxBreakStock {
  reel: number
  packs: number
  qty_in_base: number
  uom: string
  display: string
}
export function useBoxBreakStock(fkProduct: number | undefined, fkEntrepot: number | undefined, uomFrom: string) {
  return useQuery({
    queryKey: ['boxBreak', 'stock', fkProduct, fkEntrepot, uomFrom],
    queryFn: () => boxBreakGet<BoxBreakStock>('stock', { fk_product: fkProduct, fk_entrepot: fkEntrepot, uom_from: uomFrom }),
    enabled: !!fkProduct && !!fkEntrepot,
  })
}

export interface BoxBreakLot {
  batch: string
  qty: number
  eatby: string | null
  sellby: string | null
  expiry_date: string | null
  days_left: number | null
  urgent: boolean
}
export function useBoxBreakLots(fkProduct: number | undefined, fkEntrepot: number | undefined) {
  return useQuery({
    queryKey: ['boxBreak', 'lots', fkProduct, fkEntrepot],
    queryFn: () => boxBreakGet<BoxBreakLot[]>('lots', { fk_product: fkProduct, fk_entrepot: fkEntrepot }),
    enabled: !!fkProduct && !!fkEntrepot,
  })
}

export interface BoxBreakHistoryRow {
  id: number
  ref: string
  date: string
  product_id: number
  product_ref: string
  product_label: string
  warehouse_id: number
  warehouse_ref: string
  uom_from: string
  qty_broken: number
  uom_to: string
  qty_produced: number
  lot_number: string | null
  lot_eatby: string | null
  lot_sellby: string | null
  qty_per: number
  cascade_steps: string | null
  note: string | null
  author: string | null
  reversed: boolean
  reversed_at: string | null
  reversed_by: string | null
}
export interface BoxBreakHistory {
  rows: BoxBreakHistoryRow[]
  total: number
  page: number
  limit: number
  pages: number
  kpi: { total_breaks: number; total_boxes: number; total_units: number }
}
export interface BoxBreakHistoryFilters {
  fkProduct?: number
  fkEntrepot?: number
  dateFrom?: string
  dateTo?: string
  page?: number
}
const HISTORY_KEY = 'boxBreak-history'
export function useBoxBreakHistory(filters: BoxBreakHistoryFilters) {
  return useQuery({
    queryKey: ['boxBreak', HISTORY_KEY, filters],
    queryFn: () =>
      boxBreakGet<BoxBreakHistory>('history', {
        fk_product: filters.fkProduct,
        fk_entrepot: filters.fkEntrepot,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        page: filters.page ?? 1,
        limit: 50,
      }),
  })
}

export interface BoxBreakTrendRow {
  day: string
  breaks: number
  qty_broken: number
  qty_produced: number
}
export function useBoxBreakTrend(days: number) {
  return useQuery({
    queryKey: ['boxBreak', 'trend', days],
    queryFn: () => boxBreakGet<{ days: number; rows: BoxBreakTrendRow[] }>('trend', { days }),
  })
}

export interface BoxBreakTemplate {
  id: number
  name: string
  fk_product: number
  product_ref: string | null
  product_label: string | null
  fk_entrepot: number
  warehouse_ref: string | null
  uom_from: string
  uom_to: string
  qty_per: number
  qty_break_default: number
  note_template: string | null
}
const TEMPLATES_KEY = ['boxBreak', 'templates'] as const
export function useBoxBreakTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => boxBreakGet<BoxBreakTemplate[]>('templates'),
  })
}

export interface BoxBreakPendingRow {
  id: number
  ref: string
  date: string
  product_ref: string
  product_label: string
  warehouse_ref: string
  uom_from: string
  qty_broken: number
  uom_to: string
  qty_produced: number
  lot_number: string | null
  note: string | null
  author: string | null
}
const PENDING_KEY = ['boxBreak', 'pending'] as const
export function useBoxBreakPending() {
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: () => boxBreakGet<{ pending: BoxBreakPendingRow[]; count: number }>('pending'),
    refetchInterval: 30000,
  })
}

export interface BoxBreakSuggestion {
  product_id: number
  product_ref: string
  product_label: string
  warehouse_id: number
  warehouse_ref: string
  current_stock: number
  min_stock: number
  deficit: number
  break_uom: string
  qty_in_base: number
  packs_available: number
  suggested_break: number
}
export function useBoxBreakSuggestions() {
  return useQuery({
    queryKey: ['boxBreak', 'suggestions'],
    queryFn: () => boxBreakGet<BoxBreakSuggestion[]>('suggestions'),
  })
}

export interface BoxBreakGrnPending {
  grn_id: number
  grn_no: string
  date: string
  product_id: number
  product_ref: string
  product_name: string
  qty_bags: number
  qty_per_bag: number
  break_uom: string
  qty_in_base: number
  warehouse_id: number
  warehouse_ref: string
}
export function useBoxBreakGrnPending() {
  return useQuery({
    queryKey: ['boxBreak', 'grn'],
    queryFn: () => boxBreakGet<BoxBreakGrnPending[]>('grn'),
  })
}

export interface DoBoxBreakInput {
  fk_product: number
  fk_entrepot: number
  uom_from: string
  uom_to: string
  qty_break: number
  qty_per: number
  note?: string
  lot_number?: string
  cascade?: boolean
}
export interface DoBoxBreakResult {
  id?: number
  ref: string
  approval_status?: string
  msg?: string
  qty_broken?: number
  uom_from?: string
  qty_produced?: number
  uom_to?: string
  lot_number?: string | null
  cascade_steps?: string | null
  labels_url?: string
}
function invalidateAfterBreak(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['boxBreak'] })
}
export function useDoBoxBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DoBoxBreakInput) => boxBreakPost<DoBoxBreakResult>('break', input),
    onSuccess: () => invalidateAfterBreak(queryClient),
  })
}

export function useReverseBoxBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { bb_id: number; reason: string }) => boxBreakPost<{ ref: string; reversed: boolean }>('reverse', input),
    onSuccess: () => invalidateAfterBreak(queryClient),
  })
}

export function useApproveBoxBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { bb_id: number }) => boxBreakPost<{ ref: string; approval_status: string }>('approve', input),
    onSuccess: () => invalidateAfterBreak(queryClient),
  })
}

export function useRejectBoxBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { bb_id: number; reason: string }) => boxBreakPost<{ ref: string; approval_status: string; reason: string }>('reject', input),
    onSuccess: () => invalidateAfterBreak(queryClient),
  })
}

export interface SaveBoxBreakTemplateInput {
  name: string
  fk_product: number
  fk_entrepot: number
  uom_from: string
  uom_to: string
  qty_per: number
  qty_break_default: number
  note_template?: string
}
export function useSaveBoxBreakTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveBoxBreakTemplateInput) => boxBreakPost<{ id: number; name: string }>('save_template', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  })
}

export function useDeleteBoxBreakTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => boxBreakPost<{ deleted: number }>('delete_template', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  })
}

export function boxBreakLabelsUrl(bbId: number) {
  return `${BASE}?route=labels&bb_id=${bbId}`
}
export function boxBreakExportUrl(filters: BoxBreakHistoryFilters) {
  const qs = new URLSearchParams({ route: 'export' })
  if (filters.fkProduct) qs.set('fk_product', String(filters.fkProduct))
  if (filters.fkEntrepot) qs.set('fk_entrepot', String(filters.fkEntrepot))
  if (filters.dateFrom) qs.set('date_from', filters.dateFrom)
  if (filters.dateTo) qs.set('date_to', filters.dateTo)
  return `${BASE}?${qs.toString()}`
}
