import { useMemo, useState, type ReactNode } from 'react'
import { CalendarClock, ClipboardList, Coins, FileMinus, FileText, Hourglass, Users } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { monthEnd, monthStart, today, usDate } from '../reportFormat'
import {
  choices,
  useAgingDetailsClassic,
  useAgingSummaryClassic,
  useCommission,
  useCommissionDetail,
  useCreditNoteAging,
  useCustomerReport,
  useDueCustomers,
  useProposalList,
  useSalesOrderListClassic,
  type ClassicTable,
  type CommissionBlock,
  type ListingFilters,
} from '../receivablesClassic.data'
import { inputCls, RangeBar, ReportError, ReportLoading, SelectField } from './ReportWidgets'

// The Receivables reports of the Reports Center, laid out as the classic pages are (filters, heading, table, total) and filled from the classic page
// (receivablesClassic.data.ts). Nothing here is computed: the rows, the totals and the status words are the classic page's.

export function Title({ icon: Icon, children }: { icon: typeof Users; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
      <Icon size={20} className="text-brand" /> {children}
    </h2>
  )
}

// The total rows of a classic table: each figure printed under the name of its column.
function Totals({ table }: { table: ClassicTable }) {
  if (table.footers.length === 0 || table.rows.length === 0) return null
  return (
    <div className="space-y-1">
      {table.footers.map((f, i) => (
        <div key={i} className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text">
          {f.map((c, ci) => (c ? <span key={ci}>{ci === 0 || !table.headers[ci] ? c : `${table.headers[ci]}: ${c}`}</span> : null))}
        </div>
      ))}
    </div>
  )
}

export function TableWithTotals({ title, table, hiddenColumns }: { title: string; table: ClassicTable; hiddenColumns?: string[] }) {
  const t = useMemo(() => ({ headers: table.headers, rows: table.rows, links: table.links }), [table])
  return (
    <>
      <LegacyReportTable title={title} table={t} hiddenColumns={hiddenColumns} />
      <Totals table={table} />
    </>
  )
}

type Query<T> = { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; data: T | undefined }

export function Status<T>({ q, label }: { q: Query<T>; label: string }) {
  return (
    <>
      {q.isLoading && <ReportLoading label={label} />}
      {q.isError && <ReportError error={q.error} onRetry={() => void q.refetch()} />}
    </>
  )
}

// ---- Credit Note Aging Report (compta/resultat/creditnote_agingreport.php) --------------------------------------------------------------------------

export function CreditNoteAgingView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const q = useCreditNoteAging(range.start, range.end)
  return (
    <div className="space-y-4">
      <Title icon={FileMinus}>Credit Note Aging Report</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })} />
      <div className="text-center">
        <p className="text-base font-bold text-text!">Customer Credit Note Aging</p>
        <p className="text-sm text-text-muted">
          {range.start} → {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the credit note aging…" />
      {q.data && <TableWithTotals title="Credit Note Aging Report" table={q.data.table} />}
    </div>
  )
}

// ---- Combined Commission Report (compta/resultat/commissionreport.php) -------------------------------------------------------------------------------

export function CommissionView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const q = useCommission(range.start, range.end)
  return (
    <div className="space-y-4">
      <Title icon={Coins}>Combined Commission Report</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })} />
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">Combined Commission Report</p>
        <p className="text-sm text-text-muted">
          For the period of {usDate(range.start)}-{usDate(range.end)}
        </p>
      </div>
      <Status q={q} label="Loading the commission report…" />
      {q.data && <TableWithTotals title="Combined Commission Report" table={q.data.table} />}
    </div>
  )
}

// ---- Combined Commission Detailed Report (compta/resultat/commission_det_report.php) ---------------------------------------------------------------

