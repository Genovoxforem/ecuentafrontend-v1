import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { LegacyCell, LegacyTable } from './legacyTable'
import type { ValidateMovements } from './validateMovementsParser'

// accountancy/fapi/annual_closure.php and validate_movements.php (22 Oct 2026). The answers were captured from newecuenta on 22 Oct 2026
// (tests/fixtures/accountancy-annual-closure.json, accountancy-validate-movements.json). The close and validate writes were not run:
// validating movements locks them for good, and the document marks both responses "representative".

export interface FapiAnnualClosure {
  year: number
  fiscal_period: { date_start: string; date_end: string; month_start: number }
  months: Array<{ month: number; label: string; count: number }>
  total_movements: number
  fiscal_year: { exists: boolean }
  closable: boolean
}

const cell = (text: string | number): LegacyCell => ({ text: String(text), href: null, checkId: null })

// The month-by-month movement counts, in the table the closure pages already show (Jan … Dec, Total).
export function mapAnnualClosure(d: FapiAnnualClosure): LegacyTable {
  return {
    headers: [...d.months.map((m) => m.label), 'Total'],
    filters: [],
    rows: [[...d.months.map((m) => cell(m.count)), cell(d.total_movements)]],
    totals: [],
    fields: {},
  }
}

export const loadAnnualClosure = async (params: Record<string, string>) => mapAnnualClosure(await fapiGet<FapiAnnualClosure>('/accountancy/fapi/annual_closure.php', { year: params.year }))

export interface FapiValidateMovements {
  range: { date_start: string; date_end: string; source: string; year: number }
  total_in_range: number
  validatable: number
  already_validated: number
  validatable_unexported: number
}

// The "Validate movements" page: the monthly counts (annual_closure.php) with what validate_movements.php says can be locked.
export function mapValidateMovements(year: number, closure: FapiAnnualClosure, status: FapiValidateMovements): ValidateMovements {
  return {
    year,
    description: `Movements in ${status.range.date_start} to ${status.range.date_end}: ${status.total_in_range} in all, ${status.validatable} not yet validated (${status.validatable_unexported} of them not exported), ${status.already_validated} already validated.`,
    heading: 'Select Month And Validate',
    months: closure.months.map((m) => ({ label: m.label, count: String(m.count) })),
    total: String(closure.total_movements),
    canValidate: status.validatable > 0,
  }
}

export async function loadValidateMovements(year: number): Promise<ValidateMovements> {
  const [closure, status] = await Promise.all([
    fapiGet<FapiAnnualClosure>('/accountancy/fapi/annual_closure.php', { year }),
    fapiGet<FapiValidateMovements>('/accountancy/fapi/validate_movements.php', { year }),
  ])
  return mapValidateMovements(year, closure, status)
}

// Locks every not-yet-validated movement of the fiscal year (the endpoint is scoped to the entity and the year's range). Returns how many.
export async function validateMovements(year: number): Promise<number> {
  const res = await fapiPost<{ validated: number }>('/accountancy/fapi/validate_movements.php', { year }, { action: 'validate' })
  return res.validated
}
