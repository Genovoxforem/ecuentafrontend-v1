import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Info, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useAuth } from '../../auth/AuthContext'
import { useRecordSalaryTemplate } from '../payrollLists.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30'

// Confirmed real reference values for this deployment — NAPSA Limit from
// Payroll Setup's own Settings tab, NAPSA/NHIMA rates from the live
// Attendance/contribution rows seen this session ("Napsa 1% (employee)",
// "Nhima 5% (employee)"). The real contribution table (llx_payroll_deduct)
// and PAYE bracket table (llx_payee_tax) have no JSON API — only reachable
// via payroll/loadcalculation.php's HTML fragment — so these are hardcoded
// reference constants, not fetched; they'd need updating here if this
// deployment's real rates ever change. PAYE tax itself isn't auto-computed
// even by the real page's own calculation endpoint (it's a pre-known value
// passed in from elsewhere), so it stays a manual entry here too.
const NAPSA_RATE = 0.01
const NAPSA_LIMIT = 1700
const NHIMA_RATE = 0.05

interface LineItem {
  id: number
  label: string
  amount: string
}
let lineItemSeq = 1
function newLineItem(): LineItem {
  return { id: lineItemSeq++, label: '', amount: '' }
}

function LineItemBuilder({ title, addLabel, items, onChange }: { title: string; addLabel: string; items: LineItem[]; onChange: (items: LineItem[]) => void }) {
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
        <button
          type="button"
          onClick={() => onChange([...items, newLineItem()])}
          className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus size={13} /> {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-faint italic">None added.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                value={it.label}
                onChange={(e) => updateItem(it.id, { label: e.target.value })}
                placeholder="Label"
                className={`${inputCls} flex-1`}
              />
              <input
                value={it.amount}
                onChange={(e) => updateItem(it.id, { amount: e.target.value })}
                placeholder="0.00"
                inputMode="decimal"
                className={`${inputCls} w-28`}
              />
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

function sumAmounts(items: LineItem[]) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
}

// The real page: payroll/salary_temp.php. Its live NAPSA/NHIMA/Net Salary
// panel is genuinely ported below (see NAPSA_RATE/NAPSA_LIMIT/NHIMA_RATE
// above and payroll/loadcalculation.php's real formula) — but Save stays
// session-local: the real write (payroll/ajax.php?saveTemplate) needs
// internal llx_payroll_deduct/llx_c_type_fees row ids this frontend has no
// way to look up (no JSON API for either table), and its own success
// signal is an embedded `<script>` redirect tag rather than JSON or a
// status code — not a contract this can target safely.
export function SalaryTemplateForm() {
  const { user } = useAuth()
  const recordSalaryTemplate = useRecordSalaryTemplate()

  const [salaryGrade, setSalaryGrade] = useState('')
  const [grossSalary, setGrossSalary] = useState('')
  const [basicPercent, setBasicPercent] = useState('')
  const [basicSalary, setBasicSalary] = useState('')
  const [overtimeMode, setOvertimeMode] = useState<'hourly' | 'premium'>('hourly')
  const [overtimeValue, setOvertimeValue] = useState('')
  const [monthlyLeaves, setMonthlyLeaves] = useState('0')
  const [payeEnabled, setPayeEnabled] = useState(false)
  const [payeAmount, setPayeAmount] = useState('')
  const [allowances, setAllowances] = useState<LineItem[]>([])
  const [deductions, setDeductions] = useState<LineItem[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleBasicPercentChange(value: string) {
    setBasicPercent(value)
    const gross = Number(grossSalary)
    const pct = Number(value)
    if (gross > 0 && pct >= 0) setBasicSalary(((pct / 100) * gross).toFixed(2))
  }

  const totalAllowances = useMemo(() => sumAmounts(allowances), [allowances])
  const totalDeductionsManual = useMemo(() => sumAmounts(deductions), [deductions])

  const napsa = useMemo(() => Math.min((Number(grossSalary) || 0) * NAPSA_RATE, NAPSA_LIMIT), [grossSalary])
  const nhima = useMemo(() => (Number(grossSalary) || 0) * NHIMA_RATE, [grossSalary])
  const totalContributions = napsa + nhima
  const payeTax = payeEnabled ? Number(payeAmount) || 0 : 0
  const totalDeductions = totalDeductionsManual + totalContributions + payeTax

  const optGross = (Number(basicSalary) || 0) + totalAllowances
  const netSalary = optGross - totalContributions - totalDeductionsManual - payeTax
  const gross = Number(grossSalary) || 0
  const pendingAmount = gross - optGross
  const isBalanced = gross !== 0 && Math.round(pendingAmount * 100) === 0

  function reset() {
    setSalaryGrade('')
    setGrossSalary('')
    setBasicPercent('')
    setBasicSalary('')
    setOvertimeMode('hourly')
    setOvertimeValue('')
    setMonthlyLeaves('0')
    setPayeEnabled(false)
    setPayeAmount('')
    setAllowances([])
    setDeductions([])
    setError('')
    setSuccess(false)
  }

  function handleSubmit() {
    setError('')
    if (!salaryGrade.trim()) return setError('Enter a salary grade name.')
    if (!grossSalary) return setError('Enter a gross salary.')
    if (!basicSalary) return setError('Enter a basic salary.')
    if (!isBalanced) return setError(`Adjust the payment to equalize gross pay — pending ${pendingAmount.toFixed(2)} ZMW.`)

    const createdBy = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    recordSalaryTemplate.add({
      createdBy,
      salaryGrade,
      currency: 'ZMW',
      grossSalary: gross,
      basicSalary: Number(basicSalary) || 0,
      overtimeValue: Number(overtimeValue) || 0,
      payeTaxEnabled: payeEnabled,
      netSalary,
    })
    setSuccess(true)
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
          Backend page: <code className="font-mono">payroll/salary_temp.php</code>. The NAPSA/NHIMA/Net Salary numbers below are a real calculation (see
          this file's own comment for the confirmed reference rates), but Save stays local to this session — the real write needs internal database row
          ids this frontend has no way to look up safely, and PAYE tax stays a manual entry since its bracket table isn't reachable either.
        </p>
      </Card>

      {success && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Salary template saved to this session's list.</Card>}
      {error && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error}</Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!h-auto space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-danger">Salary Grade *</span>
            <input value={salaryGrade} onChange={(e) => setSalaryGrade(e.target.value)} placeholder="Enter Grade Name" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Currency</span>
            <input value="Zambian Kwacha (ZMW)" disabled className={`${inputCls} cursor-not-allowed opacity-70`} />
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
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" checked={payeEnabled} onChange={(e) => setPayeEnabled(e.target.checked)} className="rounded border-input-border text-brand focus:ring-brand/30" />
            Click To Add PAYE Tax
          </label>
          {payeEnabled && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">PAYE Tax Amount</span>
              <input value={payeAmount} onChange={(e) => setPayeAmount(e.target.value)} inputMode="decimal" className={inputCls} />
            </label>
          )}
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

          <LineItemBuilder title="Allowances" addLabel="Add More Allowances" items={allowances} onChange={setAllowances} />
          <LineItemBuilder title="Deductions" addLabel="Add More Deductions" items={deductions} onChange={setDeductions} />
        </Card>

        <Card className="!h-auto space-y-3">
          <p className={`text-xs font-medium ${isBalanced ? 'text-success-fg' : 'text-danger'}`}>
            {isBalanced
              ? '* Salary Allocation is Successful'
              : `* Adjust The Payment To Equalize Gross Pay, Pending Amount ${pendingAmount.toFixed(2)} ZMW`}
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Total Allowances</span>
            <span className="text-text! font-medium">{totalAllowances.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Napsa {(NAPSA_RATE * 100).toFixed(0)}% (employee)</span>
            <span className="text-text! font-medium">{napsa.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Nhima {(NHIMA_RATE * 100).toFixed(0)}% (employee)</span>
            <span className="text-text! font-medium">{nhima.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-border pt-2">
            <span className="text-text-muted">Total Contributions</span>
            <span className="text-text! font-medium">{totalContributions.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Paye Tax</span>
            <span className="text-text! font-medium">{payeTax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Total Deductions</span>
            <span className="text-text! font-medium">{totalDeductions.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold border-t border-border pt-2">
            <span className="text-text!">Net Salary</span>
            <span className="text-brand">{netSalary.toFixed(2)}</span>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSubmit} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Save
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
          Clear
        </button>
      </div>
    </div>
  )
}
