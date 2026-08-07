import { useContractsSummary } from '../../features/contracts/contracts.queries'
import { ContractsList } from '../../features/contracts/components/ContractsList'

export function ContractsListModule() {
  const { data: summary, isError } = useContractsSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the contracts list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ContractsList summary={summary} />}
    </div>
  )
}
