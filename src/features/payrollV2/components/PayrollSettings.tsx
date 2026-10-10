import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { usePayRunAction, usePayrollHolidays, usePayrollSettings } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, TablePanel, Td, Th } from './PayrollV2Chrome'

const FIELD = 'w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')

// Same keys, labels and help text as the classic settings page (js/pages/settings.js).
const SETTINGS: Array<{ key: string; label: string; help: string; kind?: 'mask' | 'yesno' }> = [
  { key: 'PAYROLL_V2_MONTHLY_WORKING_HOURS', label: 'Monthly working hours', help: 'Used to calculate hourly rate from basic salary: hourlyRate = basic / monthlyHours.' },
  { key: 'PAYROLL_V2_OT_RATE_NORMAL', label: 'Overtime rate multiplier', help: 'Multiplier applied to overtime hours: overtimePay = hourlyRate * otHours * rate.' },
  { key: 'PAYROLL_V2_HOLIDAY_OT_RATE', label: 'Holiday pay multiplier', help: 'Multiplier for worked holiday pay: holidayPay = dailyRate * rate * holidayDays.' },
  { key: 'PAYROLL_V2_NIGHT_OT_RATE', label: 'Night pay multiplier', help: 'Multiplier for night hours: premium = hourlyRate * nightHours * (rate - 1). Set 2.0 for total 2x pay.' },
  { key: 'PAYROLL_V2_OT_GRACE_MINUTES', label: 'Grace minutes before OT', help: 'Minutes after shift end before overtime starts.' },
  { key: 'PAYROLL_V2_LEAVE_ENCASH_DIVISOR', label: 'Daily rate divisor', help: 'Used to calculate daily rate from basic salary: dailyRate = basic / divisor.' },
  { key: 'PAYROLL_V2_DEFAULT_MORNING_WEEKS', label: 'Default morning weeks', help: 'Consecutive weeks an employee works morning shift at start of rotation.' },
  { key: 'PAYROLL_V2_DEFAULT_NIGHT_WEEKS', label: 'Default night weeks', help: 'Consecutive weeks an employee works night shift after morning weeks.' },
  { key: 'PAYROLL_V2_DEFAULT_WORK_DAYS_MASK', label: 'Default work days (Mon-Sun, 1=work)', help: '7 characters (Mon-Sun). 1 = work day, 0 = off day. Example: 1111100.', kind: 'mask' },
  { key: 'PAYROLL_V2_DEFAULT_OFF_DAYS_MASK', label: 'Default off days (Mon-Sun, 1=off)', help: '7 characters (Mon-Sun). 1 = off day, 0 = work day. Example: 0000011.', kind: 'mask' },
  { key: 'PAYROLL_V2_DEFAULT_OFF_PAID', label: 'Off days are paid holidays', help: 'When enabled, off days are treated as paid holidays and working them triggers holiday pay.', kind: 'yesno' },
]

