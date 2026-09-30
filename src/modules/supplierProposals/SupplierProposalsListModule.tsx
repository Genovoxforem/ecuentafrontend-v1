import { useMemo, useState } from 'react'
import { LegacyErrorCard, LegacyLoadingCard } from '../../features/products/components/LegacyReportStates'
import { summarizeSupplierProposals, useSupplierProposals, type SupplierProposalRange } from '../../features/supplierProposals/supplierProposals.queries'
import { SupplierProposalsList } from '../../features/supplierProposals/components/SupplierProposalsList'

export function SupplierProposalsListModule() {
  const [range, setRange] = useState<SupplierProposalRange>({ from: '', to: '' })
  const { data: rows, isLoading, isError, error, refetch } = useSupplierProposals(range)
  const summary = useMemo(() => summarizeSupplierProposals(rows ?? []), [rows])

  if (isLoading) return <LegacyLoadingCard label="Loading supplier proposals…" />
  if (isError || !rows) {
    return <LegacyErrorCard title="Couldn't load supplier proposals" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }
  return <SupplierProposalsList summary={summary} range={range} onRangeChange={setRange} />
}
