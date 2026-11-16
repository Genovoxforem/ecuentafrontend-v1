import { formatMoney } from '../../utils/format'

// Row shapes of the Fixed Asset v2 answers, copied from live answers of newecuenta (11 Nov 2026: 4 assets, 5 types, 1 category, 2 groups, 1 insurer).

export type Lifecycle = 'draft' | 'in_service' | 'disposed'
export type DepMethod = 'linear' | 'declining' | 'units'
export type AcqMode = 'purchase' | 'manual' | 'opening'

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = { draft: 'Draft', in_service: 'In service', disposed: 'Disposed' }
export const METHOD_LABEL: Record<DepMethod, string> = { linear: 'Straight-line', declining: 'Declining balance', units: 'Units of production' }
export const MODE_LABEL: Record<AcqMode, string> = { purchase: 'Supplier invoice', manual: 'Manual purchase', opening: 'Opening balance' }

export interface Option {
  id: number | string
  label: string
}

export interface AssetTypeOption extends Option {
  method: DepMethod
  life_months: number | null
  rate: number | null
  residual_pct: number | null
  total_units: number | null
  unit_label: string | null
  category_id: number | null
  accounts_ok: boolean
}

export interface AssetOptions {
  types: AssetTypeOption[]
  groups: Option[]
  categories: Array<Option & { rate: number }>
  insurers: Option[]
  users: Option[]
  currency: string
  today: string
  next_ref: string
}

export interface AssetRow {
  id: number
  ref: string
  label: string
  type_id: number | null
  type: string
  group_id: number | null
  group: string
  category: string
  lifecycle: Lifecycle
  acq_mode: AcqMode
  acquisition_date: string | null
  in_service_date: string | null
  disposal_date: string | null
  cost: number
  accumulated: number
  nbv: number
  serial_number: string
  location: string
  licence_plate: string
}

export interface AssetList {
  items: AssetRow[]
  pagination: { page: number; limit: number; total: number; pages: number }
  totals: { count: number; cost: number; accumulated: number; nbv: number; by_lifecycle: Partial<Record<Lifecycle, number>> }
  rights: { write: boolean }
}

export interface SupplierLine {
  line_id: number
  ref: string
  ref_supplier?: string | null
  supplier: string
  description: string
  date: string
  amount: number
}

export interface DepreciationRow {
  id: number
  ref: string
  label: string
  type: string
  method: DepMethod
  last_posted: string | null
  months: string[]
  amount: number
  nbv: number
  cost: number
  needs_units: string[]
  blocked: string[]
  status: 'due' | 'blocked' | 'up_to_date'
}

export interface DepreciationPreview {
  period: string
  rows: DepreciationRow[]
  totals: { assets: number; due: number; blocked: number; up_to_date: number; amount: number; months: number }
  can_post: boolean
  lock: string
}

export interface DepreciationResult {
  results: Array<{ id: number; ref: string; posted: Array<{ period: string; piece_num: number }>; amount: number; skipped?: string; error?: boolean }>
  summary: { assets_posted: number; amount: number; failed: number }
}

export interface ScheduleRow {
  period: string
  amount: number
  accumulated: number
  nbv: number
  status: 0 | 1
  piece_num: number | null
  units: number | null
  needs_units?: boolean
}

