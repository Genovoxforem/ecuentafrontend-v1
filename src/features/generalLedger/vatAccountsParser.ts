// admin/dict.php?id=10&from=accountancy — "Vat accounts" (the VAT rates dictionary, llx_c_tva).
// Verified against the dev backend and dict.php's own source:
//   - the add row is one form (`?id=10`, hidden token/from/id) with country, code, taux (rate),
//     localtax1_type + localtax1 ("Include tax 2" / "Rate 2"), localtax2_type + localtax2
//     ("Include tax 3" / "Rate 3"), recuperableonly (NPR), accountancy_code_sell/buy and note,
//     submitted with `actionadd`;
//   - the filter is GET `search_country_id` (the literal "__MYCOUNTRYID__" resolves to the company's
//     country) and `search_code`;
//   - each row is `tr#rowid-N` with 11 `td.tddict` data cells, then the status link
//     (`action=activate|disable`), the edit link and the delete link, each carrying a token;
//   - the pencil re-renders the page with the row as a second form (`actionmodify`, hidden
//     token/from/page/rowid/entity, the same field names), read here instead of guessing from cells;
//   - the account selects list the whole chart of accounts and start with a blank option whose value
//     is a non-breaking space.

import { dictRelativeHref } from './dictLinks'

export interface VatOption {
  value: string
  label: string
}

export interface VatAccountRow {
  rowid: string
  country: string
  code: string
  rate: string
  localTax1Type: string
  localTax1: string
  localTax2Type: string
  localTax2: string
  npr: string
  saleAccount: string
  purchaseAccount: string
  note: string
  active: boolean
  toggleUrl: string | null
  editUrl: string | null
  deleteUrl: string | null
}

// Field names are the dictionary form's own.
export interface VatAccountValues {
  country: string
  code: string
  taux: string
  localtax1_type: string
  localtax1: string
  localtax2_type: string
  localtax2: string
  recuperableonly: string
  accountancy_code_sell: string
  accountancy_code_buy: string
  note: string
}

export interface VatAccountsPage {
  token: string
  countries: VatOption[]
  localTaxTypes: VatOption[]
  nprOptions: VatOption[]
  accounts: VatOption[]
  filters: { country: string; code: string }
  rows: VatAccountRow[]
}

export interface VatAccountEditForm {
  token: string
  rowid: string
  entity: string
  page: string
  values: VatAccountValues
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

function optionsOf(scope: ParentNode | null | undefined, name: string, keepBlank = false): VatOption[] {
  return Array.from(scope?.querySelectorAll<HTMLOptionElement>(`select[name="${name}"] option`) ?? [])
    .map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: clean(o.textContent) }))
    .filter((o) => keepBlank || o.value !== '')
}

// A select with no `selected` option submits its first one, as a browser would.
function controlValue(scope: ParentNode | null | undefined, name: string): string {
  const el = scope?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)
  if (!el) return ''
  if (el instanceof HTMLSelectElement) return (el.selectedOptions[0]?.getAttribute('value') ?? '').trim()
  return el.getAttribute('value') ?? ''
}

export function parseVatAccounts(doc: Document): VatAccountsPage {
  const addForm = doc.querySelector('input[name="actionadd"]')?.closest('form')
  const token = addForm?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!addForm || !token) throw new Error('The VAT accounts on this backend page were not recognised.')

  const filterForm = doc.querySelector('[name="button_search_x"]')?.closest('form') ?? doc

  const rows: VatAccountRow[] = []
  doc.querySelectorAll('tr[id^="rowid-"]').forEach((tr) => {
    const c = Array.from(tr.querySelectorAll(':scope > td.tddict'))
    if (c.length < 11) return
    const toggle = tr.querySelector('a[href*="action=disable"], a[href*="action=activate"]')
    rows.push({
      rowid: tr.id.replace('rowid-', ''),
      country: clean(c[0].textContent),
      code: clean(c[1].textContent),
      rate: clean(c[2].textContent),
      localTax1Type: clean(c[3].textContent),
      localTax1: clean(c[4].textContent),
      localTax2Type: clean(c[5].textContent),
      localTax2: clean(c[6].textContent),
      npr: clean(c[7].textContent),
      saleAccount: clean(c[8].textContent),
      purchaseAccount: clean(c[9].textContent),
      note: clean(c[10].textContent),
      active: !!toggle?.getAttribute('href')?.includes('action=disable'),
      toggleUrl: dictRelativeHref(toggle?.getAttribute('href')),
      editUrl: dictRelativeHref(tr.querySelector('a[href*="action=edit"]')?.getAttribute('href')),
      deleteUrl: dictRelativeHref(tr.querySelector('a[href*="action=delete"]')?.getAttribute('href')),
    })
  })

  return {
    token,
    countries: optionsOf(addForm, 'country'),
    localTaxTypes: optionsOf(addForm, 'localtax1_type'),
    nprOptions: optionsOf(addForm, 'recuperableonly'),
    accounts: optionsOf(addForm, 'accountancy_code_sell'),
    filters: { country: controlValue(filterForm, 'search_country_id') || '0', code: controlValue(filterForm, 'search_code') },
    rows,
  }
}

export function parseVatAccountEditForm(doc: Document): VatAccountEditForm | null {
  const form = doc.querySelector('input[name="actionmodify"]')?.closest('form')
  if (!form) return null
  const v = (name: string) => controlValue(form, name)
  return {
    token: v('token'),
    rowid: v('rowid'),
    entity: v('entity'),
    page: v('page') || '0',
    values: {
      country: v('country'),
      code: v('code'),
      taux: v('taux'),
      localtax1_type: v('localtax1_type'),
      localtax1: v('localtax1'),
      localtax2_type: v('localtax2_type'),
      localtax2: v('localtax2'),
      recuperableonly: v('recuperableonly'),
      accountancy_code_sell: v('accountancy_code_sell'),
      accountancy_code_buy: v('accountancy_code_buy'),
      note: v('note'),
    },
  }
}
