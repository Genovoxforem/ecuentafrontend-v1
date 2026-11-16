import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// The three accounting-code dictionaries of General Ledger > Setup, on accountancy/fapi (key-authenticated JSON), read live on newecuenta on 13 Nov 2026:
//   vat_accounts.php            -> {items [{rowid, code, rate, country, country_code, country_id, recuperableonly, note, active, accountancy_code_sell,
//                                  sell_account_label, accountancy_code_buy, buy_account_label}], count, options}      (dict id 10, llx_c_tva)
//   tax_accounts.php            -> {items [{id, code, label, country, country_code, country_id, deductible, module, active, accountancy_code,
//                                  accountancy_label}], count, options}                                               (dict id 7, llx_c_chargesociales)
//   expensereport_accounts.php  -> {items [{id, code, label, type, active, accountancy_code, accountancy_label}], count, options}  (dict id 17, llx_c_type_fees)
//   options = the chart of accounts for the picker [{value, number, account_label, label, active}] (?options=0 leaves it out).
// The API's write is POST ?action=update, which sets the accounting code(s) only: vat {rowid, accountancy_code_sell, accountancy_code_buy};
// tax and expense {id, accountancy_code}; an absent key is left as it is and an empty one sets NULL (API document, from code; the writes were not run
// on the production server from this app). The classic dictionary pages also add, rename, switch and delete rows: those have no documented body in the
// answer of the document used here, so they are not offered (master report).

export type AccountDictionary = 'vat' | 'tax' | 'expense'

export interface DictionaryRow {
  key: number
  cells: string[]
  // accounting codes as stored, in the order of the edit fields
  codes: string[]
}

export interface DictionaryConfig {
  url: string
  title: string
  keyField: 'rowid' | 'id'
  headers: string[]
  // names of the editable code fields in the API, and their labels
  codeFields: Array<{ name: string; label: string }>
  toCells: (r: Record<string, unknown>) => string[]
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const yn = (v: unknown) => (v === 1 || v === '1' || v === true ? 'Yes' : 'No')
const withLabel = (code: unknown, label: unknown) => [s(code), s(label)].filter(Boolean).join(' - ')

export const DICTIONARIES: Record<AccountDictionary, DictionaryConfig> = {
  vat: {
    url: '/accountancy/fapi/vat_accounts.php',
    title: 'Vat accounts',
    keyField: 'rowid',
    // Include tax 2 / Rate 2 / Include tax 3 / Rate 3 are localtax1_type / localtax1 / localtax2_type / localtax2 (answered since 11 Nov 2026; the type is the stored code,
    // its words are not in the answer)
    headers: ['Country', 'Code', 'Rate', 'Include tax 2', 'Rate 2', 'Include tax 3', 'Rate 3', 'Recoverable only', 'Note', 'Accounting account (sales)', 'Accounting account (purchases)', 'Active'],
    codeFields: [
      { name: 'accountancy_code_sell', label: 'Accounting account (sales)' },
      { name: 'accountancy_code_buy', label: 'Accounting account (purchases)' },
    ],
    toCells: (r) => [s(r.country), s(r.code), s(r.rate), s(r.localtax1_type), s(r.localtax1), s(r.localtax2_type), s(r.localtax2), yn(r.recuperableonly), s(r.note), withLabel(r.accountancy_code_sell, r.sell_account_label), withLabel(r.accountancy_code_buy, r.buy_account_label), yn(r.active)],
  },
  tax: {
    url: '/accountancy/fapi/tax_accounts.php',
    title: 'Tax accounts',
    keyField: 'id',
    headers: ['Country', 'Code', 'Label', 'Deductible', 'Module', 'Accounting account', 'Active'],
    codeFields: [{ name: 'accountancy_code', label: 'Accounting account' }],
    toCells: (r) => [s(r.country), s(r.code), s(r.label), yn(r.deductible), s(r.module), withLabel(r.accountancy_code, r.accountancy_label), yn(r.active)],
  },
  expense: {
    url: '/accountancy/fapi/expensereport_accounts.php',
    title: 'Expense report accounts',
    keyField: 'id',
    headers: ['Code', 'Label', 'Type', 'Accounting account', 'Active'],
    codeFields: [{ name: 'accountancy_code', label: 'Accounting account' }],
    toCells: (r) => [s(r.code), s(r.label), s(r.type), withLabel(r.accountancy_code, r.accountancy_label), yn(r.active)],
  },
}

export interface DictionaryData {
  rows: DictionaryRow[]
  accounts: Array<{ value: string; label: string }>
}

const key = (d: AccountDictionary) => ['generalLedger', 'accountDictionary', d]

export function useAccountDictionary(d: AccountDictionary) {
  const c = DICTIONARIES[d]
  return useQuery({
    queryKey: key(d),
    queryFn: async (): Promise<DictionaryData> => {
      const a = await fapiGet<{ items: Array<Record<string, unknown>>; options?: Array<{ number: string; label: string }> }>(c.url)
      return {
        rows: a.items.map((r) => ({ key: Number(r[c.keyField]), cells: c.toCells(r), codes: c.codeFields.map((f) => s(r[f.name])) })),
        accounts: (a.options ?? []).map((o) => ({ value: o.number, label: o.label })),
      }
    },
    staleTime: 1000 * 60,
  })
}

export function useUpdateAccountCodes(d: AccountDictionary) {
  const c = DICTIONARIES[d]
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, codes }: { id: number; codes: string[] }) =>
      fapiPost(c.url, { [c.keyField]: id, ...Object.fromEntries(c.codeFields.map((f, i) => [f.name, codes[i] ?? ''])) }, { action: 'update' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(d) }),
  })
}
