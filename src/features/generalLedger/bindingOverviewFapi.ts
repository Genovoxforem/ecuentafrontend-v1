import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { BindingCell, BindingIndex } from './bindingIndexParser'

// The binding overviews on binding_customer.php / binding_vendor.php / binding_expensereport.php (23 Oct 2026): action=by_account_month is the
// accounts-by-month table (each bound account, an "unbound" bucket and a total) and action=bind_auto applies each product's (or fee type's)
// chart account to the lines still unbound. The customer answer was captured from newecuenta on 23 Oct 2026
// (tests/fixtures/accountancy-bind-by-account-month.json); the vendor and expense-report answers have not been seen with data.

const FILE = {
  customer: '/accountancy/fapi/binding_customer.php',
  vendor: '/accountancy/fapi/binding_vendor.php',
  expensereport: '/accountancy/fapi/binding_expensereport.php',
} as const
export type OverviewKind = keyof typeof FILE

export const overviewKindOf = (path: string): OverviewKind | null => (/expensereport/.test(path) ? 'expensereport' : /supplier|vendor/.test(path) ? 'vendor' : /customer/.test(path) ? 'customer' : null)

interface FapiAccountRow {
  accountId: number | null
  account: string | null
  label: string
  months: number[]
  total: number
}
export interface FapiByAccountMonth {
  year: number
  months: Array<{ month: number; month_short: string }>
  unbound: FapiAccountRow
  bound: FapiAccountRow[]
  total: { months: number[]; total: number }
}

const cell = (text: string, bold = false): BindingCell => ({ segments: [{ text, bold: bold || undefined }], text, bold })

export function mapByAccountMonth(d: FapiByAccountMonth): BindingIndex {
  const amounts = (months: number[], total: number, bold: boolean) => [...months.map((m) => cell(m ? formatMoney(m) : '', bold)), cell(formatMoney(total), true)]
  const line = (r: FapiAccountRow) => [cell(r.account ?? ''), cell(r.label), ...amounts(r.months, r.total, false)]
  return {
    year: d.year,
    info: [],
    sections: [
      {
        title: 'Binding by account',
        action: { label: 'Bind Automatically', href: '' },
        tables: [
          {
            headers: ['Account', 'Label', ...d.months.map((m) => m.month_short), 'Total'],
            rows: [...d.bound.map(line), line(d.unbound), [cell('Total', true), cell(''), ...amounts(d.total.months, d.total.total, true)]],
          },
        ],
      },
    ],
  }
}

export const loadBindingOverview = async (kind: OverviewKind, year: number) => mapByAccountMonth(await fapiGet<FapiByAccountMonth>(FILE[kind], { action: 'by_account_month', year }))

// Binds the lines still unbound for the year to the account their product / fee type carries; resolves to the backend's own count.
export async function bindAutomatically(kind: OverviewKind, year: number): Promise<string> {
  const res = await fapiPost<{ bound: number; scanned: number }>(FILE[kind], { year }, { action: 'bind_auto' })
  return `${res.bound} of ${res.scanned} line(s) bound automatically for ${year}.`
}
