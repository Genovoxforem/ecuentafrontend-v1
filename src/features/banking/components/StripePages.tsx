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

// stripe/fapi answers 409 "Stripe module is not enabled on this instance" until the module and its keys are set up: that message is what shows.
export function StripeTransactionsPage() {
  const q = useStripeTransactions()
  return (
    <BankingTablePage
      title="List of Stripe transactions"
      note="(Stripe connection with keys from Stripe module setup)"
      icon={CreditCard}
      columns={TRANSACTION_COLUMNS}
      rows={q.data}
      isLoading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.key}
      emptyText="None"
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
      rows={q.data}
      isLoading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.key}
      emptyText="None"
    />
  )
}
