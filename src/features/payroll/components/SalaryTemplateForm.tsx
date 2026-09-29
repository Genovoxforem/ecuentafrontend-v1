import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Info, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import {
  lineAmount,
  salaryTemplateTotals,
  useCreateSalaryTemplate,
  useSalaryTemplateCalculation,
  useSalaryTemplatePage,
  type SalaryTemplateInput,
  type SalaryTemplateLine,
  type SalaryTemplateValueType,
} from '../salaryTemplate.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30'

// Real shape (payroll/salary_temp.php): each row is a fee-type pick
// (a_label[]/d_label[] — the same dictionary for both tabs), a Fixed/% percentage
// type, an entered Value, and a READ-ONLY computed Amount — Fixed copies Value,
// percentage is (Basic Salary / 100) * Value (the page's own allowvale()/dvalue()).
interface LineItem extends SalaryTemplateLine {
  id: number
}
let lineItemSeq = 1
function newLineItem(): LineItem {
  return { id: lineItemSeq++, feeTypeId: '', valueType: 'Fixed', value: '' }
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function LineItemBuilder({
  title,
  addLabel,
  selectPlaceholder,
  items,
  onChange,
  feeTypeOptions,
  basicSalary,
}: {
  title: string
  addLabel: string
  selectPlaceholder: string
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  feeTypeOptions: { value: string; label: string }[]
  basicSalary: number
}) {
  function updateItem(id: number, patch: Partial<LineItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  function removeItem(id: number) {
    onChange(items.filter((it) => it.id !== id))
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text!">{title}</h3>
        <button type="button" onClick={() => onChange([...items, newLineItem()])} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <Plus size={13} /> {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-faint italic">None added.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex flex-wrap items-center gap-1.5">
              <select value={it.feeTypeId} onChange={(e) => updateItem(it.id, { feeTypeId: e.target.value })} className={`${inputCls} flex-1 min-w-[160px]`}>
                <option value="">{selectPlaceholder}</option>
                {feeTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-text-faint text-xs">:</span>
              <select value={it.valueType} onChange={(e) => updateItem(it.id, { valueType: e.target.value as SalaryTemplateValueType })} className={`${inputCls} w-24`}>
                <option value="Fixed">Fixed</option>
                <option value="percentage">% percentage</option>
              </select>
              <input value={it.value} onChange={(e) => updateItem(it.id, { value: e.target.value })} placeholder="Enter Value" inputMode="decimal" className={`${inputCls} w-24`} />
              <input value={lineAmount(it, basicSalary).toFixed(2)} readOnly placeholder="Amount" className={`${inputCls} w-24 bg-surface-alt cursor-not-allowed`} />
              <button type="button" onClick={() => removeItem(it.id)} className="p-1.5 text-text-faint hover:text-danger">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// The real page: payroll/salary_temp.php. The panel on the right is the backend's
// own calculation (payroll/loadcalculation.php — contribution rows, totals and the
// "allocation is successful" check, all per installation) and Save sends the same
// POST the page's form does. PAYE tax is not offered: the page works its bracket
// table out in the browser, so a template that needs PAYE is made on the backend.
export function SalaryTemplateForm() {
  const navigate = useNavigate()
  const { data: page, isLoading, isError, error: pageError, refetch } = useSalaryTemplatePage()
  const createTemplate = useCreateSalaryTemplate()

  const [salaryGrade, setSalaryGrade] = useState('')
  const [currency, setCurrency] = useState('')
  const [grossSalary, setGrossSalary] = useState('')
  const [basicPercent, setBasicPercent] = useState('')
  const [basicSalary, setBasicSalary] = useState('')
  const [overtimeMode, setOvertimeMode] = useState<'hourly' | 'premium'>('hourly')
  const [overtimeValue, setOvertimeValue] = useState('')
  const [monthlyLeaves, setMonthlyLeaves] = useState('0')
  const [allowances, setAllowances] = useState<LineItem[]>([])
  const [deductions, setDeductions] = useState<LineItem[]>([])
  const [activeTab, setActiveTab] = useState<'allowances' | 'deductions'>('allowances')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const input: SalaryTemplateInput = useMemo(
    () => ({
      salaryGrade,
      grossSalary,
      basicPercent,
      basicSalary,
      overtimeMode,
      overtimeValue,
      permittedLeave: monthlyLeaves,
      allowances: allowances.map(({ feeTypeId, valueType, value }) => ({ feeTypeId, valueType, value })),
      deductions: deductions.map(({ feeTypeId, valueType, value }) => ({ feeTypeId, valueType, value })),
    }),
    [salaryGrade, grossSalary, basicPercent, basicSalary, overtimeMode, overtimeValue, monthlyLeaves, allowances, deductions],
  )
  const debouncedInput = useDebounced(input, 500)
  const activeCurrency = currency || page?.defaultCurrency || ''
  const calc = useSalaryTemplateCalculation(debouncedInput, page, activeCurrency)

  function handleBasicPercentChange(value: string) {
    setBasicPercent(value)
    const gross = Number(grossSalary)
    const pct = Number(value)
    if (gross > 0 && pct >= 0) setBasicSalary(((pct / 100) * gross).toFixed(2))
  }

  const basicSalaryNum = Number(basicSalary) || 0
  const totals = salaryTemplateTotals(input)
  const inSync = debouncedInput === input
  const balanced = !!calc.data?.balanced && inSync

  function handleSubmit() {
    if (!page) return
    setError('')
    if (!salaryGrade.trim()) return setError('Please select a salary grade.')
    if (!basicSalary) return setError('Please enter the basic salary.')
    if (overtimeValue.trim() && !(Number(overtimeValue) > 0)) return setError('Overtime Value must be greater than 0.')
    createTemplate.mutate(
      { input, page, currency: activeCurrency },
      {
        onSuccess: () => {
          setSuccess(true)
          setTimeout(() => navigate(ROUTES.payrollSalaryTemplate), 800)
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'The salary template could not be saved.'),
      },
    )
  }

  if (isLoading) return <LegacyLoadingCard label="Loading salary template form…" />
  if (isError || !page) {
    return <LegacyErrorCard title="Couldn't load the salary template form" message={pageError instanceof Error ? pageError.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileSpreadsheet size={20} className="text-brand" /> Salary Template
        </h2>
        <Link to={ROUTES.payrollSalaryTemplate} className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text">
          <ArrowLeft size={14} /> Back to list
        </Link>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Contributions, totals and the net salary below are worked out by the backend as you type. PAYE tax isn't offered here — the backend builds its tax
          bracket table in the browser — so a template that needs PAYE has to be created on the backend.
        </p>
      </Card>

      {success && (
        <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">
          <p role="status">Salary template saved — redirecting…</p>
        </Card>
      )}
      {error && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
        <Card className="!h-auto space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-danger">Salary Grade *</span>
            <input value={salaryGrade} onChange={(e) => setSalaryGrade(e.target.value)} placeholder="Enter Grade Name" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Currency</span>
            <select value={activeCurrency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              {page.currencies.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-danger">Gross Salary *</span>
            <input value={grossSalary} onChange={(e) => setGrossSalary(e.target.value)} placeholder="Enter Gross Salary" inputMode="decimal" className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-danger">% Of Basic Salary</span>
              <input value={basicPercent} onChange={(e) => handleBasicPercentChange(e.target.value)} inputMode="decimal" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-danger">Basic Salary *</span>
              <input value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} placeholder="Enter Basic Salary" inputMode="decimal" className={inputCls} />
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Overtime</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-text-muted">
                <input type="radio" checked={overtimeMode === 'hourly'} onChange={() => setOvertimeMode('hourly')} className="text-brand focus:ring-brand/30" />
                Hourly Overtime
              </label>
              <label className="flex items-center gap-1.5 text-sm text-text-muted">
                <input type="radio" checked={overtimeMode === 'premium'} onChange={() => setOvertimeMode('premium')} className="text-brand focus:ring-brand/30" />
                Overtime Premium Pay
              </label>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Overtime Value</span>
            <input value={overtimeValue} onChange={(e) => setOvertimeValue(e.target.value)} placeholder="Enter Value" inputMode="decimal" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Monthly Permitted Leaves</span>
            <input value={monthlyLeaves} onChange={(e) => setMonthlyLeaves(e.target.value)} inputMode="numeric" className={inputCls} />
          </label>
        </Card>

        <Card className="!h-auto space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('allowances')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${activeTab === 'allowances' ? 'bg-brand text-white' : 'text-brand hover:bg-brand/10'}`}
            >
              Allowances
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deductions')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${activeTab === 'deductions' ? 'bg-brand text-white' : 'text-brand hover:bg-brand/10'}`}
            >
              Deductions
            </button>
          </div>

          {activeTab === 'allowances' ? (
            <LineItemBuilder
              title="Allowances"
              addLabel="Add More Allowances"
              selectPlaceholder="Select Allowances"
              items={allowances}
              onChange={setAllowances}
              feeTypeOptions={page.feeTypes}
              basicSalary={basicSalaryNum}
            />
          ) : (
            <LineItemBuilder
              title="Deductions"
              addLabel="Add More Deductions"
              selectPlaceholder="Select Deductions"
              items={deductions}
              onChange={setDeductions}
              feeTypeOptions={page.feeTypes}
              basicSalary={basicSalaryNum}
            />
          )}

          <div className="border-t border-border pt-3 space-y-2">
            {calc.isError ? (
              <p className="text-xs font-medium text-danger">{calc.error instanceof Error ? calc.error.message : 'Could not calculate.'}</p>
            ) : calc.data ? (
              <p className={`text-xs font-medium ${calc.data.balanced ? 'text-success-fg' : 'text-danger'}`}>* {calc.data.message}</p>
            ) : (
              <p className="text-xs text-text-faint">Enter the gross and basic salary to see the backend's calculation.</p>
            )}
            {calc.isFetching && (
              <p className="flex items-center gap-1.5 text-xs text-text-faint">
                <Loader2 size={12} className="animate-spin" /> Calculating…
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Total Allowances</span>
            <span className="text-text! font-medium">{totals.allowances.toFixed(2)}</span>
          </div>
          {calc.data?.contributions.map((c) => (
            <div key={c.label} className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{c.label}</span>
              <span className="text-text! font-medium">{c.amount}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm border-t border-border pt-2">
            <span className="text-text-muted">Total Contributions</span>
            <span className="text-text! font-medium">{calc.data?.totalContributions || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Paye Tax</span>
            <span className="text-text! font-medium">{calc.data?.payeTax || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Total Deductions</span>
            <span className="text-text! font-medium">{calc.data?.totalDeductions || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold border-t border-border pt-2">
            <span className="text-text!">Net Salary</span>
            <span className="text-brand">{calc.data?.netSalary || '—'}</span>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link to={ROUTES.payrollSalaryTemplate} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createTemplate.isPending || success || !balanced}
          title={balanced ? undefined : 'The allocation has to equal the gross pay first'}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createTemplate.isPending && <Loader2 size={14} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  )
}
