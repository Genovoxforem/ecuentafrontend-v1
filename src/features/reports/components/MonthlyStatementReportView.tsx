import { lazy, Suspense, useState, type ReactNode } from 'react'
import { generatePath, Link } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Eye,
  FileText,
  Handshake,
  History,
  LineChart,
  Receipt,
  Scale,
  ShoppingCart,
  Users,
  UsersRound,
  Warehouse,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShoppingBasket,
  PieChart,
  Phone,
  Landmark,
  UserCog,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import {
  statementDailySales,
  statementKpis,
  statementPnlRows,
  useMonthlyStatement,
  useStatementInvoices,
  type ActivityRow,
  type InvoiceGroup,
  type InvoiceKind,
  type MonthlyStatement,
  type StatementKpi,
} from '../monthlyStatement.data'
import { fmt, fmtDate, fmtInt, monthEnd, monthStart, num, periodLabelDate } from '../reportFormat'
import { Badge, KpiCard, MiniStat, RangeBar, ReportBlock, ReportError, ReportLoading, SimpleTable, TabBar, ValueLine, type ReportTone } from './ReportWidgets'

const StatementSalesChart = lazy(() => import('./StatementSalesChart'))

const KPI_ICON = {
  'Total Sales': TrendingUp,
  Purchases: ShoppingBasket,
  'Gross Profit': PieChart,
  Expenses: Receipt,
  Payroll: Users,
  'Bank Balance': Landmark,
  'Operating Profit': BarChart3,
  'CRM Activities': Phone,
} as const

const KPI_TONE: Record<StatementKpi['tone'], ReportTone> = { green: 'green', orange: 'orange', blue: 'blue', red: 'red', rose: 'rose', purple: 'purple', teal: 'teal', indigo: 'indigo' }

const invoiceLink = (kind: InvoiceKind, id: string | number) =>
  generatePath(kind === 'sales' ? ROUTES.invoiceDetail : ROUTES.vendorInvoiceDetail, { id: String(id) })

// "Monthly Statement Report" of the Reports Center (classic: custom/reports/monthly_statement_report.php), read from monthly_statement_ajax.php.
// Same blocks, wording and formulas as that page; links open this app's own pages instead of the classic ones.
export function MonthlyStatementReportView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const q = useMonthlyStatement(range.start, range.end)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Monthly Statement Report
      </h2>
      <RangeBar
        key={`${range.start}|${range.end}`}
        start={range.start}
        end={range.end}
        onApply={(start, end) => setRange({ start, end })}
        right={q.data ? `Showing: ${periodLabelDate(range.start)} - ${periodLabelDate(range.end)}` : undefined}
      />
      {q.isLoading && <ReportLoading label="Loading the monthly statement…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {q.data && <StatementBody d={q.data} start={range.start} end={range.end} />}
    </div>
  )
}

