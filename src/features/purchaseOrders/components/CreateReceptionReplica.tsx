import { Link, useParams } from 'react-router-dom'
import { PackageCheck } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { usePurchaseOrderCard } from '../purchaseOrderDetail.queries'
import { ReceiveGoodsForm } from './ReceiveGoodsForm'

// Create Reception: the per-line receiving grid of fourn/commande/dispatch.php, on
// fourn/commande/fapi/dispatch.php.
export function CreateReceptionReplica() {
  const { id } = useParams<{ id: string }>()
  const { data } = usePurchaseOrderCard(id)

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackageCheck size={20} className="text-brand" /> Create Reception{data?.ref ? ` — ${data.ref}` : ''}
        </h2>
        <Link to={ROUTES.purchaseOrderDetail.replace(':id', id ?? '')} className="text-sm font-medium text-brand hover:underline">
          Back to order
        </Link>
      </div>
      {id && <ReceiveGoodsForm id={id} />}
    </div>
  )
}
