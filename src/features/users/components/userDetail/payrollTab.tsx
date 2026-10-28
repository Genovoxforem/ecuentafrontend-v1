import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Loader2, FolderOpen, WalletCards, CalendarClock, Save, Settings, ArrowLeftRight, History, Info } from 'lucide-react'
import { useUserDetail } from '../../users.queries'
import { useUserShiftAssignment, useSaveUserShiftAssignment, useShiftScheduleList, usePayrunHistory, type UserShiftAssignment } from '../../userDetailTabs.queries'
import { formatMoney } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { InfoCard, inputCls, primaryBtn } from './UserDetailShared'

export const WIZARD_STEPS = ['Shift', 'Template', 'Calculate', 'History'] as const

// Disabled quick-action pill — for actions this backend has
// (payroll_v2/api/shift.php's swap/override/history verbs) but that return
// a blanket "Permission denied." for every account and every action on this
// install (including bogus action names, so the check fires before any
// handler runs) — unreachable rights, so disabled rather than guessed at.
function DisabledPill({ icon: Icon, children }: { icon: ComponentType<{ size?: number; className?: string }>; children: ReactNode }) {
  return (
    <span
      title="Requires Payroll V2 module permissions this account doesn't have (confirmed live: every action on this module returns Permission denied)."
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-faint/60 cursor-not-allowed"
    >
      <Icon size={13} /> {children}
    </span>
  )
}

