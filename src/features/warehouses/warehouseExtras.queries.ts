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
  parseWarehouseEditFormDocument,
  looksLikeLegacyLoginPage,
  type WarehouseListRow,
  type InventoryListRow,
  type LandedCostFormOptions,
  type WarehouseCard,
  type InventoryCard,
  type WarehouseMovementsData,
  type WarehouseEventsData,
  type WarehouseEditFormData,
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

// product/stock/card.php?action=edit&id=X — see warehouseHtmlParser.ts's
// parseWarehouseEditFormDocument() comment for the real field names/option
// sources this and the mutation below rely on.
export function useWarehouseEditForm(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'editForm', id],
    queryFn: async (): Promise<WarehouseEditFormData> => {
      const doc = await fetchLegacyDocument('/product/stock/card.php', new URLSearchParams({ action: 'edit', id: id ?? '' }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseWarehouseEditFormDocument(doc)
    },
    enabled: !!id,
  })
}

export function useUpdateWarehouse(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      token: string
      ref: string
      shortNameLocation: string
      parentWarehouseId: string
      description: string
      address: string
      zipCode: string
      city: string
      countryId: string
      phone: string
      fax: string
      status: string
    }) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'update')
      body.set('id', id ?? '')
      body.set('libelle', input.ref)
      body.set('lieu', input.shortNameLocation)
      body.set('fk_parent', input.parentWarehouseId)
      body.set('desc', input.description)
      body.set('address', input.address)
      body.set('zipcode', input.zipCode)
      body.set('town', input.city)
      body.set('country_id', input.countryId)
      body.set('phone', input.phone)
      body.set('fax', input.fax)
      body.set('statut', input.status)
      const res = await fetch('/product/stock/card.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'detail', id] })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'editForm', id] })
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_LIST_KEY })
    },
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

// POSTs the real action=builddoc handler on product/stock/events.php's own
// #builddoc_form (see warehouseHtmlParser.ts's WarehouseEventsData comment
// for the field contract and the earlier finding that this may silently
// produce no file on this deployment).
export function useGenerateWarehouseDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; model: string; langId: string }) => {
      const body = new URLSearchParams()
      body.set('action', 'builddoc')
      body.set('token', input.token)
      body.set('buttongeneratetype', 'Generate')
      body.set('model', input.model)
      body.set('lang_id', input.langId)
      body.set('builddoc_generatebutton', 'Generate')
      const res = await fetch(`/product/stock/events.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'events', id] })
    },
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

// Real delete is a two-step GET flow, confirmed by reading the rendered
// card.php live: the toolbar's own href is only `action=delete&token=...`
// (no confirm param at all — Dolibarr renders its own confirm box on that
// same page first), and that box's real "Yes" button is
// `action=confirm_delete&confirm=yes&token=...`. window.confirm() here
// replaces that in-page box; the token is re-scraped fresh right before
// deleting (same "fetch a live token, don't cache one" pattern already used
// for Create above) since it can rotate between page loads.
//
// Live-tested against a disposable record on this backend and found a real,
// pre-existing bug: deleting an inventory always fails with a genuine SQL
// error — "Table 'bazaudye.llx_inventory_extrafields' doesn't exist" (the
// Inventory class's delete() also tries to clear that table; it was never
// created on this database). Dolibarr returns this as HTTP 200 with the
// error delivered via an inline showToast(msg, "error") script call, not a
// non-2xx status or a static error div — so checking only `res.ok` would
// have silently reported success on every delete attempt while the record
// stayed exactly as it was. Checked here the same way the real Send Email
// failure was found to surface (see inventoryEmail.queries.ts).
export function useDeleteInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const cardHtml = await (await fetch(`/product/inventory/card.php?id=${id}`, { credentials: 'same-origin' })).text()
      const tokenMatch = cardHtml.match(/name="token" value="([a-f0-9]+)"/)
      if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')
      const res = await fetch(`/product/inventory/card.php?id=${id}&action=confirm_delete&confirm=yes&token=${tokenMatch[1]}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const toastErrorMatch = html.match(/showToast\("((?:[^"\\]|\\.)*)",\s*"error"\)/)
      if (toastErrorMatch) {
        const div = document.createElement('div')
        div.innerHTML = toastErrorMatch[1].replace(/\\'/g, "'")
        throw new Error((div.textContent ?? 'The legacy backend rejected this delete.').trim())
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_KEY })
    },
  })
}

