import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// don/fapi/list.php: the totals by status (count and amount) for the statistics table, and the newest donations for the "Latest" block.
// by_status rows were seen on newecuenta with two draft donations: { status, label, count, amount }.
interface FapiDonationList {
  items: Array<{ id: number; ref: string; date: string | null; amount: number; company: string; name: string; status: number; status_label: string }>
  totals: { count: number; amount: number; currency: string; by_status: Array<{ status: number; label: string; count: number; amount: number }> }
}

export interface DonationStatRow {
  status: number
  label: string
  count: number
  amount: number
  average: number
}

// The classic statistics table lists the four statuses in this order and leaves a status without donations blank.
const STATUS_ORDER: Array<{ status: number; label: string }> = [
  { status: 0, label: 'Draft Promise' },
  { status: 1, label: 'Validated Promise' },
  { status: -1, label: 'Canceled' },
  { status: 2, label: 'Donation Received' },
]

export function mapDonationStats(d: FapiDonationList) {
  const rows: DonationStatRow[] = STATUS_ORDER.map(({ status, label }) => {
    const hit = d.totals.by_status.find((s) => s.status === status)
    const count = hit?.count ?? 0
    const amount = hit?.amount ?? 0
    return { status, label, count, amount, average: count ? amount / count : 0 }
  })
  const total = { count: d.totals.count, amount: d.totals.amount, average: d.totals.count ? d.totals.amount / d.totals.count : 0 }
  return { rows, total, latest: d.items, currency: d.totals.currency }
}

export function useDonationsArea() {
  return useQuery({
    queryKey: ['ledger', 'donations-area'],
    queryFn: async ({ signal }) => mapDonationStats(await fapiGet<FapiDonationList>('/don/fapi/list.php', { limit: 10, sort: 'date', direction: 'DESC' }, signal)),
  })
}
