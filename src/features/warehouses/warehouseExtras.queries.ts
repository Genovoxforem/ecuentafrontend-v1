/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fetchAllPages, usDate } from '../../api/fapiRow'
import { fetchShipmentsFapi } from './shipmentListEnriched.queries'
import { customerLookupsQuery } from '../customers/thirdPartyOptions.queries'
import { stockRowFromApi } from '../products/productTools.queries'
import type { ReassortData } from '../../api/products'
import { todayIso } from '../../shared/localCollection'
import type {
  WarehouseListRow,
  InventoryListRow,
  WarehouseCard,
  InventoryCard,
  WarehouseMovementsData,
  WarehouseMovementRow,
  WarehouseEventsData,
  WarehouseEditFormData,
} from './warehouseTypes'

// Warehouses, inventories and the warehouse events tab, all on product/stock/fapi (16 Oct 2026):
//   warehouse.php (get / create / update / close / open / delete), warehouses.php + dashboard.php (list and values),
//   inventory.php (list, card, create, validate / set_draft / cancel / delete), warehouse_events.php (movement log,
//   linked events, files).
// Racks, shelves and placements live in racks.queries.ts; inventory count lines in inventoryLines.queries.ts.
const WH_FAPI = '/product/stock/fapi/warehouse.php'
const INV_FAPI = '/product/stock/fapi/inventory.php'

export type { WarehouseListRow, InventoryListRow }

const WAREHOUSE_LIST_KEY = ['warehouses', 'realList'] as const

function useWarehouseListQuery() {
  return useQuery({
    queryKey: WAREHOUSE_LIST_KEY,
    queryFn: async (): Promise<WarehouseListRow[]> => {
      const [list, dash] = await Promise.all([fapiGet<any>('/product/stock/fapi/warehouses.php', { limit: 500 }), fapiGet<any>('/product/stock/fapi/dashboard.php')])
      const values = new Map<number, { cost: number; sale: number }>(((dash.by_warehouse ?? []) as any[]).map((w) => [Number(w.id), { cost: Number(w.value_at_cost) || 0, sale: Number(w.value_at_sale) || 0 }]))
      return ((list.items ?? []) as any[]).map(
        (w): WarehouseListRow => ({
          id: Number(w.id),
          ref: w.ref ?? '',
          shortName: w.location ?? '',
          environment: '',
          inputStockValue: values.get(Number(w.id))?.cost ?? 0,
          valueForSell: values.get(Number(w.id))?.sale ?? 0,
          statusLabel: Number(w.status) === 1 ? 'Open' : 'Closed',
        }),
      )
    },
    staleTime: 1000 * 30,
  })
}

// Plain-array shape kept for the many warehouse-picker consumers (Stock Transfer / Correction / Movements, Racks, Box
// Break, Mass Transfer): they only read .ref / .shortName.
export function useWarehouses(): WarehouseListRow[] {
  const { data } = useWarehouseListQuery()
  return data ?? []
}

// A warehouse dropdown's choices from product/stock/fapi/warehouses.php (entity-isolated). `open` is the status
// (1 = open), for picking a sensible default.
export interface WarehousePickerOption {
  id: number
  ref: string
  label: string
  open: boolean
}

export function useWarehousePickerOptions() {
  return useQuery({
    queryKey: ['warehouses', 'pickerOptions'],
    queryFn: async (): Promise<WarehousePickerOption[]> => {
      const { data } = await fapi.get<{ success: boolean; message?: string | null; data: { items?: Array<{ id: number; ref?: string; label?: string; status?: number | string }> } }>(
        '/product/stock/fapi/warehouses.php',
        { params: { limit: 500 } },
      )
      if (!data.success) throw new Error(data.message || 'Could not load the warehouses.')
      return (data.data.items ?? []).map((w) => ({ id: w.id, ref: w.ref || w.label || '', label: w.label || w.ref || '', open: Number(w.status) === 1 }))
    },
    staleTime: 1000 * 60 * 5,
  })
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

// 409 on a duplicate ref (the ref is the warehouse's name in this schema); fk_parent is accepted as parent_id.
export function useCreateWarehouseReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewWarehouseInput) => {
      const d = await fapiPost<any>(
        WH_FAPI,
        { ref: input.ref, lieu: input.shortName, parent_id: Number(input.fkParent) || 0, description: input.description, address: input.address, zip: input.zip, town: input.city, country_id: Number(input.countryId) || undefined, phone: input.phone, fax: input.fax, status: input.status === 'Open' ? 1 : 0 },
        { action: 'create' },
      )
      return { id: Number(d.warehouse?.id ?? d.id) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_LIST_KEY })
    },
  })
}

