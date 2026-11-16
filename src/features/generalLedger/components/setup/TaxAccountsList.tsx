import { Receipt } from 'lucide-react'
import { AccountDictionaryPage } from './AccountDictionaryPage'

// General Ledger > Setup > Tax accounts (accountancy/fapi/tax_accounts.php): see accountDictionaries.data.ts.
export function TaxAccountsList() {
  return <AccountDictionaryPage dictionary='tax' icon={Receipt} />
}
