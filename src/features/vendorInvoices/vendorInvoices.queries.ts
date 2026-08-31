import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../api/axios'
import { parseVendorInvoiceListRow, type RawVendorInvoiceListRow } from './vendorInvoiceListParser'

export type VendorInvoiceStatus = 'all' | 'paid' | 'unpaid' | 'manual' | 'automatic'

export interface VendorInvoiceRow {
  id: number | null
  ref: string
  refSupplier: string | null
  invoiceDate: string | null
  thirdPartyId: number | null
  thirdPartyName: string | null
  paymentTypeLabel: string | null
  amountHt: number
  amountVat: number
  amountTtc: number
  saleTypeCode: string | null
  registrationTypeCode: string | null
  statusCode: number
  paye: boolean
  zraStatus: string | null
}

export interface VendorInvoicesSummary {
  suppliers: number
  invoices: number
  automaticAmount: number
  manualAmount: number
}

interface VendorInvoicesPayload {
  items: VendorInvoiceRow[]
  total: number
  summary: VendorInvoicesSummary
}

const STATUS_LABELS: Record<number, string> = { 0: 'Draft', 1: 'Not Paid', 2: 'Paid', 3: 'Abandoned' }
export function vendorInvoiceStatusLabel(row: VendorInvoiceRow) {
  return STATUS_LABELS[row.statusCode] ?? 'Unknown'
}

interface FactureAjaxListResponse {
  iTotalRecords: number
  aaData: RawVendorInvoiceListRow[]
}

// The /api/purchase-invoices/ this hook used to call (api/purchase-invoices/
// index.php) does not exist on the active backend — confirmed live (404),
// same situation as Contacts' old /api/contacts/. Real source found by
// reading the backend directly: fourn/facture/facture_ajax_list.php, a
// genuine, rich DataTables endpoint over llx_facture_fourn (confirmed live
// — real Sale Type Code/Registration Type Code/ZRA status matching the
// actual "Purchase Invoices" legacy page). length=-1 fetches every row in
// one call; Suppliers/Invoices/Automatic/Manual stat cards are computed the
// same way the rest of this app does it:
//  - Invoices: iTotalRecords from this same response.
//  - Suppliers: real societe/api/societes.php?action=stats ("suppliers"
//    field), confirmed live to match the legacy page's own count exactly.
//  - Automatic/Manual: summed client-side from rows whose Registration Type
//    Code (f.regTyCd) is 'A' or 'M' — the real column backing that exact
//    toolbar distinction on the legacy page (most rows are '-', neither).
function statusCodeFromLabel(label: string, paye: boolean): number {
  const l = label.toLowerCase()
  if (l.includes('abandon')) return 3
  if (l.includes('draft')) return 0
  if (paye || l === 'paid') return 2
  return 1
}

export function useVendorInvoices(status: VendorInvoiceStatus, search = '', page = 1, limit = 500) {
  return useQuery({
    queryKey: ['vendor-invoices', status, search, page, limit],
    queryFn: async (): Promise<VendorInvoicesPayload> => {
      const body = new URLSearchParams({
        draw: '1',
        start: '0',
        length: '-1',
        'columns[0][data]': 'ref',
        'order[0][column]': '0',
        'order[0][dir]': 'desc',
      })
      if (search) body.set('search[value]', search)
      const [{ data: listData }, { data: statsData }] = await Promise.all([
        axios.post<FactureAjaxListResponse>('/fourn/facture/facture_ajax_list.php', body),
        axios.get<{ ok: boolean; stats: { suppliers: number } }>('/societe/api/societes.php', { params: { action: 'stats' } }),
      ])

      const parsed = (listData.aaData ?? []).map(parseVendorInvoiceListRow)
      const rows: VendorInvoiceRow[] = parsed.map((r) => ({
        id: r.id,
        ref: r.ref,
        refSupplier: r.refSupplier,
        invoiceDate: r.invoiceDate,
        thirdPartyId: null,
        thirdPartyName: r.thirdPartyName,
        paymentTypeLabel: r.paymentTypeLabel,
        amountHt: r.amountHt,
        amountVat: r.amountVat,
        amountTtc: r.amountTtc,
        saleTypeCode: r.saleTypeCode,
        registrationTypeCode: r.registrationTypeCode,
        statusCode: statusCodeFromLabel(r.statusLabel, r.paye),
        paye: r.paye,
        zraStatus: r.zraStatus,
      }))

      const items = rows.filter((r) => {
        if (status === 'paid') return r.statusCode === 2
        if (status === 'unpaid') return r.statusCode === 1
        if (status === 'manual') return r.registrationTypeCode === 'M'
        if (status === 'automatic') return r.registrationTypeCode === 'A'
        return true
      })

      const automaticAmount = rows.filter((r) => r.registrationTypeCode === 'A').reduce((sum, r) => sum + r.amountTtc, 0)
      const manualAmount = rows.filter((r) => r.registrationTypeCode === 'M').reduce((sum, r) => sum + r.amountTtc, 0)

      return {
        items,
        total: items.length,
        summary: {
          suppliers: statsData.stats?.suppliers ?? 0,
          invoices: listData.iTotalRecords ?? rows.length,
          automaticAmount,
          manualAmount,
        },
      }
    },
    placeholderData: (prev) => prev,
  })
}

