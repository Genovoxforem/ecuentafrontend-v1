import { Link, useParams } from 'react-router-dom'
import { Wrench, FileSignature, ReceiptText } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useQuotationCard } from '../quotationDetail.queries'
import { ContractCreateForm } from '../../contracts/components/ContractCreateForm'
import { InvoiceCreateForm } from '../../invoices/components/InvoiceCreateForm'

// Reuses the app's real invoice and contract create forms, prefilled with the
// quotation's customer and lines. Their create endpoints do not preserve the
// source quotation relationship. Intervention creation remains unavailable
// until its backend exposes a supported create API.
export function QuotationConvertReplica({ kind }: { kind: 'intervention' | 'contract' | 'invoice' }) {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error } = useQuotationCard(id)

  if (isLoading) return <div className="p-6 text-sm text-text-muted">Loading quotation…</div>
  if (isError || !data) {
    return <Card className="!h-auto"><p role="alert" className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load the source quotation.'}</p></Card>
  }

  if (kind === 'intervention') {
    return (
      <Card className="!h-auto space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!"><Wrench size={20} className="text-brand" /> Create Intervention from {data.ref}</h2>
        <p className="text-sm text-text-muted">The intervention create API is not available on this backend. No intervention has been created.</p>
        <Link to={ROUTES.quotationDetail.replace(':id', String(data.id))} className="text-sm font-medium text-brand hover:underline">Back to quotation</Link>
      </Card>
    )
  }

  const backTo = ROUTES.quotationDetail.replace(':id', String(data.id))
  if (kind === 'contract') {
    const initialLines = data.lines.map((line) => ({
      productId: line.productId ? String(line.productId) : '',
      description: line.description || line.productLabel,
      qty: line.qty,
      vatRate: line.vatRate,
      unitPrice: line.unitPriceExcl,
      discountPct: line.discountType === '1'
        ? line.discountValue
        : line.qty * line.unitPriceExcl > 0
          ? (line.discountValue / (line.qty * line.unitPriceExcl)) * 100
          : 0,
    }))
    return (
      <div className="space-y-3">
        <Card className="!h-auto flex items-center gap-2 text-sm text-text-muted"><FileSignature size={16} className="text-brand" /> Prefilled from quotation {data.ref}. The contract API does not retain a source-quotation link.</Card>
        <ContractCreateForm fixedCustomerId={String(data.socid ?? '')} backTo={backTo} initialLines={initialLines} />
      </div>
    )
  }

  const initialLines = data.lines.map((line) => ({
    productId: line.productId ? String(line.productId) : undefined,
    label: line.description || line.productLabel,
    qty: line.qty,
    unitPriceHt: line.unitPriceExcl,
    vatRate: line.vatRate,
    discountType: Number(line.discountType),
    discountPercent: line.discountType === '1' ? line.discountValue : 0,
    discountFixed: line.discountType === '2' ? line.discountValue : 0,
  }))
  return (
    <div className="space-y-3">
      <Card className="!h-auto flex items-center gap-2 text-sm text-text-muted"><ReceiptText size={16} className="text-brand" /> Prefilled from quotation {data.ref}. The invoice API does not retain a source-quotation link.</Card>
      <InvoiceCreateForm fixedCustomerId={String(data.socid ?? '')} backTo={backTo} initialLines={initialLines} />
    </div>
  )
}
