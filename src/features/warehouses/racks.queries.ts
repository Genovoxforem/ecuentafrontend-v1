/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fetchAllPages } from '../../api/fapiRow'

// custom/racks/fapi/racks.php (racks, shelves and their create / update / delete) and custom/racks/fapi/assignments.php
// (the product placements on shelves: assign / update / move / remove / clear), 16 Oct 2026. They replace the classic
// racksindex.php / product_rack_assign.php / save_ajax.php pages, whose forms had real bugs (a Close option wired to 1,
// a rack-to-shelf cascade that always came back empty, an INSERT into a column that does not exist). A placement is a
// location record only: it neither moves nor reserves stock.
const RACKS = '/custom/racks/fapi/racks.php'
const ASSIGN = '/custom/racks/fapi/assignments.php'

// ── Racks ──────────────────────────────────────────────────────────────────
export interface RackRow {
  id: number
  label: string
  ref: string
  warehouseName: string
  active: boolean
}

async function fetchRacks(extra: Record<string, unknown> = {}): Promise<any[]> {
  return fetchAllPages((page) => fapiGet<any>(RACKS, { page, limit: 100, ...extra }))
}

export function useRacksReal() {
  return useQuery({
    queryKey: ['warehouses', 'racks'],
    queryFn: async (): Promise<RackRow[]> => (await fetchRacks()).map((r): RackRow => ({ id: Number(r.id), label: r.name ?? '', ref: r.short_name ?? '', warehouseName: r.warehouse?.ref ?? '', active: Boolean(r.active) })),
    staleTime: 1000 * 30,
  })
}

export interface RackFormInput {
  label: string
  ref: string
  warehouseId: string
  active: boolean
}

export function useCreateRackReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RackFormInput) => {
      await fapiPost(RACKS, { name: input.label, short_name: input.ref, warehouse_id: Number(input.warehouseId), status: input.active ? 1 : 0 }, { action: 'create_rack' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'racks'] }),
  })
}

export function useUpdateRackReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: RackFormInput & { id: number }) => {
      await fapiPost(RACKS, { id, name: input.label, short_name: input.ref, warehouse_id: Number(input.warehouseId), status: input.active ? 1 : 0 }, { action: 'update_rack' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'racks'] }),
  })
}

// ── Shelves ────────────────────────────────────────────────────────────────
export interface ShelfRow {
  id: number
  rackName: string
  ref: string
  capacity: number
}

export function useShelvesReal() {
  return useQuery({
    queryKey: ['warehouses', 'shelves'],
    queryFn: async (): Promise<ShelfRow[]> =>
      (await fetchRacks()).flatMap((r) => ((r.shelves ?? []) as any[]).map((sh): ShelfRow => ({ id: Number(sh.id), rackName: r.name ?? '', ref: sh.ref ?? '', capacity: Number(sh.capacity) || 0 }))),
    staleTime: 1000 * 30,
  })
}

export interface ShelfFormInput {
  rackId: string
  ref: string
  capacity: number
}

export function useCreateShelfReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ShelfFormInput) => {
      await fapiPost(RACKS, { rack_id: Number(input.rackId), ref: input.ref, capacity: input.capacity }, { action: 'create_shelf' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'shelves'] }),
  })
}

export function useUpdateShelfReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ shelId, ...input }: ShelfFormInput & { shelId: number }) => {
      await fapiPost(RACKS, { shelf_id: shelId, rack_id: Number(input.rackId), ref: input.ref, capacity: input.capacity }, { action: 'update_shelf' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'shelves'] }),
  })
}

// ── Rack List report ───────────────────────────────────────────────────────
export interface RackListReportRow {
  rackName: string
  warehouseName: string
  shelfRef: string
  lot: string
  productName: string
  qty: number
}

export interface RackListFilters {
  warehouseId?: string
  rackId?: string
  shelfId?: string
  lot?: string
  productId?: string
}

function assignmentParams(f: { warehouseId?: string; rackId?: string; shelfId?: string; lot?: string; productId?: string }) {
  return { warehouse: f.warehouseId || undefined, rack: f.rackId || undefined, shelf: f.shelfId || undefined, lot: f.lot || undefined, product: f.productId || undefined }
}

async function fetchAssignments(f: Parameters<typeof assignmentParams>[0]): Promise<any[]> {
  return fetchAllPages((page) => fapiGet<any>(ASSIGN, { page, limit: 100, ...assignmentParams(f) }))
}

export function useRackListReport(filters: RackListFilters) {
  return useQuery({
    queryKey: ['warehouses', 'rackListReport', filters],
    queryFn: async (): Promise<RackListReportRow[]> =>
      (await fetchAssignments(filters)).map(
        (a): RackListReportRow => ({
          rackName: a.rack?.name ?? '',
          warehouseName: a.warehouse?.ref ?? '',
          shelfRef: a.shelf?.ref ?? '',
          lot: a.lot ?? '',
          productName: [a.product?.ref, a.product?.label].filter(Boolean).join(' - '),
          qty: Number(a.qty) || 0,
        }),
      ),
    staleTime: 1000 * 30,
  })
}

// Distinct lot values for the report's Lot filter, from the placements already read.
export function useDistinctLots(rows: RackListReportRow[] | undefined) {
  const lots = new Set((rows ?? []).map((r) => r.lot).filter(Boolean))
  return Array.from(lots)
}

