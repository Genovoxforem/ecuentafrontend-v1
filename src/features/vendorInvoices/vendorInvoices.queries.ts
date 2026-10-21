import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createVendorInvoice } from './vendorInvoiceFapi'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchThirdPartySummary } from '../../api/customers'

// The Purchase Invoices views (All / Manual / Automatic / Expense / Imports) and the status filters of its menu,
// each applied by the server (fourn/facture/fapi/list.php). The Expense view needs llx_facture_fourn.internal_exp,
// which the list does not return.
export type VendorInvoiceStatus =
  | 'all'
  | 'manual'
  | 'automatic'
  | 'expense'
  | 'imports'
  | 'draft'
  | 'validated'
  | 'succeeded'
  | 'notSucceeded'
  | 'paid'
  | 'unpaid'
  | 'abandoned'

export interface VendorInvoiceRow {
  id: number | null
  ref: string
  refSupplier: string | null
  invoiceDate: string | null
  dueDate: string
  thirdPartyId: number | null
  thirdPartyName: string | null
  thirdPartySubtitle: string
  paymentTypeLabel: string | null
  amountHt: number
  amountVat: number
  amountTtc: number
  saleTypeCode: string | null
  registrationTypeCode: string | null
  statusCode: number
  // The classic badge's own wording (Draft / Not paid / Started / Paid / Abandoned) and badge number.
  statusLabel: string
  statusBadge: number | null
  currency: string
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
  return row.statusLabel || STATUS_LABELS[row.statusCode] || 'Unknown'
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// fourn/facture/fapi/list.php: the five views (all, manual, automatic, expense, imports) and the status
// filters are applied by the server, so each tab is its own call.
const FAPI_VIEW: Partial<Record<VendorInvoiceStatus, string>> = { all: 'all', manual: 'manual', automatic: 'automatic', expense: 'expense', imports: 'imports' }
const FAPI_STATUS: Partial<Record<VendorInvoiceStatus, string>> = { draft: 'draft', validated: 'validated', succeeded: 'zra_ok', notSucceeded: 'zra_failed', paid: 'paid', unpaid: 'unpaid', abandoned: 'abandoned' }

function usDate(value: unknown): string {
  const m = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})/) : null
  return m ? `${m[1]}-${m[2]}-${m[3]}` : typeof value === 'string' ? value : ''
}

function rowFromFapi(o: any): VendorInvoiceRow {
  const paid = Boolean(Number(o.paid ?? o.paye))
  const code = o.status == null ? (paid ? 2 : 1) : Number(o.status)
  return {
    id: Number(o.id) || null,
    ref: o.ref ?? '',
    refSupplier: o.ref_supplier ?? null,
    invoiceDate: usDate(o.date ?? o.date_invoice) || null,
    dueDate: usDate(o.date_due ?? o.date_lim_reglement),
    thirdPartyId: o.supplier?.id != null ? Number(o.supplier.id) : o.socid != null ? Number(o.socid) : null,
    thirdPartyName: o.supplier?.name ?? o.supplier_name ?? null,
    thirdPartySubtitle: [o.supplier?.code, o.supplier?.town].filter(Boolean).join(' · '),
    paymentTypeLabel: o.payment_mode_label ?? o.payment_type ?? null,
    amountHt: Number(o.total_ht) || 0,
    amountVat: Number(o.total_tva) || 0,
    amountTtc: Number(o.total_ttc) || 0,
    saleTypeCode: o.sale_type_code ?? o.sar_ty_cd ?? null,
    registrationTypeCode: o.registration_type_code ?? o.reg_ty_cd ?? null,
    statusCode: code,
    statusLabel: o.status_label ?? STATUS_LABELS[code] ?? '',
    statusBadge: null,
    currency: o.currency ?? '',
    paye: paid || code === 2,
    zraStatus: o.zra_status ?? null,
  }
}

async function fetchViaFapi(status: VendorInvoiceStatus, search: string, dateRange?: { from: string; to: string }): Promise<VendorInvoicesPayload> {
  const base: Record<string, string | number | undefined> = {
    view: FAPI_VIEW[status] ?? 'all',
    status: FAPI_STATUS[status],
    search: search || undefined,
    date_from: dateRange?.from || undefined,
    date_to: dateRange?.to || undefined,
    sort: 'date',
    direction: 'desc',
  }
  const items: any[] = []
  let summary: any = null
  let pages = 1
  for (let page = 1; page <= pages && page <= 50; page += 1) {
    const d = await fapiGet<any>('/fourn/facture/fapi/list.php', { ...base, page, limit: 100 })
    summary ??= d.summary
    pages = d.pages ?? 1
    items.push(...(d.items ?? []))
  }
  // The classic cards: how many vendors, how many invoices and the automatic / manual totals (the "all" view's own).
  const [vendors, automatic, manual] = await Promise.all([
    fetchThirdPartySummary('vendor').catch(() => null),
    status === 'all' ? fapiGet<any>('/fourn/facture/fapi/list.php', { view: 'automatic', limit: 1 }).catch(() => null) : null,
    status === 'all' ? fapiGet<any>('/fourn/facture/fapi/list.php', { view: 'manual', limit: 1 }).catch(() => null) : null,
  ])
  const rows = items.map(rowFromFapi)
  return {
    items: rows,
    total: Number(summary?.count ?? rows.length) || rows.length,
    summary: {
      suppliers: Number((vendors as any)?.total_vendors ?? (vendors as any)?.total) || 0,
      invoices: Number(summary?.count) || rows.length,
      automaticAmount: Number(automatic?.summary?.total_amount) || rows.filter((r) => r.registrationTypeCode === 'A').reduce((sum, r) => sum + r.amountTtc, 0),
      manualAmount: Number(manual?.summary?.total_amount) || rows.filter((r) => r.registrationTypeCode === 'M').reduce((sum, r) => sum + r.amountTtc, 0),
    },
  }
}

