/* eslint-disable @typescript-eslint/no-explicit-any */
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { VendorInvoiceDetail, VendorInvoiceLineRow, VendorInvoicePaymentRow } from './vendorInvoiceTypes'
import type { InvoiceLedgerEntryData } from '../invoices/invoiceTypes'

// fourn/facture/fapi/{create,get,ledger,notes,documents,contacts,agenda}.php: the vendor invoice on
// FactureFournisseur itself. Every endpoint reads the invoice through FactureFournisseur::fetch(),
// which fails on a database that lacks llx_facture_fourn.internal_exp (the endpoint then answers
// 500 and names that column), so a 500 here is the backend's answer, never a reason to fall back.
export const VI_BASE = '/fourn/facture/fapi'

function date(value: unknown): string {
  const n = Number(value)
  if (!n) return typeof value === 'string' ? value : ''
  const d = new Date(n * 1000)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`
}

const money = (v: unknown) => formatMoney(Number(v) || 0)

const STATUS: Record<number, string> = { 0: 'Draft', 1: 'Unpaid', 2: 'Paid', 3: 'Abandoned' }

// The card's buttons, by the action key actions.php takes; an unknown key shows its own name.
const ACTION_LABELS: Record<string, string> = {
  validate: 'Validate',
  set_draft: 'Modify (back to draft)',
  set_paid: 'Classify paid',
  set_unpaid: 'Classify unpaid',
  set_canceled: 'Abandon',
  abandon: 'Abandon',
  clone: 'Clone',
  delete: 'Delete',
  build_doc: 'Generate document',
}

export function mapVendorInvoiceGet(d: any, id: number): VendorInvoiceDetail {
  const inv = d.invoice ?? {}
  const supplier = d.supplier ?? {}
  const totals = d.totals ?? {}
  const status = inv.status == null ? null : Number(inv.status)
  const lines: VendorInvoiceLineRow[] = (d.lines ?? []).map((l: any) => ({
    rowid: String(l.id ?? l.rowid ?? ''),
    productId: l.product_id ? String(l.product_id) : null,
    productLabel: l.product_label ?? l.label ?? l.description ?? '',
    fournRef: l.ref_supplier ?? l.fourn_ref ?? '',
    vatRatePercent: String(l.tva_tx ?? l.vat_rate ?? ''),
    landedCost: Boolean(Number(l.landed_cost)),
    unitPriceExcl: money(l.pu_ht ?? l.subprice),
    qty: String(l.qty ?? ''),
    discountPercent: String(l.remise_percent ?? '0'),
    totalIncl: money(l.total_ttc),
    lotNumber: l.lot_number ?? '',
    lotEatBy: l.lot_eatby ?? '',
    lotSellBy: l.lot_sellby ?? '',
    lotWarehouseName: l.lot_warehouse_name ?? '',
  }))
  const payments: VendorInvoicePaymentRow[] = (d.payments ?? []).map((p: any) => ({
    id: Number(p.id ?? p.payment_id) || 0,
    ref: p.ref ?? String(p.id ?? ''),
    url: '',
    date: date(p.date ?? p.datep),
    type: p.type ?? p.payment_mode ?? '',
    bankAccount: p.bank_account ?? p.account ?? '',
    amount: money(p.amount),
  }))
  const remaining = d.remaining ?? d.payments_summary?.remaining
  return {
    id: Number(inv.id) || id,
    ref: inv.ref ?? '',
    refEditUrl: '',
    refVendor: inv.ref_supplier ?? '',
    refVendorEditUrl: '',
    thirdPartyName: supplier.name ?? '',
    thirdPartySocid: supplier.id != null ? Number(supplier.id) : null,
    otherInvoicesUrl: '',
    projectLabel: inv.project_ref ?? d.project?.ref ?? '',
    projectEditUrl: '',
    statusLabel: inv.status_label ?? (status !== null ? STATUS[status] ?? '' : ''),
    statusBadgeNumber: status,
    secondaryStatusLabel: '',
    cloneUrl: '',
    deleteUrl: '',
    deleteDisabledReason: '',
    typeLabel: inv.type_label ?? '',
    discountInfo: '',
    label: inv.label ?? '',
    labelEditUrl: '',
    invoiceDate: date(inv.date),
    paymentTerms: inv.payment_term_label ?? '',
    paymentTermsEditUrl: '',
    zraStatus: '',
    paymentDueOn: date(inv.date_due ?? inv.date_echeance),
    paymentType: inv.payment_mode_label ?? '',
    paymentTypeEditUrl: '',
    currencyLabel: inv.currency_code ?? totals.currency ?? '',
    bankAccount: inv.bank_account_label ?? '',
    bankAccountEditUrl: '',
    incoterms: inv.incoterm_label ?? '',
    incotermsEditUrl: '',
    subtotal: money(totals.total_ht),
    amountExclTax: money(totals.total_ht),
    vatAmount: money(totals.total_tva),
    amountInclTax: money(totals.total_ttc),
    lines,
    extraPanels: { shipmentFields: [], expensesMessage: '', landedCostMessage: '' },
    actions: ((d.available_actions ?? []) as any[]).map((a) => ({
      key: String(a.key ?? a.action ?? ''),
      label: ACTION_LABELS[String(a.key ?? a.action ?? '')] ?? String(a.label ?? a.key ?? a.action ?? '').replace(/_/g, ' '),
      enabled: Boolean(a.enabled ?? a.allowed),
      reason: String(a.disabled_because ?? a.reason ?? ''),
    })),
    payments,
    alreadyPaid: money(d.paid ?? d.payments_summary?.paid),
    billed: money(totals.total_ttc),
    remainingUnpaid: money(remaining),
    notesBadge: 0,
    documentsBadge: 0,
  }
}

export function mapVendorInvoiceLedger(d: any): InvoiceLedgerEntryData {
  const rows = (d.entries ?? d.rows ?? []).map((e: any) => ({
    date: date(e.doc_date ?? e.date),
    accountingDoc: String(e.piece_num ?? e.accounting_doc ?? ''),
    ref: e.doc_ref ?? e.ref ?? '',
    codeJournal: e.code_journal ?? e.journal ?? '',
    account: e.numero_compte ?? e.account ?? '',
    label: e.label_operation ?? e.label ?? '',
    debit: money(e.debit),
    credit: money(e.credit),
    amount: money(e.montant ?? e.amount ?? (Number(e.debit) || 0) - (Number(e.credit) || 0)),
  }))
  const sum = (key: 'debit' | 'credit') => (d.entries ?? d.rows ?? []).reduce((total: number, e: any) => total + (Number(e[key]) || 0), 0)
  return {
    rows,
    totalDebit: money(d.totals?.debit ?? sum('debit')),
    totalCredit: money(d.totals?.credit ?? sum('credit')),
    balance: money(d.totals?.balance ?? sum('debit') - sum('credit')),
  }
}

export interface NewVendorInvoicePayload {
  socid: number
  ref_supplier: string
  type?: number
  date?: string
  date_due?: string
  label?: string
  payment_term_id?: number
  incoterm_id?: number
  location_incoterms?: string
  payment_mode_id?: number
  fk_account?: number
  lines: Array<{ product_id?: number; description?: string; qty: number; pu_ht: number; tva_tx: number; product_type?: number; remise_percent?: number; ref_supplier?: string }>
  validate?: boolean
  warehouse_id?: number
}

// One call: the header, every line and the optional validation in a single transaction, so a failure
// leaves nothing behind. A duplicate ref_supplier for the same supplier is refused with 409, naming the
// existing invoice.
export async function createVendorInvoice(payload: NewVendorInvoicePayload): Promise<{ id: number; ref: string }> {
  const d = await fapiPost<any>(`${VI_BASE}/create.php`, payload)
  return { id: Number(d.id ?? d.invoice?.id), ref: String(d.ref ?? d.invoice?.ref ?? '') }
}

export { fapiGet }
