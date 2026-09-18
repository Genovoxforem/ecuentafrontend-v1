// compta/bank/card.php?action=create has no JSON API, but — same technique
// already established for Sales Orders/Quotations' own create-form dropdowns
// (see orderFormOptionsParser.ts) — its dropdowns aren't loaded via a
// separate AJAX call either: Country, State/Province, Accounting Account and
// Accounting Code Journal are all rendered as plain, fully-populated
// <option> lists directly in the page's own HTML (confirmed live), so they
// can be parsed straight out of the same page fetch that also supplies the
// CSRF token for the real POST this unlocks (see useCreateBankAccount in
// banking.queries.ts). Account type and Status are NOT scraped — Dolibarr
// hardcodes those 3/2-option sets inline in the PHP source itself, so
// there's nothing more "real" to gain by parsing them out of HTML.
export interface BankAccountFormOption {
  value: string
  label: string
}
export interface BankAccountFormContext {
  token: string
  currencies: BankAccountFormOption[]
  countries: BankAccountFormOption[]
  defaultCountryValue: string
  states: BankAccountFormOption[]
  accountingAccounts: BankAccountFormOption[]
  accountingJournals: BankAccountFormOption[]
}

// Exported for reuse by bankEntryDetailParser.ts — same <select name="..."><option value="..." selected>...
// shape shows up throughout Dolibarr's classic forms, not just this one.
export function extractSelectOptions(formHtml: string, name: string): { options: BankAccountFormOption[]; selected: string } {
  const openIdx = formHtml.indexOf(`name="${name}"`)
  if (openIdx < 0) return { options: [], selected: '' }
  const selectCloseIdx = formHtml.indexOf('</select>', openIdx)
  const chunk = formHtml.slice(openIdx, selectCloseIdx > -1 ? selectCloseIdx : openIdx + 20000)
  const options: BankAccountFormOption[] = []
  let selected = ''
  const optionRe = /<option\s+(?:class="[^"]*"\s+)?value="([^"]*)"([^>]*)>([^<]*)/g
  let m: RegExpExecArray | null
  while ((m = optionRe.exec(chunk))) {
    const value = m[1]
    const label = m[3].trim()
    if (!value || !label) continue
    options.push({ value, label })
    if (/\bselected\b/.test(m[2])) selected = value
  }
  return { options, selected }
}

export function parseBankAccountFormPage(html: string): BankAccountFormContext {
  const formStart = html.indexOf('name="formsoc"')
  const formEnd = html.indexOf('</form>', formStart)
  const formHtml = formStart >= 0 ? html.slice(formStart, formEnd > -1 ? formEnd : undefined) : html

  const tokenMatch = formHtml.match(/name="token"\s+value="([a-f0-9]+)"/)
  if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')

  const currency = extractSelectOptions(formHtml, 'account_currency_code')
  const country = extractSelectOptions(formHtml, 'account_country_id')
  const state = extractSelectOptions(formHtml, 'account_state_id')
  const accountingAccount = extractSelectOptions(formHtml, 'account_number')
  const journal = extractSelectOptions(formHtml, 'fk_accountancy_journal')

  return {
    token: tokenMatch[1],
    currencies: currency.options,
    countries: country.options.filter((o) => o.value !== '0'),
    defaultCountryValue: country.selected,
    // Zambian provinces as rendered for the page's default (Zambia) country
    // selection — Dolibarr reloads this list via its own AJAX call when the
    // Country field changes, which this form doesn't reproduce, so picking a
    // different country leaves this list as-is rather than empty/wrong.
    states: state.options.filter((o) => o.value !== '0'),
    accountingAccounts: accountingAccount.options.filter((o) => o.value !== '-1'),
    accountingJournals: journal.options.filter((o) => o.value !== '-1'),
  }
}