// warehouse.php?id=: the warehouse, its parent and children, racks and a stock summary, with available_actions (each
// action says whether it is allowed now and why not); the products held come from reassort.php?warehouse=.
export function useWarehouseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'detail', id],
    queryFn: async (): Promise<WarehouseCard> => {
      const [d, stock] = await Promise.all([fapiGet<any>(WH_FAPI, { id }), fapiGet<ReassortData>('/product/stock/fapi/reassort.php', { warehouse: id, limit: 500, type: 0 })])
      const w = d.warehouse ?? {}
      const actions = new Map<string, { allowed: boolean; reason: string }>(((d.available_actions ?? []) as any[]).map((a) => [a.action, { allowed: Boolean(a.allowed), reason: a.reason ?? '' }]))
      const address = [w.address, w.zip, w.town].filter(Boolean).join(', ')
      return {
        id: Number(w.id),
        ref: w.ref ?? '',
        statusLabel: w.is_open ? 'Open' : 'Closed',
        locationSummary: address,
        environment: '',
        parentWarehouseName: w.parent?.ref ?? '',
        parentWarehouseId: w.parent_id ? Number(w.parent_id) : null,
        description: w.description ?? '',
        differentProductsCount: Number(d.stock?.products) || 0,
        totalProductsCount: Number(d.stock?.qty) || 0,
        inputStockValue: Number(d.stock?.value_at_cost) || 0,
        latestMovement: '',
        tags: [] as string[],
        editUrl: actions.get('update')?.allowed ? 'edit' : '',
        deleteUrl: actions.get('delete')?.allowed ? 'delete' : '',
        deleteRefusedTitle: actions.get('delete')?.allowed ? '' : `Cannot delete: ${actions.get('delete')?.reason ?? 'not allowed'}`,
        products: (stock.items ?? []).map((item) => {
          const r = stockRowFromApi(item)
          return {
            id: Number(r.id),
            ref: r.ref,
            label: r.label,
            units: r.physical,
            weightedAvgPrice: Number(item.pmp) || 0,
            inputStockValue: r.value ?? 0,
            sellingUnitPrice: Number(item.price) || 0,
            valueForSell: r.physical * (Number(item.price) || 0),
            transferUrl: 'transfer',
            correctionUrl: 'correction',
          }
        }),
      }
    },
    enabled: !!id,
  })
}

export function useWarehouseEditForm(id: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['warehouses', 'editForm', id],
    queryFn: async (): Promise<WarehouseEditFormData> => {
      const [d, list, lookups] = await Promise.all([fapiGet<any>(WH_FAPI, { id }), fapiGet<any>('/product/stock/fapi/warehouses.php', { limit: 500 }), queryClient.ensureQueryData(customerLookupsQuery)])
      const w = d.warehouse ?? {}
      return {
        token: '',
        ref: w.ref ?? '',
        shortNameLocation: w.location ?? '',
        parentWarehouseId: w.parent_id ? String(w.parent_id) : '',
        parentWarehouseOptions: [{ value: '', label: '' }, ...((list.items ?? []) as any[]).filter((x) => String(x.id) !== String(id)).map((x) => ({ value: String(x.id), label: x.ref ?? '' }))],
        description: w.description ?? '',
        address: w.address ?? '',
        zipCode: w.zip ?? '',
        city: w.town ?? '',
        countryId: w.country_id ? String(w.country_id) : '',
        countryOptions: [{ value: '', label: '' }, ...lookups.countries.map((c) => ({ value: String(c.id), label: c.label }))],
        phone: w.phone ?? '',
        fax: w.fax ?? '',
        status: String(w.status ?? 1),
      }
    },
    enabled: !!id,
  })
}

// update (422 when a warehouse is made its own parent or sits below itself), then open / close, which are their own
// actions on this endpoint. Note: update does not change `ref` (reported to the backend team).
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
      await fapiPost(
        WH_FAPI,
        { id: Number(id), ref: input.ref, lieu: input.shortNameLocation, parent_id: Number(input.parentWarehouseId) || 0, description: input.description, address: input.address, zip: input.zipCode, town: input.city, country_id: Number(input.countryId) || undefined, phone: input.phone, fax: input.fax },
        { action: 'update' },
      )
      await fapiPost(WH_FAPI, { id: Number(id) }, { action: input.status === '1' ? 'open' : 'close' }).catch(() => undefined)
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

// The origin of a movement as an in-app route, from the origin type and id the API gives.
function originRoute(type: string, id: number): string {
  if (!id) return ''
  if (type === 'facture') return `/invoices/${id}`
  if (type === 'commande') return `/orders/${id}`
  if (type === 'order_supplier' || type === 'commande_fournisseur') return `/purchase-orders/${id}`
  return ''
}

const ORIGIN_LABEL: Record<string, string> = { facture: 'Invoice', commande: 'Order', order_supplier: 'Purchase order', commande_fournisseur: 'Purchase order', inventory: 'Inventory', expedition: 'Shipment', reception: 'Reception' }

