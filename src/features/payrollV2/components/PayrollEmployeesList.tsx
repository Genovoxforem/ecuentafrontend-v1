import { useDeferredValue, useMemo, useState } from 'react'
import { Loader2, Pencil, Search, Trash2, UserRound, UserX } from 'lucide-react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatMoney } from '../../../utils/format'
import { num } from '../payrollV2.api'
import {
  employeeName,
  useEmployeeDetail,
  useEmployeeLeaveTypes,
  useGradeHistory,
  useLeaveTypes,
  usePayrollCommand,
  usePayrollEmployees,
  usePayrollTemplates,
  useShifts,
  type EmployeeDetail,
  type EmployeeRow,
} from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PayrollModal, TablePanel, Td, Th } from './PayrollV2Chrome'

const FIELD = 'w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const PRIMARY = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60'
const OUTLINE = 'inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60'
const ROW_BTN = 'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-text hover:bg-surface-hover'
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')
const todayIso = () => new Date().toISOString().slice(0, 10)
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type Result = { ok: boolean; text: string } | null

function ResultLine({ result }: { result: Result }) {
  if (!result) return null
  return <p className={`text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      {children}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border">
      <h4 className="border-b border-border bg-surface-alt px-3 py-2 text-sm font-semibold text-text">{title}</h4>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  )
}

// ---- Assign: salary & template, shift / weekly rotation, leave types (+ grade history)

function SalarySection({ employeeId, current }: { employeeId: string; current: EmployeeDetail }) {
  const templates = usePayrollTemplates()
  const command = usePayrollCommand()
  const [form, setForm] = useState({
    grade: current.grade ?? '',
    basic_salary: current.basic_salary ?? '0',
    template_id: current.template_id ?? '',
    effective_date: current.effective_date ?? todayIso(),
    contract_start: current.contract_start ?? '',
    contract_end: current.contract_end ?? '',
  })
  const [result, setResult] = useState<Result>(null)

  const save = (templateId: string) => {
    setResult(null)
    command.mutate(
      { endpoint: 'employee.php', action: 'assign', params: { employee_id: employeeId, ...form, template_id: templateId } },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Saved.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <Section title="Salary & Template">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save(form.template_id)
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <Field label="Grade">
          <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Basic Salary">
          <input type="number" step="0.01" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Template">
          <select value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} className={FIELD}>
            <option value="">— None —</option>
            {(templates.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.template_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effective Date">
          <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Contract Start">
          <input type="date" value={form.contract_start} onChange={(e) => setForm({ ...form, contract_start: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Contract End">
          <input type="date" value={form.contract_end} onChange={(e) => setForm({ ...form, contract_end: e.target.value })} className={FIELD} />
        </Field>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
          <button type="submit" disabled={command.isPending} className={PRIMARY}>
            {command.isPending && <Loader2 size={14} className="animate-spin" />} Save
          </button>
          {current.template_id && (
            <button type="button" disabled={command.isPending} onClick={() => save('')} className={OUTLINE}>
              <Trash2 size={14} /> Remove Template
            </button>
          )}
          <ResultLine result={result} />
        </div>
      </form>
      <p className="text-xs text-text-faint">
        Current: grade {current.grade || '—'} · basic {current.basic_salary ? formatMoney(num(current.basic_salary)) : '—'} · template {current.template_name || 'none'} · effective {current.effective_date || '—'} · contract {current.contract_start || '—'} to {current.contract_end || '—'}
      </p>
    </Section>
  )
}

function ShiftSection({ employeeId, current }: { employeeId: string; current: EmployeeDetail }) {
  const shifts = useShifts()
  const command = usePayrollCommand()
  const initial = [current.morning_shift_id, current.night_shift_id].every(Boolean) ? [current.morning_shift_id!, current.night_shift_id!] : current.shift_id ? [current.shift_id] : []
  const [selected, setSelected] = useState<string[]>(initial)
  const [morningWeeks, setMorningWeeks] = useState(current.morning_weeks ?? '1')
  const [nightWeeks, setNightWeeks] = useState(current.night_weeks ?? '1')
  const [anchor, setAnchor] = useState(current.rotation_anchor_date ?? todayIso())
  const [offPaid, setOffPaid] = useState(Number(current.off_days_paid_holiday ?? 1) !== 0)
  const [workDays, setWorkDays] = useState(() => (current.work_days_mask || '1111100').padEnd(7, '0').split('').map((c) => c === '1'))
  const [result, setResult] = useState<Result>(null)

  const toggle = (id: string, on: boolean) => setSelected(on ? [...selected, id].slice(-2) : selected.filter((s) => s !== id))

  const save = () => {
    setResult(null)
    const done = { onSuccess: (msg: string) => setResult({ ok: true, text: msg || 'Saved.' }), onError: (err: unknown) => setResult({ ok: false, text: errorText(err) }) }
    if (selected.length === 2) {
      command.mutate(
        {
          endpoint: 'shift.php',
          action: 'assign_rotation',
          params: {
            employee_ids: [employeeId],
            shift_ids: selected,
            morning_weeks: morningWeeks || 1,
            night_weeks: nightWeeks || 1,
            anchor_date: anchor,
            work_days_mask: workDays.map((on) => (on ? '1' : '0')).join(''),
            off_days_mask: workDays.map((on) => (on ? '0' : '1')).join(''),
            off_days_paid_holiday: offPaid ? 1 : 0,
          },
        },
        done,
      )
    } else if (selected.length === 1) {
      command.mutate({ endpoint: 'shift.php', action: 'assign_employee', params: { employee_id: employeeId, shift_id: selected[0] } }, done)
    } else {
      setResult({ ok: false, text: 'Select 1 shift for a fixed schedule or 2 shifts (day + night) for a rotation.' })
    }
  }

  const clearAll = async () => {
    setResult(null)
    try {
      await command.mutateAsync({ endpoint: 'shift.php', action: 'assign_employee', params: { employee_id: employeeId, shift_id: '' } })
      await command.mutateAsync({ endpoint: 'shift.php', action: 'remove_rotation', params: { employee_ids: [employeeId] } })
      setSelected([])
      setResult({ ok: true, text: 'Shift/Rotation cleared.' })
    } catch (err) {
      setResult({ ok: false, text: errorText(err) })
    }
  }

  return (
    <Section title="Shift & Weekly Rotation">
      <p className="text-xs text-text-faint">Pick 1 shift for a fixed schedule, or 2 shifts (one day + one night) to rotate weekly between them.</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {(shifts.data ?? []).map((s) => (
          <label key={s.id} className="flex items-center gap-1.5 text-sm text-text">
            <input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => toggle(s.id, e.target.checked)} />
            {s.shift_name} <span className="text-xs text-text-faint">({Number(s.is_night_shift) ? 'Night' : 'Day'})</span>
          </label>
        ))}
        {shifts.data?.length === 0 && <span className="text-sm text-text-faint">No shifts defined yet.</span>}
      </div>
      {selected.length === 2 && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Morning weeks">
              <input type="number" min="1" value={morningWeeks} onChange={(e) => setMorningWeeks(e.target.value)} className={`!w-24 ${FIELD}`} />
            </Field>
            <Field label="Night weeks">
              <input type="number" min="1" value={nightWeeks} onChange={(e) => setNightWeeks(e.target.value)} className={`!w-24 ${FIELD}`} />
            </Field>
            <Field label="Anchor date">
              <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} className={`!w-44 ${FIELD}`} />
            </Field>
            <label className="flex items-center gap-1.5 pb-2 text-sm text-text-muted">
              <input type="checkbox" checked={offPaid} onChange={(e) => setOffPaid(e.target.checked)} /> Off days paid as holiday
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="text-xs font-semibold text-text-muted">Work days</span>
            {WEEK_DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1 text-sm text-text">
                <input type="checkbox" checked={workDays[i]} onChange={(e) => setWorkDays(workDays.map((on, j) => (j === i ? e.target.checked : on)))} /> {d}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={command.isPending} onClick={save} className={PRIMARY}>
          {command.isPending && <Loader2 size={14} className="animate-spin" />} Save
        </button>
        <button type="button" disabled={command.isPending} onClick={clearAll} className={OUTLINE}>
          <Trash2 size={14} /> Clear All
        </button>
        <ResultLine result={result} />
      </div>
      <p className="text-xs text-text-faint">
        Current:{' '}
        {current.morning_shift_id && current.night_shift_id
          ? `${current.morning_shift_name || 'Day'} / ${current.night_shift_name || 'Night'} — ${current.morning_weeks || 1}wk day → ${current.night_weeks || 1}wk night, repeating (anchor ${current.rotation_anchor_date || '—'})`
          : current.shift_name || 'No shift assigned'}
      </p>
    </Section>
  )
}

function LeaveTypesSection({ employeeId }: { employeeId: string }) {
  const assigned = useEmployeeLeaveTypes(employeeId)
  const all = useLeaveTypes()
  const command = usePayrollCommand()
  const [toAdd, setToAdd] = useState<string[]>([])
  const [result, setResult] = useState<Result>(null)
  const assignedIds = new Set((assigned.data ?? []).map((l) => String(l.leave_type_id)))
  const available = (all.data ?? []).filter((t) => !assignedIds.has(String(t.id)))

  const add = async () => {
    if (!toAdd.length) return setResult({ ok: false, text: 'Select at least one leave type.' })
    setResult(null)
    let ok = 0
    const errors: string[] = []
    for (const id of toAdd) {
      try {
        await command.mutateAsync({ endpoint: 'leave.php', action: 'assign_leave_type', params: { employee_id: employeeId, leave_type_id: id } })
        ok++
      } catch (err) {
        errors.push(errorText(err))
      }
    }
    setToAdd([])
    setResult({ ok: ok > 0, text: `${ok} leave type(s) added.${errors.length ? ` ${errors[0]}` : ''}` })
  }

  const remove = (id: string) => {
    setResult(null)
    command.mutate({ endpoint: 'leave.php', action: 'remove_employee_leave_type', params: { id } }, { onError: (err) => setResult({ ok: false, text: errorText(err) }) })
  }

  return (
    <Section title="Leave Types">
      {(assigned.data ?? []).length === 0 ? (
        <p className="text-sm text-text-faint">{assigned.isLoading ? 'Loading…' : 'No leave types assigned yet.'}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="py-1">Leave Type</th>
              <th className="text-right">Days Entitled</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(assigned.data ?? []).map((l) => (
              <tr key={l.id} className="border-t border-border text-text">
                <td className="py-1">{l.leave_type_name}</td>
                <td className="text-right tabular-nums">{num(l.days_entitled)}</td>
                <td className="text-right">
                  <button type="button" title="Remove" disabled={command.isPending} onClick={() => remove(l.id)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-50">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {available.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-text-muted">Add leave types</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {available.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 text-sm text-text">
                <input type="checkbox" checked={toAdd.includes(t.id)} onChange={(e) => setToAdd(e.target.checked ? [...toAdd, t.id] : toAdd.filter((x) => x !== t.id))} />
                {t.label}
              </label>
            ))}
          </div>
          <button type="button" disabled={command.isPending} onClick={add} className={PRIMARY}>
            Add
          </button>
        </div>
      )}
      <ResultLine result={result} />
    </Section>
  )
}

function GradeHistorySection({ employeeId }: { employeeId: string }) {
  const history = useGradeHistory(employeeId)
  const rows = history.data ?? []
  return (
    <Section title="Grade History">
      {rows.length === 0 ? (
        <p className="text-sm text-text-faint">{history.isLoading ? 'Loading…' : 'No grade changes recorded.'}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted">
              <th className="py-1">Effective</th>
              <th>Grade</th>
              <th className="text-right">Basic</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id} className="border-t border-border text-text">
                <td className="py-1">{h.effective_date ?? h.effective_dt ?? '—'}</td>
                <td>
                  {h.old_grade || '—'} → {h.new_grade || '—'}
                </td>
                <td className="text-right tabular-nums">
                  {formatMoney(num(h.old_basic))} → {formatMoney(num(h.new_basic))}
                </td>
                <td>{h.reason || '—'}</td>
                <td>{`${h.firstname ?? ''} ${h.lastname ?? ''}`.trim() || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  )
}

function AssignDialog({ employee, onClose }: { employee: EmployeeRow; onClose: () => void }) {
  const detail = useEmployeeDetail(employee.employee_id)
  return (
    <PayrollModal title={`Assign — ${employeeName(employee)}`} onClose={onClose} width="max-w-3xl">
      {detail.isLoading && <p className="text-sm text-text-faint">Loading…</p>}
      {detail.isError && <p className="text-sm text-danger">{errorText(detail.error)}</p>}
      {detail.data && (
        <div className="space-y-4">
          <SalarySection employeeId={employee.employee_id} current={detail.data} />
          <ShiftSection employeeId={employee.employee_id} current={detail.data} />
          <LeaveTypesSection employeeId={employee.employee_id} />
          <GradeHistorySection employeeId={employee.employee_id} />
        </div>
      )}
    </PayrollModal>
  )
}

// employee.php has no read for the profile, so — as on the classic page — the form starts empty and saving overwrites it.
function ProfileDialog({ employee, onClose }: { employee: EmployeeRow; onClose: () => void }) {
  const command = usePayrollCommand()
  const [form, setForm] = useState({ bank_name: '', bank_account: '', tax_id: '' })
  const [result, setResult] = useState<Result>(null)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(null)
    command.mutate({ endpoint: 'employee.php', action: 'update_profile', params: { employee_id: employee.employee_id, ...form } }, { onSuccess: onClose, onError: (err) => setResult({ ok: false, text: errorText(err) }) })
  }
  return (
    <PayrollModal title={`Employee Profile — ${employeeName(employee)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-text-faint">Saving replaces the bank and tax details stored for this employee.</p>
        <Field label="Bank Name">
          <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Bank Account">
          <input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Tax ID (TPIN)">
          <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className={FIELD} />
        </Field>
        <ResultLine result={result} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={OUTLINE}>
            Cancel
          </button>
          <button type="submit" disabled={command.isPending} className={PRIMARY}>
            {command.isPending && <Loader2 size={14} className="animate-spin" />} Save Profile
          </button>
        </div>
      </form>
    </PayrollModal>
  )
}

function TerminateDialog({ employee, onClose }: { employee: EmployeeRow; onClose: () => void }) {
  const command = usePayrollCommand()
  const confirm = useConfirm()
  const [date, setDate] = useState(todayIso())
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<Result>(null)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!(await confirm({ title: 'Terminate Employee?', message: 'This action cannot be undone. Continue?' }))) return
    setResult(null)
    command.mutate(
      { endpoint: 'employee.php', action: 'terminate', params: { employee_id: employee.employee_id, termination_date: date, reason } },
      { onSuccess: onClose, onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }
  return (
    <PayrollModal title="Terminate Employee" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-text-muted">
          Terminate <strong className="text-text">{employeeName(employee)}</strong>? This deactivates their salary assignment.
        </p>
        <Field label="Termination Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Reason">
          <textarea rows={3} placeholder="Reason for termination (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
        </Field>
        <ResultLine result={result} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={OUTLINE}>
            Cancel
          </button>
          <button type="submit" disabled={command.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {command.isPending && <Loader2 size={14} className="animate-spin" />} Terminate
          </button>
        </div>
      </form>
    </PayrollModal>
  )
}

type Dialog = { kind: 'assign' | 'profile' | 'terminate'; employee: EmployeeRow } | null

// employee.php?action=list: every user flagged as an employee, left-joined onto
// their current payroll assignment (template, shift, grade, basic salary), with
// the classic page's Assign / Profile / Terminate actions per row.
export function PayrollEmployeesList() {
  const employees = usePayrollEmployees()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [dialog, setDialog] = useState<Dialog>(null)

  const rows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const all = employees.data ?? []
    if (!query) return all
    return all.filter((row) => [employeeName(row), row.email, row.grade, row.template_name, row.shift_name].some((field) => (field ?? '').toLowerCase().includes(query)))
  }, [employees.data, deferredSearch])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {employees.isError && <ErrorCard error={employees.error} onRetry={() => employees.refetch()} />}

      <TablePanel
        fill
        title={
          <span className="flex items-center gap-2">
            Employees — Salary Assignment
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-text-muted">{employees.isLoading ? '…' : rows.length}</span>
          </span>
        }
        action={
          <label className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, grade, template…"
              className="w-72 max-w-full rounded-md border border-input-border bg-input-bg pl-9 pr-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
        }
      >
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Grade</Th>
              <Th className="text-right">Basic Salary</Th>
              <Th>Template</Th>
              <Th>Shift</Th>
              <Th>Assignment</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {employees.isLoading && <LoadingRows cols={8} />}
            {!employees.isLoading && rows.length === 0 && <EmptyRow colSpan={8} label='No employees found (mark users as "employee" on their user card).' />}
            {rows.map((row) => (
              <tr key={row.employee_id} className="border-t border-border">
                <Td className="font-medium">{employeeName(row)}</Td>
                <Td>{row.email || '—'}</Td>
                <Td>{row.grade || '—'}</Td>
                <Td className="text-right tabular-nums">{row.basic_salary ? formatMoney(num(row.basic_salary)) : '—'}</Td>
                <Td>{row.template_name || '—'}</Td>
                <Td>{row.shift_name || '—'}</Td>
                <Td>
                  {row.assignment_active === '1' ? (
                    <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success-fg">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-text-muted">Not assigned</span>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => setDialog({ kind: 'assign', employee: row })} className={ROW_BTN}>
                      <Pencil size={12} /> Assign
                    </button>
                    <button type="button" onClick={() => setDialog({ kind: 'profile', employee: row })} className={ROW_BTN}>
                      <UserRound size={12} /> Profile
                    </button>
                    <button type="button" onClick={() => setDialog({ kind: 'terminate', employee: row })} className="inline-flex items-center gap-1 rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10">
                      <UserX size={12} /> Terminate
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {dialog?.kind === 'assign' && <AssignDialog employee={dialog.employee} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'profile' && <ProfileDialog employee={dialog.employee} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'terminate' && <TerminateDialog employee={dialog.employee} onClose={() => setDialog(null)} />}
    </div>
  )
}
