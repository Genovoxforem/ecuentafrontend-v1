import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { LEGACY_SESSION_EXPIRED_PREFIX } from '../../shared/components/BackendUnavailable'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { looksLikeZraLoginPage, extractEmbeddedJsonData, type ZraGatewayEnvelope } from './zraGatewayParser'

function textOf(doc: Document, selector: string): string {
  return (doc.querySelector(selector)?.textContent ?? '').trim()
}

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

// custom/zra/saleszralistajax.php?cisInvcNo=X — real, confirmed by reading
// that file directly: unconditionally calls zraworker::initialize() against
// the live ZRA gateway's /trnsSales/selectInvoice endpoint and prints a
// plain HTML fragment (no llxHeader, no JSON) with the receipt fields. The
// old /api/zra/sales-lookup/ this used to call was for the inactive ecnta10
// backend — confirmed dead here (404). Read-only query (not a filing),
// safe to call and retry — but every call is a real hit against Zambia's
// live tax gateway, not a local read.
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
    mutationFn: async (cisInvcNo: string): Promise<SalesInvoiceLookup> => {
      const doc = await fetchLegacyDocument('/custom/zra/saleszralistajax.php', new URLSearchParams({ cisInvcNo }))
      if (looksLikeZraLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const block = doc.querySelector('.zra-list-view')
      if (!block) return { found: false }
      return {
        found: true,
        invoiceNumber: textOf(doc, '.zra-list-view-body p:first-child span'),
        receiptNumber: textOf(doc, '#rcptNo'),
        receiptDate: textOf(doc, '#vsdcRcptPbctDate'),
        internalData: textOf(doc, '#intrlData'),
        receiptSignature: textOf(doc, '#rcptSign'),
        sdcId: textOf(doc, '#sdcId'),
        mrcNumber: textOf(doc, '#mrcNo'),
        qrCodeUrl: doc.querySelector('#qrCodeUrl')?.getAttribute('href') ?? undefined,
      }
    },
  })
}

// custom/zra/customer.php?formfilteraction=search&cisInvcNo=X (real param
// name, despite the label — confirmed by reading the file directly: it's
// read via GETPOST('cisInvcNo') and sent to ZRA as custmTpin) — real, live
// call to the ZRA gateway's /customers/selectCustomer endpoint. Unlike the
// Sales Invoice lookup, this is a full Dolibarr-chrome page (llxHeader),
// so results come back as <div class="accordion-item"> blocks to scrape,
// not JSON. The old /api/zra/customer-lookup/ this used to call is dead
// (inactive ecnta10 backend).
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
    mutationFn: async (tpin: string): Promise<ZraCustomerRecord[]> => {
      const doc = await fetchLegacyDocument('/custom/zra/customer.php', new URLSearchParams({ formfilteraction: 'search', cisInvcNo: tpin }))
      if (looksLikeZraLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      // Scoped to the real page's own #accordionPanelsStayOpenExample
      // container specifically — a bare '.accordion-item' also matches an
      // unrelated site-wide ticket-chat widget present on every Dolibarr
      // page, confirmed live (it shares the same Bootstrap accordion
      // classes and would otherwise be scraped as a fake "customer").
      return Array.from(doc.querySelectorAll('#accordionPanelsStayOpenExample .accordion-item')).map((item) => {
        const rows = Array.from(item.querySelectorAll('.accordion-body p span')).map((span) => (span.textContent ?? '').trim())
        const [customerTpin, branchId, customerNo, taxpayerName, tpinField, phone, email, address] = rows
        return {
          tpin: tpinField || customerTpin || '',
          branchId: branchId || '',
          customerNo: customerNo || '',
          taxpayerName: taxpayerName || '',
          customerTpin: customerTpin || '',
          phone: phone || '',
          email: email || '',
          address: address || '',
        }
      })
    },
  })
}

