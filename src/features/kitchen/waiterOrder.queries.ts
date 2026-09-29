import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText } from '../../shared/legacyHtmlFetch'

// Real backing for "Kitchen > Create Orders" (the real legacy page is
// takeposnew/waiter_order.php). Confirmed live by reading these files
// directly, not guessed:
//   - takeposnew/api/tables.php?action=getTables&floor=1 — real table list
//     with live occupied/invoice status (llx_takepos_floor_tables +
//     llx_facture lookup by the real 'POS<terminal>-<place>' ref_client
//     convention).
//   - takeposnew/ajax/ajax.php?action=getCategories — real product category
//     tree (llx_categorie).
//   - takeposnew/ajax/ajax.php?action=getProducts&category=X — real product
//     list per category (category=0/empty means "All").
//   - takeposnew/ajax/ajax.php?action=searchProducts&term=X — real ref/
//     label/barcode search.
//   - takeposnew/ajax/waiter_ajax.php?action=getInvoice — real existing
//     draft-order lookup for a table, so reopening a table shows what's
//     already there.
//   - takeposnew/ajax/waiter_ajax.php?action=submitCartAsDraft — the real
//     "Place Order" action; creates or updates the table's draft invoice
//     with the full cart in one call (matches existing lines by product_id).
//
// Out of scope for this pass (a separate, much larger subsystem each):
// payment/checkout, cash drawer, modifiers, barcode scanning, offline sync.
// This mirrors this session's own earlier placeholder's scoping note.
//
// The POS terminal and the currency are not constants: the real page prints
// them in its own WAITER_CONFIG block (terminal from the session, currency from
// the company setup), so they are read from there (useWaiterConfig) instead of
// being written into the app.

async function fetchLegacyJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.json()
}

async function postForm<T>(url: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(url, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams(body) })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.json()
}

export interface WaiterCategory {
  id: number
  label: string
  level: number
}

export interface WaiterConfig {
  terminal: number
  currency: string
  transports: { mode: number; label: string }[] // the order-type tabs (Dine In / TakeAway)
  categories: WaiterCategory[] // top-level product categories
  subcategories: Record<number, WaiterCategory[]> // children per category
}

interface RawConfigCategory {
  id: string | number
  label: string
  level?: string | number
}

const toCategory = (c: RawConfigCategory): WaiterCategory => ({ id: Number(c.id), label: c.label, level: Number(c.level) || 0 })

// The real page prints its WAITER_CONFIG as one `key: value,` line per entry
// (terminal, currency, the category list and the sub-category map) and its
// order-type tabs as .transport-tab buttons. Everything the page needs about
// the POS set-up is read from there instead of being written into the app.
function configLine(lines: string[], key: string): string | undefined {
  const line = lines.find((l) => l.trim().startsWith(`${key}:`))
  return line?.trim().slice(key.length + 1).trim().replace(/,$/, '')
}

export function useWaiterConfig() {
  return useQuery({
    queryKey: ['waiterOrder', 'config'],
    queryFn: async (): Promise<WaiterConfig> => {
      const html = await fetchLegacyText('/takeposnew/waiter_order.php')
      const lines = html.split('\n')
      const terminal = Number(configLine(lines, 'terminal'))
      const currency = (configLine(lines, 'currency') ?? '').replace(/^'|'$/g, '')
      if (!terminal || !currency) throw new Error('Could not read the POS terminal and currency from the waiter order page.')

      let categories: WaiterCategory[] = []
      let subcategories: Record<number, WaiterCategory[]> = {}
      try {
        categories = (JSON.parse(configLine(lines, 'categories') ?? '[]') as RawConfigCategory[]).map(toCategory)
        const map = JSON.parse(configLine(lines, 'subcategoryMap') ?? '{}') as Record<string, RawConfigCategory[]>
        subcategories = Object.fromEntries(Object.entries(map).map(([parent, children]) => [Number(parent), children.map(toCategory)]))
      } catch {
        throw new Error('Could not read the product categories from the waiter order page.')
      }

      const doc = new DOMParser().parseFromString(html, 'text/html')
      const transports = Array.from(doc.querySelectorAll<HTMLElement>('.transport-tab')).map((b) => ({
        mode: Number(b.dataset.mode),
        label: (b.textContent ?? '').replace(/\s+/g, ' ').trim(),
      }))
      return { terminal, currency, transports, categories, subcategories }
    },
    staleTime: 10 * 60_000,
  })
}

export interface WaiterTable {
  id: number
  label: string
  floor: number
  occupied: boolean
  invoiceId: number | null
  totalTtc: number | null
}

// tables.php?action=list is what the real page loads: every table of every
// floor (getTables&floor=N returns one floor only, so a fixed floor hid the rest).
export function useWaiterTables() {
  return useQuery({
    queryKey: ['waiterOrder', 'tables'],
    queryFn: async (): Promise<WaiterTable[]> => {
      const data = await fetchLegacyJson<{ success: boolean; tables: Array<{ rowid: number; label: string; floor: number | string; status?: string; invoice_id?: number; total_ttc?: number }> }>(
        '/takeposnew/api/tables.php?action=list',
      )
      if (!data.success) throw new Error('Could not load tables.')
      return data.tables.map((t) => ({
        id: t.rowid,
        label: t.label,
        floor: Number(t.floor) || 0,
        occupied: t.status === 'occupied',
        invoiceId: t.invoice_id || null,
        totalTtc: t.total_ttc || null,
      }))
    },
    refetchInterval: 20_000,
  })
}

