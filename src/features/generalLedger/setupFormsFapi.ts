import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { LegacyFormData, LegacyFormField } from './legacyForm'

// The accounting setup forms that have a JSON endpoint under accountancy/fapi, in the shape the generic form page renders.
// Field names and values are the ones captured from newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-export-options.json,
// accountancy-closure-accounts.json); the labels are plain descriptions of each setting, since the endpoints return constants, not texts.

const select = (name: string, value: string, options: Array<{ value: string; label: string }>): LegacyFormField => ({ tag: 'select', type: 'select', name, value, options })
const text = (name: string, value: string): LegacyFormField => ({ tag: 'input', type: 'text', name, value, options: [] })

function form(fields: LegacyFormField[], labels: Record<string, { label: string; required?: boolean }>): LegacyFormData {
  return {
    hidden: {},
    fields: Object.fromEntries(fields.map((f) => [f.name, f])),
    layout: fields.map((f) => ({ kind: 'field' as const, name: f.name, label: labels[f.name].label, required: !!labels[f.name].required })),
    intro: '',
    submitLabel: 'Modify',
  }
}

// ---- Export options: accountancy/fapi/export_options.php -------------------------------------------------------------------------

export interface FapiExportOptions {
  model: number
  options: Record<string, string>
  models: Array<{ value: number; label: string }>
  formats: Array<{ value: string; label: string }>
  endlines: Array<{ value: number; label: string }>
}

const EXPORT_KEYS = ['ACCOUNTING_EXPORT_PREFIX_SPEC', 'ACCOUNTING_EXPORT_FORMAT', 'ACCOUNTING_EXPORT_SEPARATORCSV', 'ACCOUNTING_EXPORT_ENDLINE', 'ACCOUNTING_EXPORT_DATE'] as const

export function mapExportOptions(d: FapiExportOptions): LegacyFormData {
  const o = d.options
  return form(
    [
      select('ACCOUNTING_EXPORT_MODELCSV', String(d.model), d.models.map((m) => ({ value: String(m.value), label: m.label }))),
      text('ACCOUNTING_EXPORT_PREFIX_SPEC', o.ACCOUNTING_EXPORT_PREFIX_SPEC ?? ''),
      select('ACCOUNTING_EXPORT_FORMAT', o.ACCOUNTING_EXPORT_FORMAT ?? '', d.formats.map((f) => ({ value: f.value, label: f.label }))),
      text('ACCOUNTING_EXPORT_SEPARATORCSV', o.ACCOUNTING_EXPORT_SEPARATORCSV ?? ''),
      select('ACCOUNTING_EXPORT_ENDLINE', o.ACCOUNTING_EXPORT_ENDLINE ?? '', [{ value: '', label: '' }, ...d.endlines.map((e) => ({ value: String(e.value), label: e.label }))]),
      text('ACCOUNTING_EXPORT_DATE', o.ACCOUNTING_EXPORT_DATE ?? ''),
    ],
    {
      ACCOUNTING_EXPORT_MODELCSV: { label: 'Export model', required: true },
      ACCOUNTING_EXPORT_PREFIX_SPEC: { label: 'Prefix on the file name' },
      ACCOUNTING_EXPORT_FORMAT: { label: 'File format' },
      ACCOUNTING_EXPORT_SEPARATORCSV: { label: 'Column separator' },
      ACCOUNTING_EXPORT_ENDLINE: { label: 'End of line' },
      ACCOUNTING_EXPORT_DATE: { label: 'Date format' },
    },
  )
}

export const loadExportOptions = async (): Promise<LegacyFormData> => mapExportOptions(await fapiGet<FapiExportOptions>('/accountancy/fapi/export_options.php'))

// The body is the chosen model plus the per-model constants; the backend writes the ones the chosen model allows.
export function exportOptionsBody(values: Record<string, string>): Record<string, string | number> {
  const body: Record<string, string | number> = { model: Number(values.ACCOUNTING_EXPORT_MODELCSV) }
  for (const k of EXPORT_KEYS) body[k] = values[k] ?? ''
  return body
}

export async function saveExportOptions(values: Record<string, string>): Promise<string> {
  await fapiPost('/accountancy/fapi/export_options.php', exportOptionsBody(values), { action: 'update' })
  return 'Export options saved'
}

// ---- Closure accounts: accountancy/fapi/closure_accounts.php ---------------------------------------------------------------------

export interface FapiClosureAccounts {
  profit_account: { value: string; account_label: string | null }
  loss_account: { value: string; account_label: string | null }
  default_journal: { value: string; id: number; code: string | null; label: string | null }
  options: Array<{ value: string; number: string; account_label: string; label: string; active: number }>
  journals: Array<{ id: number; code: string; label: string; nature: number; nature_label: string; active: number }>
}

// -1 is how the endpoint reports "not set".
const UNSET = '-1'

export function mapClosureAccounts(d: FapiClosureAccounts): LegacyFormData {
  const accounts = [{ value: UNSET, label: '' }, ...d.options.map((a) => ({ value: a.number, label: a.label }))]
  const journals = [{ value: UNSET, label: '' }, ...d.journals.map((j) => ({ value: String(j.id), label: `${j.code} - ${j.label} (${j.nature_label}${j.active ? '' : ', inactive'})` }))]
  return form(
    [select('ACCOUNTING_RESULT_PROFIT', d.profit_account.value, accounts), select('ACCOUNTING_RESULT_LOSS', d.loss_account.value, accounts), select('ACCOUNTING_CLOSURE_DEFAULT_JOURNAL', d.default_journal.value, journals)],
    {
      ACCOUNTING_RESULT_PROFIT: { label: 'Result account (profit)' },
      ACCOUNTING_RESULT_LOSS: { label: 'Result account (loss)' },
      ACCOUNTING_CLOSURE_DEFAULT_JOURNAL: { label: 'Closure journal', required: true },
    },
  )
}

export const loadClosureAccounts = async (): Promise<LegacyFormData> => mapClosureAccounts(await fapiGet<FapiClosureAccounts>('/accountancy/fapi/closure_accounts.php'))

// The journal is required (the endpoint refuses without it, and says so); an unset result account is sent empty, which clears it.
export function closureAccountsBody(values: Record<string, string>): Record<string, string | number> {
  const clean = (v: string | undefined) => (!v || v === UNSET ? '' : v)
  const journal = clean(values.ACCOUNTING_CLOSURE_DEFAULT_JOURNAL)
  return { ...(journal ? { ACCOUNTING_CLOSURE_DEFAULT_JOURNAL: Number(journal) } : {}), ACCOUNTING_RESULT_PROFIT: clean(values.ACCOUNTING_RESULT_PROFIT), ACCOUNTING_RESULT_LOSS: clean(values.ACCOUNTING_RESULT_LOSS) }
}

export async function saveClosureAccounts(values: Record<string, string>): Promise<string> {
  await fapiPost('/accountancy/fapi/closure_accounts.php', closureAccountsBody(values), { action: 'update' })
  return 'Closure accounts saved'
}
