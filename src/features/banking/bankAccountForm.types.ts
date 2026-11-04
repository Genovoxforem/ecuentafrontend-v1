// The option lists of the New Financial Account form (filled from compta/bank/fapi/account.php?action=form_options, see bankingFapi.ts).

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