export interface WaiterProduct {
  id: number
  ref: string
  label: string
  priceHt: number
  priceTtc: number
  tvaTx: string
  vatSrcCode: string
  imageUrl: string
  hasImage: boolean
  stock: number
}

interface RawWaiterProduct {
  id: number
  ref: string
  label: string
  price: string | number
  price_ttc: string | number
  tva_tx: string | number
  vat_src_code?: string
  image_url?: string
  has_image?: number
  stock?: number
}

function mapProduct(p: RawWaiterProduct): WaiterProduct {
  return {
    id: p.id,
    ref: p.ref,
    label: p.label,
    priceHt: Number(p.price) || 0,
    priceTtc: Number(p.price_ttc) || 0,
    tvaTx: String(p.tva_tx ?? ''),
    vatSrcCode: p.vat_src_code ?? '',
    imageUrl: p.image_url ?? '',
    hasImage: !!p.has_image,
    stock: p.stock ?? 0,
  }
}

// category=null means "All" (category 0/empty on the real endpoint).
// A non-empty search term takes over via the real searchProducts action —
// matches the real page's own single search box behavior (search overrides
// category browsing rather than filtering within it).
export function useWaiterProducts(categoryId: number | null, search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: ['waiterOrder', 'products', categoryId, term],
    queryFn: async (): Promise<WaiterProduct[]> => {
      if (term) {
        const data = await postForm<{ success: boolean; data: RawWaiterProduct[] }>('/takeposnew/ajax/ajax.php', { action: 'searchProducts', term })
        if (!data.success) throw new Error('Search failed.')
        return data.data.map(mapProduct)
      }
      const data = await postForm<{ success: boolean; data: RawWaiterProduct[] }>('/takeposnew/ajax/ajax.php', {
        action: 'getProducts',
        category: String(categoryId ?? 0),
        // the real page loads the whole catalogue (limit 1000) — 250 cut a 510-product list in half
        limit: '1000',
      })
      if (!data.success) throw new Error('Could not load products.')
      return data.data.map(mapProduct)
    },
    placeholderData: (prev) => prev,
  })
}

export interface WaiterOrderLine {
  id: number
  productId: number
  label: string
  qty: number
  priceHt: number
  priceTtc: number
  tvaTx: string
  kotstatus: string
}

// Loads whatever draft order already exists for a table (e.g. reopening a
// table someone else started) — real via waiter_ajax.php's own getInvoice
// action. Returns null lines/invoice when the table has no active order.
export function useWaiterTableInvoice(place: number | null, terminal: number | null) {
  return useQuery({
    queryKey: ['waiterOrder', 'invoice', place, terminal],
    queryFn: async (): Promise<{ invoiceId: number | null; lines: WaiterOrderLine[] }> => {
      const data = await postForm<{
        success: boolean
        invoice: { id: number } | null
        lines: Array<{ id: number; product_id: number; label: string; qty: number; price_ht: number; price_ttc: number; tva_tx: string; kotstatus: string }>
      }>('/takeposnew/ajax/waiter_ajax.php', { action: 'getInvoice', place: String(place), terminal: String(terminal) })
      if (!data.success) throw new Error('Could not load this table’s order.')
      return {
        invoiceId: data.invoice?.id ?? null,
        lines: (data.lines ?? []).map((l) => ({
          id: l.id,
          productId: l.product_id,
          label: l.label,
          qty: Number(l.qty),
          priceHt: Number(l.price_ht),
          priceTtc: Number(l.price_ttc),
          tvaTx: String(l.tva_tx ?? ''),
          kotstatus: l.kotstatus,
        })),
      }
    },
    enabled: place != null && terminal != null,
    // Seeded once into local cart state and edited there — a background
    // refetch (e.g. on window refocus) must not silently overwrite
    // in-progress edits before the waiter has placed the order.
    refetchOnWindowFocus: false,
  })
}

export interface WaiterCartItem {
  productId: number
  label: string
  qty: number
  priceHt: number
  priceTtc: number
  tvaTx: string
  vatSrcCode: string
}

// Real "Place Order" — submitCartAsDraft creates the table's draft invoice
// if none exists yet, or updates its lines to match the submitted cart
// (matched by product_id) otherwise. transport_mode: 0 = Dine In, 1 =
// Takeaway, confirmed from the real page's own waiter-order.js.
export function usePlaceWaiterOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ place, terminal, transportMode, cart }: { place: number; terminal: number; transportMode: 0 | 1; cart: WaiterCartItem[] }) => {
      const cartPayload = cart.map((c) => ({ product_id: c.productId, qty: c.qty, label: c.label, tva_tx: c.tvaTx, vat_src_code: c.vatSrcCode }))
      const data = await postForm<{ success: boolean; error?: string; invoice?: { id: number; ref: string; total_ttc: number } }>('/takeposnew/ajax/waiter_ajax.php', {
        action: 'submitCartAsDraft',
        place: String(place),
        terminal: String(terminal),
        transport_mode: String(transportMode),
        cart: JSON.stringify(cartPayload),
      })
      if (!data.success) throw new Error(data.error || 'Could not place the order.')
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['waiterOrder', 'tables'] })
      queryClient.invalidateQueries({ queryKey: ['waiterOrder', 'invoice', variables.place] })
    },
  })
}
