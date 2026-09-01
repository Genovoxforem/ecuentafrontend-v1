import { useParams } from 'react-router-dom'
import { PackageCheck } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'
import { usePurchaseOrderCard } from '../purchaseOrderDetail.queries'

// Native replacement for linking out to fourn/commande/dispatch.php?id=X —
// no JSON API (confirmed by reading the PHP source directly) and no
// native "receiving" module exists elsewhere in this app yet. Fields below
// match the real dispatch form's per-line receiving grid.
export function CreateReceptionReplica() {
  const { id } = useParams<{ id: string }>()
  const { data } = usePurchaseOrderCard(id)

  return (
    <DisabledFormPage
      icon={PackageCheck}
      title={`Create Reception${data?.ref ? ` — ${data.ref}` : ''}`}
      sourcePath={`fourn/commande/dispatch.php?id=${id}`}
      sections={[
        { heading: 'Reception', fields: [{ label: 'Warehouse', type: 'select', required: true }, { label: 'Date', type: 'date' }, { label: 'Comment', type: 'textarea' }] },
        {
          heading: 'Lines to receive',
          fields: [
            { label: 'Product' },
            { label: 'Qty Ordered' },
            { label: 'Qty Already Dispatched' },
            { label: 'Qty To Dispatch', required: true },
            { label: 'Buying Price' },
          ],
        },
      ]}
    />
  )
}