function DetailBlocks({ blocks }: { blocks: CommissionBlock[] }) {
  const columns = Math.max(4, ...blocks.map((b) => ('cells' in b ? b.cells.length : 0)))
  return (
    <Card className="!h-auto overflow-x-auto !p-0">
      <table className="w-full text-sm">
        <tbody>
          {blocks.map((b, i) => {
            if (b.kind === 'title') return (
              <tr key={i} className="border-b border-border bg-surface">
                <td colSpan={columns} className="px-3 py-2 text-center text-base font-bold uppercase text-text!">{b.text}</td>
              </tr>
            )
            if (b.kind === 'section') return (
              <tr key={i} className="border-b border-border">
                <td colSpan={columns} className="px-3 py-2 text-center text-sm font-bold uppercase text-text!">{b.text}</td>
              </tr>
            )
            const header = b.kind === 'header'
            const strong = b.kind === 'total' || b.kind === 'grand'
            return (
              <tr key={i} className={`border-b border-border ${header ? 'bg-surface text-xs uppercase tracking-wide text-text-faint' : strong ? 'bg-surface-hover font-semibold text-text' : 'text-text-muted'}`}>
                {b.cells.map((c, ci) => (
                  <td key={ci} className={`px-3 py-2 ${ci === b.cells.length - 1 && !header ? 'text-right' : ''} ${header ? 'font-medium' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

export function CommissionDetailView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const [entity, setEntity] = useState('')
  const [paymentType, setPaymentType] = useState('')
  const q = useCommissionDetail(range.start, range.end, entity, paymentType)
  return (
    <div className="space-y-4">
      <Title icon={Coins}>Combined Commission Detailed Report</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Entity" value={entity} onChange={setEntity} options={choices(q.data?.entities)} blank="Select All" />
        <SelectField label="Payment Type" value={paymentType} onChange={setPaymentType} options={choices(q.data?.paymentTypes)} blank="Select All" />
      </RangeBar>
      <p className="text-center text-sm text-text-muted">
        For the period of {usDate(range.start)}-{usDate(range.end)}
      </p>
      <Status q={q} label="Loading the detailed commission report…" />
      {q.data && <DetailBlocks blocks={q.data.blocks} />}
    </div>
  )
}

// ---- Due Customers (compta/facture/customerduelist.php) -------------------------------------------------------------------------------------------------

export function DueCustomersView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const [customer, setCustomer] = useState('')
  const [type, setType] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [user, setUser] = useState('')
  const [status, setStatus] = useState('')
  const q = useDueCustomers({ ...range, customer, type, tags, user, status })
  const o = q.data?.options
  const tagOptions = choices(o?.tags)
  return (
    <div className="space-y-4">
      <Title icon={CalendarClock}>Due Customers Invoices</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report Period" buttonLabel="Refresh" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Third-party" value={customer} onChange={setCustomer} options={choices(o?.customers, ['', '-1'])} blank="" />
        <SelectField label="Third-party type" value={type} onChange={setType} options={choices(o?.types, ['', '0'])} blank="" />
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Tag/category customer</span>
          <select multiple value={tags} onChange={(e) => setTags(Array.from(e.target.selectedOptions, (s) => s.value))} className={`${inputCls} h-9 min-w-44`} aria-label="Tag/category customer" disabled={tagOptions.length === 0}>
            {tagOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <SelectField label="Created by" value={user} onChange={setUser} options={choices(o?.users, ['', '-1'])} blank="Select a users" />
        <SelectField label="Status" value={status} onChange={setStatus} options={choices(o?.statuses)} blank="" />
      </RangeBar>
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">Due Customers Invoices</p>
        <p className="text-sm text-text-muted">
          For the period of {range.start} To {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the due customers…" />
      {q.data && <TableWithTotals title="Due Customers Invoices" table={q.data.table} />}
    </div>
  )
}

// ---- Customer Report (compta/resultat/customer_report.php?type=c) -------------------------------------------------------------------------------------

export function CustomerReportClassicView() {
  // the classic page shows the month in its picker but lists every customer until a period is searched
  const [applied, setApplied] = useState<{ start: string; end: string } | null>(null)
  const range = applied ?? { start: monthStart(), end: monthEnd() }
  const [creator, setCreator] = useState('')
  const q = useCustomerReport(applied, creator)
  return (
    <div className="space-y-4">
      <Title icon={Users}>Customer Report</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Date" buttonLabel="Search" onApply={(start, end) => setApplied({ start, end })}>
        <SelectField label="Creator" value={creator} onChange={setCreator} options={choices(q.data?.options.creators)} blank="" />
      </RangeBar>
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">Customer Report</p>
        <p className="text-sm text-text-muted">
          {applied ? `For the period of ${usDate(range.start)}-${usDate(range.end)}` : 'All customers'}
        </p>
      </div>
      <Status q={q} label="Loading the customers…" />
      {q.data && <TableWithTotals title="Customer Report" table={q.data.table} />}
    </div>
  )
}

// ---- Customer aging (compta/resultat/aging_summary.php and aging_details.php) --------------------------------------------------------------------

export function AgingSummaryClassicView({ title }: { title: string }) {
  // the classic page opens on 01/01/2020 - today
  const [range, setRange] = useState({ start: '2020-01-01', end: today() })
  const [customer, setCustomer] = useState('')
  const q = useAgingSummaryClassic(range.start, range.end, customer)
  return (
    <div className="space-y-4">
      <Title icon={Hourglass}>{title}</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Customer" value={customer} onChange={setCustomer} options={choices(q.data?.options.customers, ['', 'all', '-1'])} />
      </RangeBar>
      <div>
        <p className="text-base font-bold text-text!">Customer Aging Summary</p>
        <p className="text-sm text-text-muted">
          {range.start} → {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the customer aging…" />
      {q.data && <TableWithTotals title="Customer Aging Summary" table={q.data.table} />}
    </div>
  )
}

export function AgingDetailsClassicView({ title }: { title: string }) {
  const [range, setRange] = useState({ start: `${new Date().getFullYear()}-01-01`, end: today() })
  const [customer, setCustomer] = useState('')
  const [convert, setConvert] = useState(false)
  const q = useAgingDetailsClassic(range.start, range.end, customer, convert)
  return (
    <div className="space-y-4">
      <Title icon={Hourglass}>{title}</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Customer" value={customer} onChange={setCustomer} options={choices(q.data?.options.customers, ['', '-1'])} blank="" />
        <label className="flex h-9 items-center gap-2 self-end text-sm font-medium text-text">
          <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} /> Convert to Base
        </label>
      </RangeBar>
      <div>
        <p className="text-base font-bold text-text!">Customer Aging Detail</p>
        <p className="text-sm text-text-muted">
          {range.start} → {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the customer aging…" />
      {q.data && <TableWithTotals title="Customer Aging Detail" table={q.data.table} />}
    </div>
  )
}

// ---- Proposal List (comm/propal/proposalreport.php) and Sales Order List (commande/listreport.php?type=salesorder) ------------------------------------

export function ProposalListView() {
  const [range, setRange] = useState({ start: today(), end: today() })
  const [salesRep, setSalesRep] = useState('')
  const [user, setUser] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [customerCategory, setCustomerCategory] = useState('')
  const filters: ListingFilters = { ...range, salesRep, user, productCategory, customerCategory }
  const q = useProposalList(filters)
  const o = q.data?.options
  return (
    <div className="space-y-4">
      <Title icon={FileText}>Proposal List</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Sales representative" value={salesRep} onChange={setSalesRep} options={choices(o?.salesReps, ['', '0'])} blank="" />
        <SelectField label="User" value={user} onChange={setUser} options={choices(o?.users, ['', '-1'])} blank="Select a users" />
        <SelectField label="Product category" value={productCategory} onChange={setProductCategory} options={choices(o?.productCategories, ['', '0'])} blank="" />
        <SelectField label="Customer category" value={customerCategory} onChange={setCustomerCategory} options={choices(o?.customerCategories, ['', '0'])} blank="Select Tag/Category" />
      </RangeBar>
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">Proposal List</p>
        <p className="text-sm text-text-muted">
          For the period of {range.start} To {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the proposals…" />
      {q.data && <TableWithTotals title="Proposal List" table={q.data.table} />}
    </div>
  )
}

// The classic report opens on the whole current year (For the period of 2026-01-01 To 2026-12-31).
export function SalesOrderListClassicView() {
  const year = new Date().getFullYear()
  const [range, setRange] = useState({ start: `${year}-01-01`, end: `${year}-12-31` })
  const q = useSalesOrderListClassic({ ...range, salesRep: '', user: '', productCategory: '', customerCategory: '' })
  return (
    <div className="space-y-4">
      <Title icon={ClipboardList}>Sales Order List</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })} />
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">Sales Order List</p>
        <p className="text-sm text-text-muted">
          For the period of {range.start} To {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the sales orders…" />
      {q.data && <TableWithTotals title="Sales Order List" table={q.data.table} />}
    </div>
  )
}
