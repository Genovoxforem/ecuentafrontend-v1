import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real reference module: custom/racks/ — a genuine custom Ecuenta module
// (custom/racks/racksindex.php + custom/racks/product_rack_assign.php +
// custom/racks/save_ajax.php), NOT a dead/unactivated Dolibarr feature as an
// earlier pass on this codebase wrongly assumed (see the old comments this
// file replaces on warehouseExtras.queries.ts's useRacks/useShelves/
// useRackAssignments — those were local-only browser state). Confirmed real
// by reading all three PHP files directly: llx_rack, llx_shelves and
// llx_shelvesdet are real tables with real classic-HTML (no JSON) CRUD.
//
// Several real backend quirks are deliberately NOT reproduced here:
// - racksindex.php's own "New Rack" status <select> has both options wired
//   to value="1" (a genuine source bug — Close can never actually be
//   submitted from that exact form). This rebuild sends 1/0 correctly since
//   it isn't reusing that broken markup, just the real INSERT/UPDATE it
//   posts to.
// - The `rack_list` view's own Rack→Shelf cascade AJAX
//   (save_ajax.php?action=rack) is broken server-side (iterates an
//   undefined variable — confirmed by reading the code — so it always
//   returns nothing). Every filter dropdown here is independently sourced
//   instead of chained.
// - product_rack_assign.php's Edit action loses its own validation error
//   message on failure (the failing branch redirects to the list, which
//   discards the just-set $error) — this rebuild can only detect that a
//   save failed (the final URL carries edit_id= instead of msg=updated),
//   not reproduce the specific message, since the real backend doesn't
//   send it anywhere either.
// - The "Lots" bulk multi-assignment popup (save_ajax.php
//   get_product_lots_with_assignments / save_lot_assignments) is real but
//   out of scope for this pass — its button is shown disabled with an
//   honest tooltip rather than either faked or silently dropped.
// - product_rack_assign.php's "+ Assign Product to Shelf" form has a real
//   f_expiry date input that is captured but never persisted by the `add`
//   handler (confirmed by reading it — not included in the INSERT at all),
//   so no expiry field is shown here at all rather than a field that
//   silently does nothing.
//
// None of these forms include a CSRF `token` field in the real source (this
// custom module doesn't call newToken() anywhere in racksindex.php or
// product_rack_assign.php, confirmed by reading both files in full) —
// unlike the core Dolibarr pages elsewhere in this app, no token is sent
// here because the real forms don't send one either.

function textOf(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function cellsOf(rowHtml: string): string[] {
  const cells: string[] = []
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g
  let m: RegExpExecArray | null
  while ((m = cellRe.exec(rowHtml))) cells.push(m[1])
  return cells
}

function rowsOf(html: string): string[] {
  const rows: string[] = []
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) rows.push(m[1])
  return rows
}

function optionsOf(html: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const optRe = /<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g
  let m: RegExpExecArray | null
  while ((m = optRe.exec(html))) {
    const label = m[2].trim()
    if (!m[1] || !label) continue
    options.push({ value: m[1], label })
  }
  return options
}

const BASE = '/custom/racks/racksindex.php'

// ── Racks list (racksindex.php?action=rack) ────────────────────────────────
export interface RackRow {
  id: number
  label: string
  ref: string
  warehouseName: string
  active: boolean
}

function parseRacks(html: string): RackRow[] {
  const rows: RackRow[] = []
  for (const rowHtml of rowsOf(html)) {
    const cells = cellsOf(rowHtml)
    if (cells.length < 6) continue
    const idMatch = cells[5].match(/[?&]id=(\d+)/)
    if (!idMatch) continue
    rows.push({
      id: Number(idMatch[1]),
      label: textOf(cells[1]),
      ref: textOf(cells[2]),
      warehouseName: textOf(cells[3]),
      active: textOf(cells[4]).toLowerCase() === 'active',
    })
  }
  return rows
}

