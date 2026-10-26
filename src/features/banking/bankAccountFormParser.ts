// The option lists of the New Financial Account form (filled from compta/bank/fapi/account.php?action=form_options, see bankingFapi.ts).
// extractSelectOptions is still used by bankEntryDetailParser.ts for the old line.php page.

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
  // the currency the form starts on (compta/bank/fapi/account.php names it; the classic page pre-selects it)
  defaultCurrencyValue?: string
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
