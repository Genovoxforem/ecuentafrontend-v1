import { Coins } from 'lucide-react'
import { InertListPage } from '../../../shared/components/forms/InertListPage'

// accountancy/bookkeeping/exchange_list.php — a filtered clone of the
// Journals report (same underlying accounting_bookkeeping table, no JSON of
// its own). The real listbyaccount_ajax_api.php entries already carry
// currency_code/currency_amo/cur_montant, so most columns here could be
// reproduced the same way Journals was — left for a follow-up pass; the two
// computed columns ("New accounting currency amount", "Unrealized
// gain/loss") also need a live exchange rate, which only currency_ajax.php's
// non-JSON `getdetails` action (a bare number, not `json_encode`) provides.
export function ForeignCurrencyRevaluationPage() {
  return (
    <InertListPage
      icon={Coins}
      title="Foreign Currency Revaluation"
      sourcePath="accountancy/bookkeeping/exchange_list.php"
      columns={[
        'Piece',
        'Date',
        'Doc Ref',
        'Account',
        'Currency Code',
        'Exchange Rate',
        'Debit',
        'Credit',
        'New Accounting Currency Amount',
        'Unrealized Gain/Loss',
      ]}
    />
  )
}
