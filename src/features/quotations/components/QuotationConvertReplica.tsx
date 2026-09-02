import { useParams } from 'react-router-dom'
import { Wrench, FileSignature, ReceiptText } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'
import { useQuotationCard } from '../quotationDetail.queries'

// Native replacement for the quotation's "Create Intervention / Create
// Contract / Create Invoice Or Credit Note" conversion actions
// (fichinter/card.php, contrat/card.php, compta/facture/card.php, all
// ?action=create&origin=propal&originid=X) — none of these three modules
// have a JSON API (confirmed by reading each PHP source directly), and none
// have a native create form elsewhere in this app yet (unlike Sales Order,
// which does — see ActionButtons' "Create Order" button). Real quotation
// ref/third-party shown for context; fields below match each real create
// form's standard field set.
export function QuotationConvertReplica({ kind }: { kind: 'intervention' | 'contract' | 'invoice' }) {
  const { id } = useParams<{ id: string }>()
  const { data } = useQuotationCard(id)

  const config = {
    intervention: {
      icon: Wrench,
      title: 'Create Intervention',
      sourcePath: `fichinter/card.php?action=create&origin=propal&originid=${id}`,
      fields: [
        { label: 'Third Party', required: true },
        { label: 'Contact' },
        { label: 'Subject' },
        { label: 'Duration' },
        { label: 'Description', type: 'textarea' as const },
      ],
    },
    contract: {
      icon: FileSignature,
      title: 'Create Contract',
      sourcePath: `contrat/card.php?action=create&origin=propal&originid=${id}`,
      fields: [
        { label: 'Third Party', required: true },
        { label: 'Reference Customer' },
        { label: 'Contract Date', type: 'date' as const },
        { label: 'Commercial Signature' },
        { label: 'Payment Terms', type: 'select' as const },
        { label: 'Payment Mode', type: 'select' as const },
        { label: 'Notes', type: 'textarea' as const },
      ],
    },
    invoice: {
      icon: ReceiptText,
      title: 'Create Invoice Or Credit Note',
      sourcePath: `compta/facture/card.php?action=create&origin=propal&originid=${id}`,
      fields: [
        { label: 'Third Party', required: true },
        { label: 'Invoice Type', type: 'select' as const },
        { label: 'Invoice Date', type: 'date' as const },
        { label: 'Payment Terms', type: 'select' as const },
        { label: 'Payment Mode', type: 'select' as const },
        { label: 'Bank Account', type: 'select' as const },
        { label: 'Notes', type: 'textarea' as const },
      ],
    },
  }[kind]

  return <DisabledFormPage icon={config.icon} title={`${config.title}${data?.ref ? ` — from ${data.ref}` : ''}`} sourcePath={config.sourcePath} sections={[{ fields: config.fields }]} />
}
