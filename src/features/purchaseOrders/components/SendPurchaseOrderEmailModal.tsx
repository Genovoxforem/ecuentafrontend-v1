import { SendOrderEmailModal } from '../../salesOrders/components/SendOrderEmailModal'
import { usePurchaseOrderEmailDefaults, useSendPurchaseOrderEmail } from '../purchaseOrderEmail.queries'

// The sales order email form on fourn/commande/fapi/send_email.php (compose defaults and the send).
export function SendPurchaseOrderEmailModal({ id, orderRef, onClose }: { id: string; orderRef: string; onClose: () => void }) {
  return <SendOrderEmailModal id={id} orderRef={orderRef} onClose={onClose} useDefaults={usePurchaseOrderEmailDefaults} useSend={useSendPurchaseOrderEmail} />
}
