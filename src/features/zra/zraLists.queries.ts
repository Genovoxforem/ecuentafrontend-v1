import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from 'axios'
import { parseVendorInvoiceListRow, type RawVendorInvoiceListRow } from '../vendorInvoices/vendorInvoiceListParser'
import { parsePendingSalesRow, type RawPendingSalesRow } from './pendingSalesParser'
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

// compta/facture/invoice_ajax_list.php?invtype=pending — real, same
// zra_upload_error filter, confirmed by reading that file directly. See
// pendingSalesParser.ts for the (oddly-named) column mapping.
export type { PendingSalesRow as PendingSalesInvoiceRow } from './pendingSalesParser'
export function usePendingSalesList(params: ListParams) {
  return useQuery({
    queryKey: ['zra', 'pending-sales', params],
    queryFn: async () => {
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
      const { data } = await axios.post<{ iTotalRecords: number; iTotalDisplayRecords?: number; aaData: RawPendingSalesRow[] }>('/compta/facture/invoice_ajax_list.php', body)
      return { items: (data.aaData ?? []).map(parsePendingSalesRow), total: Number(data.iTotalDisplayRecords ?? data.iTotalRecords) || 0 }
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
