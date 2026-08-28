import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { LEGACY_SESSION_EXPIRED_PREFIX } from '../../shared/components/BackendUnavailable'

export interface ZraSyncStat {
  succeededAmount: number
  unsyncedAmount: number
  totalAmount: number
}

export type ZraSyncStatus = 'poor' | 'fair' | 'good' | 'complete'

export interface ZraSyncDetailRow {
  category: string
  totalCount: number | null
  succeeded: number | null
  unsynced: number | null
  succeededAmount: number | null
  unsyncedAmount: number | null
  status: ZraSyncStatus
}

export interface ZraSummary {
  salesInvoices: ZraSyncStat
  creditNotes: ZraSyncStat
  income: ZraSyncStat
  vatAmount: ZraSyncStat
  purchaseAmount: { amount: number; complete: boolean }
  details: ZraSyncDetailRow[]
}

// custom/zra/zra_filter_api.php?year=X — a real, dedicated JSON API behind
// zraindex.php's own year-filter dropdown (found by reading that page's
// own filterDashboardByYear() JS, which calls this exact endpoint — not
// guessed). Confirmed live with real, non-zero data (304 sales invoices,
// 76 succeeded/228 unsynced, etc.) — a completely different, currently-
// active-deployment-specific integration from the old /api/zra/summary/
// this used to call, which a comment on the previous version of this
// function noted was "real... on the ecnta10 backend" (the inactive
// secondary install) and 404s here. Same-origin, session-cookie
// authenticated like every other custom/* endpoint in this app (see
// legacySession.ts) — no bearer token, so this bypasses the `api` axios
// instance entirely, same as societe/api/list.php elsewhere.
//
// The response has no separate "income" bucket — the real page's own
// "Income" stat card is labelled "Combined Total" and is sales_invoices +
// credit_notes added together (confirmed by reading the real stat-card
// markup: matching icon/wording to a plain sum, not a distinct raw field).
interface RawZraBucket {
  total: number
  succeeded: number
  unsynced: number
  finish_amount: number
  process_amount: number
  sync_rate: number
}
interface RawZraStockBucket {
  total: number
  succeeded: number
  unsynced: number
  sync_rate: number
}
interface RawZraFilterData {
  sales_invoices: RawZraBucket
  credit_notes: RawZraBucket
  stock_items: RawZraStockBucket
  vat_amount: { finish_tax: number; process_tax: number; total_tax: number }
  purchase_amount: { count: number; amount: number }
}
interface RawZraFilterResponse {
  success: boolean
  data: RawZraFilterData
}

// Thresholds classify the real succeeded/total ratio, matching the legacy
// dashboard's own badge splits (zraindex.php's real sync_rate values:
// 25% -> Poor, 75% -> Fair, 89.83% -> Good, confirmed live) — separate from
// the live VSDC gateway probe (useVsdcStatus below), which is a real
// connectivity check, not a derived ratio.
function rateToStatus(succeeded: number, total: number): ZraSyncStatus {
  if (total <= 0) return 'complete'
  const rate = (succeeded / total) * 100
  if (rate > 80) return 'good'
  if (rate > 50) return 'fair'
  return 'poor'
}

function toSyncStat(bucket: RawZraBucket): ZraSyncStat {
  return {
    succeededAmount: bucket.finish_amount,
    unsyncedAmount: bucket.process_amount,
    totalAmount: bucket.finish_amount + bucket.process_amount,
  }
}

