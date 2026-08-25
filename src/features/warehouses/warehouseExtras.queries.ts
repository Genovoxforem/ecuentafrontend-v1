import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import {
  parseWarehouseListDocument,
  parseInventoryListDocument,
  parseLandedCostFormOptions,
  parseWarehouseCardDocument,
  parseInventoryCardDocument,
  parseMovementListApiResponse,
  parseWarehouseEventsDocument,
  looksLikeLegacyLoginPage,
  type WarehouseListRow,
  type InventoryListRow,
  type LandedCostFormOptions,
  type WarehouseCard,
  type InventoryCard,
  type WarehouseMovementsData,
  type WarehouseEventsData,
} from './warehouseHtmlParser'

// Warehouses and Inventories both turned out to have real backends after
// all — product/stock/list.php and product/inventory/list.php (found by
// checking those exact legacy pages live, the same "dead REST route, real
// legacy page" pattern already found for Customer create/Customer Groups/
// the Third Party wizard dropdowns elsewhere in this app). Create actions
// are real too: warehouses go through quicklinks_ajax.php?type=savewarehouse
// (a genuine INSERT INTO llx_entrepot, confirmed by reading that file
// directly — no CSRF token needed), inventories through
// product/inventory/card.php?action=add (needs the real token off the
// create page first, like societe/api/societes.php's mutations elsewhere).
// Both confirmed live: a real row appears in the real list page afterward.
//
// Landed Costs and Racks/Shelves/Rack Assignments below stay local-only —
// out of scope for this pass (only Warehouses/Inventories were checked),
// and Racks specifically has its own already-documented reason (module not
// enabled server-side).

export type { WarehouseListRow, InventoryListRow }

const WAREHOUSE_LIST_KEY = ['warehouses', 'realList'] as const

function useWarehouseListQuery() {
  return useQuery({
    queryKey: WAREHOUSE_LIST_KEY,
    queryFn: async (): Promise<WarehouseListRow[]> => {
      const doc = await fetchLegacyDocument('/product/stock/list.php')
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseWarehouseListDocument(doc)
    },
    staleTime: 1000 * 30,
  })
}

// Plain-array shape kept for the many existing warehouse-picker consumers
// (Stock Transfer/Correction/Movements, Racks, Box Break, Mass Transfer) —
// they only ever read .ref/.shortName, both of which the real row shape
// still has, so this is a drop-in swap from the old local-only stub.
export function useWarehouses(): WarehouseListRow[] {
  const { data } = useWarehouseListQuery()
  return data ?? []
}

export function useWarehouseList() {
  const { data, isLoading, isError, error, refetch } = useWarehouseListQuery()
  return { warehouses: data ?? [], isLoading, isError, error, refetch }
}

export interface NewWarehouseInput {
  ref: string
  shortName: string
  fkParent: string
  description: string
  address: string
  zip: string
  city: string
  countryId: string
  phone: string
  fax: string
  status: 'Open' | 'Closed'
}

export function useCreateWarehouseReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewWarehouseInput) => {
      const form = new URLSearchParams()
      form.set('type', 'savewarehouse')
      form.set('libelle', input.ref)
      form.set('lieu', input.shortName)
      form.set('fk_parent', input.fkParent)
      form.set('description', input.description)
      form.set('address', input.address)
      form.set('zip', input.zip)
      form.set('town', input.city)
      form.set('country_id', input.countryId)
      form.set('phone', input.phone)
      form.set('fax', input.fax)
      form.set('statut', input.status === 'Open' ? '1' : '0')
      const { data } = await axios.post<{ savedValues?: unknown; selectedRowid?: string }>('/quicklinks_ajax.php', form, {
        transformResponse: (raw) => JSON.parse(String(raw).trim()),
      })
      if (!data.selectedRowid) throw new Error('Failed to create warehouse.')
      return { id: Number(data.selectedRowid) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_LIST_KEY })
    },
  })
}

// product/stock/card.php?id=X — a single warehouse's own detail page (no
// REST API under product/stock/ at all, confirmed — only ajax/ helpers for
// unrelated features), so this scrapes it directly. See
// parseWarehouseCardDocument's own header comment.
export function useWarehouseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'detail', id],
    queryFn: async (): Promise<WarehouseCard> => {
      const doc = await fetchLegacyDocument(`/product/stock/card.php`, new URLSearchParams({ id: id ?? '' }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseWarehouseCardDocument(doc, Number(id))
    },
    enabled: !!id,
  })
}

export interface WarehouseMovementFilters {
  dateRange?: string
  productId?: string
  batch?: string
  inventoryCode?: string
  page?: number
}