function SettingsForm({ initial }: { initial: Record<string, string | number> }) {
  const action = usePayRunAction()
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(SETTINGS.map((s) => [s.key, String(initial[s.key] ?? '')])))
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(null)
    action.mutate(
      { endpoint: 'settings.php', action: 'save', params: values },
      { onSuccess: () => setResult({ ok: true, text: 'Settings saved.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <form onSubmit={save}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS.map((s) => (
          <label key={s.key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">{s.label}</span>
            {s.kind === 'yesno' ? (
              <select value={values[s.key] === '0' ? '0' : '1'} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} className={FIELD}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            ) : (
              <input
                type="text"
                value={values[s.key]}
                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                {...(s.kind === 'mask' ? { maxLength: 7, pattern: '[01]{7}', title: '7 digits of 0 or 1' } : {})}
                className={FIELD}
              />
            )}
            <span className="text-[11px] text-text-faint">{s.help}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={action.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {action.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
        </button>
        {result && <span className={`text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</span>}
      </div>
    </form>
  )
}

// payroll_v2 #settings: the calculation constants and the holiday calendar,
// through settings.php's get / save / holidays_list / holiday_create / holiday_delete.
export function PayrollSettings() {
  const settings = usePayrollSettings()
  const [year, setYear] = useState(new Date().getFullYear())
  const holidays = usePayrollHolidays(year)
  const action = usePayRunAction()
  const confirm = useConfirm()
  const [holiday, setHoliday] = useState({ holiday_date: '', name: '', is_recurring: '0', is_paid: '1' })
  const [error, setError] = useState<string | null>(null)

  const addHoliday = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    action.mutate(
      { endpoint: 'settings.php', action: 'holiday_create', params: holiday },
      { onSuccess: () => setHoliday({ ...holiday, holiday_date: '', name: '' }), onError: (err) => setError(errorText(err)) },
    )
  }

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Delete Holiday?', message: 'Delete this holiday?' }))) return
    setError(null)
    action.mutate({ endpoint: 'settings.php', action: 'holiday_delete', params: { id } }, { onError: (err) => setError(errorText(err)) })
  }

  const yes = (v: string) => (Number(v) ? 'Yes' : 'No')

  return (
    <div className="space-y-4">
      {settings.isError && <ErrorCard error={settings.error} onRetry={() => settings.refetch()} />}

      <PanelCard title="Payroll Calculation Settings">
        {settings.isLoading ? <p className="text-sm text-text-faint">Loading…</p> : settings.data && <SettingsForm initial={settings.data} />}
      </PanelCard>

      <TablePanel
        title="Holiday Calendar"
        action={
          <div className="flex items-center gap-0.5 rounded-lg border border-border px-1 py-0.5">
            <button type="button" aria-label="Previous year" onClick={() => setYear(year - 1)} className="rounded p-1 text-text-muted hover:bg-surface-hover">
              <ChevronLeft size={14} />
            </button>
            <span className="px-1 text-xs font-semibold text-text">{year}</span>
            <button type="button" aria-label="Next year" onClick={() => setYear(year + 1)} className="rounded p-1 text-text-muted hover:bg-surface-hover">
              <ChevronRight size={14} />
            </button>
          </div>
        }
      >
        <form onSubmit={addHoliday} className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Date</span>
            <input required type="date" value={holiday.holiday_date} onChange={(e) => setHoliday({ ...holiday, holiday_date: e.target.value })} className={`!w-44 ${FIELD}`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Name</span>
            <input required placeholder="Holiday name" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} className={`!w-56 ${FIELD}`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Recurring</span>
            <select value={holiday.is_recurring} onChange={(e) => setHoliday({ ...holiday, is_recurring: e.target.value })} className={`!w-24 ${FIELD}`}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
          {/* settings.php reads is_paid as `GETPOSTINT('is_paid') ?: 1`, so the backend currently saves every holiday as paid. */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Paid</span>
            <select value={holiday.is_paid} onChange={(e) => setHoliday({ ...holiday, is_paid: e.target.value })} className={`!w-24 ${FIELD}`}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </label>
          <button type="submit" disabled={action.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            <Plus size={14} /> Add
          </button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </form>
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Date</Th>
              <Th>Name</Th>
              <Th>Recurring</Th>
              <Th>Paid</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {holidays.isLoading && <LoadingRows cols={5} rows={3} />}
            {holidays.isError && <EmptyRow colSpan={5} label={errorText(holidays.error)} />}
            {!holidays.isLoading && !holidays.isError && (holidays.data ?? []).length === 0 && <EmptyRow colSpan={5} label="No holidays defined." />}
            {(holidays.data ?? []).map((h) => (
              <tr key={h.id} className="border-t border-border">
                <Td className="whitespace-nowrap">{h.holiday_date}</Td>
                <Td>{h.name}</Td>
                <Td>{yes(h.is_recurring)}</Td>
                <Td>{yes(h.is_paid)}</Td>
                <Td className="text-right">
                  <button type="button" title="Delete holiday" disabled={action.isPending} onClick={() => remove(h.id)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  )
}
