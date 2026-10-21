import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { statusLabelFor } from './purchaseOrderTypes'
import type { PurchaseOrderAvailableActions, PurchaseOrderCard, PurchaseOrderLineDetail } from './purchaseOrderTypes'

// fourn/commande/fapi/* — the supplier-order JSON layer (form_options, get, actions, dispatch,
// stats and the notes/contacts/documents/agenda tabs). It sits on CommandeFournisseur itself, so
// the lifecycle rules, stock movements and rights are the business class's own.

export const PO_BASE = '/fourn/commande/fapi'

export interface FormChoice {
  value: number | string
  label: string
  code?: string
  ref?: string
  currency?: string
  for_debit?: boolean
}

export interface PurchaseOrderFormOptions {
  suppliers: FormChoice[]
  payment_terms: FormChoice[]
  payment_modes: FormChoice[]
  bank_accounts: FormChoice[]
  projects: FormChoice[]
  currencies: FormChoice[]
  incoterms: FormChoice[]
  warehouses: FormChoice[]
  supplier: { id: number; name: string; code: string } | null
  defaults: {
    socid: number | null
    order_date: string
    payment_term_id: number
    payment_mode_id: number
    bank_account_id: number
    project_id: number
    currency_code: string
    incoterm_id: number
    warehouse_id: number
  }
  // Which step produced each default ("supplier (cond_reglement_supplier_id)", "none", ...).
  defaults_resolved_from: Record<string, string>
  settings: { multicurrency_enabled: boolean; project_enabled: boolean; stock_enabled: boolean; incoterms_enabled: boolean; can_create: boolean }
}

// With a socid the defaults come back resolved for that supplier (payment terms, mode, bank).
export function usePurchaseOrderFormOptions(socid?: string) {
  return useQuery<PurchaseOrderFormOptions>({
    queryKey: ['purchaseOrders', 'formOptions', socid ?? ''],
    queryFn: () => fapiGet<PurchaseOrderFormOptions>(`${PO_BASE}/form_options.php`, socid ? { socid } : undefined),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}

export interface PurchaseOrderActionState {
  action: string
  allowed: boolean
  reason: string
}

export interface PurchaseOrderReceiptLine {
  lineId: number
  ordered: number
  received: number
  remaining: number
  complete: boolean
}

// The card plus what the server says can be done to it now.
export type PurchaseOrderCardFull = PurchaseOrderCard & {
  actionStates: PurchaseOrderActionState[]
  receivedLines: PurchaseOrderReceiptLine[]
  fullyReceived: boolean
}

function epochToDate(value: unknown): string {
  const n = Number(value)
  if (!n) return typeof value === 'string' ? value : ''
  const d = new Date(n * 1000)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapPurchaseOrderGet(d: any, id: number, options?: PurchaseOrderFormOptions): PurchaseOrderCardFull {
  const o = d.order ?? {}
  const supplier = d.supplier ?? {}
  const totals = d.totals ?? {}
  const statusCode = o.status == null ? null : Number(o.status)
  const states: PurchaseOrderActionState[] = (d.available_actions ?? []).map((a: any) => ({ action: String(a.action), allowed: Boolean(a.allowed), reason: String(a.reason ?? '') }))
  const allowed = (name: string) => states.some((s) => s.action === name && s.allowed)
  const label = (list: FormChoice[] | undefined, value: unknown) => list?.find((c) => String(c.value) === String(value))?.label ?? ''
  const billed = Boolean(Number(o.billed))
  const lines: PurchaseOrderLineDetail[] = (d.lines ?? []).map((l: any) => ({
    id: Number(l.id) || 0,
    productId: Number(l.product_id ?? l.fk_product) || 0,
    productLabel: l.product_label ?? l.label ?? '',
    description: l.description ?? l.desc ?? '',
    supplierRef: l.ref_supplier ?? l.fourn_ref ?? '',
    qty: Number(l.qty) || 0,
    unitPriceExcl: Number(l.subprice ?? l.pu_ht ?? l.price_ht) || 0,
    vatRate: Number(l.tva_tx ?? l.vat_rate) || 0,
    vatCode: l.vat_code ?? '',
    discountPercent: Number(l.remise_percent) || 0,
    totalHt: Number(l.total_ht) || 0,
    totalTva: Number(l.total_tva) || 0,
    totalTtc: Number(l.total_ttc) || 0,
  }))
  const actions: PurchaseOrderAvailableActions = {
    canSendMail: statusCode !== null && [2, 3, 4, 5].includes(statusCode),
    canReopen: allowed('reopen'),
    canCreateReception: allowed('receive'),
    // The classic "Classify Reception" has no fapi action; it stays a legacy GET for the two statuses that show it.
    canClassifyReception: statusCode === 3 || statusCode === 4,
    canCreateBill: statusCode !== null && statusCode >= 2 && statusCode !== 7 && !billed,
    canClassifyBilled: allowed('classify_billed'),
    canClone: allowed('clone'),
    canDelete: allowed('delete'),
  }
  return {
    id: Number(o.id) || id,
    ref: o.ref ?? '',
    refSupplier: o.ref_supplier ?? '',
    thirdPartyName: supplier.name ?? '',
    socid: supplier.id != null ? Number(supplier.id) : o.socid != null ? Number(o.socid) : null,
    projectRef: o.project_ref ?? d.project?.ref ?? '',
    projectId: o.project_id ? Number(o.project_id) : d.project?.id ? Number(d.project.id) : null,
    statusLabel: o.status_label ?? (statusCode !== null ? statusLabelFor(statusCode) : ''),
    statusCode,
    billed,
    date: epochToDate(o.date_order ?? o.date_commande),
    method: o.method_label ?? o.method ?? '',
    requestAuthor: o.author_name ?? o.user_author ?? '',
    discountsText: '',
    paymentTermsLabel: o.payment_term_label ?? label(options?.payment_terms, o.payment_term_id),
    paymentTypeLabel: o.payment_mode_label ?? label(options?.payment_modes, o.payment_mode_id),
    currencyLabel: o.currency_code ?? o.multicurrency_code ?? totals.currency ?? '',
    deliveryDate: epochToDate(o.date_livraison ?? o.delivery_date),
    noDaysToDelivery: o.delivery_delay != null ? String(o.delivery_delay) : '',
    incotermLabel: o.incoterm_label ?? label(options?.incoterms, o.incoterm_id),
    amountHt: Number(totals.total_ht) || 0,
    amountVat: Number(totals.total_tva) || 0,
    amountTtc: Number(totals.total_ttc) || 0,
    lines,
    // get.php lists the document models and languages; build_doc (actions.php) generates the PDF.
    docGen: {
      token: '',
      modelOptions: (d.doc_models ?? []).map((m: any) => ({ value: String(m.value ?? m.id ?? m), label: String(m.label ?? m.value ?? m) })),
      langOptions: (d.doc_langs ?? []).map((l: any) => ({ value: String(l.value ?? l), label: String(l.label ?? l.value ?? l) })),
      defaultLang: String(d.default_lang ?? 'en_US'),
    },
    linkedFiles: (d.documents ?? []).map((f: any) => ({ name: String(f.name ?? ''), url: String(f.url ?? '') })),
    actions,
    actionStates: states,
    receivedLines: (d.received?.lines ?? []).map((l: any) => ({ lineId: Number(l.line_id), ordered: Number(l.ordered) || 0, received: Number(l.received) || 0, remaining: Number(l.remaining) || 0, complete: Boolean(l.complete) })),
    fullyReceived: Boolean(d.received?.fully_received),
  }
}
