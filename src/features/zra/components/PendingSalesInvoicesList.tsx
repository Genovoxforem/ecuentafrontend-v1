import { FileText } from 'lucide-react'
import { BackendUnavailable } from './ZraListChrome'

export function PendingSalesInvoicesList() {
  return <BackendUnavailable icon={<FileText size={20} className="text-brand" />} title="ZRA Pending Sales Invoices" />
}
