import { useSupplierProposalsSummary } from '../../features/supplierProposals/supplierProposals.queries'
import { SupplierProposalsList } from '../../features/supplierProposals/components/SupplierProposalsList'

export function SupplierProposalsListModule() {
  const { data: summary, isError } = useSupplierProposalsSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the supplier proposals list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <SupplierProposalsList summary={summary} />}
    </>
  )
}