// Real "Back to Draft" is a two-step GET flow, same shape as Delete — the
// toolbar's own href (`action=setdraft&confirm=yes&token=...`) looks like a
// one-step call (it already carries confirm=yes) but is NOT: card.php's own
// source unconditionally renders a formconfirm() box for `action==setdraft`
// regardless of that param, and the box's real "Yes" button submits a
// DIFFERENT action, `confirm_setdraft`. Confirmed live the hard way — the
// first version of this used action=setdraft directly, returned HTTP 200
// with no error, and silently did nothing (status never actually changed);
// action=confirm_setdraft is what actually flips it, verified by checking
// the record's own status link before and after.
export function useSetInventoryToDraftReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const cardHtml = await (await fetch(`/product/inventory/card.php?id=${id}`, { credentials: 'same-origin' })).text()
      const tokenMatch = cardHtml.match(/name="token" value="([a-f0-9]+)"/)
      if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')
      const res = await fetch(`/product/inventory/card.php?id=${id}&action=confirm_setdraft&confirm=yes&token=${tokenMatch[1]}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const toastErrorMatch = html.match(/showToast\("((?:[^"\\]|\\.)*)",\s*"error"\)/)
      if (toastErrorMatch) {
        const div = document.createElement('div')
        div.innerHTML = toastErrorMatch[1].replace(/\\'/g, "'")
        throw new Error((div.textContent ?? 'The legacy backend rejected this action.').trim())
      }
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_KEY })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryDetail', id] })
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

// Racks/Shelves/Assign-Products are now backed by the real custom/racks/
// module (racks.queries.ts) — see that file's header comment. The local-only
// RackRecord/ShelfRecord/RackAssignmentRecord collections that used to live
// here were built on an incorrect assumption that the module was disabled
// server-side; it isn't (its permission check is commented out in source,
// confirmed by reading racksindex.php directly), so they've been removed.

// expedition/shipment-sidebar-list-ajax.php — a real DataTables JSON
// endpoint (same {module}-sidebar-list-ajax.php pattern already confirmed
// real for loan/loan-sidebar-list-ajax.php), found by grepping the
// expedition/ tree for json_encode after ShipmentSearchPage/
// ShipmentStatusList's own comments wrongly claimed no shipment endpoint
// exists. It only selects rowid/ref/ref_customer/fk_statut/date_creation —
// no city/zip/tracking/delivery-date fields, so the table below only shows
// what's real rather than the reference app's full (unavailable) column set.
// fk_statut: 0=Draft, 1=Validated, 2=Closed (same convention confirmed for
// other Dolibarr status columns elsewhere in this app).
export interface ShipmentRow {
  id: string
  ref: string
  customerRef: string | null
  statusCode: number
  dateCreation: string
}

const SHIPMENTS_KEY = ['warehouses', 'shipments'] as const

export function useShipments() {
  return useQuery({
    queryKey: SHIPMENTS_KEY,
    queryFn: async (): Promise<ShipmentRow[]> => {
      // length=-1 (the usual "fetch everything" DataTables convention used
      // elsewhere in this app) breaks this endpoint — it passes length
      // straight into a MySQL LIMIT clause, which rejects a negative value
      // and silently returns zero rows (confirmed live). A large explicit
      // length gets the same "everything" result without that failure mode.
      const res = await fetch('/expedition/shipment-sidebar-list-ajax.php?draw=1&start=0&length=1000', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      let json: { data?: Array<{ rowid: string; ref: string; custmr: string | null; fk_statut: string; date_creation: string }> }
      try {
        json = await res.json()
      } catch {
        throw new Error(NOT_SIGNED_IN_MESSAGE)
      }
      return (json.data ?? []).map((row) => ({
        id: row.rowid,
        ref: row.ref,
        customerRef: row.custmr,
        statusCode: Number(row.fk_statut),
        dateCreation: row.date_creation,
      }))
    },
    staleTime: 1000 * 30,
  })
}

export { todayIso }
