import { BackendUnavailableCard } from '../../shared/components/BackendUnavailable'

// The classic Check Deposits list (compta/paiement/cheque/list.php: Ref., Creation date, Account, NbOfCheques, Amount, Status, filtered by year and bank
// account) has no JSON list: cheque_deposits.php answers the awaiting count and the latest receipts of the area only. The page used to draw an always-empty
// table, which read as "no deposit" when there may be some; it now says the list is not available.
export function CheckDepositListModule() {
  return <BackendUnavailableCard feature="Check deposit list" />
}