export interface AssetCard extends AssetRow {
  description: string
  note_private: string
  insurance_id: number
  category_id: number
  custodian_id: number
  residual_value: number
  opening_accum: number
  method: DepMethod
  life_months: number | null
  rate: number | null
  total_units: number | null
  unit_label: string | null
  own_method: DepMethod | null
  own_life: number | null
  own_rate: number | null
  own_units: number | null
  accounts: { asset?: string; accum?: string; expense?: string; gain?: string; loss?: string }
  acq_piece_num: number | null
  vehicle: Record<string, string | null>
  purchase: { ref: string; supplier?: string; amount: number; bound_account?: string | null; url?: string } | null
  schedule: { start: string | null; rows: ScheduleRow[]; totals: { planned: number; posted: number; opening: number }; warnings: string[] }
  policies: Array<{ id: number; insurer_id: number; insurer: string; policy_no: string; cover: number; premium: number; start: string; end: string; note: string; expired: boolean }>
  claims: Array<{ id: number; policy_id: number; date: string; reference: string; description: string; claimed: number; settled: number | null; status: 'open' | 'settled' | 'rejected' }>
  movements: Array<{ date: string; from_group: string; to_group: string; from_location: string; to_location: string; note: string }>
  events: Array<{ type: string; date: string; amount: number | null; piece_num: number | null; label: string; user: string }>
  disposal: { date: string; kind: string; proceeds: number; cost: number; accumulated: number; nbv: number; gain_loss: number; piece_num: number | null; invoice_id: number; note: string } | null
  ledger: Array<{ id: number; piece_num: number; date: string; doc_type: string; doc_ref: string; account: string; account_label: string; label: string; debit: number; credit: number; journal: string; locked: boolean }>
  missing_accounts: string[]
  rights: { write: boolean; delete: boolean; acquire: boolean; post: boolean; reverse: boolean; dispose: boolean; insurance: boolean }
}

// ---- setup lists (asset/api/setup.php?entity=) ------------------------------------------------------------------------
export type SetupEntity = 'types' | 'categories' | 'groups' | 'insurers'

export interface SetupItem {
  id: number
  in_use?: number
  active?: boolean
  status?: string
  [field: string]: unknown
}

export interface SetupList {
  items: SetupItem[]
  meta: { entity: SetupEntity; fields: string[]; schema_pending: string[]; can_setup: boolean; global: boolean }
  extra?: { categories?: Array<{ id: number; label: string; rate: number }> } | unknown[]
}

// ---- reports (asset/api/reports.php?action=) --------------------------------------------------------------------------
export interface RegisterReport {
  as_of: string
  rows: Array<{ id: number; ref: string; label: string; type: string; group: string; location: string | null; acquired: string; method: DepMethod; cost: number; accumulated: number; nbv: number }>
  totals: { cost: number; accumulated: number; nbv: number }
}

export interface RollForwardReport {
  from: string
  to: string
  rows: Array<Record<string, number | string>>
  totals: Record<string, number | string>
}

export interface ForecastReport {
  months: Array<{ period: string; amount: number }>
  by_type: Array<{ type: string; amount: number }>
  total: number
}

export interface InsuranceReport {
  days: number
  expiring: Array<{ id?: number; asset_id?: number; ref: string; label: string; insurer: string; policy_no: string; end: string; cover: number; expired?: boolean }>
  uninsured: Array<{ asset_id: number; ref: string; label: string }>
}

export interface ReconcileReport {
  rows: Array<{ account: number | string; subledger: number; ledger: number; difference: number }>
  note: string
}

// ---- formatting (same output as the classic pages' acws-core helpers) ---------------------------------------------------
export const money = (n: number | string | null | undefined) => formatMoney(Number(n) || 0)
export const int = (n: number | string | null | undefined) => (Number(n) || 0).toLocaleString('en-US')

// "2026-01-05" -> "Jan 05, 2026"
export function fmtDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

// The number a user typed ("1,000.50", " 20 ") as a number; 0 for blank or text.
export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(String(v).replace(/[\s,]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

// "1,000.50" -> "1000.5"; text that is not a number is left as typed so the backend can refuse it.
export function cleanNumber(s: string): string {
  if (!s) return ''
  const n = Number(s.replace(/[\s,]/g, ''))
  return Number.isNaN(n) ? s : String(n)
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// Local-time ISO date of a Date ("2026-11-11"); the classic page used toISOString(), which is the UTC day.
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// The month before today as "YYYY-MM" (the depreciation run's default period, as on the classic page).
export function previousMonth(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), 0)
  return isoDate(d).slice(0, 7)
}
