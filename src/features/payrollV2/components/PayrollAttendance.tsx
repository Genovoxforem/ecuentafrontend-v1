import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, LogIn, LogOut, Plus, RefreshCw, Save, Search, Trash2, Upload } from 'lucide-react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { pv2Get } from '../payrollV2.api'
import { useAttendance, useAttendanceEmployees, useAttendanceSheet, useMyAttendanceToday, usePayrollCommand, type AttendanceRow, type AttendanceSheetRow } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, StatusBadge, TablePanel, Td, Th } from './PayrollV2Chrome'

const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 8)}01`
const FIELD = 'rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const CELL = 'w-full rounded border border-input-border bg-input-bg px-2 py-1 text-sm text-text'
const BTN = {
  primary: 'inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60',
  plain: 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60',
  danger: 'inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60',
}
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')
const hhmm = (value: string | null | undefined) => (value ? (value.split(' ')[1] ?? value).slice(0, 5) : '')
const who = (r: { firstname: string | null; lastname: string | null; employee_id: string }) => `${r.firstname ?? ''} ${r.lastname ?? ''}`.trim() || `#${r.employee_id}`

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
]
const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'zkteco', label: 'ZKteco' },
  { value: 'adms', label: 'ADMS' },
  { value: 'import', label: 'Import' },
]
// The columns the classic export writes and its import reads back.
const SHEET_COLUMNS = ['employee_id', 'firstname', 'lastname', 'department', 'work_date', 'clock_in', 'clock_out', 'status', 'ot_hours', 'night_hours', 'source'] as const

type Result = { ok: boolean; text: string } | null

