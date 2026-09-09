import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../utils/format'
import { useSalesOrdersSummary } from '../../salesOrders/salesOrders.queries'
import { useQuotationsSummary } from '../../quotations/quotations.queries'
import { ROUTES } from '../../../routes'
import type { ProjectRow } from '../projects.queries'
import { ProjectInfoCards } from './ProjectInfoRecap'

// Real "Related Items" widget from projet/element.php — a generic
// Dolibarr overview that lists every object type possibly linked to a
// project. Verified live against a real project (id=1): most of this app's
// own list features (Purchase Orders, Invoices, Contracts, Supplier
// Proposals — see the survey behind this file) have NO project-reference
// field to filter by, only Sales Orders and Quotations do (their list rows
// already carry a real `projectRef`, same field their own list pages
// already use — not new scraping, just reusing an existing hook). Every
// other section below is an honest empty state with the real column
// headers; "Create X" links out to this app's own real create form where
// one exists, and stays disabled where it doesn't.

function RelatedSection({ title, createLabel, createHref, onCreateClick, children }: { title: string; createLabel?: string; createHref?: string; onCreateClick?: () => void; children: ReactNode }) {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-brand underline underline-offset-4">{title}</h3>
        {createLabel &&
          (createHref ? (
            <Link to={createHref} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover shrink-0 whitespace-nowrap">
              <Plus size={13} /> {createLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onCreateClick}
              disabled={!onCreateClick}
              title={onCreateClick ? undefined : 'No real API available on this backend'}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              <Plus size={13} /> {createLabel}
            </button>
          ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </Card>
  )
}

// Named columns hug their own content width; the trailing unnamed <col>
// absorbs all leftover space instead of it being spread as gaps between
// every column (the default behavior of an auto-layout table at w-full).
function RelatedTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <>
      <colgroup>
        {columns.map((c) => (
          <col key={c} />
        ))}
        <col style={{ width: '100%' }} />
      </colgroup>
      <thead>
        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
          {columns.map((c) => (
            <th key={c} className="font-medium px-4 py-1.5 whitespace-nowrap">
              {c}
            </th>
          ))}
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="border-b border-border last:border-0">
            {cells.map((cell, j) => (
              <td key={j} className="px-4 py-1.5 text-text-muted whitespace-nowrap">
                {cell}
              </td>
            ))}
            <td />
          </tr>
        ))}
      </tbody>
    </>
  )
}

const STD_COLUMNS = ['Ref', 'Date', 'Third-Party', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Status']

export function ProjectOverviewTab({ project, onGoToTimeSpent }: { project: ProjectRow; onGoToTimeSpent?: () => void }) {
  const quotations = useQuotationsSummary()
  const orders = useSalesOrdersSummary()

  const projectQuotations = (quotations.data?.quotations ?? []).filter((q) => q.projectRef === project.ref)
  const projectOrders = (orders.data?.orders ?? []).filter((o) => o.projectRef === project.ref)

  return (
    <div className="space-y-3">
      <ProjectInfoCards project={project} />

      <Card className="!h-auto">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-text-faint mb-1">From</label>
            <input type="date" disabled title="No real API available on this backend" className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text-faint text-sm w-full cursor-not-allowed" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-text-faint mb-1">To</label>
            <input type="date" disabled title="No real API available on this backend" className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text-faint text-sm w-full cursor-not-allowed" />
          </div>
          <button
            type="button"
            onClick={() => {
              quotations.refetch()
              orders.refetch()
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover shrink-0"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </Card>

      <RelatedSection title="Profit">
        <RelatedTable
          columns={['Element', 'Number', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)']}
          rows={[
            ['Loan', '—', '—', '—'],
            ['Profit', '—', '—', '—'],
            ['Margin', '—', '—', '—'],
          ]}
        />
      </RelatedSection>

      <RelatedSection title="List of the commercial proposals related to the project" createLabel="Create proposal" createHref={ROUTES.quotationCreate}>
        <RelatedTable
          columns={STD_COLUMNS}
          rows={projectQuotations.map((q) => [
            <Link key="ref" to={ROUTES.quotationDetail.replace(':id', String(q.id))} className="text-brand hover:underline">
              {q.ref}
            </Link>,
            q.date,
            q.thirdParty,
            formatMoney(q.amountExclTax),
            '—',
            q.status,
          ])}
        />
      </RelatedSection>

      <RelatedSection title="List of sales orders related to the project" createLabel="Create Order" createHref={ROUTES.orderCreate}>
        <RelatedTable
          columns={STD_COLUMNS}
          rows={projectOrders.map((o) => [
            <Link key="ref" to={ROUTES.orderDetail.replace(':id', String(o.id))} className="text-brand hover:underline">
              {o.ref}
            </Link>,
            o.orderDate,
            o.thirdParty,
            formatMoney(o.amountExclTax),
            '—',
            o.status,
          ])}
        />
      </RelatedSection>

      <RelatedSection title="List of customer invoices related to the project" createLabel="Create Invoice" createHref={ROUTES.invoiceCreate}>
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of customer template invoices related to the project">
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of vendor Quotation associated with project" createLabel="Create a price request" createHref={ROUTES.supplierProposalCreate}>
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of purchase orders related to the project" createLabel="Create Purchase Order" createHref={ROUTES.purchaseOrderCreate}>
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of vendor invoices related to the project" createLabel="Create vendor invoice" createHref={ROUTES.vendorInvoiceCreate}>
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of contracts related to the project" createLabel="Create contract" createHref={ROUTES.contractCreate}>
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of interventions related to the project" createLabel="Create intervention" createHref={ROUTES.jobCardCreate}>
        <RelatedTable columns={['Ref', 'Date', 'Third-Party', 'Total Duration', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Status']} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of shippings related to the project">
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of expense reports related to the project" createLabel="Create expense report" createHref={ROUTES.expensesCreate}>
        <RelatedTable columns={['Ref', 'Date', 'User', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Status']} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of donations related to the project" createLabel="Create a donation" createHref={ROUTES.ledgerDonationCreate}>
        <RelatedTable columns={['Ref', 'Date', 'User', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Status']} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of loan associated with the project" createLabel="Create loan" createHref={ROUTES.ledgerLoanCreate}>
        <RelatedTable columns={['Ref', 'Date', 'Third-Party', 'Capital', 'Remaining Unpaid', 'Status']} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of social contributions associated with the project" createLabel="Add social/fiscal tax" createHref={ROUTES.ledgerSocialFiscalTaxCreate}>
        <RelatedTable columns={STD_COLUMNS} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of time consumed on tasks of project" createLabel="Create time spent" onCreateClick={onGoToTimeSpent}>
        <RelatedTable columns={['Ref', 'Time Spent', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Declared Real Progress']} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of payments of salaries related to the project" createLabel="Add salary payment" createHref={ROUTES.ledgerSalaryPaymentCreate}>
        <RelatedTable columns={['Ref', 'Date', 'User', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Status']} rows={[]} />
      </RelatedSection>

      <RelatedSection title="List of miscellaneous payments related to the project" createLabel="Add miscellaneous payment" createHref={ROUTES.ledgerMiscPaymentCreate}>
        <RelatedTable columns={['Ref', 'Date', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Status']} rows={[]} />
      </RelatedSection>
    </div>
  )
}
