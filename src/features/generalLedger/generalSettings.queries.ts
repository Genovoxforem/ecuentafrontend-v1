import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// accountancy/admin/index.php — "Configuration of the module accounting", read and saved through
// accountancy/fapi/setup_general.php: `fields` describes every setting (key, label, type yesno / int /
// date / select, current value), and a POST of { values: { KEY: value } } writes the ones it is given.
// The classic page shows 16 of the 17 fields; ACCOUNTING_ENABLE_EXPORT_DRAFT_JOURNAL is not on it and is left out here too.

export type SettingKind = 'toggle' | 'text' | 'date' | 'select'

export interface SettingRow {
  kind: SettingKind
  label: string
  name: string // the setting's constant, e.g. ACCOUNTING_LENGTH_GACCOUNT
  value: string // current value ('1'/'0' for a toggle, mm/dd/yyyy for a date)
  options: { value: string; label: string }[]
}

export interface GeneralSettings {
  rows: SettingRow[]
}

interface FapiField {
  key: string
  label: string
  group: string
  type: 'yesno' | 'int' | 'date' | 'select'
  value: number | string | null
  options?: { value: number | string; label: string }[]
}
export interface FapiSetupGeneral {
  fields: FapiField[]
  values: Record<string, number | string | null>
}

// The order of the classic page: the first five settings are the general options, the rest the binding options.
const CLASSIC_ORDER = [
  'BANK_DISABLE_DIRECT_INPUT',
  'ACCOUNTANCY_COMBO_FOR_AUX',
  'ACCOUNTING_MANAGE_ZERO',
  'ACCOUNTING_LENGTH_GACCOUNT',
  'ACCOUNTING_LENGTH_AACCOUNT',
  'ACCOUNTING_LIST_SORT_VENTILATION_TODO',
  'ACCOUNTING_LIST_SORT_VENTILATION_DONE',
  'ACCOUNTING_DATE_START_BINDING',
  'ACCOUNTING_DEFAULT_PERIOD_ON_TRANSFER',
  'ACCOUNTING_DISABLE_BINDING_ON_SALES',
  'ACCOUNTING_DISABLE_BINDING_ON_PURCHASES',
  'ACCOUNTING_DISABLE_BINDING_ON_EXPENSEREPORTS',
  'ACCOUNTING_AUTOMATION_BINDING_ON_SALES',
  'ACCOUNTING_AUTOMATION_BINDING_ON_PURCHASES',
  'ACCOUNTING_AUTOMATION_BINDING_ON_EXPENSEREPORTS',
  'ACCOUNTING_AUTOMATION_BINDING_ON_BANKPAYMENT',
]

// The endpoint prints a few labels with their HTML entities ("binding &amp; transfer").
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")

// YYYY-MM-DD <-> MM/DD/YYYY (the page's own date format)
const usFromIso = (iso: string | number | null | undefined) => {
  const m = typeof iso === 'string' ? iso.match(/^(\d{4})-(\d{2})-(\d{2})/) : null
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}
const isoFromUs = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null
}

export function mapGeneralSettings(d: FapiSetupGeneral): GeneralSettings {
  const byKey = new Map(d.fields.map((f) => [f.key, f]))
  const rows: SettingRow[] = []
  for (const key of CLASSIC_ORDER) {
    const f = byKey.get(key)
    if (!f) continue
    const value = d.values[key] ?? f.value
    const base = { label: decode(f.label), name: key, options: [] as SettingRow['options'] }
    if (f.type === 'yesno') rows.push({ ...base, kind: 'toggle', value: Number(value) ? '1' : '0' })
    else if (f.type === 'date') rows.push({ ...base, kind: 'date', value: usFromIso(value) })
    else if (f.type === 'select') rows.push({ ...base, kind: 'select', value: String(value ?? ''), options: (f.options ?? []).map((o) => ({ value: String(o.value), label: o.label })) })
    // an account length of 0 means "not set"; the classic page shows an empty box
    else rows.push({ ...base, kind: 'text', value: Number(value) ? String(value) : '' })
  }
  return { rows }
}

// What the endpoint expects for each setting when a value box is saved.
export function settingsPayload(rows: SettingRow[], values: Record<string, string>): Record<string, number | string | null> {
  const out: Record<string, number | string | null> = {}
  for (const row of rows) {
    if (row.kind === 'toggle') continue
    const v = values[row.name] ?? row.value
    if (row.kind === 'date') out[row.name] = isoFromUs(v)
    else if (row.kind === 'select') out[row.name] = Number(v)
    else out[row.name] = v.trim() === '' ? 0 : Number(v)
  }
  return out
}

const PATH = '/accountancy/fapi/setup_general.php'
const KEY = ['generalLedger', 'generalSettings'] as const

export function useGeneralSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async ({ signal }) => mapGeneralSettings(await fapiGet<FapiSetupGeneral>(PATH, undefined, signal)),
    staleTime: 0,
  })
}

// Flip one on/off setting.
export function useToggleSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (row: SettingRow) => {
      await fapiPost(PATH, { values: { [row.name]: row.value === '1' ? 0 : 1 } })
      return ''
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// The "Save Changes" button: the account lengths, the start-binding date and the default transfer period.
export function useSaveSettingValues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rows, values }: { rows: SettingRow[]; values: Record<string, string> }) => {
      await fapiPost(PATH, { values: settingsPayload(rows, values) })
      return 'Setup saved.'
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
