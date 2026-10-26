import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import { mdy } from './bankingFapi'

// stripe/fapi/transactions.php and payouts.php (26 Oct 2026). Stripe is off on newecuenta, so both answer 409 "Stripe module is not enabled on
// this instance" there; the item of a transaction is the document's own "shape, from code". A payout item has no documented shape: its cells
// are read under the Stripe field names and stay blank when absent.

type Row = Record<string, unknown>
export interface FapiStripeList {
  mode: string
  stripe_account: string
  items: Row[]
  count: number
  has_more: boolean
  next_cursor: string | null
}
export interface StripeRow {
  key: string
  ref: string
  date: string
  operationDate: string
  type: string
  description: string
  paid: string
  fee: string
  status: string
}

const text = (r: Row, k: string) => (r[k] === undefined || r[k] === null ? '' : String(r[k]))
const money = (r: Row, k: string) => {
  const v = r[k]
  return typeof v === 'number' ? `${formatMoney(v)} ${text(r, 'currency').toUpperCase()}`.trim() : ''
}

export const mapStripeList = (d: FapiStripeList): StripeRow[] =>
  d.items.map((r, i) => ({
    key: text(r, 'id') || String(i),
    ref: text(r, 'id'),
    date: mdy(text(r, 'created')),
    operationDate: mdy(text(r, 'arrival_date') || text(r, 'available_on')),
    type: text(r, 'type'),
    description: text(r, 'description'),
    paid: money(r, 'amount'),
    fee: money(r, 'fee'),
    status: text(r, 'status'),
  }))

export const loadStripeTransactions = async () => mapStripeList(await fapiGet<FapiStripeList>('/stripe/fapi/transactions.php'))
export const loadStripePayouts = async () => mapStripeList(await fapiGet<FapiStripeList>('/stripe/fapi/payouts.php'))
