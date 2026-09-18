import { useMemo, useState } from 'react'
import { ClipboardList, Clock, LoaderCircle, Search, Users, Wallet, X } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useManageSalaryEmployees, useCreateSalaryAssignment, type NewSalaryAssignmentInput } from '../payrollActions.queries'
import type { ManageSalaryRow } from '../manageSalaryParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const fieldCls = 'w-full h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function StatTile({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Users; color: IconColor }) {
  return (
    <Card className="!p-4 !flex-row items-center gap-3">
      <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text! leading-tight mt-0.5">{value}</p>
      </div>
    </Card>
  )
}

// Real "Assign Details" modal — one per employee row, opened from the list
// below. Every field starts pre-filled from the real backend (bank
// details, current salary grade / shift / leave type assignment) and every
// dropdown's option list is real, scraped from this same employee's row
// (see manageSalaryParser.ts) rather than fabricated — matching
// payroll/manage_salary.php's own modal section-for-section: Bank Details,
// Assign Salary Grade, Assign Shift, Assign Leave Type.
function AssignSalaryModal({ row, onClose, onSaved }: { row: ManageSalaryRow; onClose: () => void; onSaved: () => void }) {
  const save = useCreateSalaryAssignment()

  const [bankName, setBankName] = useState(row.bankName)
  const [accountNo, setAccountNo] = useState(row.accountNo)
  const [ifsc, setIfsc] = useState(row.ifsc)
  const [micr, setMicr] = useState(row.micr)
  const [comments, setComments] = useState(row.comments)

  const [gradeType, setGradeType] = useState<NewSalaryAssignmentInput['gradeType']>(row.gradeType)
  const [hourlyTemplateId, setHourlyTemplateId] = useState(row.gradeType === 'llx_payroll_hourly_template' ? row.hourlySelected : '')
  const [monthlyTemplateId, setMonthlyTemplateId] = useState(row.gradeType === 'llx_payroll_monthly_template' ? row.monthlySelected : '')

  const [primaryShift, setPrimaryShift] = useState(row.primaryShift)
  const [secondaryShift, setSecondaryShift] = useState(row.secondaryShift)
  const [alternateMode, setAlternateMode] = useState<NewSalaryAssignmentInput['alternateMode']>(row.alternateMode)
  const [startDate, setStartDate] = useState(row.startDate)
  const [endDate, setEndDate] = useState(row.endDate)

  const [leaveTypeIds, setLeaveTypeIds] = useState<string[]>(row.leaveTypeSelected)
  const [error, setError] = useState('')

  const templateId = gradeType === 'llx_payroll_hourly_template' ? hourlyTemplateId : gradeType === 'llx_payroll_monthly_template' ? monthlyTemplateId : ''

  function toggleGrade(type: 'llx_payroll_hourly_template' | 'llx_payroll_monthly_template') {
    setGradeType((prev) => (prev === type ? '' : type))
  }

  function toggleLeaveType(value: string) {
    setLeaveTypeIds((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  function handleSave() {
    setError('')
    if (!gradeType) return setError('Salary Grade required!')
    if (primaryShift !== '0' && !startDate) return setError('Shift start date required!')
    if (primaryShift !== '0' && !endDate) return setError('Shift end date required!')

    save.mutate(
      {
        employeeId: row.employeeId,
        userRole: row.userRole || row.designation,
        insertedId: row.insertedId,
        gradeType,
        templateId,
        bankName,
        ifsc,
        micr,
        accountNo,
        comments,
        primaryShift,
        secondaryShift,
        alternateMode,
        startDate,
        endDate,
        leaveTypeIds,
      },
      {
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
        onSuccess: () => {
          onSaved()
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-lg bg-surface border border-border shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-text!">Manage Salary — {row.employeeName}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-text! underline underline-offset-2">Bank Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">Bank Name</span>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Enter Bank Name" className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">Account No</span>
                <input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="Enter Account No" className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">IFSC Code</span>
                <input value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="Enter IFSC Code" className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">MICR Code</span>
                <input value={micr} onChange={(e) => setMicr(e.target.value)} placeholder="Enter MICR Code" className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-text-muted">Comments</span>
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} placeholder="Enter Comments" className={fieldCls} />
              </label>
            </div>
          </section>

          <hr className="border-border" />

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-text! underline underline-offset-2">Assign Salary Grade</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={gradeType === 'llx_payroll_hourly_template'}
                  onChange={() => toggleGrade('llx_payroll_hourly_template')}
                  className="accent-brand shrink-0"
                />
                <select
                  value={hourlyTemplateId}
                  disabled={row.hourlyOptions.length === 0}
                  onChange={(e) => {
                    setHourlyTemplateId(e.target.value)
                    setGradeType('llx_payroll_hourly_template')
                  }}
                  className={fieldCls}
                >
                  <option value="" disabled>
                    {row.hourlyOptions.length ? 'Select Hourly Grade' : 'No hourly templates'}
                  </option>
                  {row.hourlyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={gradeType === 'llx_payroll_monthly_template'}
                  onChange={() => toggleGrade('llx_payroll_monthly_template')}
                  className="accent-brand shrink-0"
                />
                <select
                  value={monthlyTemplateId}
                  disabled={row.monthlyOptions.length === 0}
                  onChange={(e) => {
                    setMonthlyTemplateId(e.target.value)
                    setGradeType('llx_payroll_monthly_template')
                  }}
                  className={fieldCls}
                >
                  <option value="" disabled>
                    {row.monthlyOptions.length ? 'Select Monthly Grade' : 'No monthly templates'}
                  </option>
                  {row.monthlyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <hr className="border-border" />

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-text! underline underline-offset-2">Assign Shift</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">Primary Shift</span>
                <select value={primaryShift} onChange={(e) => setPrimaryShift(e.target.value)} className={fieldCls}>
                  {row.shiftOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value === '0' ? 'Select' : o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-muted">Alternate Mode</span>
                <select value={alternateMode} onChange={(e) => setAlternateMode(e.target.value as NewSalaryAssignmentInput['alternateMode'])} className={fieldCls}>
                  <option value="none">No alternation</option>
                  <option value="week">Alternate Week</option>
                  <option value="month">Alternate Month</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={`text-xs ${primaryShift !== '0' ? 'text-danger' : 'text-text-muted'}`}>Start Date{primaryShift !== '0' && ' *'}</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={primaryShift === '0'} className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={`text-xs ${primaryShift !== '0' ? 'text-danger' : 'text-text-muted'}`}>End Date{primaryShift !== '0' && ' *'}</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={primaryShift === '0'} className={fieldCls} />
              </label>
              {alternateMode !== 'none' && (
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs text-danger">Secondary Shift</span>
                  <select value={secondaryShift} onChange={(e) => setSecondaryShift(e.target.value)} className={fieldCls}>
                    {row.shiftOptions.map((o) => (
                      <option key={o.value} value={o.value} disabled={o.value !== '0' && o.value === primaryShift}>
                        {o.value === '0' ? 'Select shift' : o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <hr className="border-border" />

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-text! underline underline-offset-2">Assign Leave Type</h4>
            {row.leaveTypeOptions.length === 0 ? (
              <p className="text-xs text-text-faint italic">No leave types configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {row.leaveTypeOptions.map((o) => {
                  const checked = leaveTypeIds.includes(o.value)
                  return (
                    <label
                      key={o.value}
                      className={`flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 cursor-pointer ${checked ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted'}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleLeaveType(o.value)} className="accent-brand" />
                      {o.label}
                    </label>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {error && <p className="px-4 pb-1 text-xs text-danger shrink-0">{error}</p>}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Close
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Real via payroll/manage_salary.php: pick an entity, "Go" loads every
// employee in it with their current Assigned Salary Grade / Assigned Shift
// (see payrollActions.queries.ts's useManageSalaryEmployees), and each
// row's "Assign Details" opens the real modal above to create or update
// that employee's assignment — confirmed live, this deployment has exactly
// one entity ("Master entity", id 1), same convention already used on
// Mark Attendance's own Entity dropdown.
export function ManageSalaryForm() {
  const [entityId, setEntityId] = useState('')
  const [searchedEntity, setSearchedEntity] = useState('')
  const [entityError, setEntityError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [assignRow, setAssignRow] = useState<ManageSalaryRow | null>(null)

  const { data, isLoading, isError, error, refetch, isFetching } = useManageSalaryEmployees(searchedEntity)

  function handleGo() {
    if (!entityId) {
      setEntityError('Entity Required!')
      return
    }
    setEntityError('')
    setSearchedEntity(entityId)
    setPage(1)
  }

  const allRows = useMemo(() => data ?? [], [data])
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((r) => r.employeeName.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q))
  }, [allRows, search])
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  const gradeAssignedCount = useMemo(() => allRows.filter((r) => r.salaryGradeSet).length, [allRows])
  const shiftAssignedCount = useMemo(() => allRows.filter((r) => r.shiftSet).length, [allRows])

  function getExportData() {
    return {
      headers: ['Employee Name', 'Designation', 'Assigned Salary Grade', 'Assigned Shift'],
      rows: filteredRows.map((r) => [r.employeeName, r.designation || '-', r.salaryGradeText, r.shiftText]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <Wallet size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Manage Salary</h2>
            <p className="text-xs text-text-faint mt-0.5">Assign salary grade, shift and leave type per employee.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-danger mb-1">Select Entity *</label>
            <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className={inputCls}>
              <option value="">Select Entity</option>
              <option value="1">Master entity</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleGo}
            disabled={isFetching}
            className="h-9 flex items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {isFetching ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />} Go
          </button>
          {entityError && <p className="text-xs text-danger">{entityError}</p>}
        </div>
      </div>

      {searchedEntity && (
        <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
          {isLoading && <LegacyLoadingCard label="Loading employees…" />}
          {isError && <LegacyErrorCard title="Couldn't load employees" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatTile label="Total Employees" value={allRows.length} icon={Users} color="blue" />
                <StatTile label="Salary Grade Assigned" value={gradeAssignedCount} icon={Wallet} color="green" />
                <StatTile label="Shift Assigned" value={shiftAssignedCount} icon={Clock} color="amber" />
              </div>

              <Card className="!p-0 overflow-hidden flex-1 min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
                  <h3 className="font-semibold text-text!">Employees</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value))
                        setPage(1)
                      }}
                      className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder="Search by employee name or designation…"
                      className={`w-64 ${inputCls}`}
                    />
                    <TableExportButtons title="Manage Salary" getExportData={getExportData} />
                  </div>
                </div>

                {filteredRows.length === 0 ? (
                  <p className="text-sm text-text-faint italic py-6 text-center">No employees match this search.</p>
                ) : (
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                          <th className="font-medium px-3 py-2">Employee Name</th>
                          <th className="font-medium px-3 py-2">Designation</th>
                          <th className="font-medium px-3 py-2">Assigned Salary Grade</th>
                          <th className="font-medium px-3 py-2">Assigned Shift</th>
                          <th className="font-medium px-3 py-2">Assign Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r) => (
                          <tr key={r.employeeId} className="border-b border-border last:border-0">
                            <td className="px-3 py-2.5 text-text!">
                              <div className="flex items-center gap-2">
                                <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(r.employeeName)]}`}>
                                  {initialsFor(r.employeeName)}
                                </span>
                                {r.employeeName}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-text-muted">{r.designation || '—'}</td>
                            <td className="px-3 py-2.5">
                              {r.salaryGradeSet ? <span className="text-text!">{r.salaryGradeText}</span> : <span className="text-xs font-medium text-danger">Not Set</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              {r.shiftSet ? <span className="text-text!">{r.shiftText}</span> : <span className="text-xs font-medium text-danger">Not Set</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <button type="button" onClick={() => setAssignRow(r)} title="Assign Details" className="p-1.5 rounded-md text-brand hover:bg-brand/10">
                                <ClipboardList size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {searchedEntity && data && <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />}

      {assignRow && <AssignSalaryModal row={assignRow} onClose={() => setAssignRow(null)} onSaved={() => refetch()} />}
    </div>
  )
}
