import { CreditCard } from 'lucide-react'
import { useStripePayouts, useStripeTransactions } from '../bankConnectors.queries'
import type { StripeRow } from '../stripeFapi'
import { BankingTablePage, type BankingColumn } from './BankingTablePage'

const TRANSACTION_COLUMNS: BankingColumn<StripeRow>[] = [
  { label: 'Ref.', text: (r) => r.ref },
  { label: 'Date of payment', text: (r) => r.date },
  { label: 'Type', text: (r) => r.type },
  { label: 'Paid', text: (r) => r.paid, align: 'right' },
  { label: 'Fee', text: (r) => r.fee, align: 'right' },
  { label: 'Status', text: (r) => r.status },
]

const PAYOUT_COLUMNS: BankingColumn<StripeRow>[] = [
  { label: 'Ref.', text: (r) => r.ref },
  { label: 'Date of payment', text: (r) => r.date },
  { label: 'Operation date', text: (r) => r.operationDate },
  { label: 'Description', text: (r) => r.description },
  { label: 'Paid', text: (r) => r.paid, align: 'right' },
  { label: 'Status', text: (r) => r.status },
]

// stripe/fapi answers 409 "Stripe module is not enabled on this instance" until the module and its keys are set up. The classic page then prints its empty
// table with the headers, so the page does the same and says why in the empty row (any other failure still shows the error card).
const MODULE_OFF = 'The Stripe module is not enabled on this instance.'
const moduleOff = (error: unknown) => error instanceof Error && /not enabled/i.test(error.message)

export function StripeTransactionsPage() {
  const q = useStripeTransactions()
  return (
    <BankingTablePage
      title="List of Stripe transactions"
      note="(Stripe connection with keys from Stripe module setup)"
      icon={CreditCard}
      columns={TRANSACTION_COLUMNS}
      isLoading={q.isLoading}
      rows={moduleOff(q.error) ? [] : q.data}
      error={moduleOff(q.error) ? null : q.error}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.key}
      emptyText={moduleOff(q.error) ? MODULE_OFF : 'None'}
    />
  )
}

export function StripePayoutsPage() {
  const q = useStripePayouts()
  return (
    <BankingTablePage
      title="List of Stripe payouts"
      note="(Stripe connection with keys from Stripe module setup)"
      icon={CreditCard}
      columns={PAYOUT_COLUMNS}
      isLoading={q.isLoading}
      rows={moduleOff(q.error) ? [] : q.data}
      error={moduleOff(q.error) ? null : q.error}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.key}
      emptyText={moduleOff(q.error) ? MODULE_OFF : 'None'}
    />
  )
}
