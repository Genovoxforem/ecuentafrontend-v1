import { useQuery, keepPreviousData } from '@tanstack/react-query'
import axios from 'axios'
import { parseVendorInvoiceListRow, type RawVendorInvoiceListRow } from '../vendorInvoices/vendorInvoiceListParser'
import { parsePendingSalesRow, type RawPendingSalesRow } from './pendingSalesParser'
import { parseAutomaticPurchaseRow, type RawAutomaticPurchaseRow } from './automaticPurchaseParser'
import { parseUnuploadedProductRow, type RawUnuploadedProductRow } from './unuploadedProductsParser'

// The /api/zra/* endpoints this whole file used to call (api/zra/purchases/,
// api/zra/customers/unuploaded/, api/zra/invoices/pending-sales/, etc.) do
// not exist on the active backend — their own header comments said "real,
// on the ecnta10 backend", a different WAMP instance than the one actually
// running (ecuenta9). Confirmed live: /api/zra/ 404s entirely, no such
// folder on disk. Real sources found instead by reading the backend
// directly, one per list — see each hook's own comment below.

interface ListParams {
  page: number
  perPage: number
  search?: string
}

// custom/zra/getpurchases_ajax.php — real, confirmed live (matches the
// "ZRA Purchases" page exactly: llx_zrapurchases WHERE purchasestatus='0',
// same "not yet actioned" filter as before). Rows are positional arrays of
// pre-formatted HTML, not keyed objects — see automaticPurchaseParser.ts.
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
      const { data } = await axios.post<{ recordsTotal: number; data: RawAutomaticPurchaseRow[] }>('/custom/zra/getpurchases_ajax.php', body)
      return { items: (data.data ?? []).map(parseAutomaticPurchaseRow), total: Number(data.recordsTotal) || 0 }
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
      const { data } = await axios.post<{ iTotalRecords: number; aaData: RawVendorInvoiceListRow[] }>('/fourn/facture/facture_ajax_list.php', body)
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
      return { items, total: Number(data.iTotalRecords) || 0 }
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
      })
      if (params.search) body.set('search[value]', params.search)
      const { data } = await axios.post<{ iTotalRecords: number; aaData: RawPendingSalesRow[] }>('/compta/facture/invoice_ajax_list.php', body)
      return { items: (data.aaData ?? []).map(parsePendingSalesRow), total: Number(data.iTotalRecords) || 0 }
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
      const { data } = await axios.post<{ iTotalRecords: number; aaData: RawUnuploadedProductRow[] }>('/product/allproducts_ajax.php', body)
      return { items: (data.aaData ?? []).map(parseUnuploadedProductRow), total: Number(data.iTotalRecords) || 0 }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}