function StatementBody({ d, start, end }: { d: MonthlyStatement; start: string; end: string }) {
  const kpis = statementKpis(d)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} tone={KPI_TONE[k.tone]} icon={KPI_ICON[k.label as keyof typeof KPI_ICON]} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesInvoicesBlock d={d} start={start} end={end} />
        <PurchaseInvoicesBlock d={d} start={start} end={end} />
      </div>

      <ExpensesBlock d={d} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PayrollBlock d={d} />
        <ReportBlock title="Customer Overview" icon={UsersRound} tone="teal">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <MiniStat label="Total Customers" value={fmtInt(d.customers.total_customers)} />
            <MiniStat label="Active This Month" value={fmtInt(d.customers.active_customers)} valueClass="text-blue-600" />
            <MiniStat label="New This Month" value={fmtInt(d.customers.new_customers)} valueClass="text-success-fg" />
          </div>
        </ReportBlock>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BankBlock d={d} />
        <WarehouseBlock d={d} />
      </div>

      <h3 className="flex items-center gap-2 pt-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
        <LineChart size={15} /> Analytics &amp; Summaries
      </h3>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportBlock title="Sales Orders" icon={ClipboardList} tone="teal">
          <ValueLine label="Total" value={fmtInt(d.sales_orders.total_count)} />
          <ValueLine label="Confirmed" value={fmtInt(d.sales_orders.confirmed_count)} />
          <ValueLine label="Cancelled" value={fmtInt(d.sales_orders.cancelled_count)} />
          <ValueLine label="Total Value" value={fmt(d.sales_orders.total_ttc)} />
        </ReportBlock>
        <ReportBlock title="Purchase Orders" icon={FileText} tone="purple">
          <ValueLine label="Total" value={fmtInt(d.purchase_orders.total_count)} />
          <ValueLine label="Confirmed" value={fmtInt(d.purchase_orders.confirmed_count)} />
          <ValueLine label="Total Value" value={fmt(d.purchase_orders.total_ttc)} />
        </ReportBlock>
        <ReportBlock title="Quotations / Proposals" icon={Handshake} tone="indigo">
          <ValueLine label="Total" value={fmtInt(d.proposals.total_count)} />
          <ValueLine label="Validated" value={fmtInt(d.proposals.validated_count)} />
          <ValueLine label="Signed / Won" value={fmtInt(d.proposals.signed_count)} />
          <ValueLine label="Pipeline Value" value={fmt(d.proposals.total_ttc)} />
        </ReportBlock>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ReportBlock title="Profit & Loss Summary" icon={Scale} tone="green" className="lg:col-span-2">
          <div>
            {statementPnlRows(d.pnl).map((r) => (
              <div key={r.label} className={`flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0 ${r.indent ? 'pl-4' : ''} ${r.total ? 'font-semibold' : ''}`}>
                <span className="text-text-muted">{r.label}</span>
                <span className={r.value >= 0 ? 'text-success-fg' : 'text-danger-fg'}>{fmt(r.value)}</span>
              </div>
            ))}
          </div>
        </ReportBlock>
        <ReportBlock title="Daily Sales Trend" icon={LineChart} tone="blue" className="lg:col-span-3">
          <Suspense fallback={<ReportLoading label="Loading the chart…" />}>
            <StatementSalesChart data={statementDailySales(d.sales, d.period)} />
          </Suspense>
          {start.slice(0, 7) !== end.slice(0, 7) && <p className="mt-2 text-xs text-text-muted">The period covers several months: the sales of the same day of each month are added together.</p>}
        </ReportBlock>
      </div>

      <ActivitiesSection d={d} />
    </div>
  )
}

// ── Sales / purchase invoices ────────────────────────────────────────────────

