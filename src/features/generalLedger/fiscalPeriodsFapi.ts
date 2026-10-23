import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { LegacyFormData } from './legacyForm'
import type { LegacyCell, LegacyTable } from './legacyTable'

// accountancy/fapi/fiscal_periods.php (22 Oct 2026): the accounting periods with their dates, status and how many ledger lines they hold.
// Captured from newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-fiscal-periods.json); it holds one period there.
export interface FapiFiscalPeriods {
  items: Array<{ id: number; ref: string; label: string; date_start: string; date_end: string; statut: number; status_label: string; entries_count: number; movements_count: number }>
  pagination: { page: number; limit: number; total: number; pages: number }
}

const cell = (text: string): LegacyCell => ({ text, href: null, checkId: null })

export function mapFiscalPeriodsFapi(data: FapiFiscalPeriods): LegacyTable {
  const headers = ['Ref', 'Label', 'Date start', 'Date end', 'Entries', 'Movements', 'Status']
  return {
    headers,
    filters: headers.map(() => null),
    rows: data.items.map((p) => [cell(p.ref), cell(p.label), cell(p.date_start), cell(p.date_end), cell(String(p.entries_count)), cell(String(p.movements_count)), cell(p.status_label)]),
    totals: [],
    fields: {},
  }
}

// A company has a handful of periods, so the whole list is read in one call (the endpoint's paging base was not confirmable with a single
// period on the server, so no page number is sent).
export async function loadFiscalPeriods(): Promise<LegacyTable> {
  return mapFiscalPeriodsFapi(await fapiGet<FapiFiscalPeriods>('/accountancy/fapi/fiscal_periods.php', { limit: 500 }))
}

// ---- New fiscal period: POST accountancy/fapi/fiscal_periods.php?action=create ------------------------------------------------------
// label, date_start and date_end (ISO) are required; statut is 0 = open, 1 = closed. The endpoint answers 422 with the missing field when
// one is absent or a date is invalid.
export function fiscalPeriodBody(values: Record<string, string>): Record<string, string | number> {
  return { label: values.label ?? '', date_start: values.fiscalyear ?? '', date_end: values.fiscalyearend ?? '', statut: Number(values.statut || 0) }
}

export async function saveFiscalPeriod(values: Record<string, string>): Promise<string> {
  await fapiPost('/accountancy/fapi/fiscal_periods.php', fiscalPeriodBody(values), { action: 'create' })
  return 'Fiscal period created'
}

// The form has no data to load: an empty label and dates, open by default.
export const loadFiscalPeriodForm = async (): Promise<LegacyFormData> => ({
  hidden: {},
  fields: {
    label: { tag: 'input', type: 'text', name: 'label', value: '', options: [] },
    fiscalyear: { tag: 'input', type: 'text', name: 'fiscalyear', value: '', options: [] },
    fiscalyearend: { tag: 'input', type: 'text', name: 'fiscalyearend', value: '', options: [] },
    statut: { tag: 'select', type: 'select', name: 'statut', value: '0', options: [{ value: '0', label: 'Open' }, { value: '1', label: 'Closed' }] },
  },
  layout: [],
  intro: '',
  submitLabel: 'Save',
})