// ── Product placements ─────────────────────────────────────────────────────
export interface ProductAssignmentRow {
  productId: number
  productRef: string
  productName: string
  assignId: number | null
  hasAssignment: boolean
  warehouseName: string
  rackName: string
  shelfRef: string
  lot: string | null
  lotCount: number
  qty: number | null
  capDisplay: string
  capColor: string
}

export interface ProductAssignFilters {
  productId?: string
  warehouseId?: string
  rackId?: string
  shelfId?: string
  lot?: string
}

// "used / capacity" of the shelf and a traffic-light colour for how full it is.
function capacityCell(used: number, capacity: number) {
  if (!capacity) return { text: `${used}`, color: '#999' }
  const pct = (used / capacity) * 100
  return { text: `${used} / ${capacity}`, color: pct > 100 ? '#dc3545' : pct >= 80 ? '#f59e0b' : '#198754' }
}

export function useProductAssignments(filters: ProductAssignFilters) {
  return useQuery({
    queryKey: ['warehouses', 'productAssignments', filters],
    queryFn: async (): Promise<ProductAssignmentRow[]> => {
      const items = await fetchAssignments(filters)
      const usedByShelf = new Map<number, number>()
      for (const a of items) usedByShelf.set(Number(a.shelf?.id), (usedByShelf.get(Number(a.shelf?.id)) ?? 0) + (Number(a.qty) || 0))
      return items.map((a): ProductAssignmentRow => {
        const cap = capacityCell(usedByShelf.get(Number(a.shelf?.id)) ?? 0, Number(a.shelf?.capacity) || 0)
        return {
          productId: Number(a.product?.id) || 0,
          productRef: a.product?.ref ?? '',
          productName: a.product?.label ?? '',
          assignId: Number(a.id) || null,
          hasAssignment: true,
          warehouseName: a.warehouse?.ref ?? '',
          rackName: a.rack?.name ?? '',
          shelfRef: a.shelf?.ref ?? '',
          lot: a.lot || null,
          lotCount: a.lot ? 1 : 0,
          qty: Number(a.qty) || 0,
          capDisplay: cap.text,
          capColor: cap.color,
        }
      })
    },
    staleTime: 1000 * 30,
  })
}

// Cascading choices for the assignment form: the racks of a warehouse and the shelves of a rack.
export function useRacksByWarehouse(warehouseId: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'racksByWarehouse', warehouseId],
    queryFn: async (): Promise<{ value: string; label: string }[]> => (await fetchRacks({ warehouse: warehouseId })).map((r) => ({ value: String(r.id), label: r.name ?? '' })),
    enabled: !!warehouseId,
  })
}

export function useShelvesByRack(rackId: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'shelvesByRack', rackId],
    queryFn: async (): Promise<{ value: string; label: string }[]> => {
      const d = await fapiGet<any>(RACKS, { id: rackId })
      return ((d.rack?.shelves ?? []) as any[]).map((s) => ({ value: String(s.id), label: s.ref ?? '' }))
    },
    enabled: !!rackId,
  })
}

// One placement with the ids the edit form needs (the endpoint has no get-by-id, so it is found in the list).
export interface AssignmentDetail {
  id: number
  productId: number
  warehouseId: number
  rackId: number
  shelfId: number
  qty: number
  lot: string | null
}
export async function fetchAssignmentDetail(assignId: number): Promise<AssignmentDetail> {
  const a = (await fetchAssignments({})).find((x) => Number(x.id) === assignId)
  if (!a) throw new Error('Could not load this assignment.')
  return { id: Number(a.id), productId: Number(a.product?.id), warehouseId: Number(a.warehouse?.id), rackId: Number(a.rack?.id), shelfId: Number(a.shelf?.id), qty: Number(a.qty), lot: a.lot ?? null }
}

export interface AssignProductInput {
  warehouseId: string
  rackId: string
  shelfId: string
  productId: string
  qty: number
  lot?: string
}

// POST ?action=assign {shelf_id, mode:'add'|'replace', rows:[{product_id, qty, lot}]}: tops up an existing placement
// of the same product and lot, refuses a fractional quantity (the column is an integer) and a quantity that would put
// more on the shelf than its capacity (409).
export function useAssignProductReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssignProductInput) => {
      await fapiPost(ASSIGN, { shelf_id: Number(input.shelfId), mode: 'add', rows: [{ product_id: Number(input.productId), qty: input.qty, lot: input.lot ?? '' }] }, { action: 'assign' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'productAssignments'] }),
  })
}

export interface UpdateAssignmentInput {
  assignId: number
  warehouseId: string
  rackId: string
  shelfId: string
  productId: string
  qty: number
  lot?: string
}

// ?action=update {id, qty, lot} changes the quantity or lot; ?action=move {id, shelf_id} moves it to another shelf.
export function useUpdateAssignmentReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateAssignmentInput) => {
      const before = await fetchAssignmentDetail(input.assignId)
      await fapiPost(ASSIGN, { id: input.assignId, qty: input.qty, lot: input.lot ?? '' }, { action: 'update' })
      if (Number(input.shelfId) && Number(input.shelfId) !== before.shelfId) await fapiPost(ASSIGN, { id: input.assignId, shelf_id: Number(input.shelfId) }, { action: 'move' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'productAssignments'] }),
  })
}

export function useDeleteAssignmentReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assignId: number) => {
      await fapiPost(ASSIGN, { id: assignId }, { action: 'remove' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'productAssignments'] }),
  })
}