export function useVendorInvoices(status: VendorInvoiceStatus, search = '', dateRange?: { from: string; to: string }) {
  const datefilter = dateRange?.from && dateRange.to ? `${dateRange.from} - ${dateRange.to}` : ''
  return useQuery({
    queryKey: ['vendor-invoices', status, search, datefilter],
    queryFn: (): Promise<VendorInvoicesPayload> => fetchViaFapi(status, search, dateRange),
    placeholderData: (prev) => prev,
  })
}

// The warehouse a validated purchase invoice dispatches its product lines into (it drives the stock movement), from
// fourn/commande/fapi/form_options.php (the entity's warehouses).
export interface WarehouseOption {
  id: string
  label: string
}

export function useWarehouseOptionsForPurchaseInvoice() {
  return useQuery({
    queryKey: ['vendor-invoices', 'warehouseOptions'],
    queryFn: async (): Promise<WarehouseOption[]> =>
      (await fapiGet<{ warehouses: Array<{ value: number | string; label: string }> }>('/fourn/commande/fapi/form_options.php')).warehouses.map((w) => ({ id: String(w.value), label: w.label })),
    staleTime: 1000 * 60 * 10,
  })
}

// Bank accounts for the payment, from the same form_options.php.
export interface BankAccountOption {
  id: string
  label: string
}
export function useBankAccountOptions() {
  return useQuery({
    queryKey: ['vendor-invoices', 'bankAccountOptions'],
    queryFn: async (): Promise<BankAccountOption[]> =>
      (await fapiGet<{ bank_accounts: Array<{ value: number | string; label: string }> }>('/fourn/commande/fapi/form_options.php')).bank_accounts.map((b) => ({ id: String(b.value), label: b.label })),
    staleTime: 1000 * 60 * 10,
  })
}

export function usePaymentModeOptions() {
  return useQuery({
    queryKey: ['vendor-invoices', 'paymentModeOptions'],
    queryFn: async (): Promise<BankAccountOption[]> =>
      (await fapiGet<{ payment_modes: Array<{ value: number | string; label: string }> }>('/fourn/commande/fapi/form_options.php')).payment_modes.map((m) => ({ id: String(m.value), label: m.label })),
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
  refSupplier: string
  // yyyy-mm-dd; blank = the server's own default (today / terms-based due date).
  date?: string
  dueDate?: string
  paymentTermId?: string
  incotermId?: string
  incotermLocation?: string
  fkAccount: string
  modeReglementId: string
  warehouseId: string
  lines: NewVendorInvoiceLine[]
  // Save as Invoice validates the draft inside the same transaction; Save as Draft leaves it a draft.
  validate: boolean
}

// POST fourn/facture/fapi/create.php: the header, every line and the optional validation in one
// transaction (the old supplier_invoice_lines_api.php committed the header first and left an orphan
// draft when the lines failed). A duplicate ref_supplier for the same supplier is a 409 naming the
// existing invoice; a vendor that is not flagged as a supplier, or a missing socid, is a 422.
export function useCreateVendorInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewVendorInvoiceInput) => {
      const num = (v: string) => (v ? Number(v) : undefined)
      return createVendorInvoice({
        socid: Number(input.vendorId),
        ref_supplier: input.refSupplier,
        type: 0,
        date: input.date || undefined,
        date_due: input.dueDate || undefined,
        payment_term_id: num(input.paymentTermId ?? ''),
        incoterm_id: num(input.incotermId ?? ''),
        location_incoterms: input.incotermLocation || undefined,
        payment_mode_id: num(input.modeReglementId),
        fk_account: num(input.fkAccount),
        lines: input.lines.map((l) => ({
          product_id: l.productId ? Number(l.productId) : undefined,
          description: l.label,
          qty: l.qty,
          pu_ht: l.unitPriceHt,
          tva_tx: l.vatRate,
          product_type: l.productType ?? 0,
          remise_percent: l.discPercent ?? 0,
          ref_supplier: l.supplierRef || undefined,
        })),
        validate: input.validate,
        warehouse_id: num(input.warehouseId),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-invoices'] })
    },
  })
}