function ResultLine({ result }: { result: Result }) {
  if (!result) return null
  return <p className={`text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      {children}
    </label>
  )
}

// ---- My attendance today (clock in / out)

function MyToday() {
  const record = useMyAttendanceToday()
  const command = usePayrollCommand()
  const [result, setResult] = useState<Result>(null)
  const clock = (verb: 'clock_in' | 'clock_out') => {
    setResult(null)
    command.mutate({ endpoint: 'attendance.php', action: verb }, { onSuccess: (msg) => setResult({ ok: true, text: msg }), onError: (err) => setResult({ ok: false, text: errorText(err) }) })
  }
  const r = record.data
  return (
    <PanelCard title="My Attendance Today">
      {record.isLoading ? (
        <p className="text-sm text-text-faint">Loading…</p>
      ) : r?.clock_in && r.clock_out ? (
        <p className="text-sm text-text-muted">
          You clocked in at {hhmm(r.clock_in)} and clocked out at {hhmm(r.clock_out)}.
        </p>
      ) : r?.clock_in ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-text-muted">Clocked in at {hhmm(r.clock_in)}.</p>
          <button type="button" disabled={command.isPending} onClick={() => clock('clock_out')} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            <LogOut size={15} /> Clock Out
          </button>
        </div>
      ) : (
        <button type="button" disabled={command.isPending} onClick={() => clock('clock_in')} className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
          <LogIn size={15} /> Clock In
        </button>
      )}
      <div className="mt-2">
        <ResultLine result={result} />
      </div>
    </PanelCard>
  )
}

// ---- Bulk marking sheet

interface SheetLine {
  employee_id: string
  name: string
  shift: string
  selected: boolean
  present: boolean
  clock_in: string
  clock_out: string
  ot_hours: string
  night_hours: string
  source: string
}

function toLine(r: AttendanceSheetRow): SheetLine {
  const recorded = Boolean(r.attendance_id)
  return {
    employee_id: r.employee_id,
    name: who(r),
    shift: r.shift_name || 'Default Shift',
    selected: false,
    present: recorded ? r.attendance_status !== 'absent' : false,
    clock_in: hhmm(r.clock_in) || (r.start_time ?? '09:00').slice(0, 5),
    clock_out: hhmm(r.clock_out) || (r.end_time ?? '17:00').slice(0, 5),
    ot_hours: r.ot_hours ?? '0',
    night_hours: r.night_hours ?? '0',
    source: r.source || 'manual',
  }
}

async function exportXlsx(date: string) {
  const rows = await pv2Get<Array<Record<string, unknown>>>('attendance.php', 'export', { date_range: date })
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Attendance')
  ws.addRow([...SHEET_COLUMNS])
  for (const row of rows) ws.addRow(SHEET_COLUMNS.map((c) => (row[c] ?? '') as string))
  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance_export_${date}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
  return rows.length
}

// .xlsx (first sheet) or .csv with a header row → one record per row, keyed by
// header. A bare HH:MM clock time is completed with the row's work_date, since
// the import stores clock_in/clock_out exactly as given.
async function readImportFile(file: File): Promise<Array<Record<string, string>>> {
  let table: string[][]
  if (/\.csv$/i.test(file.name)) {
    table = (await file.text())
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
  } else {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())
    const ws = wb.worksheets[0]
    table = []
    ws?.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : []
      table.push(values.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? '' : typeof v === 'object' && 'text' in v ? String(v.text) : String(v))))
    })
  }
  const [header = [], ...body] = table
  const keys = header.map((h) => h.trim().toLowerCase())
  return body.map((cells) => {
    const rec = Object.fromEntries(keys.map((k, i) => [k, cells[i] ?? '']))
    for (const k of ['clock_in', 'clock_out']) if (/^\d{1,2}:\d{2}/.test(rec[k] ?? '') && rec.work_date) rec[k] = `${rec.work_date} ${rec[k]}`
    return rec
  })
}

function BulkSheet() {
  const command = usePayrollCommand()
  const confirm = useConfirm()
  const [date, setDate] = useState(today())
  const [loadedDate, setLoadedDate] = useState<string | null>(null)
  const sheet = useAttendanceSheet(loadedDate)
  const [lines, setLines] = useState<SheetLine[]>([])
  const [result, setResult] = useState<Result>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // A fresh load of the sheet replaces the rows being edited.
  useEffect(() => {
    if (sheet.data) setLines(sheet.data.map(toLine))
  }, [sheet.data])

  const update = (i: number, patch: Partial<SheetLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const allSelected = lines.length > 0 && lines.every((l) => l.selected)

  const save = () => {
    if (!loadedDate || !lines.length) return setResult({ ok: false, text: 'Load the employees for a date first.' })
    setResult(null)
    command.mutate(
      {
        endpoint: 'attendance.php',
        action: 'bulk_mark_attendance',
        params: {
          date_range: loadedDate,
          attendances: lines.map((l) => ({
            employee_id: l.employee_id,
            present: l.present ? 1 : '',
            clock_in: l.present ? l.clock_in : '',
            clock_out: l.present ? l.clock_out : '',
            ot_hours: l.present ? l.ot_hours || 0 : 0,
            night_hours: l.present ? l.night_hours || 0 : 0,
            source: 'manual',
          })),
        },
      },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Attendance saved.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  // bulk_delete without a date wipes every record the employees have; the date is always sent.
  const deleteSelected = async () => {
    const ids = lines.filter((l) => l.selected).map((l) => l.employee_id)
    if (!loadedDate || !ids.length) return setResult({ ok: false, text: 'Select the employees whose attendance to delete.' })
    if (!(await confirm({ title: 'Delete Attendance?', message: `Delete the ${loadedDate} attendance of ${ids.length} employee(s)? This cannot be undone.` }))) return
    setResult(null)
    command.mutate(
      { endpoint: 'attendance.php', action: 'bulk_delete', params: { employee_ids: ids, date_range: loadedDate } },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Deleted.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  const doExport = async () => {
    setResult(null)
    setBusy('export')
    try {
      const n = await exportXlsx(date)
      setResult({ ok: true, text: `Exported ${n} record(s).` })
    } catch (err) {
      setResult({ ok: false, text: errorText(err) })
    } finally {
      setBusy(null)
    }
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    setResult(null)
    setBusy('import')
    try {
      const data = await readImportFile(file)
      if (!data.length) throw new Error('The file has no rows under its header.')
      const msg = await command.mutateAsync({ endpoint: 'attendance.php', action: 'import', params: { data } })
      setResult({ ok: true, text: msg || 'Imported.' })
    } catch (err) {
      setResult({ ok: false, text: errorText(err) })
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <PanelCard title="Bulk Attendance Marking">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
        </Field>
        <button type="button" onClick={() => setLoadedDate(date)} className={BTN.primary}>
          {sheet.isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Load Employees
        </button>
        <button type="button" disabled={!lines.length} onClick={() => setLines(lines.map((l) => ({ ...l, present: true })))} className={BTN.plain}>
          Mark All Present
        </button>
        <button type="button" disabled={!lines.length} onClick={() => setLines(lines.map((l) => ({ ...l, present: false })))} className={BTN.plain}>
          Mark All Absent
        </button>
        <span className="mx-1 h-6 w-px bg-border" />
        <button type="button" disabled={busy !== null} onClick={doExport} title="Export the date's attendance to Excel" className={BTN.plain}>
          {busy === 'export' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export
        </button>
        <button type="button" disabled={busy !== null} onClick={() => fileInput.current?.click()} title="Import .xlsx / .csv with the export's columns" className={BTN.plain}>
          {busy === 'import' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import
        </button>
        <input ref={fileInput} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
      </div>
      {sheet.isError && <p className="mt-2 text-sm text-danger">{errorText(sheet.error)}</p>}
      {lines.length > 0 && (
        <>
          <div className="-mx-4 mt-4 overflow-x-auto border-y border-border">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <Th>
                    <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={(e) => setLines(lines.map((l) => ({ ...l, selected: e.target.checked })))} />
                  </Th>
                  <Th>Employee</Th>
                  <Th>Shift</Th>
                  <Th>Present</Th>
                  <Th>Clock In</Th>
                  <Th>Clock Out</Th>
                  <Th>OT Hrs</Th>
                  <Th>Night Hrs</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.employee_id} className="border-t border-border">
                    <Td>
                      <input type="checkbox" aria-label={`Select ${l.name}`} checked={l.selected} onChange={(e) => update(i, { selected: e.target.checked })} />
                    </Td>
                    <Td className="font-medium">{l.name}</Td>
                    <Td>{l.shift}</Td>
                    <Td>
                      <input type="checkbox" aria-label={`${l.name} present`} checked={l.present} onChange={(e) => update(i, { present: e.target.checked })} />
                    </Td>
                    <Td>
                      <input type="time" disabled={!l.present} value={l.clock_in} onChange={(e) => update(i, { clock_in: e.target.value })} className={`!w-28 ${CELL}`} />
                    </Td>
                    <Td>
                      <input type="time" disabled={!l.present} value={l.clock_out} onChange={(e) => update(i, { clock_out: e.target.value })} className={`!w-28 ${CELL}`} />
                    </Td>
                    <Td>
                      <input type="number" step="0.5" min="0" disabled={!l.present} value={l.ot_hours} onChange={(e) => update(i, { ot_hours: e.target.value })} className={`!w-20 ${CELL}`} />
                    </Td>
                    <Td>
                      <input type="number" step="0.5" min="0" disabled={!l.present} value={l.night_hours} onChange={(e) => update(i, { night_hours: e.target.value })} className={`!w-20 ${CELL}`} />
                    </Td>
                    <Td className="capitalize">{l.source}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={command.isPending} onClick={save} className={BTN.primary}>
              {command.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Attendance ({loadedDate})
            </button>
            <button type="button" disabled={command.isPending} onClick={deleteSelected} className={BTN.danger}>
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        </>
      )}
      {loadedDate && sheet.data?.length === 0 && <p className="mt-3 text-sm text-text-faint">No employees found.</p>}
      <div className="mt-2">
        <ResultLine result={result} />
      </div>
    </PanelCard>
  )
}

// ---- Manual entry

const EMPTY_MANUAL = { employee_id: '', work_date: today(), clock_in: '', clock_out: '', status: 'present', ot_hours: '', night_hours: '' }

function ManualEntry() {
  const employees = useAttendanceEmployees()
  const command = usePayrollCommand()
  const [form, setForm] = useState(EMPTY_MANUAL)
  const [result, setResult] = useState<Result>(null)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.employee_id || !form.work_date) return setResult({ ok: false, text: 'Employee and date are required.' })
    setResult(null)
    command.mutate(
      { endpoint: 'attendance.php', action: 'manual_entry', params: { ...form, ot_hours: form.ot_hours || 0, night_hours: form.night_hours || 0 } },
      {
        onSuccess: (msg) => {
          setForm({ ...EMPTY_MANUAL, work_date: form.work_date })
          setResult({ ok: true, text: msg || 'Attendance recorded.' })
        },
        onError: (err) => setResult({ ok: false, text: errorText(err) }),
      },
    )
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <Field label="Employee">
        <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className={`min-w-52 ${FIELD}`}>
          <option value="">Select Employee</option>
          {(employees.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.text}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Clock In">
        <input type="time" value={form.clock_in} onChange={(e) => setForm({ ...form, clock_in: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Clock Out">
        <input type="time" value={form.clock_out} onChange={(e) => setForm({ ...form, clock_out: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Status">
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={FIELD}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="OT Hours">
        <input type="number" step="0.5" min="0" value={form.ot_hours} onChange={(e) => setForm({ ...form, ot_hours: e.target.value })} className={`w-24 ${FIELD}`} />
      </Field>
      <Field label="Night Hours">
        <input type="number" step="0.5" min="0" value={form.night_hours} onChange={(e) => setForm({ ...form, night_hours: e.target.value })} className={`w-24 ${FIELD}`} />
      </Field>
      <button type="submit" disabled={command.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
        <Plus size={14} /> Add
      </button>
      <div className="w-full">
        <ResultLine result={result} />
      </div>
    </form>
  )
}

// attendance.php: clock in/out for the signed-in user, plus the manager tools
// the classic page shows — bulk marking with export/import/delete, manual
// entry, filters and per-record delete.
export function PayrollAttendance() {
  const [draft, setDraft] = useState({ start_date: monthStart(), end_date: today(), status: '', source: '' })
  const [filters, setFilters] = useState(draft)
  const log = useAttendance({
    start_date: filters.start_date,
    end_date: filters.end_date,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.source ? { source: filters.source } : {}),
  })
  const command = usePayrollCommand()
  const confirm = useConfirm()
  const [error, setError] = useState<string | null>(null)

  const remove = async (row: AttendanceRow) => {
    if (!(await confirm({ title: 'Delete Attendance Record?', message: `Delete ${who(row)}'s attendance for ${row.work_date}?` }))) return
    setError(null)
    command.mutate({ endpoint: 'attendance.php', action: 'delete', params: { id: row.id } }, { onError: (err) => setError(errorText(err)) })
  }

  return (
    <div className="space-y-4">
      {log.isError && <ErrorCard error={log.error} onRetry={() => log.refetch()} />}

      <MyToday />
      <BulkSheet />

      <PanelCard title="Filters & Manual Entry">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setFilters(draft)
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="From">
            <input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} className={FIELD} />
          </Field>
          <Field label="To">
            <input type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Status">
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={FIELD}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className={FIELD}>
              <option value="">All</option>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className={BTN.primary}>
            <Search size={14} /> Apply
          </button>
        </form>
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="mb-3 text-sm font-semibold text-text">Manual Attendance Entry</h4>
          <ManualEntry />
        </div>
      </PanelCard>

      <TablePanel title="Attendance Log">
        {error && <p className="px-4 pt-3 text-sm text-danger">{error}</p>}
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Employee</Th>
              <Th>Date</Th>
              <Th>Clock In</Th>
              <Th>Clock Out</Th>
              <Th>Status</Th>
              <Th className="text-right">OT Hrs</Th>
              <Th className="text-right">Night Hrs</Th>
              <Th>Source</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {log.isLoading && <LoadingRows cols={9} />}
            {!log.isLoading && (log.data ?? []).length === 0 && <EmptyRow colSpan={9} label="No attendance records found." />}
            {(log.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <Td>{who(row)}</Td>
                <Td className="whitespace-nowrap">{row.work_date ?? '—'}</Td>
                <Td>{hhmm(row.clock_in) || '—'}</Td>
                <Td>{hhmm(row.clock_out) || '—'}</Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td className="text-right tabular-nums">{row.ot_hours ?? '0'}</Td>
                <Td className="text-right tabular-nums">{row.night_hours ?? '0'}</Td>
                <Td className="capitalize">{row.source ?? '—'}</Td>
                <Td className="text-right">
                  <button type="button" title="Delete record" disabled={command.isPending} onClick={() => remove(row)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-50">
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
