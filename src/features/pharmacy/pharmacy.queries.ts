import { useQuery } from '@tanstack/react-query'
import { pharmacyGet, pharmacyPosGet, pharmacyRacksGet } from './pharmacy.api'
import type { PharmacyReportAnswer, PharmacyReportParams } from './pharmacyReports'

// Shapes below are what each endpoint returned on newecuenta (GET, 2 Nov 2026). Lists that were empty there
// (batch lots, GRNs, schedule register, recalls, interactions) carry only the column names the classic
// Pharmacy screen shows; their field names are not verified until a row exists.

export interface PharmacyMe {
  admin: boolean
  clinical: boolean
  login: string
  rights: Record<string, string[]>
}

export interface PharmacyMedicine {
  id: number
  ref: string
  label: string
  barcode: string | null
  generic: string | null
  salt: string | null
  strength: string | null
  dosage_form: string | null
  rx_only: number
  schedule_class: string | null
  price_ht: number
  price_ttc: number
  tva_tx: number
  // pos.php medicine_search rows may carry stock; the counter dims a medicine with none left (stock <= 0).
  stock?: number | null
}

export interface PharmacyPatient {
  id: number
  name: string
  phone: string
  town: string
  dob: string | null
  allergies: string
}

export interface PharmacyPrescription {
  id: number
  ref: string
  patient_id: number
  patient: string
  prescriber: string
  licence: string
  rx_date: string
  status: string
}

export interface PharmacySale {
  id: number
  ref: string
  customer: string
  total_ttc: number
  paid: number
  date: string
}

export interface PharmacyStockRow {
  id: number
  ref: string
  label: string
  qty: number
  pmp: number
  value: number
}

export interface PharmacyReportSummary {
  near_expiry: number
  low_stock: number
  controlled_today: number
  pending_rx: number
  scripts_total: number
}

export interface PharmacyRackRow {
  id: number
  rack: { id: number; name: string }
  shelf: { id: number; ref: string; capacity: number }
  warehouse: { id: number; ref: string }
  product: { id: number; ref: string; label: string }
  qty: number
  lot: string
}

const STALE = 60_000
const q = <T,>(key: unknown[], fn: () => Promise<T>) => ({ queryKey: ['pharmacy', ...key], queryFn: fn, staleTime: STALE, retry: false })

export const usePharmacyMe = () => useQuery(q<PharmacyMe>(['me'], () => pharmacyGet('me', '')))

export const usePharmacySummary = () => useQuery(q<PharmacyReportSummary>(['summary'], () => pharmacyGet('reports', 'summary')))

export const usePharmacyMedicines = (search: string) =>
  useQuery(q(['medicines', search], async () => (await pharmacyGet<{ results: PharmacyMedicine[] }>('medicines', 'search', { term: search })).results ?? []))

// pos.php medicine_search?term= (the POS counter and the medication pickers); only runs for 2+ characters.
export const usePharmacyMedicineSearch = (term: string, min = 1) =>
  useQuery({
    ...q(['medicine-search', term], async () => (await pharmacyPosGet<{ results: PharmacyMedicine[] }>('medicine_search', { term })).results ?? []),
    enabled: term.trim().length >= min,
  })

export const usePharmacyPatients = () => useQuery(q(['patients'], async () => (await pharmacyGet<{ patients: PharmacyPatient[] }>('patients', 'list')).patients ?? []))

export const usePharmacyPrescriptions = () => useQuery(q(['rx'], async () => (await pharmacyPosGet<{ prescriptions: PharmacyPrescription[] }>('rx_list')).prescriptions ?? []))

export const usePharmacyRecentSales = () => useQuery(q(['recent-sales'], async () => (await pharmacyPosGet<{ sales: PharmacySale[] }>('recent_sales')).sales ?? []))

export const usePharmacyValuation = () =>
  useQuery(q(['valuation'], async () => {
    const r = await pharmacyGet<{ rows: PharmacyStockRow[]; total_value: number }>('stock', 'valuation')
    return { rows: r.rows, total: r.total_value }
  }))

// stock/reorder answered { success:false, error:"db: Reference 'qty' not supported (reference to group function)" } on newecuenta.
export interface PharmacyReorderRow {
  id: number
  ref: string
  label: string
  qty: number
  reorder_level: number
  suggest: number
}
export const usePharmacyReorder = () => useQuery(q(['reorder'], async () => (await pharmacyGet<{ rows: PharmacyReorderRow[] }>('stock', 'reorder')).rows ?? []))

