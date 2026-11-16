import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from 'axios'
import { fapiGet } from '../../api/fapiEnvelope'
import { preferNewApi } from '../salesOrders/orderApi'
import { parseVendorInvoiceListRow, type RawVendorInvoiceListRow } from '../vendorInvoices/vendorInvoiceListParser'
import { parsePendingSalesRow, type RawPendingSalesRow, type PendingSalesRow } from './pendingSalesParser'
import { parseAutomaticPurchaseRow, type RawAutomaticPurchaseRow } from './automaticPurchaseParser'
import { parseUnuploadedProductRow, type RawUnuploadedProductRow } from './unuploadedProductsParser'

// There is no /api/zra/ on the active backend (it 404s entirely); each list
// below reads its own backend source — see each hook's own comment.

interface ListParams {
  page: number
  perPage: number
  search?: string
}

// custom/zra/getpurchases_ajax.php — the "ZRA Purchases" page's source:
// llx_zrapurchases WHERE purchasestatus='0' ("not yet actioned"). Rows are
// positional arrays of pre-formatted HTML, not keyed objects — see
// automaticPurchaseParser.ts.
export type { AutomaticPurchaseRow } from './automaticPurchaseParser'
export function useAutomaticPurchaseList(params: ListParams) {
  return useQuery({
    queryKey: ['zra', 'purchases', params],
    queryFn: async () => {
      const body = new URLSearchParams({
        draw: '1',
        start: String((params.page - 1) * params.perPage),
        length: String(params.perPage),
      })
      if (params.search) body.set('search[value]', params.search)
      const { data } = await axios.post<{ recordsTotal: number; recordsFiltered?: number; data: RawAutomaticPurchaseRow[] }>('/custom/zra/getpurchases_ajax.php', body)
      // recordsTotal ignores the search; the pager needs the filtered count (live: search "UNO" -> 14 of 1102).
      return { items: (data.data ?? []).map(parseAutomaticPurchaseRow), total: Number(data.recordsFiltered ?? data.recordsTotal) || 0 }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

// fourn/facture/facture_ajax_list.php?invtype=pending — the exact same
// real endpoint already wired for the main Purchase Invoices list this
// session (see vendorInvoices/vendorInvoiceListParser.ts), just with the
// real invtype=pending filter this file itself defines (WHERE
// zra_upload_error != '000' OR IS NULL — confirmed by reading the file).
export interface PendingPurchaseInvoiceRow {
  id: number | null
  ref: string
  refVendor: string | null
  invoiceDate: string
  dueDate: string | null
  thirdParty: string
  thirdPartyAlias: string | null
  paymentType: string | null
  amountExclTax: number
  vat: number
  amountInclTax: number
  status: string
  zraSucceeded: boolean
  zraStatusMessage: string
}
export function usePendingPurchasesList(params: ListParams) {
  return useQuery({
    queryKey: ['zra', 'pending-purchases', params],
    queryFn: async () => {
      const body = new URLSearchParams({
        draw: '1',
        start: String((params.page - 1) * params.perPage),
        length: String(params.perPage),
        invtype: 'pending',
        'columns[0][data]': 'ref',
      })
      if (params.search) body.set('search[value]', params.search)
      const { data } = await axios.post<{ iTotalRecords: number; iTotalDisplayRecords: number; aaData: RawVendorInvoiceListRow[] }>(
        '/fourn/facture/facture_ajax_list.php',
        body,
      )
      const items: PendingPurchaseInvoiceRow[] = (data.aaData ?? []).map(parseVendorInvoiceListRow).map((r) => ({
        id: r.id,
        ref: r.ref,
        refVendor: r.refSupplier,
        invoiceDate: r.invoiceDate,
        dueDate: r.dueDate || null,
        thirdParty: r.thirdPartyName ?? '',
        thirdPartyAlias: r.thirdPartySubtitle || null,
        paymentType: r.paymentTypeLabel,
        amountExclTax: r.amountHt,
        vat: r.amountVat,
        amountInclTax: r.amountTtc,
        status: r.statusLabel,
        zraSucceeded: /success/i.test(r.zraStatus ?? ''),
        zraStatusMessage: r.zraStatus ?? '',
      }))
      // This endpoint's own iTotalRecords is just the count of rows in this
      // page's aaData (always equals the requested `length`, e.g. 25 when 77
      // pending rows exist across 4 pages) — the filtered total pagination
      // must be built from is iTotalDisplayRecords.
      return { items, total: Number(data.iTotalDisplayRecords) || 0 }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

export interface FapiSalesItem {
  id: number
  ref: string
  ref_client?: string | null
  type_label?: string | null
  customer?: {
    id?: number
    name?: string
    tpin?: string
  } | null
  total_ht?: number | string
  total_ttc?: number | string
  invoice_status?: number
  paid?: number
  due_date?: number | string | null
  city?: string | null
  payment_type?: string | null
  payment_terms?: string | null
  author?: string | null
  date?: string | number | null
  date_invoice?: string | number | null
  invoice_date?: string | number | null
  status_label?: string | null
  currency?: string | null
  zra?: {
    code?: string | number | null
    state?: string | null
  } | null
}

export interface FapiSalesListResponse {
  items?: FapiSalesItem[]
  pagination?: {
    page?: number
    limit?: number
    total?: number
    pages?: number
  }
  totals?: unknown
}

function formatDateValue(val: number | string | null | undefined): string | null {
  if (val == null || val === '' || val === '-') return null
  if (typeof val === 'number') {
    const d = new Date(val < 1e11 ? val * 1000 : val)
    if (Number.isNaN(d.getTime())) return null
    const iso = d.toISOString().slice(0, 10)
    const [y, m, day] = iso.split('-')
    return `${m}/${day}/${y}`
  }
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(val)
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`
  return val
}

function initialsOfName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase()
}

export function fapiSalesToPendingRow(item: FapiSalesItem): PendingSalesRow {
  const ht = Number(item.total_ht) || 0
  const ttc = Number(item.total_ttc) || 0
  const vat = Math.round((ttc - ht) * 100) / 100
  const zraCode = item.zra?.code != null ? String(item.zra.code) : ''
  const zraState = item.zra?.state ?? ''
  const zraMessage = zraState ? (zraCode ? `${zraState} (${zraCode})` : zraState) : zraCode
  const zraSucceeded = zraState.toLowerCase() === 'success' || zraCode === '000'

  const status =
    item.status_label ||
    (item.paid === 1 || item.invoice_status === 2
      ? 'Paid'
      : item.invoice_status === 0
        ? 'Draft'
        : item.invoice_status === 1
          ? 'Not paid'
          : item.type_label || '')

  const invDate = formatDateValue(item.date ?? item.invoice_date ?? item.date_invoice) ?? ''

  return {
    id: item.id ?? null,
    ref: item.ref ?? '',
    refNote: item.ref_client ? `ref: ${item.ref_client}` : '',
    refHref: item.id ? `/compta/facture/card.php?id=${item.id}` : null,
    refTip: null,
    invoiceDate: invDate,
    dueDate: formatDateValue(item.due_date),
    thirdParty: item.customer?.name ?? '',
    thirdPartyHref: item.customer?.id ? `/societe/card.php?socid=${item.customer.id}` : null,
    thirdPartyInitials: initialsOfName(item.customer?.name ?? ''),
    thirdPartyCode: item.customer?.tpin ? `TPIN: ${item.customer.tpin}` : '',
    thirdPartyTip: null,
    city: item.city || null,
    paymentType: item.payment_type || null,
    paymentTerms: item.payment_terms || null,
    amountExclTax: ht,
    vat,
    amountInclTax: ttc,
    author: item.author ?? '',
    authorHref: null,
    authorInitials: initialsOfName(item.author ?? ''),
    authorTip: null,
    status,
    currency: item.currency ?? 'ZMW',
    zraSucceeded,
    zraStatusMessage: zraMessage,
    zraRefreshRef: item.ref ?? null,
  }
}

// custom/zra/fapi/sales_list.php — JSON list of pending sales invoices (AN-172: carries due_date, city,
// payment_type, payment_terms and author). Falls back to compta/facture/invoice_ajax_list.php when unrouted.
export type { PendingSalesRow as PendingSalesInvoiceRow } from './pendingSalesParser'
export function usePendingSalesList(params: ListParams) {
  return useQuery({
    queryKey: ['zra', 'pending-sales', params],
    queryFn: async () => {
      return preferNewApi(
        'zra-pending-sales-list',
        async () => {
          const d = await fapiGet<FapiSalesListResponse>('/custom/zra/fapi/sales_list.php', {
            page: params.page,
            limit: params.perPage,
            search: params.search || undefined,
          })
          const items: PendingSalesRow[] = (d.items ?? []).map(fapiSalesToPendingRow)
          return { items, total: Number(d.pagination?.total) || items.length }
        },
        async () => {
          const body = new URLSearchParams({
            draw: '1',
            start: String((params.page - 1) * params.perPage),
            length: String(params.perPage),
            invtype: 'pending',
            // Newest invoice date first, as the classic list opens (column 2 = Invoice Date).
            'order[0][column]': '2',
            'order[0][dir]': 'desc',
          })
          if (params.search) body.set('search[value]', params.search)
          const { data } = await axios.post<{ iTotalRecords: number; iTotalDisplayRecords?: number; aaData: RawPendingSalesRow[] }>(
            '/compta/facture/invoice_ajax_list.php',
            body,
          )
          return { items: (data.aaData ?? []).map(parsePendingSalesRow), total: Number(data.iTotalDisplayRecords ?? data.iTotalRecords) || 0 }
        },
      )
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

// product/allproducts_ajax.php?zrastatus=unupload — real, confirmed by
// reading that file directly (WHERE p.zracode != '000' OR p.zracode IS
// NULL). This page never had a backend wired at all before (not even on
// the old ecnta10 instance), so this is a fresh build rather than a
// dead-endpoint fix.
export type { UnuploadedProductRow } from './unuploadedProductsParser'
export function useUnuploadedProductsList(params: ListParams) {
  return useQuery({
    queryKey: ['zra', 'unuploaded-products', params],
    queryFn: async () => {
      const body = new URLSearchParams({
        draw: '1',
        start: String((params.page - 1) * params.perPage),
        length: String(params.perPage),
        zrastatus: 'unupload',
        'columns[0][data]': 'label',
      })
      if (params.search) body.set('search[value]', params.search)
      const { data } = await axios.post<{ iTotalRecords: number; iTotalDisplayRecords?: number; aaData: RawUnuploadedProductRow[] }>('/product/allproducts_ajax.php', body)
      // Live: with length=10, iTotalRecords is 10 (this page) while iTotalDisplayRecords is the real 14.
      return { items: (data.aaData ?? []).map(parseUnuploadedProductRow), total: Number(data.iTotalDisplayRecords ?? data.iTotalRecords) || 0 }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}
