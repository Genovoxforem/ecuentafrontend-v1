import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/axios'

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

// GET /api/zra/summary/ — real endpoint on the ecnta10 backend, queries
// llx_facture/llx_facture_fourn/llx_product directly. Response is
// {success, data: {salesInvoices, creditNotes, stockItems, purchaseAmount,
// vat, income}}, each of salesInvoices/creditNotes shaped
// {total,succeeded,unsynced,finishAmount,processAmount}, stockItems
// {total,succeeded,unsynced} (no amounts — stock has no monetary value here).
interface RawZraBucket {
  total: number
  succeeded: number
  unsynced: number
  finishAmount: number
  processAmount: number
}
interface RawZraStockBucket {
  total: number
  succeeded: number
  unsynced: number
}
interface RawZraSummaryData {
  salesInvoices: RawZraBucket
  creditNotes: RawZraBucket
  stockItems: RawZraStockBucket
  purchaseAmount: { count: number; amount: number }
  vat: { finishTax: number; processTax: number }
  income: { finishAmount: number; processAmount: number }
}
interface RawZraResponse {
  success: boolean
  data: RawZraSummaryData
}

// Thresholds classify our own succeeded/total ratio, matching the legacy
// dashboard's badge splits (sync_rate > 80 / > 50, per zraindex.php's
// updateTableRow) — separate from the live VSDC gateway probe (useVsdcStatus
// below), which is a real connectivity check, not a derived ratio.
function rateToStatus(succeeded: number, total: number): ZraSyncStatus {
  if (total <= 0) return 'complete'
  const rate = (succeeded / total) * 100
  if (rate > 80) return 'good'
  if (rate > 50) return 'fair'
  return 'poor'
}

function toSyncStat(bucket: RawZraBucket): ZraSyncStat {
  return {
    succeededAmount: bucket.finishAmount,
    unsyncedAmount: bucket.processAmount,
    totalAmount: bucket.finishAmount + bucket.processAmount,
  }
}

export function useZraSummary(year?: number) {
  return useQuery({
    queryKey: ['zra', 'summary', year ?? 'all'],
    queryFn: async (): Promise<ZraSummary> => {
      const { data } = await api.get<RawZraResponse>('/zra/summary/', { params: year ? { year } : undefined })
      const { salesInvoices, creditNotes, stockItems, purchaseAmount, vat, income } = data.data

      return {
        salesInvoices: toSyncStat(salesInvoices),
        creditNotes: toSyncStat(creditNotes),
        income: { succeededAmount: income.finishAmount, unsyncedAmount: income.processAmount, totalAmount: income.finishAmount + income.processAmount },
        vatAmount: { succeededAmount: vat.finishTax, unsyncedAmount: vat.processTax, totalAmount: vat.finishTax + vat.processTax },
        purchaseAmount: { amount: purchaseAmount.amount, complete: true },
        details: [
          {
            category: 'Sales Invoices',
            totalCount: salesInvoices.total,
            succeeded: salesInvoices.succeeded,
            unsynced: salesInvoices.unsynced,
            succeededAmount: salesInvoices.finishAmount,
            unsyncedAmount: salesInvoices.processAmount,
            status: rateToStatus(salesInvoices.succeeded, salesInvoices.total),
          },
          {
            category: 'Credit Notes',
            totalCount: creditNotes.total,
            succeeded: creditNotes.succeeded,
            unsynced: creditNotes.unsynced,
            succeededAmount: creditNotes.finishAmount,
            unsyncedAmount: creditNotes.processAmount,
            status: rateToStatus(creditNotes.succeeded, creditNotes.total),
          },
          {
            category: 'Stock Items',
            totalCount: stockItems.total,
            succeeded: stockItems.succeeded,
            unsynced: stockItems.unsynced,
            succeededAmount: null,
            unsyncedAmount: null,
            status: rateToStatus(stockItems.succeeded, stockItems.total),
          },
          {
            category: 'Purchase Amount',
            totalCount: purchaseAmount.count,
            succeeded: purchaseAmount.count,
            unsynced: 0,
            succeededAmount: purchaseAmount.amount,
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
