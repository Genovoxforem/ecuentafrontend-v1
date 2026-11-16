import { InvoicesList } from '../../features/invoices/components/InvoicesList'

// The classic list.php?search_status=3 page: the Sales Invoices list narrowed to
// Dolibarr status 3 (abandoned).
const ABANDONED = 3

export function AbandonedInvoicesModule() {
  return <InvoicesList statusFilter={ABANDONED} />
}