// custom/zra/selectItems.php?ZRA_dclRefNum=X — real, live call to the ZRA
// gateway's /items/selectItems endpoint (this business's own registered
// item master list). Confirmed by reading that file directly: a full
// Dolibarr-chrome page that embeds the entire gateway response as
// `var jsonData = {...}` in a <script> tag on every load — there's no
// separate ajax URL, so this scrapes that embedded blob (see
// zraGatewayParser.ts) rather than calling a JSON endpoint directly. Real
// quirk preserved: the page's only filter field is labelled "Item Code"
// but is actually sent to ZRA as lastReqDt (a date, not an item code) — see
// that file's own $postData. The old /api/zra/item-details/ this used to
// call is dead (inactive ecnta10 backend).
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
interface RawZraItem {
  itemNm?: string
  itemCd?: string
  itemClsCd?: string
  itemTyCd?: string
  orgnNatCd?: string
  pkgUnitCd?: string
  qtyUnitCd?: string
  btchNo?: string
  dftPrc?: string | number
  sftyQty?: string | number
  vatCatCd?: string
  iplCatCd?: string
  tlCatCd?: string
  exciseTxCatCd?: string
}
export function useZraItemDetails(lastReqDt?: string) {
  return useQuery({
    queryKey: ['zra', 'item-details', lastReqDt ?? ''],
    queryFn: async (): Promise<{ resultCode: string | null; resultMessage: string | null; items: ZraItemDetail[] }> => {
      const doc = await fetchLegacyDocument('/custom/zra/selectItems.php', lastReqDt ? new URLSearchParams({ ZRA_dclRefNum: lastReqDt }) : undefined)
      if (looksLikeZraLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const envelope = extractEmbeddedJsonData(doc) as (ZraGatewayEnvelope & { data?: { itemList?: RawZraItem[] } }) | null
      const itemList = envelope?.data?.itemList ?? []
      return {
        resultCode: envelope?.resultCd ?? null,
        resultMessage: envelope?.resultMsg ?? null,
        items: itemList.map((item) => ({
          itemName: item.itemNm ?? '',
          itemCode: item.itemCd ?? '',
          itemClassCode: item.itemClsCd ?? '',
          itemTypeCode: item.itemTyCd ?? '',
          originCountry: item.orgnNatCd ?? '',
          packageUnit: item.pkgUnitCd ?? '',
          quantityUnit: item.qtyUnitCd ?? '',
          batchNumber: item.btchNo ?? '',
          price: item.dftPrc != null ? Number(item.dftPrc) : null,
          safetyQuantity: item.sftyQty != null ? Number(item.sftyQty) : null,
          vat: item.vatCatCd ?? '',
          ipl: item.iplCatCd ?? '',
          tl: item.tlCatCd ?? '',
          excise: item.exciseTxCatCd ?? '',
        })),
      }
    },
    staleTime: 1000 * 30,
  })
}

// custom/zra/selectrrpItems.php?ZRA_dclRefNum=X — real, live call to the
// ZRA gateway's /items/selectRrpItems endpoint (Recommended Retail Price
// list). Same embedded-JSON-on-a-full-page pattern as Item Details above.
// No React page existed for this before at all (route was defined, never
// wired).
export interface ZraRrpItem {
  manufacturerTpin: string
  manufacturerName: string
  itemCode: string
  itemClassCode: string
  itemName: string
  originCountry: string
  packageUnit: string
  quantityUnit: string
  rrp: number | null
}
interface RawZraRrpItem {
  manufacturerTpin?: string
  manufacturerName?: string
  itemCd?: string
  itemClsCd?: string
  itemNm?: string
  orgnNatCd?: string
  pkgUnitCd?: string
  qtyUnitCd?: string
  rrp?: string | number
}
export function useZraRrpItems(lastReqDt?: string) {
  return useQuery({
    queryKey: ['zra', 'rrp-items', lastReqDt ?? ''],
    queryFn: async (): Promise<{ resultCode: string | null; resultMessage: string | null; items: ZraRrpItem[] }> => {
      const doc = await fetchLegacyDocument('/custom/zra/selectrrpItems.php', lastReqDt ? new URLSearchParams({ ZRA_dclRefNum: lastReqDt }) : undefined)
      if (looksLikeZraLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const envelope = extractEmbeddedJsonData(doc) as (ZraGatewayEnvelope & { data?: { itemList?: RawZraRrpItem[] } }) | null
      const itemList = envelope?.data?.itemList ?? []
      return {
        resultCode: envelope?.resultCd ?? null,
        resultMessage: envelope?.resultMsg ?? null,
        items: itemList.map((item) => ({
          manufacturerTpin: item.manufacturerTpin ?? '',
          manufacturerName: item.manufacturerName ?? '',
          itemCode: item.itemCd ?? '',
          itemClassCode: item.itemClsCd ?? '',
          itemName: item.itemNm ?? '',
          originCountry: item.orgnNatCd ?? '',
          packageUnit: item.pkgUnitCd ?? '',
          quantityUnit: item.qtyUnitCd ?? '',
          rrp: item.rrp != null ? Number(item.rrp) : null,
        })),
      }
    },
    staleTime: 1000 * 30,
  })
}

// custom/zra/rvat_agent.php?ZRA_dclRefNum=X — real, live call to the ZRA
// gateway's /trnsSales/selectPrincipals endpoint (registered RVAT agent
// principals). Same embedded-JSON-on-a-full-page pattern. No React page
// existed for this before at all.
export interface ZraPrincipal {
  id: string
  tpin: string
  tin: string
  name: string
  address: string
  email: string
  telephone: string
  registerDate: string
  modifyDate: string
  accountNo: string
}
interface RawZraPrincipal {
  id?: string | number
  tpin?: string
  tin?: string
  principalNm?: string
  principalAddress?: string
  principalEmail?: string
  principalTelNo?: string
  regDt?: string
  modDt?: string
  accountNo?: string
}
export function useZraPrincipals(lastReqDt?: string) {
  return useQuery({
    queryKey: ['zra', 'principals', lastReqDt ?? ''],
    queryFn: async (): Promise<{ resultCode: string | null; resultMessage: string | null; items: ZraPrincipal[] }> => {
      const doc = await fetchLegacyDocument('/custom/zra/rvat_agent.php', lastReqDt ? new URLSearchParams({ ZRA_dclRefNum: lastReqDt }) : undefined)
      if (looksLikeZraLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const envelope = extractEmbeddedJsonData(doc) as (ZraGatewayEnvelope & { data?: { taxpayerPrincipalList?: RawZraPrincipal[] } }) | null
      const list = envelope?.data?.taxpayerPrincipalList ?? []
      return {
        resultCode: envelope?.resultCd ?? null,
        resultMessage: envelope?.resultMsg ?? null,
        items: list.map((item) => ({
          id: String(item.id ?? ''),
          tpin: item.tpin ?? '',
          tin: item.tin ?? '',
          name: item.principalNm ?? '',
          address: item.principalAddress ?? '',
          email: item.principalEmail ?? '',
          telephone: item.principalTelNo ?? '',
          registerDate: item.regDt ?? '',
          modifyDate: item.modDt ?? '',
          accountNo: item.accountNo ?? '',
        })),
      }
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