// The "Payroll V2 Setup Wizard" mockup this tab is modeled on maps to the
// installed `payroll_v2` module (its CSS/JS load app-wide, and
// /payroll_v2/api/payrun.php?action=list returns JSON), but every page and
// every API action under it returns a blanket "Permission denied." for this
// account, and the module has no visible rights entry on the standard
// user/perms.php or admin/modules.php pages to grant it from — so "Create
// New Shift" and wizard steps 2-4 (Template/Calculate/History) can't be
// wired without guessing at an unverified field contract. What IS wired
// here: shift assignment (pick 1-2 shifts + weekly/monthly/periodic
// rotation) and the system-wide shift roster both live on
// user/salarydetails.php's own form — the same page (and the same
// full-fidelity FormData technique) as this tab's Leave Types fix in
// HrBankTab. See useSaveUserShiftAssignment's comment.
export function PayrollTab({ userId, detail }: { userId: string | undefined; detail: ReturnType<typeof useUserDetail>['detail'] }) {
  const { data: shiftData, isLoading, isError, error, refetch } = useUserShiftAssignment(userId)
  const { data: scheduleRows } = useShiftScheduleList()
  const saveShift = useSaveUserShiftAssignment(userId)
  const [wizardStep, setWizardStep] = useState(1)
  const [primaryShiftId, setPrimaryShiftId] = useState<number | null>(null)
  const [secondaryShiftId, setSecondaryShiftId] = useState<number | null>(null)
  const [alternateMode, setAlternateMode] = useState<UserShiftAssignment['alternateMode']>('none')

  useEffect(() => {
    if (shiftData) {
      setPrimaryShiftId(shiftData.primaryShiftId)
      setSecondaryShiftId(shiftData.secondaryShiftId)
      setAlternateMode(shiftData.alternateMode)
    }
  }, [shiftData])

  function shiftName(id: number | null) {
    return id ? (shiftData?.shiftOptions.find((o) => o.id === id)?.name ?? `#${id}`) : null
  }
  const currentLabel =
    primaryShiftId == null ? 'No shift assigned' : secondaryShiftId ? `${shiftName(primaryShiftId)} + ${shiftName(secondaryShiftId)} (${alternateMode})` : shiftName(primaryShiftId)

  const dirty =
    !!shiftData && (primaryShiftId !== shiftData.primaryShiftId || secondaryShiftId !== shiftData.secondaryShiftId || alternateMode !== shiftData.alternateMode)

  function handleClear() {
    setPrimaryShiftId(null)
    setSecondaryShiftId(null)
    setAlternateMode('none')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand/10 text-brand shrink-0">
            <Settings size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text!">Payroll V2 Setup Wizard</h3>
            <p className="text-xs text-text-faint">Set up shifts, templates, and calculate payroll for this employee.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {WIZARD_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(i + 1)}
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                  wizardStep === i + 1 ? 'bg-brand text-white' : 'bg-neutral-bg text-neutral-fg hover:bg-border'
                }`}
              >
                {i + 1}
              </button>
              <button type="button" onClick={() => setWizardStep(i + 1)} className={`text-xs ${wizardStep === i + 1 ? 'text-brand font-medium' : 'text-text-faint'}`}>
                {step}
              </button>
              {i < WIZARD_STEPS.length - 1 && <span className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {wizardStep === 1 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InfoCard
          icon={CalendarClock}
          title="Shift & Weekly Rotation"
          subtitle="Pick 1 shift for a fixed schedule, or 2 shifts (one day + one night) to rotate weekly between them."
        >
          {isLoading ? (
            <LegacyLoadingCard label="Loading shift assignment…" />
          ) : isError || !shiftData ? (
            <LegacyErrorCard title="Couldn't load shift assignment" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-faint">Shifts (pick 1 or 2)</label>
                <select
                  value={primaryShiftId ?? ''}
                  disabled={!detail}
                  onChange={(e) => setPrimaryShiftId(e.target.value ? Number(e.target.value) : null)}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="">Select shift(s)</option>
                  {shiftData.shiftOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              {primaryShiftId != null && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-text-faint">Rotation</label>
                    <select value={alternateMode} onChange={(e) => setAlternateMode(e.target.value as UserShiftAssignment['alternateMode'])} className={`mt-1 ${inputCls}`}>
                      <option value="none">No alternation</option>
                      <option value="week">Alternate Week</option>
                      <option value="month">Alternate Month</option>
                      <option value="periodic">Periodic Pattern</option>
                    </select>
                  </div>
                  {alternateMode !== 'none' && (
                    <div>
                      <label className="text-xs text-text-faint">Second shift</label>
                      <select
                        value={secondaryShiftId ?? ''}
                        onChange={(e) => setSecondaryShiftId(e.target.value ? Number(e.target.value) : null)}
                        className={`mt-1 ${inputCls}`}
                      >
                        <option value="">Select shift</option>
                        {shiftData.shiftOptions
                          .filter((o) => o.id !== primaryShiftId)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-start gap-2 rounded-md bg-info-bg/40 border border-info-bg px-3 py-2 text-xs text-info-fg">
                <Info size={13} className="shrink-0 mt-0.5" />
                Current: <span className="font-semibold">{currentLabel}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!dirty || saveShift.isPending} onClick={() => saveShift.mutate({ primaryShiftId, secondaryShiftId, alternateMode })} className={primaryBtn}>
                  {saveShift.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                </button>
                <button
                  type="button"
                  disabled={primaryShiftId == null && alternateMode === 'none'}
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-sm font-medium text-danger disabled:opacity-50"
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
              {saveShift.isError && <p className="text-sm text-danger">{saveShift.error instanceof Error ? saveShift.error.message : 'Failed to save.'}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <DisabledPill icon={ArrowLeftRight}>Swap Shift</DisabledPill>
                <DisabledPill icon={Pencil}>Override Shift</DisabledPill>
                <DisabledPill icon={History}>Shift History</DisabledPill>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-text! mb-2">
              <FolderOpen size={14} className="text-text-faint" /> Current Shift Schedule
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
                    <th className="font-medium px-3 py-2">Name</th>
                    <th className="font-medium px-3 py-2">Type</th>
                    <th className="font-medium px-3 py-2">Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {!scheduleRows || scheduleRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-text-faint italic" colSpan={3}>
                        {scheduleRows ? 'No shifts defined.' : 'Loading…'}
                      </td>
                    </tr>
                  ) : (
                    scheduleRows.map((r, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">{r.name}</td>
                        <td className="px-3 py-2 text-text-muted">{r.type}</td>
                        <td className="px-3 py-2 text-text-muted">{r.createdBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </InfoCard>

        <InfoCard icon={Plus} title="Create New Shift" subtitle="Define a new shift schedule for this employee.">
          <div className="flex items-start gap-2 mb-3 rounded-md bg-warning-bg/40 border border-warning-bg px-3 py-2 text-xs text-warning-fg">
            <Info size={13} className="shrink-0 mt-0.5" />
            Not available in this app yet — the real Payroll V2 module this belongs to (confirmed live and installed) returns "Permission denied" for every account and action, with no
            rights entry exposed to grant it.
          </div>
          <div className="space-y-3 opacity-60 pointer-events-none">
            <div>
              <label className="text-xs text-text-faint">Shift name</label>
              <input disabled placeholder="e.g. Morning Shift" className={`mt-1 ${inputCls}`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-text-faint">Start time</label>
                <input disabled placeholder="08:00 AM" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-xs text-text-faint">End time</label>
                <input disabled placeholder="05:00 PM" className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-text-faint">Break (min)</label>
                <input disabled placeholder="60" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-xs text-text-faint">Grace (min)</label>
                <input disabled placeholder="15" className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" disabled /> Night shift
            </label>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" disabled /> Assign to this user after create
            </label>
            <button type="button" disabled className={primaryBtn}>
              <Plus size={13} /> Create Shift
            </button>
          </div>
        </InfoCard>
      </div>
      )}

      {wizardStep === 2 && <PayrollTemplateStep />}
      {wizardStep === 3 && <PayrollCalculateStep />}
      {wizardStep === 4 && <PayrollHistoryStep shiftData={shiftData} shiftName={shiftName} />}

      <div className="flex items-center justify-between">
        {wizardStep > 1 ? (
          <button type="button" onClick={() => setWizardStep((s) => s - 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover">
            <ChevronLeft size={14} /> {WIZARD_STEPS[wizardStep - 2]}
          </button>
        ) : (
          <span />
        )}
        {wizardStep < WIZARD_STEPS.length && (
          <button type="button" onClick={() => setWizardStep((s) => s + 1)} className={primaryBtn}>
            Next: {WIZARD_STEPS[wizardStep]} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// Wizard steps 2/3 belong to the same permission-gated payroll_v2 module as
// "Create New Shift"/"Swap Shift" etc. (see PayrollTab's own comment) —
// every field is honestly disabled with the real reason given, matching
// the reference design's exact layout rather than inventing working
// behavior that doesn't exist on this backend.
function PermissionBanner() {
  return (
    <div className="flex items-start gap-2 mb-3 rounded-md bg-warning-bg/40 border border-warning-bg px-3 py-2 text-xs text-warning-fg">
      <Info size={13} className="shrink-0 mt-0.5" />
      Not available in this app yet — the real Payroll V2 module this belongs to (confirmed live and installed) returns "Permission denied" for every account and action, with no rights
      entry exposed to grant it.
    </div>
  )
}

function PayrollTemplateStep() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <InfoCard icon={WalletCards} title="Assign salary template" subtitle="Attach a pay template and grade to this employee.">
        <PermissionBanner />
        <div className="space-y-3 opacity-60 pointer-events-none">
          <div className="rounded-md bg-neutral-bg px-3 py-2 text-xs text-neutral-fg">
            Current: <span className="font-semibold">No template assigned</span>
          </div>
          <div>
            <label className="text-xs text-text-faint">Template</label>
            <select disabled className={`mt-1 ${inputCls}`}>
              <option>Select a template</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-faint">Grade</label>
            <input disabled className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs text-text-faint">Basic salary</label>
            <input disabled placeholder="0.00" className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs text-text-faint">Effective date</label>
            <input disabled type="date" className={`mt-1 ${inputCls}`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-faint">Contract start</label>
              <input disabled type="date" className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label className="text-xs text-text-faint">Contract end</label>
              <input disabled type="date" className={`mt-1 ${inputCls}`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled className={primaryBtn}>
              Assign template
            </button>
            <button type="button" disabled className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-faint">
              Manage components
            </button>
          </div>
        </div>
      </InfoCard>

      <InfoCard icon={Plus} title="Create new template" subtitle="Define a new salary template with its own components.">
        <PermissionBanner />
        <div className="space-y-3 opacity-60 pointer-events-none">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-faint">Template name</label>
              <input disabled className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label className="text-xs text-text-faint">Type</label>
              <select disabled className={`mt-1 ${inputCls}`}>
                <option>Monthly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-faint">Grade min</label>
              <input disabled placeholder="0" className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label className="text-xs text-text-faint">Grade max</label>
              <input disabled placeholder="0" className={`mt-1 ${inputCls}`} />
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-faint uppercase tracking-wide bg-surface border-b border-border">
                  <th className="font-medium px-2 py-1.5">Code</th>
                  <th className="font-medium px-2 py-1.5">Name</th>
                  <th className="font-medium px-2 py-1.5">Type</th>
                  <th className="font-medium px-2 py-1.5">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-3 text-text-faint italic text-center" colSpan={4}>
                    No components yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" disabled className={primaryBtn}>
            <Plus size={13} /> Create template
          </button>
        </div>
      </InfoCard>
    </div>
  )
}

function PayrollCalculateStep() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <InfoCard icon={Settings} title="Preview period" subtitle="Run a payroll calculation preview for a given month.">
        <PermissionBanner />
        <div className="flex items-start gap-2 mb-3 rounded-md bg-warning-bg/40 border border-warning-bg px-3 py-2 text-xs text-warning-fg">
          <Info size={13} className="shrink-0 mt-0.5" />
          Complete template assignment (step 2) before calculating.
        </div>
        <div className="space-y-3 opacity-60 pointer-events-none">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-faint">Month</label>
              <select disabled className={`mt-1 ${inputCls}`}>
                <option>{new Date().toLocaleString(undefined, { month: 'short' })}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-faint">Year</label>
              <input disabled value={new Date().getFullYear()} className={`mt-1 ${inputCls}`} />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-faint">OT hours</label>
            <input disabled placeholder="0" className={`mt-1 ${inputCls}`} />
          </div>
          <button type="button" disabled className={primaryBtn}>
            Run calculation
          </button>
        </div>
      </InfoCard>

      <InfoCard icon={WalletCards} title="Result" subtitle="Gross, statutory deductions, and net pay for the selected period.">
        <p className="text-sm text-text-faint italic py-6 text-center">Run a preview to see gross, statutory deductions and net pay.</p>
      </InfoCard>
    </div>
  )
}

// The only piece of this step that's real: shift assignment (already
// fetched for step 1) is shown here too, exactly as saved on
// user/salarydetails.php. Payslip history is real too — genuinely fetched
// from payroll_v2/api/payrun.php?action=list, the one confirmed-working,
// non-permission-gated endpoint on that module (currently empty, since no
// payrun has ever been run on this install — not fabricated demo rows).
// Grade/salary change history has no confirmed real source, so it's an
// honest empty state rather than an invented one.
function PayrollHistoryStep({ shiftData, shiftName }: { shiftData: UserShiftAssignment | undefined; shiftName: (id: number | null) => string | null }) {
  const { data: payruns, isLoading, isError, error, refetch } = usePayrunHistory()

  return (
    <div className="space-y-5">
      <InfoCard icon={History} title="Payslip history" subtitle="Real payroll_v2 payrun records for this install (currently none have been run).">
        {isLoading ? (
          <LegacyLoadingCard label="Loading payslip history…" />
        ) : isError ? (
          <LegacyErrorCard title="Couldn't load payslip history" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
                  <th className="font-medium px-3 py-2">Period</th>
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2 text-right">Gross</th>
                  <th className="font-medium px-3 py-2 text-right">Net</th>
                  <th className="font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {!payruns || payruns.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-text-faint italic" colSpan={5}>
                      No payslips yet.
                    </td>
                  </tr>
                ) : (
                  payruns.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{p.period}</td>
                      <td className="px-3 py-2 text-brand">{p.ref}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{formatMoney(p.gross)}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{formatMoney(p.net)}</td>
                      <td className="px-3 py-2 text-text-muted">{p.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </InfoCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InfoCard icon={FolderOpen} title="Grade / salary changes" subtitle="History of salary grade updates for this employee.">
          <p className="text-sm text-text-faint italic">No grade history.</p>
        </InfoCard>
        <InfoCard icon={CalendarClock} title="Shift assignments" subtitle="Current shift assignment period, from the real record.">
          {shiftData?.primaryShiftId ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
                    <th className="font-medium px-3 py-2">Shift</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 text-text!">
                      {shiftName(shiftData.primaryShiftId)}
                      {shiftData.secondaryShiftId && ` + ${shiftName(shiftData.secondaryShiftId)}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-faint italic">No shift assigned.</p>
          )}
        </InfoCard>
      </div>
    </div>
  )
}
