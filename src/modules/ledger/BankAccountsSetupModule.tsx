import { BankAccountsList } from '../../features/banking/components/BankAccountsList'

// The backend has one Bank Management Details page (compta/bank/list.php) that both the Banking
// menu and General Ledger > Setup > Bank accounts open, so both routes show the same list.
export function BankAccountsSetupModule() {
  return <BankAccountsList />
}