async function fetchWarehouseEvents(id: string, params: Record<string, unknown> = {}) {
  return fapiGet<any>('/product/stock/fapi/warehouse_events.php', { id, ...params })
}

// warehouse_events.php: the warehouse's movement log (date, product, quantity and direction, type, origin document
// and author) with totals over the whole filtered set. The classic movement list's sale / purchase / lot tiles are not
// part of it, so the tiles are worked out here from the movements read; the date range and inventory-code filters run
// here too (the endpoint filters by product, batch and page).
export function useWarehouseMovements(id: string | undefined, filters: WarehouseMovementFilters) {
  return useQuery({
    queryKey: ['warehouses', 'movements', id, filters],
    queryFn: async (): Promise<WarehouseMovementsData> => {
      const d = await fetchWarehouseEvents(id!, { product: filters.productId || undefined, batch: filters.batch || undefined, page: (filters.page ?? 0) + 1, limit: 250 })
      const all: any[] = d.movements ?? []
      const movements: WarehouseMovementRow[] = all
        .filter((m) => !filters.inventoryCode || String(m.inventory_code ?? '') === filters.inventoryCode)
        .map((m) => ({
          id: Number(m.id),
          dateFormatted: m.date_label ?? usDate(m.date),
          productRef: m.product_ref ?? '',
          productLabel: m.product_label ?? '',
          batch: m.batch ?? '',
          inventoryCode: m.inventory_code ?? '',
          label: m.label ?? '',
          typeLabel: m.type_label ?? '',
          originText: m.origin_id ? `${ORIGIN_LABEL[String(m.origin_type)] ?? m.origin_type ?? ''} #${m.origin_id}` : '',
          originUrl: originRoute(String(m.origin_type ?? ''), Number(m.origin_id)),
          costPrice: m.unit_price != null ? String(m.unit_price) : '',
          qtyDisplay: String(m.qty ?? ''),
          zraStatusLabel: '',
        }))
      const sum = (pred: (m: any) => boolean) => all.filter(pred).reduce((s, m) => s + Math.abs(Number(m.qty) || 0), 0)
      const today = new Date().toISOString().slice(0, 10)
      const isToday = (m: any) => usDate(m.date) === usDate(today)
      const sold = (m: any) => m.direction === 'out' && m.origin_type === 'facture'
      const bought = (m: any) => m.direction === 'in' && /fourn|supplier|reception/i.test(String(m.origin_type ?? ''))
      const correction = (m: any) => !m.origin_id
      return {
        stats: {
          saleUseQty: String(sum((m) => m.direction === 'out')),
          saleUseToday: String(sum((m) => m.direction === 'out' && isToday(m))),
          soldQty: String(sum(sold)),
          soldToday: String(sum((m) => sold(m) && isToday(m))),
          purchaseQty: String(sum(bought)),
          purchaseToday: String(sum((m) => bought(m) && isToday(m))),
          lotUsedCount: String(all.filter((m) => m.batch).length),
          lotUsedToday: String(all.filter((m) => m.batch && isToday(m)).length),
          correctionCount: String(all.filter(correction).length),
          correctionToday: String(all.filter((m) => correction(m) && isToday(m)).length),
        },
        movements,
        totalRecords: Number(d.pagination?.total ?? movements.length),
        page: Number(d.pagination?.page ?? 1) - 1,
        limit: Number(d.pagination?.limit ?? 250),
        products: Array.from(new Map(all.map((m) => [m.product_id, { id: Number(m.product_id), ref: m.product_ref ?? '', label: m.product_label ?? '' }])).values()),
        batches: Array.from(new Set(all.map((m) => String(m.batch ?? '')).filter(Boolean))),
        inventoryCodes: Array.from(new Set(all.map((m) => String(m.inventory_code ?? '')).filter(Boolean))),
        dateRange: '',
        zraEnabled: false,
        batchTrackingEnabled: all.some((m) => m.batch),
      }
    },
    enabled: !!id,
  })
}

// warehouse_events.php: the linked events and the files of the warehouse. The document-generation form, the author
// and the creation / modification dates of the classic events page are not part of the endpoint (listed as backend
// requests), so the card hides them.
export function useWarehouseEvents(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'events', id],
    queryFn: async (): Promise<WarehouseEventsData> => {
      const d = await fetchWarehouseEvents(id!)
      return {
        linkedFiles: ((d.files ?? []) as any[]).map((f) => ({ name: String(f.name ?? f.filename ?? ''), url: String(f.url ?? '') })),
        docGen: { token: '', modelOptions: [], langOptions: [], defaultLang: '' },
        events: ((d.events ?? []) as any[]).map((e) => ({ ref: String(e.ref ?? e.id ?? ''), date: usDate(e.date ?? e.datep), by: String(e.author ?? e.by ?? ''), type: String(e.type ?? e.type_label ?? ''), title: String(e.label ?? e.title ?? '') })),
        addEventUrl: '',
        createdByName: '',
        createdByUrl: '',
        createdById: null,
        creationDate: '',
        lastModificationDate: '',
      }
    },
    enabled: !!id,
  })
}

