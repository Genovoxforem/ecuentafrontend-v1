import { Percent } from 'lucide-react'
import { AccountDictionaryPage } from './AccountDictionaryPage'

// General Ledger > Setup > Vat accounts (accountancy/fapi/vat_accounts.php): see accountDictionaries.data.ts.
export function VatAccountsList() {
  return <AccountDictionaryPage dictionary='vat' icon={Percent} />
}