export function useRacksReal() {
  return useQuery({
    queryKey: ['warehouses', 'racks'],
    queryFn: async (): Promise<RackRow[]> => {
      const res = await fetch(`${BASE}?action=rack`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseRacks(await res.text())
    },
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
      const body = new URLSearchParams({
        action: 'create',
        rack_name: input.label,
        short_name: input.ref,
        ware_house: input.warehouseId,
        rack_status: input.active ? '1' : '0',
      })
      const res = await fetch(BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'racks'] }),
  })
}

export function useUpdateRackReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: RackFormInput & { id: number }) => {
      const body = new URLSearchParams({
        action: 'update_rack',
        rack_name: input.label,
        short_name: input.ref,
        ware_house: input.warehouseId,
        rack_status: input.active ? '1' : '0',
      })
      const res = await fetch(`${BASE}?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'racks'] }),
  })
}

// ── Shelves list (racksindex.php?action=shelves_list) ──────────────────────
export interface ShelfRow {
  id: number
  rackName: string
  ref: string
  capacity: number
}

function parseShelves(html: string): ShelfRow[] {
  const rows: ShelfRow[] = []
  for (const rowHtml of rowsOf(html)) {
    const cells = cellsOf(rowHtml)
    if (cells.length < 5) continue
    const idMatch = cells[4].match(/[?&]shel_id=(\d+)/)
    if (!idMatch) continue
    rows.push({
      id: Number(idMatch[1]),
      rackName: textOf(cells[1]),
      ref: textOf(cells[2]),
      capacity: Number(textOf(cells[3])) || 0,
    })
  }
  return rows
}

export function useShelvesReal() {
  return useQuery({
    queryKey: ['warehouses', 'shelves'],
    queryFn: async (): Promise<ShelfRow[]> => {
      const res = await fetch(`${BASE}?action=shelves_list`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseShelves(await res.text())
    },
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
      const body = new URLSearchParams({ action: 'create_shelf', rack_id: input.rackId, shel_name: input.ref, capacity: String(input.capacity) })
      const res = await fetch(BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'shelves'] }),
  })
}

export function useUpdateShelfReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ shelId, ...input }: ShelfFormInput & { shelId: number }) => {
      const body = new URLSearchParams({ action: 'update_shelf', rack_id: input.rackId, shel_id: String(shelId), shel_name: input.ref, capacity: String(input.capacity) })
      const res = await fetch(BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'shelves'] }),
  })
}

// ── Rack List report (racksindex.php?action=rack_list) — read-only ─────────
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

function parseRackListReport(html: string): RackListReportRow[] {
  const rows: RackListReportRow[] = []
  for (const rowHtml of rowsOf(html)) {
    const cells = cellsOf(rowHtml)
    if (cells.length < 7) continue
    rows.push({
      rackName: textOf(cells[1]),
      warehouseName: textOf(cells[2]),
      shelfRef: textOf(cells[3]),
      lot: textOf(cells[4]),
      productName: textOf(cells[5]),
      qty: Number(textOf(cells[6])) || 0,
    })
  }
  return rows
}

export function useRackListReport(filters: RackListFilters) {
  return useQuery({
    queryKey: ['warehouses', 'rackListReport', filters],
    queryFn: async (): Promise<RackListReportRow[]> => {
      const params = new URLSearchParams({ action: 'rack_list' })
      if (filters.warehouseId) params.set('warehouse_name', filters.warehouseId)
      if (filters.rackId) params.set('rack_name', filters.rackId)
      if (filters.shelfId) params.set('shel_ref', filters.shelfId)
      if (filters.lot) params.set('lot_id', filters.lot)
      if (filters.productId) params.set('product_name', filters.productId)
      const res = await fetch(`${BASE}?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseRackListReport(await res.text())
    },
    staleTime: 1000 * 30,
  })
}