// product/stock/movement_list.php is a pure JS SPA shell (see
// warehouseHtmlParser.ts's own header comment) — its real data is a genuine
// JSON API at product/stock/ajax/movement_list_api.php, read with the same
// session cookie as every other legacy scrape in this app. No CSRF token
// needed for the read-only get_page_data action (confirmed by reading the
// dispatcher's source — the token check only guards the mutating actions).
export function useWarehouseMovements(id: string | undefined, filters: WarehouseMovementFilters) {
  return useQuery({
    queryKey: ['warehouses', 'movements', id, filters],
    queryFn: async (): Promise<WarehouseMovementsData> => {
      const params = new URLSearchParams({ action: 'get_page_data', id: id ?? '' })
      if (filters.dateRange) params.set('newdatepicker', filters.dateRange)
      if (filters.productId) params.set('fk_producter', filters.productId)
      if (filters.batch) params.set('prod_lot', filters.batch)
      if (filters.inventoryCode) params.set('prod_invoice', filters.inventoryCode)
      if (filters.page) params.set('page', String(filters.page))
      const res = await fetch(`/product/stock/ajax/movement_list_api.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      let json: { success: boolean; error?: string; data?: unknown }
      try {
        json = await res.json()
      } catch {
        throw new Error(NOT_SIGNED_IN_MESSAGE)
      }
      if (!json.success) throw new Error(json.error || 'Failed to load stock movements.')
      return parseMovementListApiResponse(json.data)
    },
    enabled: !!id,
  })
}

// product/stock/events.php — the real Linked files + Latest 10 linked
// events tab, same no-REST-API scrape pattern as the Warehouse/Stock
// movements tabs. See parseWarehouseEventsDocument's own header comment.
export function useWarehouseEvents(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'events', id],
    queryFn: async (): Promise<WarehouseEventsData> => {
      const doc = await fetchLegacyDocument('/product/stock/events.php', new URLSearchParams({ id: id ?? '' }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseWarehouseEventsDocument(doc)
    },
    enabled: !!id,
  })
}

const INVENTORY_LIST_KEY = ['warehouses', 'inventoryList'] as const

function useInventoryListQuery() {
  return useQuery({
    queryKey: INVENTORY_LIST_KEY,
    queryFn: async (): Promise<InventoryListRow[]> => {
      const doc = await fetchLegacyDocument('/product/inventory/list.php')
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseInventoryListDocument(doc)
    },
    staleTime: 1000 * 30,
  })
}

export function useInventories(): InventoryListRow[] {
  const { data } = useInventoryListQuery()
  return data ?? []
}

export function useInventoryList() {
  const { data, isLoading, isError, error, refetch } = useInventoryListQuery()
  return { inventories: data ?? [], isLoading, isError, error, refetch }
}

// product/inventory/card.php?id=X — a single inventory's own detail page.
// See parseInventoryCardDocument's own header comment.
export function useInventoryDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'inventoryDetail', id],
    queryFn: async (): Promise<InventoryCard> => {
      const doc = await fetchLegacyDocument(`/product/inventory/card.php`, new URLSearchParams({ id: id ?? '' }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseInventoryCardDocument(doc, Number(id))
    },
    enabled: !!id,
  })
}

export interface NewInventoryInput {
  ref: string
  label: string
  warehouseId: string
  productId: string
  valueDate: string
}

// product/inventory/card.php's own create form (action=add) enforces
// Dolibarr's normal CSRF token check, unlike quicklinks_ajax.php above — the
// token is fetched fresh from the create page first, same pattern as
// fetchSocieteFormContext() elsewhere in this app.
export function useCreateInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewInventoryInput) => {
      const createPageHtml = await (await fetch('/product/inventory/card.php?action=create', { credentials: 'same-origin' })).text()
      const tokenMatch = createPageHtml.match(/name="token" value="([a-f0-9]+)"/)
      if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')

      const [year, month, day] = input.valueDate.split('-')
      const form = new URLSearchParams()
      form.set('token', tokenMatch[1])
      form.set('action', 'add')
      form.set('ref', input.ref)
      form.set('title', input.label)
      form.set('fk_warehouse', input.warehouseId)
      form.set('fk_product', input.productId)
      form.set('date_inventory', `${month}/${day}/${year}`)
      form.set('date_inventoryday', day)
      form.set('date_inventorymonth', month)
      form.set('date_inventoryyear', year)
      form.set('add', 'Create')
      await fetch('/product/inventory/card.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_KEY })
    },
  })
}

// The create page's three real picker fields (Purchase Invoice, Landed Cost
// Invoice, Landed Expense) all turned out to be bespoke modal/DataTable
// widgets rather than plain dropdowns, and this pass couldn't find a plain
// submit button anywhere in the 110KB+ form to safely confirm its real save
// contract (unlike Warehouses/Inventory, verified live end-to-end earlier) —
// see parseLandedCostFormOptions's own header comment. So the picker
// *options* below are real (User, Purchase Invoice, and the full Landed
// Cost Invoice list), but creating a record here still only writes to this
// local, session-only collection rather than a confirmed-real backend
// action, same honest local-only convention as Racks/Shelves below.
export function useLandedCostFormOptions() {
  return useQuery({
    queryKey: ['warehouses', 'landedCostFormOptions'],
    queryFn: async (): Promise<LandedCostFormOptions> => {
      const res = await fetch('/expensereport/landedcostbilled.php?action=create', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      return parseLandedCostFormOptions(html)
    },
    staleTime: 1000 * 60 * 5,
  })
}

export interface LandedCostRecord {
  ref: string
  startDate: string
  userName: string
  purchaseInvoice: string
  landedCostInvoice: string
  landedExpense: string
  note: string
}
const LANDED_COSTS_KEY = ['local', 'landed-costs'] as const

export function useLandedCosts() {
  const [costs] = useLocalCollection<LandedCostRecord[]>(LANDED_COSTS_KEY, [])
  return costs
}

export interface NewLandedCostInput {
  startDate: string
  userName: string
  purchaseInvoice: string
  landedCostInvoice: string
  landedExpense: string
  note: string
}

export function useCreateLandedCost() {
  const [, update] = useLocalCollection<LandedCostRecord[]>(LANDED_COSTS_KEY, [])
  return (input: NewLandedCostInput) => {
    const record: LandedCostRecord = { ref: nextLocalRef('LC'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

// Racks/Shelves/Assign-Products — the real underlying tables (llx_rack,
// llx_shelves, llx_shelvesdet) exist and have real rows on the live DB, but
// the "Racks" Dolibarr module itself isn't activated server-side
// (MAIN_MODULE_RACKS is missing from llx_const — confirmed via direct DB
// query), so custom/racks/*.php always renders its content gated off, even
// for a logged-in session. Scraping it client-side would just scrape that
// same empty gate. Same local-only, session-scoped convention as
// Warehouses/Inventories/Landed Costs above until that module is turned on
// server-side (a backend change, out of this app's scope).

export interface RackRecord {
  ref: string
  name: string
  shortName: string
  warehouseRef: string
  status: 'Active' | 'Inactive'
}
const RACKS_KEY = ['local', 'racks'] as const

export function useRacks() {
  const [racks] = useLocalCollection<RackRecord[]>(RACKS_KEY, [])
  return racks
}

export interface NewRackInput {
  name: string
  shortName: string
  warehouseRef: string
  status: 'Active' | 'Inactive'
}

export function useCreateRack() {
  const [, update] = useLocalCollection<RackRecord[]>(RACKS_KEY, [])
  return (input: NewRackInput) => {
    const record: RackRecord = { ref: nextLocalRef('RACK'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export interface ShelfRecord {
  ref: string
  rackRef: string
  capacity: number
}
const SHELVES_KEY = ['local', 'shelves'] as const

export function useShelves() {
  const [shelves] = useLocalCollection<ShelfRecord[]>(SHELVES_KEY, [])
  return shelves
}

export interface NewShelfInput {
  rackRef: string
  capacity: number
}

export function useCreateShelf() {
  const [, update] = useLocalCollection<ShelfRecord[]>(SHELVES_KEY, [])
  return (input: NewShelfInput) => {
    const record: ShelfRecord = { ref: nextLocalRef('SHF'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export interface RackAssignmentRecord {
  ref: string
  rackRef: string
  shelfRef: string
  productRef: string
  productLabel: string
  lotSerial: string
  qty: number
}
const RACK_ASSIGNMENTS_KEY = ['local', 'rackAssignments'] as const

export function useRackAssignments() {
  const [assignments] = useLocalCollection<RackAssignmentRecord[]>(RACK_ASSIGNMENTS_KEY, [])
  return assignments
}

export interface NewRackAssignmentInput {
  rackRef: string
  shelfRef: string
  productRef: string
  productLabel: string
  lotSerial: string
  qty: number
}

export function useCreateRackAssignment() {
  const [, update] = useLocalCollection<RackAssignmentRecord[]>(RACK_ASSIGNMENTS_KEY, [])
  return (input: NewRackAssignmentInput) => {
    const record: RackAssignmentRecord = { ref: nextLocalRef('ASG'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export { todayIso }
