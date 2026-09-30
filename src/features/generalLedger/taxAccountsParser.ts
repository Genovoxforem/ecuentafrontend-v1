// admin/dict.php?id=7&from=accountancy — "Tax accounts" (the tax types
// dictionary). Confirmed live against 172.16.5.10 and in the PHP source:
// an Add row (code, libelle, country, decuctableper, module, modulecode,
// accountancy_code, deductible + actionadd), a filter form (search_code,
// search_country_id, search_rate, search_modulecode — plain GET params work,
// and the literal "__MYCOUNTRYID__" resolves to the company's country) and
// 11-cell rows: 8 td.tddict data cells, then status toggle / edit / delete
// links that each carry a fresh CSRF token. Edit is a second real form
// (actionmodify) rendered by the page itself, so the edit values are read from
// that form rather than guessed from the list cells.

export interface TaxAccountRow {
  rowid: string
  code: string
  label: string
  country: string
  rate: string
  module: string
  taxTypeCode: string
  accountingCode: string
  deductible: string
  active: boolean
  toggleUrl: string | null
  editUrl: string | null
  deleteUrl: string | null
}

export interface Option {
  value: string
  label: string
}

// Field names are the dictionary form's own (note the backend's spelling).
export interface TaxAccountValues {
  code: string
  libelle: string
  country: string
  decuctableper: string
  module: string
  modulecode: string
  accountancy_code: string
  deductible: string
}

export interface TaxAccountsPage {
  token: string
  countries: Option[]
  accounts: Option[]
  moduleFilter: Option[]
  filters: { code: string; country: string; rate: string; module: string }
  rows: TaxAccountRow[]
}

export interface TaxAccountEditForm {
  token: string
  rowid: string
  entity: string
  page: string
  values: TaxAccountValues
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const options = (root: ParentNode | null | undefined, selector: string): Option[] =>
  Array.from(root?.querySelectorAll<HTMLOptionElement>(`${selector} option`) ?? []).map((o) => ({ value: o.value, label: text(o) }))

const rel = (href: string | null | undefined): string | null => {
  if (!href) return null
  return href.startsWith('http') ? new URL(href).pathname + new URL(href).search : href
}

export function parseTaxAccounts(doc: Document): TaxAccountsPage {
  const addRow = doc.querySelector('input[name="actionadd"]')?.closest('tr')
  const val = (name: string) => doc.querySelector<HTMLInputElement>(`input[name="${name}"], select[name="${name}"]`)?.value ?? ''

  const rows: TaxAccountRow[] = []
  for (const tr of Array.from(doc.querySelectorAll('tr.oddeven'))) {
    const c = Array.from(tr.querySelectorAll('td.tddict'))
    if (c.length < 8) continue
    const off = tr.querySelector('a[href*="action=disable"]')
    // dict.php's own switch-on link is `action=activate`.
    const on = tr.querySelector('a[href*="action=activate"], a[href*="action=enable"]')
    rows.push({
      rowid: tr.id.replace('rowid-', ''),
      code: text(c[0]),
      label: text(c[1]),
      country: text(c[2]),
      rate: text(c[3]),
      module: text(c[4]),
      taxTypeCode: text(c[5]),
      accountingCode: text(c[6]),
      deductible: text(c[7]),
      active: !!off,
      toggleUrl: rel((off ?? on)?.getAttribute('href')),
      editUrl: rel(tr.querySelector('a[href*="action=edit"]')?.getAttribute('href')),
      deleteUrl: rel(tr.querySelector('a[href*="action=delete"]')?.getAttribute('href')),
    })
  }

  return {
    token: doc.querySelector<HTMLInputElement>('form input[name="token"]')?.value ?? '',
    countries: options(addRow, 'select[name="country"]'),
    accounts: options(addRow, 'select[name="accountancy_code"]'),
    moduleFilter: options(doc, 'select[name="search_modulecode"]'),
    filters: { code: val('search_code'), country: val('search_country_id') || '0', rate: val('search_rate'), module: val('search_modulecode') },
    rows,
  }
}

export function parseTaxAccountEditForm(doc: Document): TaxAccountEditForm | null {
  const form = doc.querySelector('input[name="actionmodify"]')?.closest('form')
  if (!form) return null
  const v = (name: string) => form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? ''
  return {
    token: v('token'),
    rowid: v('rowid'),
    entity: v('entity'),
    page: v('page') || '0',
    values: {
      code: v('code'),
      libelle: v('libelle'),
      country: v('country'),
      decuctableper: v('decuctableper'),
      module: v('module'),
      modulecode: v('modulecode'),
      accountancy_code: v('accountancy_code'),
      deductible: v('deductible'),
    },
  }
}
