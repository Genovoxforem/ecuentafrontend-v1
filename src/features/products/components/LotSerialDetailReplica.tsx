import { useParams } from 'react-router-dom'
import { Hash } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for linking out to
// product/stock/productlot_card.php?id=X — no JSON API (confirmed by
// reading the PHP source directly). Fields below match that page's real
// form exactly.
export function LotSerialDetailReplica() {
  const { id } = useParams<{ id: string }>()

  return (
    <DisabledFormPage
      icon={Hash}
      title={`Lot/Serial #${id}`}
      sourcePath={`product/stock/productlot_card.php?id=${id}`}
      sections={[
        {
          fields: [
            { label: 'Product', required: true },
            { label: 'Batch / Lot Number', required: true },
            { label: 'Sell-by Date', type: 'date' },
            { label: 'Eat-by Date', type: 'date' },
          ],
        },
      ]}
    />
  )
}
