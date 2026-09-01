import { useSearchParams } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for linking out to product/stock/stockatdate.php — no
// JSON API (confirmed by reading the PHP source directly; a classic
// server-rendered report). Fields below match the real report's own date
// filter and per-warehouse quantity breakdown.
export function StockAtDateReplica() {
  const [params] = useSearchParams()
  const isFuture = params.get('mode') === 'future'
  const productId = params.get('productid')

  return (
    <DisabledFormPage
      icon={CalendarClock}
      title={isFuture ? 'Virtual Stock At Date' : 'Stock At Date'}
      sourcePath={`product/stock/stockatdate.php${isFuture ? '?mode=future' : ''}&productid=${productId ?? ''}`}
      sections={[
        {
          fields: [{ label: 'Date', type: 'date', required: true }],
        },
        {
          heading: 'Quantity by warehouse',
          fields: [{ label: 'Warehouse' }, { label: 'Qty At Date' }],
        },
      ]}
    />
  )
}
