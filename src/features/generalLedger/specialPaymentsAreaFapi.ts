import { fapiGet } from '../../api/fapiEnvelope'

// compta/charges/fapi/dashboard.php: the classic "Area for all special payments" (compta/charges/index.php). The answer was captured from
// newecuenta on 27 Oct 2026 (tests/fixtures/accountancy-charges-dashboard.json). That instance holds no social charges, VAT payments or local
// tax payments, so every rows[] is empty there and the fields of a row have never been seen: the rows are kept exactly as the server sends
// them and shown under the server's own field names until a real row shows which classic column each one is.
type PaymentRow = Record<string, unknown>

export interface FapiChargesDashboard {
  year: number
  social_contributions: { rows: PaymentRow[]; total_paid: number }
  vat: { rows: PaymentRow[]; total: number }
  localtax: Record<'lt1' | 'lt2', { enabled: boolean; rows: PaymentRow[]; total: number }>
}

export interface PaymentsBlock {
  key: string
  title: string
  // The classic table's headers, shown while the block has no rows.
  columns: string[]
  rows: PaymentRow[]
  total: number
}

export interface SpecialPaymentsArea {
  year: number
  blocks: PaymentsBlock[]
}

// Header rows of the two classic tables (seen on the legacy server: End date for period | Label | [Type] | Expected payment | Ref. payment |
// Date of payment | Type | Account | Paid by this payment).
const SOCIAL_COLUMNS = ['End date for period', 'Label', 'Type', 'Expected payment', 'Ref. payment', 'Date of payment', 'Type', 'Account', 'Paid by this payment']
const VAT_COLUMNS = ['End date for period', 'Label', 'Expected payment', 'Ref. payment', 'Date of payment', 'Type', 'Account', 'Paid by this payment']

// The classic page prints "Local tax" tables only when the company is subject to them (lt1 / lt2 enabled), and the two tax tables always.
export function mapSpecialPaymentsArea(d: FapiChargesDashboard): SpecialPaymentsArea {
  const blocks: PaymentsBlock[] = [
    { key: 'social', title: `Social/fiscal taxes payments (Year ${d.year})`, columns: SOCIAL_COLUMNS, rows: d.social_contributions.rows, total: d.social_contributions.total_paid },
    { key: 'vat', title: `Sales tax payments (Year ${d.year})`, columns: VAT_COLUMNS, rows: d.vat.rows, total: d.vat.total },
  ]
  for (const k of ['lt1', 'lt2'] as const) {
    const lt = d.localtax[k]
    if (lt?.enabled) blocks.push({ key: k, title: `Local tax ${k === 'lt1' ? 1 : 2} payments (Year ${d.year})`, columns: VAT_COLUMNS, rows: lt.rows, total: lt.total })
  }
  return { year: d.year, blocks }
}

// The union of the keys the server sent, in the order they first appear.
export function rowFields(rows: PaymentRow[]): string[] {
  const seen = new Set<string>()
  for (const r of rows) for (const k of Object.keys(r)) seen.add(k)
  return [...seen]
}

export const loadSpecialPaymentsArea = async (year: number, signal?: AbortSignal) =>
  mapSpecialPaymentsArea(await fapiGet<FapiChargesDashboard>('/compta/charges/fapi/dashboard.php', { year }, signal))