// Distinct lot values for the rack_list report's own Lot filter dropdown —
// sourced from the same real assignment rows already being fetched
// (llx_shelvesdet.lot), rather than reproducing the reference's own
// non-DISTINCT <option> query (confirmed to emit duplicate lot options).
export function useDistinctLots(rows: RackListReportRow[] | undefined) {
  const lots = new Set((rows ?? []).map((r) => r.lot).filter(Boolean))
  return Array.from(lots)
}

// ── Product Rack/Shelf Assignments (product_rack_assign.php?action=list) ───
const ASSIGN_BASE = '/custom/racks/product_rack_assign.php'

// Note: warehouseId/rackId/shelfId are deliberately not modeled here — the
// list row only ever echoes their names/refs (confirmed by reading the
// row-rendering code), never the underlying ids. Editing an assignment
// fetches those separately via fetchAssignmentDetail() below.
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

function parseProductAssignments(html: string): ProductAssignmentRow[] {
  const rows: ProductAssignmentRow[] = []
  const tableStart = html.indexOf('Shelf Cap.')
  const section = tableStart === -1 ? html : html.slice(tableStart)
  for (const rowHtml of rowsOf(section)) {
    const cells = cellsOf(rowHtml)
    if (cells.length < 10) continue

    const productText = textOf(cells[1])
    const dashSplit = productText.indexOf(' - ')
    const productRef = dashSplit === -1 ? productText : productText.slice(0, dashSplit)
    const productName = dashSplit === -1 ? '' : productText.slice(dashSplit + 3)

    const editMatch = cells[9].match(/action=edit&(?:amp;)?assign_id=(\d+)/)
    const hasAssignment = !!editMatch
    const assignId = editMatch ? Number(editMatch[1]) : null

    const lotBtnMatch = cells[5].match(/data-product-id="(\d+)"/)
    const lotCountMatch = cells[6].match(/>(\d+)</)

    const capColorMatch = cells[8].match(/color:([^;]+);/)

    rows.push({
      productId: lotBtnMatch ? Number(lotBtnMatch[1]) : 0,
      productRef,
      productName,
      assignId,
      hasAssignment,
      warehouseName: hasAssignment ? textOf(cells[2]) : '',
      rackName: hasAssignment ? textOf(cells[3]) : '',
      shelfRef: hasAssignment ? textOf(cells[4]) : '',
      lot: textOf(cells[5].replace(/<button[\s\S]*$/, '')) || null,
      lotCount: lotCountMatch ? Number(lotCountMatch[1]) : 0,
      qty: hasAssignment ? Number(textOf(cells[7])) || 0 : null,
      capDisplay: textOf(cells[8]),
      capColor: capColorMatch ? capColorMatch[1].trim() : '#999',
    })
  }
  return rows
}

