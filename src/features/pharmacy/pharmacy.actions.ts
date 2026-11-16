import { PharmacyApiError, idemKey, pharmacyPosPost, pharmacyPost } from './pharmacy.api'

// Every write the classic Pharmacy app makes on Prescriptions and Purchases / GRN, with the same fields. The caller shows
// the toast and refreshes the lists. None of these was run against the live server from here (see project notes).
export interface RxItemInput {
  product_id: number
  label: string
  prescribed_qty: number
  dosage: string
}
export interface GrnLineInput {
  product_id: number
  label: string
  batch: string
  eatby: string
  qty: number
  cost: number
  mrp: number
}

export const saveRx = (v: { prescriber_name: string; prescriber_licence: string; note: string; items: RxItemInput[] }) =>
  pharmacyPosPost('save_rx', { id: 0, prescriber_name: v.prescriber_name, prescriber_licence: v.prescriber_licence, note: v.note, items: JSON.stringify(v.items) }, idemKey('rx-new'))

export const verifyRx = (id: number, repeats: number) => pharmacyPosPost('verify_rx', { id, repeats_authorised: String(Math.max(0, repeats || 0)) }, idemKey('rxv', id))
export const queryRx = (id: number, note: string) => pharmacyPosPost('query_rx', { id, note }, idemKey('rxq', id))
export const declineRx = (id: number, note: string) => pharmacyPosPost('decline_rx', { id, note }, idemKey('rxdec', id))
export const repeatRx = (id: number) => pharmacyPosPost<{ repeats_used?: number; repeats_authorised?: number }>('repeat_rx', { id }, idemKey('rxrep', id))
export const collectRx = (id: number, collectedBy: string, counselled: boolean) => pharmacyPosPost('collect_rx', { id, collected_by: collectedBy, counselled: counselled ? 1 : 0 }, idemKey('rxc', id))
export const updateRxDirections = (id: number, directions: Record<number, { dosage: string; frequency: string; duration: string }>) =>
  pharmacyPosPost('update_rx_directions', { id, directions: JSON.stringify(directions) }, idemKey('rxdir', id))

export interface DispenseResult {
  invoice_ref?: string
  zra?: { code?: string }
  awaiting_collection?: boolean
  rx_status?: string
}
// "Dispense & bill" raises the invoice and fiscalises it with ZRA. A major DUR warning answers the error code "dur_block";
// the caller then asks for an override reason and calls again with it (the reason is logged by the server).
export const dispenseRx = (id: number, overrideReason?: string) =>
  pharmacyPosPost<DispenseResult>('dispense_rx', { id, payment_method_code: '01', dur_override_reason: overrideReason }, idemKey(overrideReason ? `rxd-ovr` : 'rxd', id))

export const saveGrn = (supplierRef: string, lines: GrnLineInput[]) => pharmacyPost('purchases', 'grn_save', { fk_soc: 0, supplier_ref: supplierRef, items: JSON.stringify(lines) }, idemKey('grn'))
export const receiveGrn = (id: number) => pharmacyPost<{ ref?: string; lines_received?: number }>('purchases', 'grn_receive', { id }, idemKey('grnrecv', id))

export const isDurBlock = (e: unknown) => e instanceof PharmacyApiError && e.code === 'dur_block'

export interface SaleLineInput {
  product_id: number
  qty: number
  price_ht: number
  price_ttc: number
  tva_tx: number
  discount_percent?: number
}
export interface SaleResult {
  invoice_ref?: string
  invoice_id?: number
  zra?: { code?: string }
}
// pos.php create_sale: raises the invoice and fiscalises it with ZRA; payment codes 01 Cash, 05 Card, 06 Mobile.
export const createSale = (lines: SaleLineInput[], paymentCode: string, prescriber: string) =>
  pharmacyPosPost<SaleResult>('create_sale', { terminal: '1', lines: JSON.stringify(lines), payment_method_code: paymentCode, payment_amount: 0, prescriber_name: prescriber, prescriber_licence: '' }, idemKey('pos-sale'))

export interface MedicineForm {
  label: string
  ref: string
  generic_name: string
  salt_composition: string
  strength: string
  dosage_form: string
  pack_size: string
  schedule_class: string
  hsn_code: string
  price: string
  tva_tx: string
  is_rx_only: boolean
  itemclassification: string
  item_type: string
  fk_unit: string
  packing: string
  vat_code: string
}
// api.php medicines/save (id 0 = new): catalogue fields plus the ZRA item data needed to fiscalise a dispense.
export const saveMedicine = (id: number, f: MedicineForm) =>
  pharmacyPost('medicines', 'save', {
    id,
    label: f.label,
    ref: f.ref,
    generic_name: f.generic_name,
    salt_composition: f.salt_composition,
    strength: f.strength,
    dosage_form: f.dosage_form,
    pack_size: f.pack_size,
    schedule_class: f.schedule_class,
    hsn_code: f.hsn_code,
    price: f.price,
    tva_tx: f.tva_tx,
    is_rx_only: f.is_rx_only ? 1 : 0,
    itemclassification: f.itemclassification,
    finished: f.item_type,
    fk_unit: f.fk_unit,
    packing: f.packing,
    default_vat_code: f.vat_code,
  }, idemKey(`med-${id || 'new'}`))

// ---- Medicines import (api.php import/template | validate | commit) ------------------------------------------------------
export type ImportPurpose = 'new' | 'update' | 'receive'
export interface ImportField {
  key: string
  label: string
  required?: boolean
  regulatory?: boolean
  enum?: string[]
  help?: string
  aliases?: string[]
}
export interface ImportTemplate {
  title: string
  instructions: string[]
  header: string[]
  example: string[]
  fields: ImportField[]
}
export interface ImportIssue {
  column: string
  issue: string
  suggestion?: string
}
export interface ImportRow {
  row_no: number
  action: string
  match_label?: string
  issues: ImportIssue[]
  warnings: ImportIssue[]
}
export interface ImportCounts {
  create: number
  update: number
  receive: number
  warn: number
  reject: number
}
export interface ImportCommit {
  status: string
  counts: { created: number; updated: number; received: number; skipped: number; rejected: number }
  results: { row_no: number; action: string; status: string; fk_product?: number; fk_grn?: number; message: string }[]
}

export const importTemplate = (purpose: ImportPurpose) => pharmacyPost<ImportTemplate>('import', 'template', { purpose })
export const importValidate = (purpose: ImportPurpose, rows: Record<string, string>[], mapping: Record<string, string>) =>
  pharmacyPost<{ rows: ImportRow[]; counts: ImportCounts }>('import', 'validate', { purpose, rows: JSON.stringify(rows), mapping: JSON.stringify(mapping) })
export const importCommit = (v: { purpose: ImportPurpose; rows: Record<string, string>[]; mapping: Record<string, string>; importUid: string; warehouse: string; filename: string; fileHash: string; sheet: string }) =>
  pharmacyPost<ImportCommit>('import', 'commit', { purpose: v.purpose, rows: JSON.stringify(v.rows), mapping: JSON.stringify(v.mapping), import_uid: v.importUid, warehouse: v.warehouse || 0, filename: v.filename, file_hash: v.fileHash, sheet: v.sheet }, v.importUid)
