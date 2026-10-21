import { useState } from 'react'
import { BarChart3, Tags, Users } from 'lucide-react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useExpenseReportsPage, type ReportsFilters } from '../expenseTabs.queries'
import { controlCls } from '../expenseTable'
import { ExpenseTable, type ExpenseColumn } from './ExpenseTable'
import { Field, FormCard } from './expenseParts'

const amount = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

// The backend prints sums with every decimal the database holds (287.4137931); amounts are shown to 2.
const money = (s: string) => {
  const n = amount(s)
  return /\.\d{3,}$/.test(s) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : s
}

type EmployeeRow = { employee: string; count: string; ht: string; vat: string; ttc: string; paid: string }
type TypeRow = { type: string; lines: string; ttc: string }

const employeeColumns: ExpenseColumn<EmployeeRow>[] = [
  { key: 'employee', header: 'Employee', sortValue: (r) => r.employee, cell: (r) => r.employee },
  { key: 'count', header: 'Count', align: 'center', sortValue: (r) => Number(r.count) || 0, cell: (r) => r.count },
  { key: 'ht', header: 'Total HT', align: 'right', sortValue: (r) => amount(r.ht), cell: (r) => <span className="tabular-nums">{money(r.ht)}</span> },
  { key: 'vat', header: 'VAT', align: 'right', sortValue: (r) => amount(r.vat), cell: (r) => <span className="tabular-nums">{money(r.vat)}</span> },
  { key: 'ttc', header: 'Total TTC', align: 'right', sortValue: (r) => amount(r.ttc), cell: (r) => <strong className="tabular-nums">{money(r.ttc)}</strong> },
  { key: 'paid', header: 'Paid TTC', align: 'right', sortValue: (r) => amount(r.paid), cell: (r) => <span className="tabular-nums text-success-fg">{money(r.paid)}</span> },
]
const typeColumns: ExpenseColumn<TypeRow>[] = [
  { key: 'type', header: 'Type', sortValue: (r) => r.type, cell: (r) => r.type },
  { key: 'lines', header: 'Lines', align: 'center', sortValue: (r) => Number(r.lines) || 0, cell: (r) => r.lines },
  { key: 'ttc', header: 'Total TTC', align: 'right', sortValue: (r) => amount(r.ttc), cell: (r) => <strong className="tabular-nums">{money(r.ttc)}</strong> },
]

// expense/reports.php: totals by employee and by expense type for a period (and department / branch).
export function ExpenseReportsPage() {
  // Until Filter is pressed the page shows its own defaults: this year, January to December.
  const [applied, setApplied] = useState<ReportsFilters | null>(null)
  const [draft, setDraft] = useState<ReportsFilters | null>(null)
  const { data, isLoading, isError, error, refetch } = useExpenseReportsPage(applied)
  const form = draft ?? (data ? data.filters : null)

  const set = (key: keyof ReportsFilters) => (value: string) => form && setDraft({ ...form, [key]: value })

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 p-6 space-y-4">
      <h2 className="shrink-0 flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Expense Reports
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading the reports…" />}
      {isError && <LegacyErrorCard title="Couldn't load the reports" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && form && (
        <>
          <FormCard icon={<BarChart3 size={15} />} title="Filters">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setApplied(form)
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <Field label="Year From" className="w-28">
                <input type="number" value={form.yearFrom} onChange={(e) => set('yearFrom')(e.target.value)} className={`${controlCls} w-full`} />
              </Field>
              <Field label="Month From" className="w-36">
                <select value={form.monthFrom} onChange={(e) => set('monthFrom')(e.target.value)} className={`${controlCls} w-full`}>
                  {data.months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year To" className="w-28">
                <input type="number" value={form.yearTo} onChange={(e) => set('yearTo')(e.target.value)} className={`${controlCls} w-full`} />
              </Field>
              <Field label="Month To" className="w-36">
                <select value={form.monthTo} onChange={(e) => set('monthTo')(e.target.value)} className={`${controlCls} w-full`}>
                  {data.months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department" className="w-40">
                <input value={form.dept} onChange={(e) => set('dept')(e.target.value)} className={`${controlCls} w-full`} />
              </Field>
              <Field label="Branch" className="w-40">
                <input value={form.branch} onChange={(e) => set('branch')(e.target.value)} className={`${controlCls} w-full`} />
              </Field>
              <button type="submit" className="h-9 shrink-0 rounded-md bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover">
                Filter
              </button>
            </form>
          </FormCard>

          <div className="flex-1 min-h-0 grid grid-cols-1 gap-4 xl:grid-cols-[7fr_5fr]">
            <div className="min-w-0 flex flex-col min-h-0 space-y-2">
              <h3 className="shrink-0 flex items-center gap-2 text-sm font-semibold text-text!">
                <Users size={15} className="text-brand" /> By Employee
              </h3>
              <ExpenseTable
                rows={data.byEmployee}
                columns={employeeColumns}
                rowKey={(r) => r.employee}
                searchPlaceholder="Search..."
                searchText={(r) => r.employee}
                defaultSort={{ key: 'ttc', dir: 'desc' }}
                empty="No expenses in this period."
              />
            </div>
            <div className="min-w-0 flex flex-col min-h-0 space-y-2">
              <h3 className="shrink-0 flex items-center gap-2 text-sm font-semibold text-text!">
                <Tags size={15} className="text-brand" /> By Expense Type
              </h3>
              <ExpenseTable
                rows={data.byType}
                columns={typeColumns}
                rowKey={(r) => r.type}
                searchPlaceholder="Search..."
                searchText={(r) => r.type}
                defaultSort={{ key: 'ttc', dir: 'desc' }}
                empty="No expenses in this period."
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
