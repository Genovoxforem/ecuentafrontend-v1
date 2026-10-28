import type { DefaultAccountsPage } from './defaultAccountsParser'

// accountancy/fapi/default_accounts.php (22 Oct 2026): the default accounting accounts grouped in sections (customer / supplier / salary
// first, required), each field's stored account number and label, and the chart of accounts as the picker list. Field names are the
// ones captured from newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-default-accounts.json). An option's `number` is the account
// number the constants store (`value` is the same text on every one of the 370 captured rows).
export interface FapiDefaultAccounts {
  sections: Array<{ title: string; fields: Array<{ name: string; label: string; value: string; account_label: string | null; required: boolean }> }>
  count: number
  options: Array<{ value: string; number: string; account_label: string; label: string; active: number }>
}

export function mapDefaultAccountsFapi(data: FapiDefaultAccounts): DefaultAccountsPage {
  return {
    // The endpoint needs no form token, and the backend's explanatory banner is not part of its answer.
    token: '',
    intro: '',
    sections: data.sections.map((s) => ({ title: s.title, fields: s.fields.map((f) => ({ name: f.name, label: f.label, required: f.required, value: f.value })) })),
    options: data.options.map((o) => ({ value: o.number, label: o.label })),
  }
}