export const usePharmacyBatches = () => useQuery(q(['batches'], async () => (await pharmacyGet<{ lots: Record<string, unknown>[] }>('batches', 'list')).lots ?? []))

export interface PharmacyGrn {
  id: number
  ref: string
  supplier: string | null
  supplier_ref: string | null
  date: string | null
  status: string
  total_ttc: number
}
export const usePharmacyGrns = () => useQuery(q(['grns'], async () => (await pharmacyGet<{ grns: PharmacyGrn[] }>('purchases', 'grn_list')).grns ?? []))

export const usePharmacyRegister = () => useQuery(q(['register'], async () => (await pharmacyGet<{ rows: Record<string, unknown>[] }>('register', 'list')).rows ?? []))

export const usePharmacyRecalls = () => useQuery(q(['recalls'], async () => (await pharmacyGet<{ rows: Record<string, unknown>[] }>('returns', 'recall_list')).rows ?? []))

export const usePharmacyInteractions = () =>
  useQuery(q(['interactions'], async () => (await pharmacyGet<{ interactions: Record<string, unknown>[] }>('dur', 'interaction_list')).interactions ?? []))

export const usePharmacyDurConfig = () => useQuery(q(['dur-config'], () => pharmacyGet<{ enabled: number; block_major: number }>('dur', 'config_get')))

export const usePharmacyReport = (report: string, p: PharmacyReportParams) =>
  useQuery({
    queryKey: ['pharmacy', 'report', report, p],
    queryFn: () => pharmacyGet<PharmacyReportAnswer>('reports', report, { ...p, status: p.statuses.join(','), statuses: undefined }),
    staleTime: STALE,
    retry: false,
    placeholderData: (prev) => prev,
  })

export const usePharmacyRacks = () => useQuery(q(['racks'], async () => (await pharmacyRacksGet<{ items: PharmacyRackRow[] }>()).items ?? []))

export interface PharmacyMedicineDetail {
  product: PharmacyMedicine & {
    pack_size: string | null
    hsn_code: string | null
    active: number
    itemclassification?: string | null
    item_type?: string | number | null
    fk_unit?: number | null
    packing?: number | null
    vat_code?: string | null
    zra_registered?: boolean
  }
  stock: { total: number }
  lots: Record<string, unknown>[]
}

export const usePharmacyMedicineDetail = (id: number | null) =>
  useQuery({ ...q<PharmacyMedicineDetail>(['medicine', id], () => pharmacyGet('medicines', 'detail', { product_id: id ?? undefined })), enabled: id !== null })

export interface PharmacyRxItem {
  id: number
  label: string
  prescribed_qty: number
  dispensed_qty: number
  dosage: string | null
  frequency: string | null
  duration: string | null
}

export interface PharmacyDurWarning {
  type: string
  severity: string
  message: string
}

export interface PharmacyRxDetail {
  prescription: PharmacyPrescription & { note: string; pharmacist_note: string; collected_at: string | null; collected_by: string; counselled: number; repeats_authorised: number; repeats_used: number }
  items: PharmacyRxItem[]
}

export const usePharmacyRx = (id: number | null) =>
  useQuery({ ...q<PharmacyRxDetail>(['rx', id], () => pharmacyPosGet('rx_get', { id: id ?? undefined })), enabled: id !== null })

// pos.php popular_medicines answered {results: []} on newecuenta (the classic POS then shows built-in sample tiles; React does not).
export const usePharmacyPopular = () => useQuery(q(['popular'], async () => (await pharmacyPosGet<{ results: PharmacyMedicine[] }>('popular_medicines')).results ?? []))

// pos.php dur_check?prescription_id= -> {patient_id, checked, warnings:[{type, severity, message}]} (allergy / duplicate / interaction screening).
export const usePharmacyDurCheck = (id: number | null) =>
  useQuery({ ...q<PharmacyDurWarning[]>(['dur-check', id], async () => (await pharmacyPosGet<{ warnings: PharmacyDurWarning[] }>('dur_check', { prescription_id: id ?? undefined })).warnings ?? []), enabled: id !== null })

// api.php medicines/units -> {units:[{id, label, code}]}: the quantity / packing unit lists of the medicine form.
export interface PharmacyUnit {
  id: number
  label?: string
  code?: string
}
export const usePharmacyUnits = () => useQuery(q(['units'], async () => (await pharmacyGet<{ units: PharmacyUnit[] }>('medicines', 'units')).units ?? []))
