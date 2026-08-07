import { ShoppingCart } from 'lucide-react'
import { BackendUnavailable } from './ZraListChrome'

export function PendingPurchaseInvoicesList() {
  return <BackendUnavailable icon={<ShoppingCart size={20} className="text-brand" />} title="ZRA Pending Purchase Invoices" />
}
