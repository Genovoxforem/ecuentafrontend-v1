import { usDate } from '../../api/fapiRow'
import type { SalesInvoiceData, SalesInvoiceLine, SalesInvoiceModeOption, SalesInvoiceOption, SalesInvoicePayment } from './salesInvoiceApi'

// compta/facture/fapi/get.php -> the shape the invoice card renders (SalesInvoiceData). get.php carries the header, lines,
// payments, balance, customer, files, document models, margin and the payment-term / mode lists, with numbers and ISO dates;
// the card's older shape (the *_f display strings, bootstrap badge classes) is rebuilt here.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>

const num = (v: unknown) => Number(v) || 0
const money = (v: unknown) => num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function paymentBadgeClass(code: string): string {
  switch (code) {
    case 'paid':
      return 'bg-success'
    case 'partial':
    case 'partially_paid':
      return 'bg-warning'
    case 'unpaid':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

function mapLine(l: Raw, seq: number): SalesInvoiceLine {
  return {
    rowid: str(l.rowid ?? l.id),
    seq: num(l.seq ?? seq),
    product_id: str(l.product_id),
    product_ref: str(l.product_ref),
    ref: str(l.product_ref),
    label: str(l.label ?? l.product_label),
    desc: str(l.description),
    subprice: str(l.subprice),
    remise_type: str(l.remise_type ?? 1),
    qty: str(l.qty),
    pu_ht: num(l.pu_ht),
    pu_ttc: num(l.pu_ttc),
    pu_ht_f: money(l.pu_ht),
    pu_ttc_f: money(l.pu_ttc),
    tva_tx: str(l.tva_tx),
    remise_percent: str(l.remise_percent),
    total_ht: str(l.total_ht),
    total_tva: str(l.total_tva),
    total_ttc: str(l.total_ttc),
    total_ht_f: money(l.total_ht),
    total_tva_f: money(l.total_tva),
    total_ttc_f: money(l.total_ttc),
    multicurrency_code: str(l.multicurrency_code),
    multicurrency_subprice: str(l.multicurrency_subprice),
    multicurrency_subprice_f: money(l.multicurrency_subprice),
    multicurrency_total_ht: str(l.multicurrency_total_ht),
    multicurrency_total_tva: str(l.multicurrency_total_tva),
    multicurrency_total_ttc: str(l.multicurrency_total_ttc),
    multicurrency_total_ht_f: money(l.multicurrency_total_ht),
    multicurrency_total_tva_f: money(l.multicurrency_total_tva),
    multicurrency_total_ttc_f: money(l.multicurrency_total_ttc),
    vat_src_code: str(l.vat_src_code),
    has_product: Boolean(l.has_product),
    product_type: str(l.product_type),
    product_url: '',
    product_link_html: '',
    lot_number: str(l.lot_number),
    lot_eatby: str(l.lot_eatby),
    lot_sellby: str(l.lot_sellby),
    fk_unit: num(l.fk_unit),
    packing_unit_label: str(l.packing_unit_label),
    packing_factor: num(l.packing_factor),
    packing_qty: num(l.packing_qty),
  }
}

function mapPayment(p: Raw): SalesInvoicePayment {
  return {
    rowid: str(p.id ?? p.rowid),
    ref: str(p.ref),
    date: usDate(p.date),
    type: str(p.type_label ?? p.type),
    type_code: str(p.type_code),
    type_label: str(p.type_label),
    bank: str(p.bank ?? p.bank_label),
    bank_id: p.bank_id ?? null,
    bank_entry_id: p.bank_entry_id ?? null,
    amount: str(p.amount),
    amount_f: money(p.amount),
  }
}

export function fapiToSalesInvoice(d: Raw): SalesInvoiceData {
  const balance = num(d.balance ?? d.totals?.remain)
  const zra = d.zra ?? {}
  const margin = d.margin ?? {}
  return {
    success: true,
    invoice: {
      id: str(d.id),
      ref: str(d.ref),
      ref_client: d.ref_client ?? null,
      statut: str(d.fk_statut ?? d.status),
      paye: str(d.paye),
      status_label: str(d.status_label),
      status_color: str(d.status_color),
      payment_status: str(d.payment_status),
      payment_status_class: paymentBadgeClass(str(d.payment_status_code)),
      type: str(d.type),
      type_label: str(d.type_label),
      socid: str(d.socid ?? d.fk_soc),
      date: usDate(d.invoice_date),
      date_due: usDate(d.due_date),
      date_valid: usDate(d.date_valid),
      total_ht: str(d.total_ht),
      total_tva: str(d.total_tva ?? d.total_vat),
      total_ttc: str(d.total_ttc),
      total_ht_f: money(d.total_ht),
      total_tva_f: money(d.total_tva ?? d.total_vat),
      total_ttc_f: money(d.total_ttc),
      multicurrency_code: str(d.multicurrency_code),
      multicurrency_total_ht: str(d.multicurrency_total_ht),
      multicurrency_total_tva: str(d.multicurrency_total_tva ?? d.multicurrency_total_vat),
      multicurrency_total_ttc: str(d.multicurrency_total_ttc),
      multicurrency_total_ht_f: money(d.multicurrency_total_ht),
      multicurrency_total_tva_f: money(d.multicurrency_total_tva ?? d.multicurrency_total_vat),
      multicurrency_total_ttc_f: money(d.multicurrency_total_ttc),
      discount_info: str(d.discount_info),
      mode_reglement: str(d.mode_reglement?.code),
      mode_reglement_label: str(d.mode_reglement?.label),
      mode_reglement_id: num(d.mode_reglement?.id ?? d.mode_reglement_id),
      cond_reglement: d.cond_reglement?.code ?? null,
      cond_reglement_label: str(d.cond_reglement?.label),
      cond_reglement_id: num(d.cond_reglement?.id ?? d.cond_reglement_id),
      currency: str(d.currency),
      currency_symbol: str(d.currency_symbol),
      multicurrency_symbol: str(d.multicurrency_symbol),
      bank_account: d.fk_account ? str(d.fk_account) : null,
      bank_label: str(d.bank_account?.label ?? d.bank_account),
      bank_ref: str(d.bank_account?.ref),
      incoterms: str(d.incoterms?.code),
      online_pay_url: str(d.online_pay_url),
      nb_files: num(d.nb_files),
      ventil_compta: num(d.ventil_compta),
    },
    lines: (d.lines ?? []).map((l: Raw, i: number) => mapLine(l, i + 1)),
    payments: (d.payments ?? []).map(mapPayment),
    total_paid: money(d.total_paid ?? d.totals?.paid),
    total_credit_notes: money(d.total_credit_notes ?? d.totals?.credit_notes),
    total_deposits: money(d.total_deposits ?? d.totals?.deposits),
    balance: money(balance),
    balance_raw: balance,
    zra: {
      status: str(zra.status),
      errorcode: str(zra.errorcode),
      errormessage: str(zra.errormessage),
      receipt_no: str(zra.receipt_no),
      internal_data: str(zra.internal_data),
      signature: str(zra.signature),
      invoice_no: str(zra.invoice_no),
      sdc_id: str(zra.sdc_id),
      mrc: str(zra.mrc),
      date: str(zra.date),
      qr_url: str(zra.qr_url),
    },
    customer: {
      id: str(d.customer?.id ?? d.socid),
      name: str(d.customer?.name ?? d.third_party_name),
      email: str(d.customer?.email ?? d.third_party_email),
      phone: str(d.customer?.phone),
      tpin: str(d.customer?.tpin ?? d.third_party_tpin),
      branch: str(d.customer?.branch),
      address: str(d.customer?.address),
      zip: str(d.customer?.zip),
      town: str(d.customer?.town ?? d.third_party_town),
      country: str(d.customer?.country),
      url: '',
    },
    cond_options: (d.cond_options ?? []).map((o: Raw): SalesInvoiceOption => ({ id: str(o.id), label: str(o.label) })),
    mode_options: (d.mode_options ?? []).map((o: Raw): SalesInvoiceModeOption => ({ id: str(o.id), code: str(o.code), label: str(o.label) })),
    related: d.related ?? [],
    files: (d.files ?? []).map((f: Raw) => ({
      name: str(f.name),
      date: str(f.date),
      size: str(f.size_label ?? f.size),
      size_raw: str(f.size),
      is_pdf: Boolean(f.is_pdf),
      download_url: str(f.download_url),
      view_url: str(f.view_url),
      preview_html: '',
    })),
    models: (d.models ?? []).map((m: Raw) => ({ value: str(m.value), label: str(m.label), selected: Boolean(m.selected) })),
    margin: {
      enabled: Boolean(margin.enabled),
      margin_info: '',
      rows: (margin.rows ?? []).map((r: Raw) => ({ label: str(r.label), sellingPrice: money(r.selling_price), costPrice: money(r.cost_price), margin: money(r.margin) })),
    },
  }
}