// fourn/facture/purchase.php renders Warehouse as a real <select
// name="warehouse_id"> via formproduct->selectWarehouses() straight off
// llx_entrepot (8 real warehouses on this DB, confirmed via direct query) —
// scraped the same way Quotations' Availability/Reason/Payment Terms
// dictionaries come off comm/propal/index_v2.php's own real <select>s. This
// one isn't just a display dictionary: supplier_invoice_lines_api.php's
// validateInvoice actually passes warehouse_id into
// FactureFournisseur::validate($user, '', $warehouse), which drives real
// stock dispatch for product-type lines — confirmed by reading that file.
export interface WarehouseOption {
  id: string
  label: string
}
export function useWarehouseOptionsForPurchaseInvoice() {
  return useQuery({
    queryKey: ['vendor-invoices', 'warehouseOptions'],
    queryFn: async (): Promise<WarehouseOption[]> => {
      const res = await fetch('/fourn/facture/purchase.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
      const select = doc.querySelector('select[name="warehouse_id"]')
      if (!select) return []
      return Array.from(select.querySelectorAll('option'))
        .map((o) => ({ id: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
        .filter((o) => o.id && o.id !== '0' && o.id !== '-1')
    },
    staleTime: 1000 * 60 * 10,
  })
}

// GET /api/bank_accounts.php — real, session-cookie authenticated dictionary
// (llx_bank_account WHERE clos = 0) — same pattern as payment_types.php:
// the file itself only checks main.inc.php's session (no X-API-Key check
// at all), but going through the `api` instance is harmless since every
// request stays same-origin anyway (its X-API-Key header is simply unread).
export interface BankAccountOption {
  id: string
  label: string
}
export function useBankAccountOptions() {
  return useQuery({
    queryKey: ['dictionary', '/bank_accounts.php'],
    queryFn: async (): Promise<BankAccountOption[]> => {
      const { data } = await api.get<{ success: boolean; results: Array<{ id: string; text: string }> }>('/bank_accounts.php')
      return data.success ? data.results.map((r) => ({ id: String(r.id), label: r.text })) : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export interface NewVendorInvoiceLine {
  productId?: string
  supplierRef?: string
  label: string
  qty: number
  unitPriceHt: number
  vatRate: number
  discPercent?: number
  productType?: number
}

export interface NewVendorInvoiceInput {
  vendorId: string
  refSupplier?: string
  fkAccount: string
  modeReglementId: string
  warehouseId: string
  lines: NewVendorInvoiceLine[]
  // Real grndetails JSON fields — see validateInvoice's handling below.
  shipment?: {
    shipmentvia?: string
    shipmentdate?: string
    shipmentaddress?: string
    trackingid?: string
    gdnno?: string
    grnno?: string
    transporter?: string
    truck_details?: string
  }
}

interface VendorInvoiceApiResponse {
  success: boolean
  message?: string
  data?: { id: number; ref: string }
}

// fourn/facture/api/supplier_invoice_lines_api.php?action=validateInvoice —
// CONFIRMED BROKEN for a genuinely new invoice, live-tested end-to-end on
// 2026-08-29 (not just read from source): POSTing action=validateInvoice
// with invoice_id=0 really does create a draft FactureFournisseur header
// (verified directly in llx_facture_fourn — a real row appeared), but the
// very next step inside that same request — handing off to
// handleSaveCachedLines() to save the lines — fails with {"success":false,
// "message":"Invoice not found"} even though the invoice unquestionably
// exists. It isn't a stale-invoice-id artifact either: a completely fresh
// follow-up call (action=getLines, or action=validateInvoice again) using
// that invoice's own real, confirmed rowid still returns the identical
// "Invoice not found" — so FactureFournisseur::fetch() itself is refusing
// to load this record through this API file, for a reason not pinned down
// further than that. Net effect: every real "Save as Invoice" attempt
// leaves behind an orphaned, lineless Draft invoice and never completes.
// (The stray (PROV153) row this produced during testing was deleted
// directly from the DB afterward — a clean, zero-line, zero-amount
// artifact, not a real business record.)
//
// "Save as Draft" for a brand-new invoice was already known broken (the
// legacy page's own JS calls action=saveCachedLines directly with
// invoice_id=0, which 400s before ever creating one — confirmed live,
// {"success":false,"message":"Invalid parameters"}, no side effects). With
// this finding, there is now no real working path at all to create a
// vendor invoice from a blank slate through this API — see
// DetailedPurchaseCreateForm.tsx / QuickPurchaseCreateForm.tsx for how the
// UI offers the real, working legacy page instead of pretending either
// button works.
export function useCreateVendorInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewVendorInvoiceInput) => {
      const body = new URLSearchParams()
      body.set('action', 'validateInvoice')
      body.set('invoice_id', '0')
      body.set('socid', input.vendorId)
      body.set('ref_supplier', input.refSupplier ?? '')
      body.set('fk_account', input.fkAccount)
      body.set('mode_reglement_id', input.modeReglementId)
      body.set('warehouse_id', input.warehouseId)
      body.set(
        'lines',
        JSON.stringify(
          input.lines.map((l) => ({
            is_cached: true,
            product_id: l.productId ? Number(l.productId) : 0,
            product_type: l.productType ?? 0,
            desc: l.label,
            qty: l.qty,
            price_ht: l.unitPriceHt,
            vat_rate: String(l.vatRate),
            discount_percent: l.discPercent ?? 0,
            dis_type: 1,
            fourn_ref: l.supplierRef ?? '',
          })),
        ),
      )
      if (input.shipment) {
        for (const [key, value] of Object.entries(input.shipment)) {
          if (value) body.set(key, value)
        }
      }

      const res = await fetch('/fourn/facture/api/supplier_invoice_lines_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: VendorInvoiceApiResponse = await res.json()
      if (!data.success) throw new Error(data.message || 'Failed to create purchase invoice')
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-invoices'] })
    },
  })
}
