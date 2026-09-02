import { useParams } from 'react-router-dom'
import { History } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for the Consumptions tab's "View full history" link
// (custom/consumption/card.php?id=X&type=propal) — the Declare form itself
// is already real (useDeclareConsumption, see QuotationDetail.tsx's
// ConsumptionsTab), but the full ledger view below it has no JSON API.
// Fields below match that ledger's real column set (a stock-movement list
// scoped to this quotation's origin, same underlying data shape as
// StockMovementsView).
export function ConsumptionHistoryReplica() {
  const { id } = useParams<{ id: string }>()

  return (
    <DisabledFormPage
      icon={History}
      title={`Consumption History — Quotation #${id}`}
      sourcePath={`custom/consumption/card.php?id=${id}&type=propal`}
      sections={[
        {
          heading: 'Declared consumptions',
          fields: [{ label: 'Date' }, { label: 'Product' }, { label: 'Warehouse' }, { label: 'Batch / Lot' }, { label: 'Qty' }, { label: 'User' }],
        },
      ]}
    />
  )
}