export function useZraSummary(year?: number) {
  return useQuery({
    queryKey: ['zra', 'summary', year ?? 'all'],
    queryFn: async (): Promise<ZraSummary> => {
      const res = await fetch(`/custom/zra/zra_filter_api.php?year=${year ?? ''}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const trimmed = (await res.text()).trim()
      if (trimmed.startsWith('<')) {
        throw new Error(`${LEGACY_SESSION_EXPIRED_PREFIX}custom/zra/zra_filter_api.php returned a login page instead of JSON.`)
      }
      const body: RawZraFilterResponse = JSON.parse(trimmed)
      const { sales_invoices, credit_notes, stock_items, vat_amount, purchase_amount } = body.data

      const salesInvoices = toSyncStat(sales_invoices)
      const creditNotes = toSyncStat(credit_notes)

      return {
        salesInvoices,
        creditNotes,
        income: {
          succeededAmount: sales_invoices.finish_amount + credit_notes.finish_amount,
          unsyncedAmount: sales_invoices.process_amount + credit_notes.process_amount,
          totalAmount: salesInvoices.totalAmount + creditNotes.totalAmount,
        },
        vatAmount: { succeededAmount: vat_amount.finish_tax, unsyncedAmount: vat_amount.process_tax, totalAmount: vat_amount.total_tax },
        purchaseAmount: { amount: purchase_amount.amount, complete: true },
        details: [
          {
            category: 'Sales Invoices',
            totalCount: sales_invoices.total,
            succeeded: sales_invoices.succeeded,
            unsynced: sales_invoices.unsynced,
            succeededAmount: sales_invoices.finish_amount,
            unsyncedAmount: sales_invoices.process_amount,
            status: rateToStatus(sales_invoices.succeeded, sales_invoices.total),
          },
          {
            category: 'Credit Notes',
            totalCount: credit_notes.total,
            succeeded: credit_notes.succeeded,
            unsynced: credit_notes.unsynced,
            succeededAmount: credit_notes.finish_amount,
            unsyncedAmount: credit_notes.process_amount,
            status: rateToStatus(credit_notes.succeeded, credit_notes.total),
          },
          {
            category: 'Stock Items',
            totalCount: stock_items.total,
            succeeded: stock_items.succeeded,
            unsynced: stock_items.unsynced,
            succeededAmount: null,
            unsyncedAmount: null,
            status: rateToStatus(stock_items.succeeded, stock_items.total),
          },
          {
            category: 'Purchase Amount',
            totalCount: purchase_amount.count,
            succeeded: purchase_amount.count,
            unsynced: 0,
            succeededAmount: purchase_amount.amount,
            unsyncedAmount: 0,
            status: 'complete',
          },
        ],
      }
    },
    staleTime: 1000 * 60,
  })
}

// GET /api/zra/vsdc-status/ — real, live connectivity checks (not derived
// from local DB data): ZRA API HEAD probe, the VSDC app's own status page
// (version banner, service time, pending-invoice count for this TPIN/branch),
// and the ZRA gateway's own branch-sync status code/message. Ports
// zraindex.php's checkZRAApiStatus()/fetchZRAContent() and
// quicklinks_ajax.php's 'getzraresponse' action exactly — no derived/local
// substitute, since this is specifically a live-gateway health check.
export interface VsdcStatus {
  apiOnline: boolean
  tpinBranchCode: string
  vsdc: { logoUrl: string | null; title: string | null; serviceTime: string | null; pendingLine: string | null } | null
  syncStatus: { code: string | null; message: string | null } | null
  responseTimeMs: number
}
export function useVsdcStatus() {
  return useQuery({
    queryKey: ['zra', 'vsdc-status'],
    queryFn: async (): Promise<VsdcStatus> => {
      const start = performance.now()
      const { data } = await api.get<{ success: boolean; data: Omit<VsdcStatus, 'responseTimeMs'> }>('/zra/vsdc-status/')
      return { ...data.data, responseTimeMs: Math.round(performance.now() - start) }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

// POST /api/zra/sales-lookup/ — real, proxies custom/zra/saleszralist.php's
// own live lookup against the ZRA gateway's /trnsSales/selectInvoice
// endpoint. Read-only query (not a filing), safe to call and retry.
export interface SalesInvoiceLookup {
  found: boolean
  invoiceNumber?: string
  receiptNumber?: string
  receiptDate?: string
  internalData?: string
  receiptSignature?: string
  sdcId?: string
  mrcNumber?: string
  qrCodeUrl?: string
}
export function useSalesInvoiceLookup() {
  return useMutation({
    mutationFn: async (cisInvcNo: string) => {
      const { data } = await api.post<{ success: boolean; data: SalesInvoiceLookup }>('/zra/sales-lookup/', { cisInvcNo })
      return data.data
    },
  })
}

// POST /api/zra/customer-lookup/ — real, proxies custom/zra/customer.php's
// own live lookup against the ZRA gateway's /customers/selectCustomer
// endpoint, by customer TPIN. Read-only query, safe to call and retry.
export interface ZraCustomerRecord {
  tpin: string
  branchId: string
  customerNo: string
  taxpayerName: string
  customerTpin: string
  phone: string
  email: string
  address: string
}
export function useZraCustomerLookup() {
  return useMutation({
    mutationFn: async (tpin: string) => {
      const { data } = await api.post<{ success: boolean; data: { customers: ZraCustomerRecord[] } }>('/zra/customer-lookup/', { tpin })
      return data.data.customers
    },
  })
}

// GET /api/zra/item-details/ — real, proxies custom/zra/selectItems.php's
// own live lookup against the ZRA gateway's /items/selectItems endpoint —
// this business's own registered item master list. Real quirk preserved:
// the page's only filter field is labelled "Item Code" but is actually
// posted to ZRA as lastReqDt (format YYYYMMDDHHmmss), not an item code
// filter — see selectItems.php. Read-only, safe to call and retry.
export interface ZraItemDetail {
  itemName: string
  itemCode: string
  itemClassCode: string
  itemTypeCode: string
  originCountry: string
  packageUnit: string
  quantityUnit: string
  batchNumber: string
  price: number | null
  safetyQuantity: number | null
  vat: string
  ipl: string
  tl: string
  excise: string
}
export function useZraItemDetails(lastReqDt?: string) {
  return useQuery({
    queryKey: ['zra', 'item-details', lastReqDt ?? ''],
    queryFn: async (): Promise<{ resultCode: string | null; resultMessage: string | null; items: ZraItemDetail[] }> => {
      const { data } = await api.get<{ success: boolean; data: { resultCode: string | null; resultMessage: string | null; items: ZraItemDetail[] } }>(
        '/zra/item-details/',
        { params: lastReqDt ? { lastReqDt } : undefined },
      )
      return data.data
    },
    staleTime: 1000 * 30,
  })
}

// GET /api/zra/stock-list/ — real, proxies custom/zra/stocklist.php's own
// live lookup against the ZRA gateway's /stock/selectStockItems endpoint —
// this business's own reported stock movement history, grouped/aggregated
// by item code server-side exactly like the real page's own client-side
// groupAndAggregateItems(). Read-only, safe to call and retry.
export interface ZraStockMovementDetail {
  sno: number
  sarNo: string
  occurrenceDate: string
  itemSeq: number | null
  itemCode: string
  itemClassCode: string
  itemName: string
  packageUnit: string
  package: number | null
  quantityUnit: string
  quantity: number | null
  price: number | null
  supplyAmount: number | null
  totalDiscountAmount: number | null
  taxableAmount: number | null
  vat: string
  vatAmount: number | null
  totalAmount: number | null
}
export interface ZraStockListItem {
  sno: number
  itemCode: string
  itemClassCode: string
  itemName: string
  packageUnit: string
  quantityUnit: string
  quantity: number
  price: number | null
  supplyAmount: number
  vat: string
  details: ZraStockMovementDetail[]
}
export function useZraStockList() {
  return useQuery({
    queryKey: ['zra', 'stock-list'],
    queryFn: async (): Promise<{ resultCode: string | null; resultMessage: string | null; items: ZraStockListItem[] }> => {
      const { data } = await api.get<{ success: boolean; data: { resultCode: string | null; resultMessage: string | null; items: ZraStockListItem[] } }>(
        '/zra/stock-list/',
      )
      return data.data
    },
    staleTime: 1000 * 30,
  })
}
