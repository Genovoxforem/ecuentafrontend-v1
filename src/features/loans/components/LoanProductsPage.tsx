import { useState } from 'react'
import { PackageSearch, Info, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { DisabledFormModal } from '../../../shared/components/forms/DisabledFormModal'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useLoanProducts } from '../loans.queries'

// The list reads custom/loanmanagement/fapi/products.php. The Add New form stays disabled and the Action column empty: the
// create / update / delete of loan_product.php are plain PHP POST + redirect (action=save_loan_product) or ajax.php actions
// with no JSON contract. Interest Type is shown as the API prints it (for example "flat").
export function LoanProductsPage() {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const { data: products, isLoading, isError, error, refetch } = useLoanProducts()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackageSearch size={20} className="text-brand" /> Loan Product
        </h2>
        <button type="button" onClick={() => setShowAddProduct(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add New
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-info-bg bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
        <Info size={14} className="shrink-0 mt-0.5" />
        
      </div>

      {showAddProduct && (
        <DisabledFormModal
          icon={PackageSearch}
          title="New Loan Product"
          sourcePath="custom/loanmanagement/loan_product.php?action=save_loan_product"
          fields={[
            { label: 'Name', required: true },
            { label: 'Loan Type', type: 'select', required: true },
            { label: 'Loan Sub Type', type: 'select' },
            { label: 'Minimum Amount', required: true },
            { label: 'Maximum Amount', required: true },
            { label: 'Interest Rate Per Year (%)', required: true },
            { label: 'Interest Type', type: 'select', options: ['Flat Rate', 'Fixed Rate', 'Mortgage amortization', 'Reducing Amount', 'One-time payment'], required: true },
            { label: 'Max Term', required: true },
            { label: 'Term Period', type: 'select', options: ['Day', 'Week', 'Month', 'Year'], required: true },
            { label: 'Late Payment Penalties In %', required: true },
            { label: 'Status', type: 'select', options: ['Active', 'Deactivate'] },
            { label: 'Description', type: 'textarea' },
          ]}
          onClose={() => setShowAddProduct(false)}
        />
      )}

      {isLoading && <LegacyLoadingCard label="Loading…" />}
      {isError && <LegacyErrorCard title="Couldn't load loan products" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Name</th>
              <th className="font-medium px-4 py-2.5">Interest Rate</th>
              <th className="font-medium px-4 py-2.5">Interest Type</th>
              <th className="font-medium px-4 py-2.5">Max Term</th>
              <th className="font-medium px-4 py-2.5">Term Period</th>
              <th className="font-medium px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {products && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-text-faint italic text-center">
                  No loan products found.
                </td>
              </tr>
            )}
            {(products ?? []).map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-text!">{p.name}</td>
                <td className="px-4 py-2 text-text-muted">{p.interestRate}%</td>
                <td className="px-4 py-2 text-text-muted">{p.interestType}</td>
                <td className="px-4 py-2 text-text-muted">{p.term}</td>
                <td className="px-4 py-2 text-text-muted">{p.termPeriod}</td>
                <td className="px-4 py-2" />
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