function SalesInvoicesBlock({ d, start, end }: { d: MonthlyStatement; start: string; end: string }) {
  const s = d.sales
  return (
    <ReportBlock
      title="Sales Invoices"
      icon={FileSpreadsheet}
      tone="blue"
      right={
        <>
          <Badge tone="success">{fmtInt(s.paid_count)} Paid</Badge>
          <Badge tone="warning">{fmtInt(s.unpaid_count)} Unpaid</Badge>
        </>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <MiniStat label="Sales (Incl. VAT)" value={fmt(s.sales_only?.total_ttc)} valueClass="text-blue-600" />
        <MiniStat label="Credit Notes (Incl. VAT)" value={fmt(s.credit_notes_only?.total_ttc)} valueClass="text-danger-fg" />
        <MiniStat label="Total Sales (Incl. VAT)" value={fmt(s.total_ttc)} valueClass="text-success-fg" />
        <MiniStat label="VAT" value={fmt(s.total_vat)} />
        <MiniStat label="Excl. VAT" value={fmt(s.total_ht)} />
      </div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-text-muted">
        <Users size={13} /> Top Customers
      </p>
      <SimpleTable
        headers={['Customer', 'Invoices', 'Amount']}
        rows={(s.top_customers ?? []).map((c) => [c.customer || 'N/A', fmtInt(c.inv_count), fmt(c.total)])}
        empty="No data"
        right={[1, 2]}
      />
      <InvoiceGroups kind="sales" block={s} start={start} end={end} />
    </ReportBlock>
  )
}

function PurchaseInvoicesBlock({ d, start, end }: { d: MonthlyStatement; start: string; end: string }) {
  const p = d.purchases
  return (
    <ReportBlock
      title="Purchase Invoices"
      icon={ShoppingCart}
      tone="orange"
      right={
        <>
          <Badge tone="success">{fmtInt(p.paid_count)} Paid</Badge>
          <Badge tone="warning">{fmtInt(p.unpaid_count)} Unpaid</Badge>
        </>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniStat label="Excl. VAT" value={fmt(p.total_ht)} />
        <MiniStat label="VAT" value={fmt(p.total_vat)} />
        <MiniStat label="Incl. VAT" value={fmt(p.total_ttc)} valueClass="text-orange-600" />
        <MiniStat label="Unpaid" value={fmt(p.unpaid_ttc)} valueClass="text-amber-700" />
      </div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-text-muted">
        <Building2 size={13} /> Top Suppliers
      </p>
      <SimpleTable
        headers={['Supplier', 'Invoices', 'Amount']}
        rows={(p.top_suppliers ?? []).map((s) => [s.supplier || 'N/A', fmtInt(s.inv_count), fmt(s.total)])}
        empty="No data"
        right={[1, 2]}
      />
      <InvoiceGroups kind="purchase" block={p} start={start} end={end} />
    </ReportBlock>
  )
}

// The four groups under the totals: each is listed only when its count is above 0 and loads its invoices when it is opened.
function InvoiceGroups({ kind, block, start, end }: { kind: InvoiceKind; block: MonthlyStatement['sales'] | MonthlyStatement['purchases']; start: string; end: string }) {
  const groups: Array<{ status: InvoiceGroup; label: string; count: number; icon: ReactNode }> = [
    { status: 'paid', label: 'Paid Invoices', count: num(block.paid_count), icon: <CheckCircle2 size={15} className="text-success-fg" /> },
    { status: 'unpaid', label: 'Unpaid Invoices', count: num(block.unpaid_count), icon: <AlertCircle size={15} className="text-danger-fg" /> },
    { status: 'previous_unpaid', label: 'Previous Unpaid', count: num(block.previous_unpaid_count), icon: <History size={15} className="text-orange-500" /> },
    { status: 'upcoming', label: 'Upcoming Payments', count: num(block.upcoming_payment_count), icon: <CalendarDays size={15} className="text-sky-500" /> },
  ]
  const shown = groups.filter((g) => g.count > 0)
  if (shown.length === 0) return null
  return (
    <div className="mt-3 space-y-2">
      {shown.map((g) => (
        <InvoiceGroup key={g.status} kind={kind} status={g.status} title={`${g.label} (${g.count})`} icon={g.icon} start={start} end={end} />
      ))}
    </div>
  )
}

function InvoiceGroup({ kind, status, title, icon, start, end }: { kind: InvoiceKind; status: InvoiceGroup; title: string; icon: ReactNode; start: string; end: string }) {
  const [open, setOpen] = useState(false)
  const q = useStatementInvoices(kind, status, start, end, open)
  return (
    <div className="rounded-lg border border-border">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover">
        <span className="flex items-center gap-2">
          {icon} {title}
        </span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border">
          {q.isLoading && <p className="py-3 text-center text-sm text-text-faint">Loading…</p>}
          {q.isError && <p className="py-3 text-center text-sm text-danger-fg">Error loading invoices</p>}
          {q.data && q.data.length === 0 && <p className="py-3 text-center text-sm text-text-faint">No invoices found</p>}
          {q.data?.map((inv) => (
            <div key={String(inv.rowid)} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-0">
              <div className="min-w-0">
                <Link to={invoiceLink(kind, inv.rowid)} className="font-semibold text-brand hover:underline">
                  {inv.ref}
                </Link>
                <p className="text-xs text-text-muted">
                  {inv.customer || inv.supplier || 'N/A'} • {fmtDate(inv.datef)}
                  {inv.date_lim_reglement && <span className="ml-2 text-sky-600">Due: {fmtDate(inv.date_lim_reglement)}</span>}
                </p>
              </div>
              <span className="font-bold text-text">{fmt(inv.total_ttc)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Expense reports ──────────────────────────────────────────────────────────

type ExpenseTab = 'user' | 'employee' | 'customer' | 'type' | 'detail'

function ExpensesBlock({ d }: { d: MonthlyStatement }) {
  const [tab, setTab] = useState<ExpenseTab>('user')
  const e = d.expenses
  return (
    <ReportBlock title="Expense Reports" icon={Receipt} tone="rose">
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat label="Reports" value={fmtInt(e.total_count)} />
        <MiniStat label="Approved" value={fmtInt(e.approved_count)} />
        <MiniStat label="Total Amount" value={fmt(e.total_ttc)} valueClass="text-rose-600" />
        <MiniStat label="Paid Amount" value={fmt(e.paid_amount)} valueClass="text-success-fg" />
        <MiniStat label="Employee Expense" value={fmt(e.employee_expense_total)} valueClass="text-violet-600" />
        <MiniStat label="Customer Expense" value={fmt(e.customer_expense_total)} valueClass="text-cyan-600" />
      </div>
      {(num(e.employee_expense_paid) !== 0 || num(e.customer_expense_paid) !== 0) && (
        <p className="mb-3 text-xs text-text-muted">
          <span className="text-violet-600">Employee Paid: {fmt(e.employee_expense_paid)}</span> | <span className="text-cyan-600">Customer Paid: {fmt(e.customer_expense_paid)}</span>
        </p>
      )}
      <TabBar<ExpenseTab>
        tabs={[
          { key: 'user', label: 'By Reporter' },
          { key: 'employee', label: 'By Employee' },
          { key: 'customer', label: 'By Customer' },
          { key: 'type', label: 'By Type' },
          { key: 'detail', label: 'Full Detail' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'user' && <SimpleTable headers={['Reporter', 'Reports', 'Amount']} rows={(e.by_user ?? []).map((u) => [u.employee || 'Unknown', fmtInt(u.report_count), fmt(u.total)])} empty="No data" right={[1, 2]} />}
      {tab === 'employee' && (
        <SimpleTable headers={['Employee', 'Reports', 'Amount']} rows={(e.by_employee ?? []).map((u) => [u.employee || 'Unknown', fmtInt(u.report_count), fmt(u.total)])} empty="No linked employee expenses" right={[1, 2]} />
      )}
      {tab === 'customer' && (
        <SimpleTable headers={['Customer', 'Reports', 'Amount']} rows={(e.by_customer ?? []).map((c) => [c.customer || 'Unknown', fmtInt(c.report_count), fmt(c.total)])} empty="No customer-linked expenses" right={[1, 2]} />
      )}
      {tab === 'type' && <SimpleTable headers={['Expense Type', 'Amount']} rows={(e.by_type ?? []).map((t) => [t.fee_type || t.fee_code || 'Other', fmt(t.total)])} empty="No data" right={[1]} />}
      {tab === 'detail' && (
        <SimpleTable
          headers={['Ref', 'Employee', 'From', 'To', 'Amount', 'Status', 'Linked Records']}
          rows={(d.expense_details ?? []).map((r) => [
            <Link key="ref" to={generatePath(ROUTES.expenseReportDetail, { id: String(r.rowid) })} className="font-semibold text-brand hover:underline">
              {r.ref}
            </Link>,
            r.employee_name || '—',
            fmtDate(r.date_debut),
            fmtDate(r.date_fin),
            fmt(r.total_ttc),
            <Badge key="st" tone={r.status_label === 'Paid' || r.status_label === 'Approved' ? 'success' : r.status_label === 'Refused' ? 'danger' : r.status_label === 'Validated' ? 'warning' : 'neutral'}>
              {r.status_label}
            </Badge>,
            <ExpenseLinks key="ln" r={r} />,
          ])}
          empty="No expense reports found"
          right={[4]}
          center={[5]}
        />
      )}
    </ReportBlock>
  )
}

// The records an expense report is linked to; each opens this app's page for it.
function ExpenseLinks({ r }: { r: MonthlyStatement['expense_details'][number] }) {
  const chip = 'inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-brand hover:underline'
  return (
    <span className="flex flex-wrap gap-1">
      {r.socid && r.customer_name ? (
        <Link className={chip} to={generatePath(ROUTES.customerDetail, { id: String(r.socid) })}>
          {r.customer_name}
        </Link>
      ) : null}
      {r.invoiceid && r.invoice_ref ? (
        <Link className={chip} to={invoiceLink('sales', r.invoiceid)}>
          {r.invoice_ref}
        </Link>
      ) : null}
      {r.purchaseid && r.purchase_ref ? (
        <Link className={chip} to={invoiceLink('purchase', r.purchaseid)}>
          {r.purchase_ref}
        </Link>
      ) : null}
      {r.employeeid && r.linked_employee_name ? (
        <Link className={chip} to={generatePath(ROUTES.userDetail, { id: String(r.employeeid) })}>
          {r.linked_employee_name}
        </Link>
      ) : null}
      {r.sales_invoice ? (
        <Link className={chip} to={invoiceLink('sales', r.sales_invoice)}>
          Sales Inv.
        </Link>
      ) : null}
      {r.trip_id ? <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted">Trip #{r.trip_id}</span> : null}
    </span>
  )
}

// ── Payroll, bank, warehouse ─────────────────────────────────────────────────

function PayrollBlock({ d }: { d: MonthlyStatement }) {
  const p = d.payroll
  return (
    <ReportBlock title="Payroll Summary" icon={UserCog} tone="purple">
      <ValueLine label="Employees Paid" value={fmtInt(p.employee_count)} />
      <ValueLine label="Gross Salary" value={fmt(p.gross_total)} />
      <ValueLine label="Allowances" value={fmt(p.allowance_total)} />
      <ValueLine label="Total Deductions" value={fmt(p.deduction_total)} />
      <ValueLine label="NHIMA" value={fmt(p.nhima_total)} />
      <ValueLine label="NAPSA" value={fmt(p.napsa_total)} />
      <ValueLine label="PAYE Tax" value={fmt(p.paye_total)} />
      <ValueLine label="Advances Deducted" value={fmt(p.advance_deducted_total)} />
      <ValueLine label="Paid Amount" value={fmt(p.paid_amount)} valueClass="text-success-fg" />
      <ValueLine label="Net Salary" value={fmt(p.salary_paid_total)} valueClass="text-success-fg" />
      {(p.by_method ?? []).length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase text-text-muted">By Payment Method</p>
          <SimpleTable headers={['Method', 'Emp.', 'Amount']} rows={p.by_method.map((m) => [m.payment_method || 'N/A', fmtInt(m.emp_count), fmt(m.total)])} empty="" right={[1, 2]} />
        </div>
      )}
    </ReportBlock>
  )
}

function BankBlock({ d }: { d: MonthlyStatement }) {
  const b = d.bank
  const groups = b.by_currency ?? []
  return (
    <ReportBlock title="Bank Accounts" icon={Landmark} tone="teal">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
              <th className="px-2 py-2 text-left font-medium">Account</th>
              <th className="px-2 py-2 text-right font-medium">Opening</th>
              <th className="px-2 py-2 text-right font-medium">Credits</th>
              <th className="px-2 py-2 text-right font-medium">Debits</th>
              <th className="px-2 py-2 text-right font-medium">Closing</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-text-faint">
                  No accounts
                </td>
              </tr>
            )}
            {groups.map((c) => (
              <BankCurrencyRows key={c.currency_code ?? 'unknown'} c={c} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-bold text-text">
              <td className="px-2 py-2">Total</td>
              <td />
              <td className="px-2 py-2 text-right text-success-fg">{fmt(b.total_credits)}</td>
              <td className="px-2 py-2 text-right text-danger-fg">{fmt(b.total_debits)}</td>
              <td className="px-2 py-2 text-right">{fmt(b.total_closing_balance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportBlock>
  )
}

function BankCurrencyRows({ c }: { c: MonthlyStatement['bank']['by_currency'][number] }) {
  return (
    <>
      <tr className="bg-surface-hover">
        <td colSpan={5} className="px-2 py-1.5 font-semibold text-text">
          {c.currency_code || 'Unknown Currency'}
          <span className="ml-2 font-normal text-text-muted">
            ({c.accounts.length} account{c.accounts.length > 1 ? 's' : ''})
          </span>
        </td>
      </tr>
      {c.accounts.map((a) => (
        <tr key={a.ref} className="border-b border-border">
          <td className="px-2 py-2 text-text-muted">{a.label || a.ref}</td>
          <td className="px-2 py-2 text-right text-text-muted">{fmt(a.opening_balance)}</td>
          <td className="px-2 py-2 text-right text-success-fg">{fmt(a.credits)}</td>
          <td className="px-2 py-2 text-right text-danger-fg">{fmt(a.debits)}</td>
          <td className="px-2 py-2 text-right font-semibold text-text">{fmt(a.closing_balance)}</td>
        </tr>
      ))}
      <tr className="border-b border-border font-semibold text-text">
        <td className="px-2 py-2 pl-6">Total ({c.currency_code})</td>
        <td className="px-2 py-2 text-right">—</td>
        <td className="px-2 py-2 text-right text-success-fg">{fmt(c.total_credits)}</td>
        <td className="px-2 py-2 text-right text-danger-fg">{fmt(c.total_debits)}</td>
        <td className="px-2 py-2 text-right">{fmt(c.total_closing_balance)}</td>
      </tr>
    </>
  )
}

function WarehouseBlock({ d }: { d: MonthlyStatement }) {
  const w = d.warehouse
  const mv = w.stock_movements ?? { stock_in: null, stock_out: null, movement_count: null }
  return (
    <ReportBlock title="Warehouse Stock" icon={Warehouse} tone="orange">
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniStat label="Stock Value" value={fmt(w.total_stock_value)} valueClass="text-amber-600" />
        <MiniStat label="Stock In" value={fmtInt(mv.stock_in)} valueClass="text-success-fg" />
        <MiniStat label="Stock Out" value={fmtInt(mv.stock_out)} valueClass="text-danger-fg" />
        <MiniStat label="Movements" value={fmtInt(mv.movement_count)} />
      </div>
      <SimpleTable
        headers={['Warehouse', 'Products', 'Qty', 'Stock Value']}
        rows={(w.warehouses ?? []).map((wh) => [
          <span key="n">
            <strong>{wh.warehouse_ref}</strong>
            {wh.warehouse_name ? ` — ${wh.warehouse_name}` : ''}
          </span>,
          fmtInt(wh.product_count),
          fmtInt(wh.total_qty),
          fmt(wh.stock_value),
        ])}
        empty="No warehouses"
        right={[1, 2, 3]}
      />
      {(w.low_stock ?? []).length > 0 && (
        <div className="mt-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-danger-fg">
            <AlertCircle size={13} /> Low Stock Alerts
          </p>
          <SimpleTable headers={['Product', 'Current', 'Min']} rows={w.low_stock.map((p) => [`${p.ref} — ${p.label}`, fmtInt(p.current_stock), fmtInt(p.min_stock)])} empty="" right={[1, 2]} />
        </div>
      )}
    </ReportBlock>
  )
}

// ── CRM activities ───────────────────────────────────────────────────────────

type ActivityTab = 'calls' | 'meetings' | 'tasks'

function ActivitiesSection({ d }: { d: MonthlyStatement }) {
  const [tab, setTab] = useState<ActivityTab>('calls')
  const a = d.activities
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 pt-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
        <Phone size={15} /> CRM Activities — Calls, Meetings &amp; Tasks
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="Phone Calls" value={fmtInt(a.total_calls)} sub="Logged this month" tone="blue" icon={Phone} />
        <KpiCard label="Meetings" value={fmtInt(a.total_meetings)} sub="Scheduled this month" tone="green" icon={Users} />
        <KpiCard label="Tasks/Other" value={fmtInt(a.total_tasks)} sub="All activities" tone="purple" icon={ClipboardList} />
      </div>
      <ReportBlock
        title="Activity Details"
        icon={CalendarCheck}
        tone="indigo"
        right={
          <Link to={ROUTES.agenda} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-surface-hover">
            CRM Agenda
          </Link>
        }
      >
        <TabBar<ActivityTab>
          tabs={[
            { key: 'calls', label: `Calls (${num(a.total_calls)})` },
            { key: 'meetings', label: `Meetings (${num(a.total_meetings)})` },
            { key: 'tasks', label: `Tasks & Other (${num(a.total_tasks)})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ActivityTables kind={tab} range={a[tab]} created={a.created_today[tab]} scheduled={a.scheduled_today[tab]} />
      </ReportBlock>
    </div>
  )
}

const NOUN: Record<ActivityTab, string> = { calls: 'calls', meetings: 'meetings', tasks: 'tasks' }

function ActivityTables({ kind, range, created, scheduled }: { kind: ActivityTab; range: ActivityRow[]; created: ActivityRow[]; scheduled: ActivityRow[] }) {
  const noun = NOUN[kind]
  return (
    <div className="space-y-4">
      <ActivityTable kind={kind} title="Date Range" rows={range} empty={`No ${noun} recorded`} />
      <ActivityTable kind={kind} title="Created Today" rows={created} empty={`No ${noun} created today`} />
      <ActivityTable kind={kind} title="Scheduled Today" rows={scheduled} empty={`No ${noun} scheduled for today`} />
    </div>
  )
}

// A column the classic task table titles "Progress" holds the priority, so it is titled by what it shows.
function ActivityTable({ kind, title, rows, empty }: { kind: ActivityTab; title: string; rows: ActivityRow[]; empty: string }) {
  const tasks = kind === 'tasks'
  const who = (r: ActivityRow) => (r.fk_soc ? <Link to={generatePath(ROUTES.customerDetail, { id: String(r.fk_soc) })} className="text-brand hover:underline">{r.customer || '—'}</Link> : r.customer || '—')
  const by = (r: ActivityRow) => (r.fk_user_author ? <Link to={generatePath(ROUTES.userDetail, { id: String(r.fk_user_author) })} className="text-brand hover:underline">{r.author || '—'}</Link> : r.author || '—')
  const status = (r: ActivityRow) => (r.activitystatus === 'closed' ? <Badge key="s" tone="success">Closed</Badge> : <Badge key="s" tone="warning">Open</Badge>)
  const view = (r: ActivityRow) =>
    r.fk_soc ? (
      <Link key="v" to={generatePath(ROUTES.customerDetail, { id: String(r.fk_soc) })} aria-label="View customer" className="inline-flex rounded-md border border-border p-1 text-text-muted hover:bg-surface-hover">
        <Eye size={13} />
      </Link>
    ) : (
      '—'
    )
  const headers = tasks ? ['Date', 'Type', 'Label', 'Customer', 'Created By', 'Priority', 'Status', 'Link'] : ['Date', 'Label', 'Customer', 'Created By', 'Priority', 'Status', 'Link']
  const body = rows.map((r) =>
    tasks
      ? [fmtDate(r.act_date), r.type_label || '—', r.label || '—', who(r), by(r), r.priority || '—', status(r), view(r)]
      : [fmtDate(r.act_date), r.label || '—', who(r), by(r), r.priority || '—', status(r), view(r)],
  )
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-text">{title}</h4>
      <SimpleTable headers={headers} rows={body} empty={empty} center={tasks ? [6, 7] : [5, 6]} />
    </div>
  )
}
