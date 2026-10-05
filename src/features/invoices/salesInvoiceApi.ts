// Types for compta/sales/api/invoice.php — a complete, reliable JSON API for
// the real "Sales Invoice Details" page (compta/sales/card.php?facid=X),
// confirmed live on 172.16.5.55 across drafts and paid invoices (facid
// 1057, 43, 1059, 1060). This is a separate, actively-maintained real page
// from compta/facture/card.php (which the rest of this feature's other
// tabs — Contacts, Notes, Documents, Agenda, LedgerEntry, StandingOrders —
// still scrape); its own client logic lives in compta/sales/js/invoice.js.
// Shapes below are read directly off real responses, not guessed.

export interface SalesInvoiceLine {
  rowid: string
  seq: number
  product_id: string
  product_ref: string
  ref: string
  label: string
  desc: string
  subprice: string
  remise_type: string
  qty: string
  pu_ht: number
  pu_ttc: number
  pu_ht_f: string
  pu_ttc_f: string
  tva_tx: string
  remise_percent: string
  total_ht: string
  total_tva: string
  total_ttc: string
  total_ht_f: string
  total_tva_f: string
  total_ttc_f: string
  multicurrency_code: string
  multicurrency_subprice: string
  multicurrency_subprice_f: string
  multicurrency_total_ht: string
  multicurrency_total_tva: string
  multicurrency_total_ttc: string
  multicurrency_total_ht_f: string
  multicurrency_total_tva_f: string
  multicurrency_total_ttc_f: string
  vat_src_code: string
  has_product: boolean
  product_type: string
  product_url: string
  product_link_html: string
  lot_number: string
  lot_eatby: string
  lot_sellby: string
  fk_unit: number
  packing_unit_label: string
  packing_factor: number
  packing_qty: number
}

export interface SalesInvoicePayment {
  rowid: string
  ref: string
  date: string
  type: string
  type_code: string
  type_label: string
  bank: string
  bank_id: number | null
  bank_entry_id: number | null
  amount: string
  amount_f: string
}

export interface SalesInvoiceZra {
  status: string
  errorcode: string
  errormessage: string
  receipt_no: string | number
  internal_data: string
  signature: string
  invoice_no: string
  sdc_id: string
  mrc: string
  date: string
  qr_url: string
}

export interface SalesInvoiceCustomer {
  id: string
  name: string
  email: string
  phone: string
  tpin: string
  branch: string
  address: string
  zip: string
  town: string
  country: string
  url: string
}

export interface SalesInvoiceOption {
  id: string
  label: string
}

export interface SalesInvoiceModeOption {
  id: string
  code: string
  label: string
}

export interface SalesInvoiceFile {
  name: string
  date: string
  size: string
  size_raw: string
  is_pdf: boolean
  download_url: string
  view_url: string
  preview_html: string
}

export interface SalesInvoiceModel {
  value: string
  label: string
  selected: boolean
}

export interface SalesInvoiceMargin {
  enabled: boolean
  margin_info: string
}

export interface SalesInvoiceHeader {
  id: string
  ref: string
  ref_client: string | null
  statut: string
  paye: string
  status_label: string
  status_color: string
  payment_status: string
  payment_status_class: string
  type: string
  type_label: string
  socid: string
  date: string
  date_due: string
  date_valid: string
  total_ht: string
  total_tva: string
  total_ttc: string
  total_ht_f: string
  total_tva_f: string
  total_ttc_f: string
  multicurrency_code: string
  multicurrency_total_ht: string
  multicurrency_total_tva: string
  multicurrency_total_ttc: string
  multicurrency_total_ht_f: string
  multicurrency_total_tva_f: string
  multicurrency_total_ttc_f: string
  discount_info: string
  mode_reglement: string
  mode_reglement_label: string
  mode_reglement_id: number
  cond_reglement: string | null
  cond_reglement_label: string
  cond_reglement_id: number
  currency: string
  currency_symbol: string
  multicurrency_symbol: string
  bank_account: string | null
  bank_label: string
  bank_ref: string
  incoterms: string
  online_pay_url: string
  nb_files: number
  ventil_compta: number
}

export interface SalesInvoiceData {
  success: boolean
  invoice: SalesInvoiceHeader
  lines: SalesInvoiceLine[]
  payments: SalesInvoicePayment[]
  total_paid: string
  total_credit_notes: string
  total_deposits: string
  balance: string
  balance_raw: number
  zra: SalesInvoiceZra
  customer: SalesInvoiceCustomer
  cond_options: SalesInvoiceOption[]
  mode_options: SalesInvoiceModeOption[]
  // Always empty on every real invoice checked so far — shape unconfirmed,
  // kept generic rather than guessed.
  related: unknown[]
  files: SalesInvoiceFile[]
  models: SalesInvoiceModel[]
  margin: SalesInvoiceMargin
}