// There is no document generation action on warehouse_events.php yet (the classic builddoc form is gone); the events
// card hides the control while docGen has no templates, so this only exists for the card's type.
export function useGenerateWarehouseDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_input: { token: string; model: string; langId: string }) => {
      throw new Error('Generating a warehouse document needs a backend action that does not exist yet.')
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
      const items = await fetchAllPages((page) => fapiGet<any>(INV_FAPI, { page, limit: 100 }))
      return items.map(
        (i): InventoryListRow => ({
          id: Number(i.id),
          ref: i.ref || `(PROV${i.id})`,
          label: i.title ?? '',
          warehouseId: i.warehouse_id ? Number(i.warehouse_id) : null,
          warehouseLabel: i.warehouse_ref ?? '',
          productLabel: i.product_ref ?? '',
          valueDate: usDate(i.date_inventory),
          statusLabel: i.status_label ?? '',
        }),
      )
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

// inventory.php?id=: the inventory with its lines, totals and available_actions (allowed + the reason when not).
// There is no modify action (title / date) and no linked-events or email API for an inventory yet.
export function useInventoryDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', 'inventoryDetail', id],
    queryFn: async (): Promise<InventoryCard> => {
      const d = await fapiGet<any>(INV_FAPI, { id })
      const inv = d.inventory ?? {}
      const actions = new Map<string, boolean>(((d.available_actions ?? []) as any[]).map((a) => [a.action, Boolean(a.allowed)]))
      return {
        id: Number(inv.id),
        label: inv.title ?? '',
        warehouseId: inv.warehouse_id ? Number(inv.warehouse_id) : null,
        warehouseLabel: inv.warehouse?.ref ?? '',
        productId: inv.product_id ? Number(inv.product_id) : null,
        productLabel: inv.product?.ref ?? '',
        valueDate: usDate(inv.date_inventory),
        statusLabel: inv.status_label ?? '',
        emailUrl: '',
        modifyUrl: '',
        validateUrl: actions.get('validate') ? 'validate' : '',
        backToDraftUrl: actions.get('set_draft') ? 'set_draft' : '',
        deleteUrl: actions.get('delete') ? 'delete' : '',
        relatedObjects: [] as InventoryCard['relatedObjects'],
        linkedEvents: [] as InventoryCard['linkedEvents'],
        addEventUrl: '',
      }
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

export function useCreateInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewInventoryInput) => {
      const d = await fapiPost<any>(INV_FAPI, { warehouse_id: Number(input.warehouseId) || undefined, product_id: Number(input.productId) || undefined, title: input.label || input.ref, date_inventory: input.valueDate }, { action: 'create' })
      return { id: Number(d.inventory?.id ?? d.id) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_KEY })
    },
  })
}

// The endpoint removes the lines itself, so it works where llx_inventory_extrafields is missing (the classic delete
// failed with an SQL error there).
export function useDeleteInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fapiPost(INV_FAPI, { id: Number(id), confirm: true }, { action: 'delete' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_KEY })
    },
  })
}

// 409 when the warehouse holds stock or has children, or has movements and confirm is not sent.
export function useDeleteWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fapiPost(WH_FAPI, { id: Number(id), confirm: true }, { action: 'delete' })
    },
    // Only the list: the page showing the deleted warehouse is still mounted when this runs, and refetching its (now
    // gone) card would flash an error before the caller navigates away.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_LIST_KEY })
    },
  })
}

export function useSetInventoryToDraftReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fapiPost(INV_FAPI, { id: Number(id) }, { action: 'set_draft' })
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_KEY })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryDetail', id] })
    },
  })
}

// POST inventory.php?action=validate freezes the lines (prefilled from stock); 409 when it has none or is not a draft.
export function useValidateInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fapiPost(INV_FAPI, { id: Number(id) }, { action: 'validate' })
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_KEY })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryLines', id] })
    },
  })
}

// A shipment row for the sidebar-style lists; the full row (third party, tracking, delivery date ...) is
// ShipmentListRow in shipmentListEnriched.queries.ts. Status: 0 draft, 1 validated, 2 processed.
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
    queryFn: async (): Promise<ShipmentRow[]> => (await fetchShipmentsFapi()).map((r) => ({ id: r.id, ref: r.ref, customerRef: r.customerRef, statusCode: r.statusCode, dateCreation: r.dateCreation })),
    staleTime: 1000 * 30,
  })
}

export { todayIso }