export function useProductAssignments(filters: ProductAssignFilters) {
  return useQuery({
    queryKey: ['warehouses', 'productAssignments', filters],
    queryFn: async (): Promise<ProductAssignmentRow[]> => {
      const params = new URLSearchParams({ action: 'list' })
      if (filters.productId) params.set('f_product', filters.productId)
      if (filters.warehouseId) params.set('f_warehouse', filters.warehouseId)
      if (filters.rackId) params.set('f_rack', filters.rackId)
      if (filters.shelfId) params.set('f_shelf', filters.shelfId)
      if (filters.lot) params.set('f_lot', filters.lot)
      const res = await fetch(`${ASSIGN_BASE}?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseProductAssignments(await res.text())
    },
    staleTime: 1000 * 30,
  })
}

// Real cascading option AJAX (save_ajax.php) — both routes confirmed
// working server-side (unlike racksindex.php's own broken rack->shelf
// cascade on the rack_list screen).
export function useRacksByWarehouse(warehouseId: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'racksByWarehouse', warehouseId],
    queryFn: async (): Promise<{ value: string; label: string }[]> => {
      const body = new URLSearchParams({ action: 'get_racks_by_warehouse', warehouse: warehouseId ?? '' })
      const res = await fetch('/custom/racks/save_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return optionsOf(await res.text())
    },
    enabled: !!warehouseId,
  })
}

export function useShelvesByRack(rackId: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'shelvesByRack', rackId],
    queryFn: async (): Promise<{ value: string; label: string }[]> => {
      const body = new URLSearchParams({ action: 'get_shelves_by_rack', rack_id: rackId ?? '' })
      const res = await fetch('/custom/racks/save_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return optionsOf(await res.text())
    },
    enabled: !!rackId,
  })
}

// Real contract: POST action=get_assignment_data to product_rack_assign.php
// itself (a self-page AJAX action, not save_ajax.php) — the ONLY real source
// for an assignment's underlying warehouse/rack/shelf ids, since the list
// row markup only ever echoes their names/refs (confirmed by reading the
// row-rendering code directly). Used to pre-fill the Edit modal's cascading
// selects.
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
  const body = new URLSearchParams({ action: 'get_assignment_data', assign_id: String(assignId) })
  const res = await fetch(ASSIGN_BASE, { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = await res.json()
  if (!json.success || !json.assignment) throw new Error('Could not load this assignment.')
  const a = json.assignment
  return {
    id: Number(a.rowid),
    productId: Number(a.product_id),
    warehouseId: Number(a.warehouse_id),
    rackId: Number(a.rack_id),
    shelfId: Number(a.shelves_id),
    qty: Number(a.qty),
    lot: a.lot ?? null,
  }
}

export interface AssignProductInput {
  warehouseId: string
  rackId: string
  shelfId: string
  productId: string
  qty: number
  lot?: string
}

// Real contract (action=add): required fields + rack-belongs-to-warehouse +
// shelf-belongs-to-rack + duplicate check — no capacity check at all here
// (confirmed by reading the handler; unlike Edit, below).
export function useAssignProductReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssignProductInput) => {
      const body = new URLSearchParams({
        action: 'add',
        f_warehouse: input.warehouseId,
        f_rack: input.rackId,
        f_shelf: input.shelfId,
        f_product: input.productId,
        f_quantity: String(input.qty),
        f_lot: input.lot ?? '',
      })
      const res = await fetch(ASSIGN_BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = await res.text()
      if (!res.redirected && /alert-danger/.test(text)) {
        throw new Error(textOf(text.slice(text.indexOf('alert-danger'), text.indexOf('alert-danger') + 400)) || 'The legacy backend rejected this assignment.')
      }
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

// Real contract (action=update_assignment): same validations as add plus a
// real capacity check (excluding this assignment's own current qty). The
// real backend's own redirect-on-failure swallows the specific validation
// message (confirmed by reading the source) — this can only detect that it
// failed (final URL carries edit_id=, not msg=updated), not recover why.
export function useUpdateAssignmentReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateAssignmentInput) => {
      const body = new URLSearchParams({
        action: 'update_assignment',
        assign_id: String(input.assignId),
        warehouse_id: input.warehouseId,
        rack_id: input.rackId,
        shelves_id: input.shelfId,
        product_id: input.productId,
        prod_qty: String(input.qty),
        prod_lot: input.lot ?? '',
      })
      const res = await fetch(ASSIGN_BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      if (res.url.includes('edit_id=')) {
        throw new Error('The legacy backend rejected this update (invalid rack/shelf combination, duplicate assignment, or over shelf capacity) — it does not report which.')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'productAssignments'] }),
  })
}

// Real contract: DELETE FROM llx_shelvesdet WHERE rowid=assign_id via
// action=confirm_delete&confirm=yes. The reference app's own GET
// confirmation page is skipped here in favor of a client-side confirm()
// (same convention as this app's other single-step legacy deletes), since
// the data needed for that confirmation screen is already in the row we're
// deleting from.
export function useDeleteAssignmentReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assignId: number) => {
      const body = new URLSearchParams({ action: 'confirm_delete', confirm: 'yes', assign_id: String(assignId) })
      const res = await fetch(ASSIGN_BASE, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'productAssignments'] }),
  })
}
