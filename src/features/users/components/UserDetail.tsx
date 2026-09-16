import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  UserRound,
  X,
  Crown,
  IdCard,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Pencil,
  XCircle,
  CheckCircle2,
  UsersRound,
  Plus,
  Bell,
  Download,
  Trash2,
  Loader2,
  FolderOpen,
  PhoneCall,
  Database,
  WalletCards,
  FileText,
  CalendarClock,
  Clock,
  StickyNote,
  Paperclip,
  Save,
  Landmark,
  CreditCard,
  Settings,
  ArrowLeftRight,
  History,
  Info,
  Eye,
  Repeat,
  CalendarPlus,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { useUser, useUserDetail } from '../users.queries'
import { useUserPermissions, useToggleUserPermission } from '../userPermissions.queries'
import {
  useUserBankProfile,
  useSaveUserPersonalContact,
  useAddUserBankAccount,
  useSaveUserLeaveTypes,
  useUserShiftAssignment,
  useSaveUserShiftAssignment,
  useShiftScheduleList,
  usePayrunHistory,
  type UserShiftAssignment,
  useUserNotes,
  useSaveUserNotes,
  useUserDocuments,
  useUploadUserDocument,
  useDeleteUserDocument,
  useUserAgenda,
  useCreateUserAgendaEvent,
  useActivitiesMeta,
  useActivities,
  useActivityTimeline,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  useScheduleActivity,
  useCloseActivity,
  type ActivityItem,
  type ActivityMeta,
  type ActivityProcessType,
  type ActivitySubtabKey,
  type ActivityFormFields,
  useUserNotifications,
  useAddUserNotification,
  useDeleteUserNotification,
  useToggleUserStatus,
} from '../userDetailTabs.queries'
import { formatDate, formatMoney } from '../../../utils/format'
import { BackendUnavailableCard, isBackendUnavailable } from '../../../shared/components/BackendUnavailable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const TABS = ['Overview', 'Permissions', 'HR & Bank', 'Payroll', 'Activities', 'Notes', 'Documents', 'Agenda', 'LDAP', 'Notifications', 'Click to Dial'] as const
type Tab = (typeof TABS)[number]

// Same icon-per-tab treatment as OrderDetail.tsx's own tab strip.
const TAB_ICONS: Record<Tab, ComponentType<{ size?: number; className?: string }>> = {
  Overview: UserRound,
  Permissions: ShieldCheck,
  'HR & Bank': Briefcase,
  Payroll: WalletCards,
  Activities: FolderOpen,
  Notes: StickyNote,
  Documents: Paperclip,
  Agenda: CalendarClock,
  LDAP: Database,
  Notifications: Bell,
  'Click to Dial': PhoneCall,
}

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 disabled:bg-surface disabled:text-text-faint disabled:cursor-default'
const primaryBtn = 'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:bg-neutral-bg disabled:text-text-faint disabled:cursor-default'

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: ComponentType<{ size?: number; className?: string }> }) {
  if (!Icon) {
    return (
      <div className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
        <span className="text-xs text-text-faint">{label}</span>
        <span className="text-sm text-text!">{value || '—'}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="flex items-center gap-2 text-sm text-text-muted">
        <Icon size={14} className="text-brand shrink-0" /> {label}
      </span>
      <span className="text-sm text-text! font-medium text-right">{value || '—'}</span>
    </div>
  )
}

// Collapsible section shell used by OverviewTab's Basic Information/Work
// Profile/Groups/Validators cards — purely a local UI affordance (no data
// dependency), defaults open so nothing is hidden on first load.
function CollapsibleSection({ icon: Icon, title, children }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 border-b border-border bg-surface px-4 py-3 text-left"
      >
        <Icon size={15} className="text-brand" />
        <h3 className="text-sm font-semibold text-text! flex-1">{title}</h3>
        <ChevronUp size={14} className={`text-text-faint transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && <div className="px-4">{children}</div>}
    </section>
  )
}

function ReadOnlyNote({ children }: { children: string }) {
  return <p className="text-xs text-text-faint italic mt-1">{children}</p>
}

// Non-collapsible card shell (icon + title + subtitle, optional header
// action) used by HrBankTab's Personal Contact/Bank Accounts/Leave Types
// sections.
function InfoCard({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-start gap-3 border-b border-border bg-surface px-4 py-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand/10 text-brand shrink-0">
          <Icon size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text!">{title}</h3>
          {subtitle && <p className="text-xs text-text-faint mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function IconField({
  icon: Icon,
  ...props
}: { icon: ComponentType<{ size?: number; className?: string }> } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
      <input {...props} className={`${inputCls} pl-9`} />
    </div>
  )
}

// Real per-module/per-right permission state from userprofile/api/
// permissions.php (see userPermissions.queries.ts's header comment for how
// this was found). Unchanged by this rebuild — already fully real.
function PermissionsTab({
  userId,
  permModule,
  setPermModule,
  hasGroups,
}: {
  userId: string | undefined
  permModule: string | null
  setPermModule: (key: string) => void
  hasGroups: boolean
}) {
  const { data, isLoading, isError, error, refetch } = useUserPermissions(userId)
  const toggle = useToggleUserPermission(userId)
  const [selectAllPending, setSelectAllPending] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading permissions…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load permissions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const activeModuleKey = permModule && data.modules.some((m) => m.id === permModule) ? permModule : (data.modules[0]?.id ?? null)
  const activeModule = data.modules.find((m) => m.id === activeModuleKey)
  const allGranted = activeModule ? activeModule.perms.every((r) => r.granted) : false

  // Real "you must associate user with a group and one or more entities"
  // warning — this is the actual condition the reference page's own
  // multicompany-module banner is keyed on (verified live at
  // userprofile/index.php?id=X#permissions: it shows for this exact user,
  // who has 0 groups), reproduced here rather than a generic message.
  async function handleSelectAll() {
    if (!activeModule) return
    setSelectAllPending(true)
    try {
      const targets = activeModule.perms.filter((r) => r.granted === allGranted)
      for (const right of targets) {
        await toggle.mutateAsync({ rightId: right.id, grant: !allGranted })
      }
    } finally {
      setSelectAllPending(false)
    }
  }

  return (
    <div>
      {!hasGroups && (
        <div className="flex items-start gap-2 mb-3 rounded-md border border-warning-bg bg-warning-bg/40 px-3 py-2 text-xs text-warning-fg">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />
          You must associate this user with a group and one or more entities in order to define permissions.
        </div>
      )}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs text-text-faint">{data.nbRights} direct right(s) granted</p>
        {!data.canEdit && <p className="text-xs text-text-faint italic">Read-only — your account can't edit this user's permissions.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-0 border border-border rounded-lg overflow-hidden">
        <div className="border-b sm:border-b-0 sm:border-r border-border max-h-96 overflow-y-auto">
          {data.modules.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPermModule(m.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm border-b border-border last:border-0 ${
                activeModuleKey === m.id ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <span className="flex-1 truncate">{m.label}</span>
              <span className={`text-xs rounded px-1.5 ${activeModuleKey === m.id ? 'bg-white/20' : 'bg-surface text-text-faint'}`}>{m.perms.length}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col max-h-96">
          {activeModule ? (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-10 shrink-0">
                <p className="flex items-center gap-2 font-semibold text-text!">
                  <UsersRound size={14} className="text-brand" /> {activeModule.label}
                </p>
                {data.canEdit && (
                  <label className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
                    <input
                      type="checkbox"
                      checked={allGranted}
                      disabled={selectAllPending || toggle.isPending}
                      onChange={handleSelectAll}
                      className="rounded border-input-border"
                    />
                    Select All
                  </label>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {activeModule.perms.map((right) => (
                    <label key={right.id} className={`flex items-center gap-2 py-1.5 text-sm ${right.granted ? 'text-text!' : 'text-text-muted'}`}>
                      <input
                        type="checkbox"
                        checked={right.granted}
                        disabled={!data.canEdit || toggle.isPending || selectAllPending}
                        onChange={(e) => toggle.mutate({ rightId: right.id, grant: e.target.checked })}
                        className="rounded border-input-border"
                      />
                      {right.label}
                      {right.inherited && !right.direct && <span className="text-xs text-text-faint italic">(via group)</span>}
                    </label>
                  ))}
                </div>
                {toggle.isError && <p className="text-sm text-danger mt-2">{toggle.error instanceof Error ? toggle.error.message : 'Failed to update permission.'}</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-faint italic p-4">No permission modules found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Real fields from userprofile/api/user.php (see users.queries.ts's
// useUserDetail) — every value here now comes off that endpoint's actual
// response shape, including the previously-broken supervisor/expense
// validator/NRC fields.
function OverviewTab({ user, detail }: { user: NonNullable<ReturnType<typeof useUser>['user']>; detail: ReturnType<typeof useUserDetail>['detail'] }) {
  const groups = detail?.groups ?? []
  const socialLinks = detail?.socialLinks ?? []
  const basicFields = [
    ['Username', user.login, UserRound],
    ['Email Address', user.email, Mail],
    ['Office Phone', user.phone, Phone],
    ['Mobile', detail?.mobile ?? '', PhoneCall],
    ['Job Position', user.designation, Briefcase],
    ['Employee', user.employee ? 'Yes' : 'No', CheckCircle2],
    ['Employee NRC', detail?.employeeNrc ?? '', IdCard],
    ['Gender', user.gender, UserRound],
    ['Supervisor', detail?.supervisor?.name ?? '', UsersRound],
    ['Force Expense Report Validator', detail?.expenseValidator?.name ?? '', FileText],
    ['Holiday Validator', detail?.holidayValidator?.name ?? '', CalendarClock],
  ] as const
  const workFields = [
    ['Last Login', user.lastLogin, Clock],
    ['Employment Date', detail?.dateEmployment ? formatDate(detail.dateEmployment) : '', CalendarClock],
    ['Date Of Birth', detail?.birth ? formatDate(detail.birth) : '', CalendarClock],
    ['Average Hourly Rate', detail?.hourlyCost != null ? `${formatMoney(detail.hourlyCost)} ZMW` : '', WalletCards],
    ['Average Daily Rate', detail?.dailyCost != null ? `${formatMoney(detail.dailyCost)} ZMW` : '', WalletCards],
    ['Hours Worked (Per Week)', detail?.weeklyHours != null ? String(detail.weeklyHours) : '', Clock],
    ['Timesheet Device', detail?.timesheetDevice ? `${detail.timesheetDevice.name}${detail.timesheetDevice.brand ? ` (${detail.timesheetDevice.brand})` : ''}` : '', Database],
    ['Address', [detail?.address, detail?.zip, detail?.town].filter(Boolean).join(', '), MapPin],
  ] as const

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)] gap-5">
      <div className="space-y-5">
        <CollapsibleSection icon={IdCard} title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {basicFields.map(([label, value, icon]) => <Field key={label} label={label} value={value} icon={icon} />)}
          </div>
        </CollapsibleSection>

        <CollapsibleSection icon={Briefcase} title="Work Profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {workFields.map(([label, value, icon]) => <Field key={label} label={label} value={value} icon={icon} />)}
          </div>
        </CollapsibleSection>
      </div>

      <div className="space-y-5">
        <CollapsibleSection icon={UsersRound} title="Groups">
          {groups.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 py-3">
              {groups.map((g) => <span key={g} className="rounded-full bg-brand/10 px-2.5 py-1 text-xs text-brand">{g}</span>)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-surface text-text-faint">
                <UsersRound size={22} />
              </span>
              <p className="text-sm text-text-faint">No groups assigned.</p>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection icon={ShieldCheck} title="Validators">
          <div className="text-sm">
            <Field label="Supervisor" value={detail?.supervisor?.name ?? ''} icon={UserRound} />
            <Field label="Force expense report validator" value={detail?.expenseValidator?.name ?? ''} icon={FileText} />
            <Field label="Leave request validator" value={detail?.holidayValidator?.name ?? ''} icon={UserRound} />
          </div>
        </CollapsibleSection>
      </div>

      {socialLinks.length > 0 && (
        <div className="xl:col-span-2">
          <p className="font-semibold text-text! mb-2">Social Links</p>
          <div className="flex flex-wrap gap-2">
            {socialLinks.map((s) => (
              <a
                key={s.key}
                href={s.url || undefined}
                target="_blank"
                rel="noreferrer"
                className={`text-xs rounded-md border border-border px-2 py-1 ${s.url ? 'text-brand hover:underline' : 'text-text-muted'}`}
              >
                {s.label}: {s.value}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Real via userprofile/api/bank.php (bank.php's own set_personal/add_account
// actions — see userDetailTabs.queries.ts). Leave-type assignment is real
// too, but goes through a different real page entirely
// (user/salarydetails.php's own editform, action=update) — bank.php's own
// action=set_leavetypes is a dead stub (see useSaveUserLeaveTypes' comment).
function HrBankTab({ userId, canEdit }: { userId: string | undefined; canEdit: boolean }) {
  const { data, isLoading, isError, error, refetch } = useUserBankProfile(userId)
  const saveContact = useSaveUserPersonalContact(userId)
  const addAccount = useAddUserBankAccount(userId)
  const saveLeaveTypes = useSaveUserLeaveTypes(userId)
  const [personalEmail, setPersonalEmail] = useState('')
  const [personalMobile, setPersonalMobile] = useState('')
  const [accountForm, setAccountForm] = useState({ label: '', bank: '', number: '', iban: '', bic: '' })
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [selectedLeaves, setSelectedLeaves] = useState<number[]>([])

  useEffect(() => {
    if (data) {
      setPersonalEmail(data.personalEmail)
      setPersonalMobile(data.personalMobile)
      setSelectedLeaves(data.assignedLeaves)
    }
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading HR & bank details…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load HR & bank details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const editable = canEdit && data.canEdit

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,1fr)] gap-5">
      <div className="space-y-5">
        <InfoCard icon={UserRound} title="Personal Contact" subtitle="Employee's personal contact details">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-faint">Personal email</label>
              <IconField
                icon={Mail}
                type="email"
                value={personalEmail}
                disabled={!editable}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="employee@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-text-faint">Personal mobile</label>
              <IconField
                icon={PhoneCall}
                type="tel"
                value={personalMobile}
                disabled={!editable}
                onChange={(e) => setPersonalMobile(e.target.value)}
                placeholder="Enter mobile number"
                className="mt-1"
              />
            </div>
            {editable && (
              <button
                type="button"
                disabled={saveContact.isPending}
                onClick={() => saveContact.mutate({ personal_email: personalEmail, personal_mobile: personalMobile })}
                className={primaryBtn}
              >
                {saveContact.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
              </button>
            )}
            {saveContact.isError && <p className="text-sm text-danger">{saveContact.error instanceof Error ? saveContact.error.message : 'Failed to save.'}</p>}
          </div>
        </InfoCard>

        <InfoCard
          icon={Landmark}
          title="Bank Accounts"
          subtitle="Manage bank accounts for salary payments"
          action={
            editable && (
              <button type="button" onClick={() => setShowAddAccount((s) => !s)} className={`${primaryBtn} shrink-0`}>
                <Plus size={13} /> Add Account
              </button>
            )
          }
        >
          {data.accounts.length === 0 && !showAddAccount ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-surface text-text-faint">
                <CreditCard size={22} />
              </span>
              <p className="text-sm font-medium text-text!">No bank accounts yet</p>
              <p className="text-xs text-text-faint">Add a bank account to enable salary payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium py-2 px-3">Label</th>
                    <th className="font-medium py-2 px-3">Bank</th>
                    <th className="font-medium py-2 px-3">Account Number</th>
                    <th className="font-medium py-2 px-3">IBAN</th>
                    <th className="font-medium py-2 px-3">BIC/SWIFT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-3 text-text!">{a.label}</td>
                      <td className="py-2 px-3 text-text-muted">{a.bank}</td>
                      <td className="py-2 px-3 text-text-muted">{a.number}</td>
                      <td className="py-2 px-3 text-text-muted">{a.iban}</td>
                      <td className="py-2 px-3 text-text-muted">{a.bic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {editable && showAddAccount && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
              {(['label', 'bank', 'number', 'iban', 'bic'] as const).map((key) => (
                <input
                  key={key}
                  placeholder={key === 'label' ? 'BAN Label' : key === 'number' ? 'Account Number' : key.toUpperCase()}
                  value={accountForm[key]}
                  onChange={(e) => setAccountForm((f) => ({ ...f, [key]: e.target.value }))}
                  className={inputCls}
                />
              ))}
              <button
                type="button"
                disabled={addAccount.isPending || !accountForm.label}
                onClick={() =>
                  addAccount.mutate(accountForm, {
                    onSuccess: () => {
                      setAccountForm({ label: '', bank: '', number: '', iban: '', bic: '' })
                      setShowAddAccount(false)
                    },
                  })
                }
                className={`${primaryBtn} sm:col-span-5 justify-center`}
              >
                {addAccount.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Account
              </button>
            </div>
          )}
        </InfoCard>
      </div>

      <div>
        <InfoCard icon={CalendarClock} title="Leave Types" subtitle="Assign holiday leave types for this employee. Salary templates and shifts are managed in the Payroll tab.">
          {data.leaveTypes.length === 0 ? (
            <p className="text-sm text-text-faint italic">No leave types configured.</p>
          ) : (
            <div>
              {selectedLeaves.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedLeaves.map((id) => {
                    const t = data.leaveTypes.find((lt) => lt.id === id)
                    if (!t) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2.5 py-1 text-xs">
                        {canEdit && (
                          <button
                            type="button"
                            title="Remove"
                            onClick={() => setSelectedLeaves((prev) => prev.filter((x) => x !== id))}
                            className="hover:opacity-70"
                          >
                            <X size={10} />
                          </button>
                        )}
                        {t.name} ({t.daysEntitled} days)
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="space-y-1">
                {data.leaveTypes.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      checked={selectedLeaves.includes(t.id)}
                      disabled={!canEdit}
                      onChange={(e) => setSelectedLeaves((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id)))}
                      className="rounded border-input-border"
                    />
                    {t.name} <span className="text-text-faint">({t.daysEntitled} days)</span>
                  </label>
                ))}
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={saveLeaveTypes.isPending || JSON.stringify([...selectedLeaves].sort()) === JSON.stringify([...data.assignedLeaves].sort())}
                  onClick={() => saveLeaveTypes.mutate(selectedLeaves)}
                  className={`${primaryBtn} mt-3`}
                >
                  {saveLeaveTypes.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Leave Types
                </button>
              )}
              {saveLeaveTypes.isError && (
                <p className="text-sm text-danger mt-1">{saveLeaveTypes.error instanceof Error ? saveLeaveTypes.error.message : 'Failed to save.'}</p>
              )}
            </div>
          )}
        </InfoCard>
      </div>
    </div>
  )
}

const ACTIVITY_SUBTABS = [
  { key: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { key: 'meetings', label: 'Meetings', icon: UsersRound },
  { key: 'calls', label: 'Calls', icon: PhoneCall },
  { key: 'timeline', label: 'Timeline', icon: History },
] as const
type ActivitySubtab = (typeof ACTIVITY_SUBTABS)[number]['key']

const SUBTAB_PROCESS: Record<Exclude<ActivitySubtab, 'timeline'>, ActivityProcessType> = { tasks: 'task', meetings: 'meeting', calls: 'calls' }
const PROCESS_LABEL: Record<ActivityProcessType, string> = { task: 'Task', meeting: 'Meeting', calls: 'Call' }
const PROCESS_ICON: Record<ActivityProcessType, ComponentType<{ size?: number; className?: string }>> = { task: CheckCircle2, meeting: UsersRound, calls: PhoneCall }

function resolveUserNames(csv: string, meta: ActivityMeta | undefined): string {
  const ids = (csv || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.length) return '—'
  const map = new Map((meta?.users ?? []).map((u) => [String(u.id), u.name]))
  return ids.map((id) => map.get(id) ?? `User #${id}`).join(', ')
}
function accountingNeedsLabel(value: string, meta: ActivityMeta | undefined): string {
  if (!value) return '—'
  return meta?.accountingNeeds.find((a) => a.value === value)?.label ?? value
}
// The reference's own datetime picker submits "YYYY-MM-DD HH:mm:ss"; native
// <input type="datetime-local"> uses "YYYY-MM-DDTHH:mm" — these convert
// between the two so real _raw values round-trip through the form.
function toDatetimeLocalInput(raw: string): string {
  return raw ? raw.replace(' ', 'T').slice(0, 16) : ''
}
function fromDatetimeLocalInput(val: string): string {
  return val ? `${val.replace('T', ' ')}:00` : ''
}

function activityToFormFields(a: ActivityItem): ActivityFormFields {
  return {
    processtype: a.processtype,
    subject: a.subject,
    description: a.description,
    priority: a.priority || 'normal',
    relatedto: a.relatedTo,
    industry: a.industry,
    fk_parent_id: a.fkParentId,
    assign_salesperson: a.assignSalesperson || '',
    duedate: a.dueDateRaw,
    startdate: a.startDateRaw,
    location: a.location,
    demo_given: a.demoGiven,
    demo_date: a.demoDateRaw,
    proposal_shared: a.proposalShared,
    proposal_date: a.proposalDateRaw,
    statusdescription: a.statusDescription,
    userremainder: a.userRemainder ? a.userRemainder.split(',').filter(Boolean) : [],
    participentsremainder: a.participantsRemainder ? a.participantsRemainder.split(',').filter(Boolean) : [],
    callstatus: a.callStatus,
    callpurpose: a.callPurpose,
    followup_type: a.followupType,
    lead_type: a.leadType,
    last_contact_date: a.lastContactDateRaw,
    agenda: a.agenda,
  }
}

// Real via userprofile/api/activities.php — see userDetailTabs.queries.ts's
// header comment on this section for how this endpoint was found (reading
// the reference page's own front-end JS, activities.js, which calls this
// instead of agenda.php) and how its full CRUD surface (create/detail/
// update/delete/schedule/close) was independently verified live before
// being wired here.
function ActivitiesTab({ userId }: { userId: string | undefined }) {
  const [subtab, setSubtab] = useState<ActivitySubtab>('tasks')
  const { data: meta } = useActivitiesMeta(userId)
  const listType: ActivitySubtabKey = subtab === 'timeline' ? 'tasks' : subtab
  const list = useActivities(userId, listType, subtab !== 'timeline')
  const timeline = useActivityTimeline(userId, subtab === 'timeline')
  const [request, setRequest] = useState<
    { kind: 'create'; processtype: ActivityProcessType } | { kind: 'panel'; activity: ActivityItem; initialPanel: 'view' | 'edit' | 'schedule' } | null
  >(null)

  const isLoading = subtab === 'timeline' ? timeline.isLoading : list.isLoading
  const isError = subtab === 'timeline' ? timeline.isError : list.isError
  const error = subtab === 'timeline' ? timeline.error : list.error
  const refetch = subtab === 'timeline' ? timeline.refetch : list.refetch

  if (isLoading) return <LegacyLoadingCard label="Loading activities…" />
  if (isError) return <LegacyErrorCard title="Couldn't load activities" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {ACTIVITY_SUBTABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSubtab(t.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                subtab === t.key ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        {subtab !== 'timeline' && (
          <button type="button" onClick={() => setRequest({ kind: 'create', processtype: SUBTAB_PROCESS[subtab] })} className={primaryBtn}>
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {subtab === 'timeline' ? (
        <ActivityTimelineView events={timeline.data ?? []} onSelect={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'view' })} />
      ) : (
        <ActivityTable
          open={list.data?.open ?? []}
          closed={list.data?.closed ?? []}
          meta={meta}
          onView={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'view' })}
          onEdit={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'edit' })}
          onSchedule={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'schedule' })}
        />
      )}

      {request?.kind === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRequest(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text!">Create {PROCESS_LABEL[request.processtype]}</h3>
              <button type="button" onClick={() => setRequest(null)} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <ActivityForm userId={userId} processtype={request.processtype} activity={null} onDone={() => setRequest(null)} />
            </div>
          </div>
        </div>
      )}

      {request?.kind === 'panel' && (
        <ActivityPanelModal userId={userId} activity={request.activity} initialPanel={request.initialPanel} onClose={() => setRequest(null)} />
      )}
    </div>
  )
}

function ActivityTable({
  open,
  closed,
  meta,
  onView,
  onEdit,
  onSchedule,
}: {
  open: ActivityItem[]
  closed: ActivityItem[]
  meta: ActivityMeta | undefined
  onView: (a: ActivityItem) => void
  onEdit: (a: ActivityItem) => void
  onSchedule: (a: ActivityItem) => void
}) {
  return (
    <>
      {([
        { label: 'Open', rows: open },
        { label: 'Close', rows: closed },
      ] as const).map(({ label, rows }) => (
        <div key={label}>
          <p className="flex items-center gap-2 text-sm font-semibold text-text! mb-2">
            <FolderOpen size={14} className="text-text-faint" /> {label} Activity <span className="text-text-faint">{rows.length}</span>
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
                  <th className="font-medium px-3 py-2">Subject</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Priority</th>
                  <th className="font-medium px-3 py-2">Accounting Needs</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-text-faint italic" colSpan={6}>
                      None
                    </td>
                  </tr>
                ) : (
                  rows.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <p className="text-text! font-medium">{a.subject}</p>
                        <p className="text-xs text-text-faint">{PROCESS_LABEL[a.processtype]}</p>
                      </td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{a.dueDate || a.startDate || '—'}</td>
                      <td className="px-3 py-2 text-text-muted capitalize">{a.priority || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{accountingNeedsLabel(a.relatedTo, meta)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            a.status === 'open' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'
                          }`}
                        >
                          {a.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => onView(a)} title="View" className="p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                            <Eye size={13} />
                          </button>
                          {a.status === 'open' && (
                            <>
                              <button type="button" onClick={() => onEdit(a)} title="Edit" className="p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                                <Pencil size={13} />
                              </button>
                              <button type="button" onClick={() => onSchedule(a)} title="Schedule" className="p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                                <CalendarPlus size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  )
}

// Chronological view, grouped by month — matches the reference's own
// Timeline sub-tab layout. The subject genuinely opens the same real
// ActivityPanelModal as the table's Eye icon, since the timeline call
// already returns every field for every row.
function ActivityTimelineView({ events, onSelect }: { events: ActivityItem[]; onSelect: (event: ActivityItem) => void }) {
  const monthGroups = new Map<string, Map<string, ActivityItem[]>>()
  for (const e of [...events].sort((a, b) => (b.dueDateRaw || b.createdDate).localeCompare(a.dueDateRaw || a.createdDate))) {
    const raw = e.dueDateRaw || e.createdDate
    const d = raw ? new Date(raw.replace(' ', 'T')) : null
    const valid = d && !isNaN(d.getTime())
    const monthKey = valid ? d!.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Unknown'
    const dateKey = valid ? d!.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }) : e.dueDate || e.createdDate || 'Unknown'
    if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, new Map())
    const dateGroup = monthGroups.get(monthKey)!
    if (!dateGroup.has(dateKey)) dateGroup.set(dateKey, [])
    dateGroup.get(dateKey)!.push(e)
  }

  if (events.length === 0) return <p className="text-sm text-text-faint italic py-6 text-center">No activity recorded.</p>

  return (
    <div className="space-y-6">
      {Array.from(monthGroups.entries()).map(([month, dateGroups]) => {
        const total = Array.from(dateGroups.values()).reduce((sum, rows) => sum + rows.length, 0)
        return (
          <div key={month} className="relative pl-5 border-l-2 border-border space-y-4">
            <div className="flex items-center gap-2 -ml-[27px]">
              <span className="w-3.5 h-3.5 rounded-full bg-brand shrink-0" />
              <span className="text-sm font-semibold text-text!">{month}</span>
              <span className="rounded-full bg-neutral-bg text-neutral-fg text-xs px-2 py-0.5">{total} Entries</span>
            </div>
            {Array.from(dateGroups.entries()).map(([date, rows]) => (
              <div key={date} className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-brand text-white text-xs font-medium px-2.5 py-1">
                  <Clock size={11} /> {date}
                </span>
                <div className="flex flex-wrap gap-3">
                  {rows.map((e) => (
                    <div key={e.id} className="rounded-lg border border-border bg-surface p-3 w-full sm:w-64">
                      <p className="flex items-center gap-1.5 text-xs text-text-faint">
                        <Clock size={11} /> {PROCESS_LABEL[e.processtype].toLowerCase()}
                      </p>
                      <button type="button" onClick={() => onSelect(e)} className="block text-sm text-brand font-medium mt-1 text-left hover:underline">
                        {e.subject}
                      </button>
                      {e.description && <p className="text-xs text-text-faint mt-1 line-clamp-2">{e.description}</p>}
                      {e.creatorName && <p className="text-xs text-text-faint mt-1">- {e.creatorName}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function FormRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-xs text-text-faint">{label}</span>
      {children}
    </label>
  )
}

interface FormFieldsProps {
  values: ActivityFormFields
  onChange: (patch: Partial<ActivityFormFields>) => void
  meta: ActivityMeta | undefined
  mode: 'create' | 'edit'
}

function TaskFormFields({ values, onChange, meta, mode }: FormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Subject *">
          <input value={values.subject ?? ''} onChange={(e) => onChange({ subject: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Date *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.duedate ?? '')}
            onChange={(e) => onChange({ duedate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="Priority">
          <select value={values.priority ?? 'normal'} onChange={(e) => onChange({ priority: e.target.value })} className={`${inputCls} capitalize`}>
            {(meta?.priorities ?? ['normal']).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Accounting Needs">
          <select value={values.relatedto ?? ''} onChange={(e) => onChange({ relatedto: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.accountingNeeds ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Company">
          <input value={values.industry ?? ''} onChange={(e) => onChange({ industry: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Belongs To">
          <select value={String(values.fk_parent_id ?? 0)} onChange={(e) => onChange({ fk_parent_id: e.target.value })} className={inputCls}>
            <option value="0">None (Main Action)</option>
            {(meta?.parents ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.subject}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <FormRow label="Assigned Sales Person" className="sm:w-1/3">
        <select value={String(values.assign_salesperson ?? '')} onChange={(e) => onChange({ assign_salesperson: e.target.value })} className={inputCls}>
          <option value="">—</option>
          {(meta?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Notes">
        <textarea rows={2} value={values.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} className={`${inputCls} resize-y`} />
      </FormRow>
      {mode === 'create' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border px-3 py-2 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <input type="checkbox" checked={!!values.reminder} onChange={(e) => onChange({ reminder: e.target.checked })} /> <Bell size={12} /> Reminder
            </label>
            <input
              type="datetime-local"
              disabled={!values.reminder}
              value={toDatetimeLocalInput(values.remtime ?? '')}
              onChange={(e) => onChange({ remtime: fromDatetimeLocalInput(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div className="rounded-md border border-border px-3 py-2 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <input type="checkbox" checked={!!values.repeatp} onChange={(e) => onChange({ repeatp: e.target.checked })} /> <Repeat size={12} /> Repeat
            </label>
            <input
              type="datetime-local"
              disabled={!values.repeatp}
              value={toDatetimeLocalInput(values.reptime ?? '')}
              onChange={(e) => onChange({ reptime: fromDatetimeLocalInput(e.target.value) })}
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MeetingFormFields({ values, onChange, meta, mode }: FormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Subject *">
          <input value={values.subject ?? ''} onChange={(e) => onChange({ subject: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Location">
          <input value={values.location ?? ''} onChange={(e) => onChange({ location: e.target.value })} className={inputCls} />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Belongs To">
          <select value={String(values.fk_parent_id ?? 0)} onChange={(e) => onChange({ fk_parent_id: e.target.value })} className={inputCls}>
            <option value="0">None (Main Action)</option>
            {(meta?.parents ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.subject}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="From Date *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.startdate ?? '')}
            onChange={(e) => onChange({ startdate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="To Date *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.duedate ?? '')}
            onChange={(e) => onChange({ duedate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Demo Given">
          <select value={values.demo_given ?? ''} onChange={(e) => onChange({ demo_given: e.target.value })} className={inputCls}>
            <option value="">—</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </FormRow>
        <FormRow label="Demo Date">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.demo_date ?? '')}
            onChange={(e) => onChange({ demo_date: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Host">
          <select
            multiple
            value={values.userremainder ?? []}
            onChange={(e) => onChange({ userremainder: Array.from(e.target.selectedOptions).map((o) => o.value) })}
            className={`${inputCls} h-20`}
          >
            {(meta?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Participants">
          <select
            multiple
            value={values.participentsremainder ?? []}
            onChange={(e) => onChange({ participentsremainder: Array.from(e.target.selectedOptions).map((o) => o.value) })}
            className={`${inputCls} h-20`}
          >
            {(meta?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Accounting Needs">
          <select value={values.relatedto ?? ''} onChange={(e) => onChange({ relatedto: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.accountingNeeds ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Proposal Shared">
          <select value={values.proposal_shared ?? ''} onChange={(e) => onChange({ proposal_shared: e.target.value })} className={inputCls}>
            <option value="">—</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </FormRow>
        <FormRow label="Proposal Date">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.proposal_date ?? '')}
            onChange={(e) => onChange({ proposal_date: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <FormRow label="Clients Objection">
        <textarea rows={2} value={values.statusdescription ?? ''} onChange={(e) => onChange({ statusdescription: e.target.value })} className={`${inputCls} resize-y`} />
      </FormRow>
      <FormRow label="Proposal Followup">
        <textarea rows={2} value={values.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} className={`${inputCls} resize-y`} />
      </FormRow>
      {mode === 'create' && (
        <div className="rounded-md border border-border px-3 py-2 space-y-1.5 sm:w-1/2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <input type="checkbox" checked={!!values.reminder} onChange={(e) => onChange({ reminder: e.target.checked })} /> <Bell size={12} /> Reminder
          </label>
          <input
            type="datetime-local"
            disabled={!values.reminder}
            value={toDatetimeLocalInput(values.remtime ?? '')}
            onChange={(e) => onChange({ remtime: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </div>
      )}
    </div>
  )
}

function CallFormFields({ values, onChange, meta, mode }: FormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Subject *">
          <input value={values.subject ?? ''} onChange={(e) => onChange({ subject: e.target.value })} className={inputCls} />
        </FormRow>
        <FormRow label="Belongs To">
          <select value={String(values.fk_parent_id ?? 0)} onChange={(e) => onChange({ fk_parent_id: e.target.value })} className={inputCls}>
            <option value="0">None (Main Action)</option>
            {(meta?.parents ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.subject}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Accounting Needs">
          <select value={values.relatedto ?? ''} onChange={(e) => onChange({ relatedto: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.accountingNeeds ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Call Type">
          <select value={values.callstatus ?? ''} onChange={(e) => onChange({ callstatus: e.target.value })} className={`${inputCls} capitalize`}>
            {(meta?.callStatuses ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Follow Up Type">
          <select value={values.followup_type ?? ''} onChange={(e) => onChange({ followup_type: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {Object.entries(meta?.followupTypes ?? {}).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FormRow label="Lead Type">
          <select value={values.lead_type ?? ''} onChange={(e) => onChange({ lead_type: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.leadTypes ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Assigned Sales Person">
          <select value={String(values.assign_salesperson ?? '')} onChange={(e) => onChange({ assign_salesperson: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {(meta?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Call Start Time *">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.duedate ?? '')}
            onChange={(e) => onChange({ duedate: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Last Contact Date">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.last_contact_date ?? '')}
            onChange={(e) => onChange({ last_contact_date: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
        <FormRow label="Call Purpose">
          <select value={values.callpurpose ?? ''} onChange={(e) => onChange({ callpurpose: e.target.value })} className={`${inputCls} capitalize`}>
            {(meta?.callPurposes ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
      <FormRow label="Call Agenda">
        <input value={values.agenda ?? ''} onChange={(e) => onChange({ agenda: e.target.value })} className={inputCls} />
      </FormRow>
      {mode === 'create' && (
        <FormRow label="Reminder" className="sm:w-1/2">
          <input
            type="datetime-local"
            value={toDatetimeLocalInput(values.remtime ?? '')}
            onChange={(e) => onChange({ remtime: fromDatetimeLocalInput(e.target.value) })}
            className={inputCls}
          />
        </FormRow>
      )}
    </div>
  )
}

function ActivityFormRenderer({ processtype, ...rest }: FormFieldsProps & { processtype: ActivityProcessType }) {
  if (processtype === 'meeting') return <MeetingFormFields {...rest} />
  if (processtype === 'calls') return <CallFormFields {...rest} />
  return <TaskFormFields {...rest} />
}

// Shared create+edit form — real create (POST) / update (PUT) / delete
// (DELETE), all against userprofile/api/activities.php and all confirmed
// live (create → detail → update → detail → delete → detail-now-404).
function ActivityForm({
  userId,
  processtype,
  activity,
  onDone,
}: {
  userId: string | undefined
  processtype: ActivityProcessType
  activity: ActivityItem | null
  onDone: () => void
}) {
  const { data: meta } = useActivitiesMeta(userId)
  const create = useCreateActivity(userId)
  const update = useUpdateActivity(userId)
  const del = useDeleteActivity(userId)
  const [values, setValues] = useState<ActivityFormFields>(() => (activity ? activityToFormFields(activity) : { processtype }))
  const patch = (p: Partial<ActivityFormFields>) => setValues((v) => ({ ...v, ...p }))
  const mutation = activity ? update : create

  const submit = () => {
    if (activity) update.mutate({ activityId: activity.id, fields: values }, { onSuccess: onDone })
    else create.mutate(values, { onSuccess: onDone })
  }

  return (
    <div className="space-y-4">
      <ActivityFormRenderer processtype={processtype} values={values} onChange={patch} meta={meta} mode={activity ? 'edit' : 'create'} />
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        {activity && activity.status === 'open' && (
          <button
            type="button"
            disabled={del.isPending}
            onClick={() => {
              if (window.confirm('Delete this activity?')) del.mutate(activity.id, { onSuccess: onDone })
            }}
            className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-danger/30 text-danger px-3 py-1.5 text-sm font-medium hover:bg-danger-bg disabled:opacity-50"
          >
            {del.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
          </button>
        )}
        <button type="button" disabled={mutation.isPending || !values.subject} onClick={submit} className={primaryBtn}>
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}{' '}
          {activity ? `Update ${PROCESS_LABEL[processtype]}` : `Create ${PROCESS_LABEL[processtype]}`}
        </button>
      </div>
      {(mutation.isError || del.isError) && (
        <p className="text-sm text-danger">{((mutation.error ?? del.error) as Error | null)?.message ?? 'Failed to save.'}</p>
      )}
    </div>
  )
}

// Read-only "Details" panel — matches the reference's own field set per
// process type exactly (see activities.js's buildDetailView).
function ActivityDetailView({
  activity: a,
  meta,
  onGoto,
  userId,
  onClose,
}: {
  activity: ActivityItem
  meta: ActivityMeta | undefined
  onGoto: (panel: 'schedule' | 'edit') => void
  userId: string | undefined
  onClose: () => void
}) {
  const close = useCloseActivity(userId)
  const isOpen = a.status === 'open'
  const rows: Array<[string, string]> = [
    ['Status', isOpen ? 'Open' : 'Closed'],
    ['Created', a.createdDate || '—'],
    ['Accounting Needs', accountingNeedsLabel(a.relatedTo, meta)],
    ['Assigned Sales', a.assignSalespersonName || (a.assignSalesperson ? resolveUserNames(String(a.assignSalesperson), meta) : '—')],
  ]
  if (a.processtype === 'task') {
    rows.push(['Due Date', a.dueDate || '—'], ['Priority', a.priority || '—'], ['Company', a.industry || '—'], ['Reminder', a.reminder ? `Yes — ${a.remtime}` : 'No'])
  } else if (a.processtype === 'meeting') {
    rows.push(
      ['Location', a.location || '—'],
      ['From', a.startDate || '—'],
      ['To', a.dueDate || '—'],
      ['Host', resolveUserNames(a.userRemainder, meta)],
      ['Participants', resolveUserNames(a.participantsRemainder, meta)],
      ['Demo Given', a.demoGiven === '1' ? 'Yes' : a.demoGiven === '0' ? 'No' : '—'],
      ['Demo Date', a.demoDate || '—'],
      ['Proposal Shared', a.proposalShared === '1' ? 'Yes' : a.proposalShared === '0' ? 'No' : '—'],
      ['Proposal Date', a.proposalDate || '—'],
      ['Lead Outcome', a.statusCode || '—'],
      ['Loss Reason', a.lossReason || '—'],
    )
  } else {
    rows.push(
      ['Call Start', a.dueDate || '—'],
      ['Call Type', a.callStatus || '—'],
      ['Call Purpose', a.callPurpose || '—'],
      ['Follow-up Type', (meta?.followupTypes ?? {})[a.followupType] ?? (a.followupType || '—')],
      ['Lead Type', a.leadType || '—'],
      ['Last Contact', a.lastContactDate || '—'],
      ['Agenda', a.agenda || '—'],
    )
  }
  const notes = a.description || a.statusDescription

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        {rows.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </div>
      {notes && (
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs text-text-faint uppercase tracking-wide mb-1">Notes / Description</p>
          <p className="text-sm text-text! whitespace-pre-wrap">{notes}</p>
        </div>
      )}
      {isOpen && (
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => onGoto('schedule')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover"
          >
            <CalendarPlus size={13} /> Schedule
          </button>
          <button
            type="button"
            onClick={() => onGoto('edit')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover"
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            type="button"
            disabled={close.isPending}
            onClick={() => close.mutate({ activityId: a.id, processtype: a.processtype, description: a.description }, { onSuccess: onClose })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success text-white hover:bg-success-hover px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {close.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Close
          </button>
        </div>
      )}
      {close.isError && <p className="text-sm text-danger">{close.error instanceof Error ? close.error.message : 'Failed to close.'}</p>}
    </div>
  )
}

// Real reschedule/follow-up form — POST action=schedule — plus a quick
// "Close Activity" action (POST action=close), matching the reference's
// own buildScheduleForm exactly (see activities.js).
function ActivityScheduleForm({ userId, activity, onDone }: { userId: string | undefined; activity: ActivityItem; onDone: () => void }) {
  const schedule = useScheduleActivity(userId)
  const close = useCloseActivity(userId)
  const [scheduleAt, setScheduleAt] = useState(toDatetimeLocalInput(activity.dueDateRaw || activity.startDateRaw))
  const [reminder, setReminder] = useState(activity.reminder)
  const [remtime, setRemtime] = useState(toDatetimeLocalInput(activity.remtimeRaw))
  const [description, setDescription] = useState('')
  const [statusCode, setStatusCode] = useState(activity.statusCode)
  const [lossReason, setLossReason] = useState(activity.lossReason)
  const [statusDescription, setStatusDescription] = useState(activity.statusDescription)
  const [demoDate, setDemoDate] = useState(toDatetimeLocalInput(activity.demoDateRaw))
  const [proposalDate, setProposalDate] = useState(toDatetimeLocalInput(activity.proposalDateRaw))
  const [lastContactDate, setLastContactDate] = useState(toDatetimeLocalInput(activity.lastContactDateRaw))

  const submit = () => {
    if (!description.trim()) return
    schedule.mutate(
      {
        activityId: activity.id,
        fields: {
          processtype: activity.processtype,
          description,
          schedule_at: fromDatetimeLocalInput(scheduleAt),
          reminder,
          remtime: fromDatetimeLocalInput(remtime),
          status_code: statusCode,
          loss_reason: lossReason,
          statusdescription: statusDescription,
          demo_date: fromDatetimeLocalInput(demoDate),
          proposal_date: fromDatetimeLocalInput(proposalDate),
          last_contact_date: fromDatetimeLocalInput(lastContactDate),
        },
      },
      { onSuccess: onDone },
    )
  }
  const closeNow = () => {
    close.mutate({ activityId: activity.id, processtype: activity.processtype, description: statusDescription || description }, { onSuccess: onDone })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">Reschedule or add a follow-up for this {PROCESS_LABEL[activity.processtype].toLowerCase()}.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormRow label="Schedule Date & Time">
          <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={inputCls} />
        </FormRow>
        <div className="rounded-md border border-border px-3 py-2 space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} /> Set reminder
          </label>
          <input type="datetime-local" disabled={!reminder} value={remtime} onChange={(e) => setRemtime(e.target.value)} className={inputCls} />
        </div>
      </div>
      <FormRow label="Follow-up Notes *">
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} resize-y`} />
      </FormRow>
      {activity.processtype === 'meeting' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <FormRow label="Lead Outcome (1=Won,2=Loss,3=Dropped)">
            <input value={statusCode} onChange={(e) => setStatusCode(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Reason For Loss">
            <input value={lossReason} onChange={(e) => setLossReason(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Demo Date">
            <input type="datetime-local" value={demoDate} onChange={(e) => setDemoDate(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Proposal Date">
            <input type="datetime-local" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} className={inputCls} />
          </FormRow>
          <FormRow label="Client Objection" className="sm:col-span-2">
            <textarea rows={2} value={statusDescription} onChange={(e) => setStatusDescription(e.target.value)} className={`${inputCls} resize-y`} />
          </FormRow>
        </div>
      )}
      {activity.processtype === 'calls' && (
        <FormRow label="Last Contact Date">
          <input type="datetime-local" value={lastContactDate} onChange={(e) => setLastContactDate(e.target.value)} className={inputCls} />
        </FormRow>
      )}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <button
          type="button"
          disabled={close.isPending}
          onClick={closeNow}
          className="inline-flex items-center gap-1.5 rounded-lg bg-success text-white hover:bg-success-hover px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {close.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Close Activity
        </button>
        <button type="button" disabled={schedule.isPending || !description.trim()} onClick={submit} className={primaryBtn}>
          {schedule.isPending ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />} Save Schedule
        </button>
      </div>
      {(schedule.isError || close.isError) && (
        <p className="text-sm text-danger">{((schedule.error ?? close.error) as Error | null)?.message ?? 'Failed.'}</p>
      )}
    </div>
  )
}

// Unified View/Schedule/Edit panel for one activity — mirrors the
// reference's own offcanvas tabs (activities.js's panelTabs/renderActivityPanel).
function ActivityPanelModal({
  userId,
  activity,
  initialPanel,
  onClose,
}: {
  userId: string | undefined
  activity: ActivityItem
  initialPanel: 'view' | 'edit' | 'schedule'
  onClose: () => void
}) {
  const { data: meta } = useActivitiesMeta(userId)
  const [panel, setPanel] = useState<'view' | 'edit' | 'schedule'>(initialPanel)
  const isOpen = activity.status === 'open'
  const Icon = PROCESS_ICON[activity.processtype]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-text-faint uppercase tracking-wide">
                {PROCESS_LABEL[activity.processtype]} · #{activity.id}
              </p>
              <h3 className="text-sm font-semibold text-text!">{activity.subject}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 mt-3 border-b border-border">
          <button
            type="button"
            onClick={() => setPanel('view')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 ${panel === 'view' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            Details
          </button>
          {isOpen && (
            <button
              type="button"
              onClick={() => setPanel('schedule')}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 ${panel === 'schedule' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              Schedule
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel('edit')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 ${panel === 'edit' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            Edit
          </button>
        </div>

        <div className="px-5 py-4">
          {panel === 'view' && <ActivityDetailView activity={activity} meta={meta} onGoto={setPanel} userId={userId} onClose={onClose} />}
          {panel === 'schedule' && <ActivityScheduleForm userId={userId} activity={activity} onDone={onClose} />}
          {panel === 'edit' && <ActivityForm userId={userId} processtype={activity.processtype} activity={activity} onDone={onClose} />}
        </div>
      </div>
    </div>
  )
}

// Real via userprofile/api/notes.php.
function NotesTab({ userId }: { userId: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useUserNotes(userId)
  const save = useSaveUserNotes(userId)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (data) setValue(data.note)
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        disabled={!data.can_edit}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        placeholder="No note recorded."
        className={`${inputCls} resize-y`}
      />
      {data.can_edit && (
        <button type="button" disabled={save.isPending} onClick={() => save.mutate(value)} className={primaryBtn}>
          {save.isPending && <Loader2 size={13} className="animate-spin" />} Save
        </button>
      )}
      {save.isError && <p className="text-sm text-danger">{save.error instanceof Error ? save.error.message : 'Failed to save note.'}</p>}
      {save.isSuccess && <p className="text-sm text-success-fg">Note saved.</p>}
    </div>
  )
}

// Real via userprofile/api/documents.php — lists actual files under this
// user's dol_dir_list() output directory, real upload/delete.
function DocumentsTab({ userId }: { userId: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useUserDocuments(userId)
  const upload = useUploadUserDocument(userId)
  const del = useDeleteUserDocument(userId)

  if (isLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      {data.canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload.mutate(file)
              e.target.value = ''
            }}
            className="text-sm text-text-muted"
          />
          {upload.isPending && (
            <span className="flex items-center gap-1 text-xs text-text-faint">
              <Loader2 size={12} className="animate-spin" /> Uploading…
            </span>
          )}
        </div>
      )}
      {upload.isError && <p className="text-sm text-danger">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
              <th className="font-medium px-3 py-2">Name</th>
              <th className="font-medium px-3 py-2">Size</th>
              <th className="font-medium px-3 py-2">Date</th>
              <th className="font-medium px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {data.documents.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-text-faint italic" colSpan={4}>
                  No documents uploaded.
                </td>
              </tr>
            ) : (
              data.documents.map((d) => (
                <tr key={d.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text!">{d.name}</td>
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{d.size}</td>
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{d.date}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <a href={d.downloadUrl} target="_blank" rel="noreferrer" title="Download" className="text-text-faint hover:text-brand">
                        <Download size={14} />
                      </a>
                      {data.canEdit && (
                        <button type="button" title="Delete" onClick={() => del.mutate(d.name)} disabled={del.isPending} className="text-text-faint hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Real via userprofile/api/agenda.php — full event list plus real create.
function AgendaTab({ userId, canEdit }: { userId: string | undefined; canEdit: boolean }) {
  const { data: events, isLoading, isError, error, refetch } = useUserAgenda(userId)
  const create = useCreateUserAgendaEvent(userId)
  const [form, setForm] = useState({ label: '', date: '', date_end: '', note: '' })

  if (isLoading) return <LegacyLoadingCard label="Loading agenda…" />
  if (isError || !events) return <LegacyErrorCard title="Couldn't load agenda" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="border border-border rounded-lg p-3 space-y-2">
          <p className="font-semibold text-text! text-sm">Add Event</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={inputCls} />
            <input type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
            <input type="datetime-local" value={form.date_end} onChange={(e) => setForm((f) => ({ ...f, date_end: e.target.value }))} className={inputCls} />
            <input placeholder="Note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className={inputCls} />
          </div>
          <button
            type="button"
            disabled={create.isPending || !form.label || !form.date}
            onClick={() =>
              create.mutate(form, {
                onSuccess: () => setForm({ label: '', date: '', date_end: '', note: '' }),
              })
            }
            className={primaryBtn}
          >
            {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Event
          </button>
          {create.isError && <p className="text-sm text-danger">{create.error instanceof Error ? create.error.message : 'Failed to create event.'}</p>}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
              <th className="font-medium px-3 py-2">Label</th>
              <th className="font-medium px-3 py-2">Date</th>
              <th className="font-medium px-3 py-2">Note</th>
              <th className="font-medium px-3 py-2">Progress</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-text-faint italic" colSpan={4}>
                  No events recorded.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text!">{e.label}</td>
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{e.date}</td>
                  <td className="px-3 py-2 text-text-muted">{e.note || '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{e.percent}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Real via userprofile/api/notify.php — llx_notify_def rows for this user.
function NotificationsTab({ userId }: { userId: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useUserNotifications(userId)
  const add = useAddUserNotification(userId)
  const del = useDeleteUserNotification(userId)
  const [selected, setSelected] = useState<number | ''>('')

  if (isLoading) return <LegacyLoadingCard label="Loading notifications…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notifications" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start gap-2 text-text-muted">
        <Bell size={15} className="text-text-faint shrink-0 mt-0.5" />
        <p>Email notifications sent automatically for Ecuenta events this user is subscribed to.</p>
      </div>

      {data.canEdit && (
        <div>
          <p className="font-semibold text-text! mb-2 pb-1.5 border-b border-border">Subscribe to a new event</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selected} onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : '')} className={`${inputCls} max-w-xs`}>
              <option value="">Select event…</option>
              {data.available.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selected || add.isPending}
              onClick={() => {
                if (selected) add.mutate(selected, { onSuccess: () => setSelected('') })
              }}
              className={primaryBtn}
            >
              {add.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
            </button>
          </div>
          {add.isError && <p className="text-sm text-danger mt-1">{add.error instanceof Error ? add.error.message : 'Failed to add.'}</p>}
        </div>
      )}

      <div>
        <p className="font-semibold text-text! mb-2 pb-1.5 border-b border-border">Active subscriptions ({data.assigned.length})</p>
        {data.assigned.length === 0 ? (
          <p className="text-text-faint italic">None</p>
        ) : (
          <div className="space-y-1">
            {data.assigned.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
                <span className="text-text!">{a.label}</span>
                {data.canEdit && (
                  <button type="button" title="Remove" onClick={() => del.mutate(a.id)} disabled={del.isPending} className="text-text-faint hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const WIZARD_STEPS = ['Shift', 'Template', 'Calculate', 'History'] as const

// Disabled quick-action pill — for actions this backend genuinely has
// (payroll_v2/api/shift.php's swap/override/history verbs) but that return
// a blanket "Permission denied." for every account and every action on this
// install (confirmed live, including deliberately bogus action names,
// proving the check fires before any real handler runs) — real feature,
// unreachable rights, so honestly disabled rather than guessed at.
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

// The "Payroll V2 Setup Wizard" mockup this tab is modeled on maps to a
// real, already-installed `payroll_v2` module (confirmed live: its own
// CSS/JS load app-wide, and /payroll_v2/api/payrun.php?action=list returns
// genuine JSON), but every page and every API action under it returns a
// blanket "Permission denied." for this account, and the module has no
// visible rights entry on the standard user/perms.php or admin/modules.php
// pages to grant it from — so "Create New Shift" and wizard steps 2-4
// (Template/Calculate/History) can't be wired for real without guessing at
// an unconfirmed field contract. What IS real and wired here: shift
// assignment (pick 1-2 shifts + weekly/monthly/periodic rotation) and the
// system-wide shift roster both live on user/salarydetails.php's own real
// form — the exact same page (and the exact same live-verified
// full-fidelity FormData technique) as this tab's Leave Types fix in
// HrBankTab. See useSaveUserShiftAssignment's comment for the live
// round-trip verification.
function PayrollTab({ userId, detail }: { userId: string | undefined; detail: ReturnType<typeof useUserDetail>['detail'] }) {
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

function LdapTab({ user }: { user: NonNullable<ReturnType<typeof useUser>['user']> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Database size={16} className="text-brand" />
        <h3 className="font-semibold text-text!">LDAP Account</h3>
      </div>
      <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
        <Field label="Username" value={user.login} />
        <Field label="Email Address" value={user.email} />
        <ReadOnlyNote>LDAP connection and synchronization controls are not exposed by the current user-profile API.</ReadOnlyNote>
      </div>
    </div>
  )
}

function ClickToDialTab({ user, detail }: { user: NonNullable<ReturnType<typeof useUser>['user']>; detail: ReturnType<typeof useUserDetail>['detail'] }) {
  const phone = detail?.mobile || user.phone
  const officePhone = detail?.officePhone || ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <PhoneCall size={16} className="text-brand" />
        <h3 className="font-semibold text-text!">Click To Dial</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['Mobile', phone], ['Office Phone', officePhone]].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <p className="text-xs text-text-faint">{label}</p>
            {value ? (
              <a href={`tel:${value}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
                <PhoneCall size={14} /> {value}
              </a>
            ) : <p className="mt-1 text-sm text-text-faint">No phone number recorded.</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, isLoading, isError, error } = useUser(id)
  const { detail } = useUserDetail(id)
  const toggleStatus = useToggleUserStatus(id)
  const [tab, setTab] = useState<Tab>('Overview')
  const [permModule, setPermModule] = useState<string | null>(null)

  // "<zip> <town>, <country> - <state>" — countryLabel/stateLabel aren't
  // part of userprofile/api/user.php's response (bare numeric ids only), so
  // this reduces to whatever of zip/town is present, same honesty
  // convention as the rest of this file.
  const locationLabel = detail ? [detail.zip, detail.town].filter(Boolean).join(' ') : ''

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    )
  }

  if (isError && isBackendUnavailable(error)) {
    return (
      <div className="-m-6 flex-1 flex flex-col items-center justify-center gap-3">
        <BackendUnavailableCard feature="User details" />
        <Link to={ROUTES.usersDashboard} className="text-sm text-brand hover:underline">
          Back to Users list
        </Link>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="-m-6 flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-muted">No user found for id "{id}".</p>
        <Link to={ROUTES.usersDashboard} className="text-sm text-brand hover:underline">
          Back to Users list
        </Link>
      </div>
    )
  }

  const securityLevel = user.isAdmin ? 'Administrator' : 'Standard User'
  const enabled = detail?.enabled ?? user.status === 'Enabled'

  // Real vCard generated entirely client-side from this user's already-real
  // data (no backend endpoint needed for this one — it's a pure export of
  // data already on the page) rather than the disabled "Edit" pencil above,
  // which does need one that doesn't exist yet.
  function handleDownloadVCard() {
    if (!user) return
    const name = user.name || user.login
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `N:${name};;;;`,
      user.designation && `TITLE:${user.designation}`,
      user.email && `EMAIL:${user.email}`,
      (detail?.mobile || user.phone) && `TEL;TYPE=CELL:${detail?.mobile || user.phone}`,
      detail?.officePhone && `TEL;TYPE=WORK:${detail.officePhone}`,
      'END:VCARD',
    ].filter(Boolean)
    const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '_')}.vcf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center gap-4">
          <Link to={ROUTES.usersDashboard} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
            <ChevronLeft size={18} /> Users
          </Link>
          <span className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-text!">
            <UserRound size={16} className="text-brand" /> User Details
          </span>
        </div>
        <Link to={ROUTES.usersDashboard} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
        {/* Horizontal header: identity + badges + info strip + action icons */}
        <Card className="!h-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar name={user.name || user.login} size={64} className="text-lg" />
                <span
                  title={enabled ? 'Enabled' : 'Disabled'}
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface-alt ${enabled ? 'bg-success-fg' : 'bg-neutral-fg'}`}
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-text! text-xl">{user.name || user.login}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${enabled ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                    {enabled ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {user.isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning-bg text-warning-fg">
                      <Crown size={11} /> Admin
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand">{user.employee ? 'Employee' : 'Non-Employee'}</span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-text-muted">
                  {user.designation && <span>{user.designation}</span>}
                  {user.designation && <span className="text-text-faint">·</span>}
                  <span>@{user.login}</span>
                  {user.email && (
                    <>
                      <span className="text-text-faint">·</span>
                      <a href={`mailto:${user.email}`} className="text-brand hover:underline">
                        {user.email}
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href={detail?.actions.canEmail ? detail.urls.email : undefined}
                title={detail?.actions.canEmail ? 'Send by email' : 'No email on file'}
                aria-disabled={!detail?.actions.canEmail}
                className={`p-2 rounded-lg border border-border ${detail?.actions.canEmail ? 'text-text-faint hover:bg-surface-hover hover:text-brand' : 'text-text-faint/50 pointer-events-none'}`}
              >
                <Mail size={16} />
              </a>
              <a
                href={detail?.actions.canWhatsapp ? detail.urls.whatsapp : undefined}
                target="_blank"
                rel="noreferrer"
                title={detail?.actions.canWhatsapp ? 'Message on WhatsApp' : 'No WhatsApp number on file'}
                className={`p-2 rounded-lg border border-border ${detail?.actions.canWhatsapp ? 'text-text-faint hover:bg-surface-hover hover:text-brand' : 'text-text-faint/50 pointer-events-none'}`}
              >
                <MessageCircle size={16} />
              </a>
              <span
                title="Editing basic profile fields isn't available in this app yet."
                className="p-2 rounded-lg border border-border text-text-faint/50 cursor-not-allowed"
              >
                <Pencil size={16} />
              </span>
              <button
                type="button"
                title="Download vCard"
                onClick={handleDownloadVCard}
                className="p-2 rounded-lg border border-border text-text-faint hover:bg-surface-hover hover:text-brand"
              >
                <IdCard size={16} />
              </button>
              {detail?.actions.canDisable && (
                <button
                  type="button"
                  title="Disable this user"
                  disabled={toggleStatus.isPending}
                  onClick={() => toggleStatus.mutate('disable')}
                  className="p-2 rounded-lg border border-border text-text-faint hover:bg-surface-hover hover:text-danger"
                >
                  {toggleStatus.isPending ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                </button>
              )}
              {detail?.actions.canEnable && (
                <button
                  type="button"
                  title="Enable this user"
                  disabled={toggleStatus.isPending}
                  onClick={() => toggleStatus.mutate('enable')}
                  className="p-2 rounded-lg border border-border text-text-faint hover:bg-surface-hover hover:text-success-fg"
                >
                  {toggleStatus.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                </button>
              )}
            </div>
          </div>
          {toggleStatus.isError && <p className="text-sm text-danger mt-2">{toggleStatus.error instanceof Error ? toggleStatus.error.message : 'Failed to update status.'}</p>}

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                <IdCard size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Employee ID</p>
                <p className="text-sm text-text! font-bold">#{user.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                <ShieldCheck size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Security Level</p>
                <p className="text-sm text-text! font-bold truncate">{securityLevel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-success-bg text-success-fg shrink-0">
                <Phone size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Mobile</p>
                <p className="text-sm text-text! font-bold truncate">{detail?.mobile || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-danger-bg text-danger-fg shrink-0">
                <MapPin size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Location</p>
                <p className="text-sm text-text! font-bold truncate">{locationLabel || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Status</p>
                <p className={`flex items-center gap-1.5 text-sm font-bold ${enabled ? 'text-success-fg' : 'text-text!'}`}>
                  {enabled ? 'Active' : 'Inactive'}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${enabled ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                    {enabled ? 'OK' : 'Off'}
                  </span>
                </p>
              </div>
              <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ml-auto ${enabled ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                <CheckCircle2 size={16} />
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand/10 text-brand shrink-0">
                <ShieldCheck size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Rights</p>
                <p className="text-sm text-text! font-bold">{detail?.nbRights ?? '—'}</p>
                <button type="button" onClick={() => setTab('Permissions')} className="flex items-center gap-0.5 text-[10px] text-brand hover:underline">
                  View permissions <ChevronRight size={10} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                <UsersRound size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Groups</p>
                <p className="text-sm text-text! font-bold">{detail?.groups.length ?? '—'}</p>
                <button type="button" onClick={() => setTab('Overview')} className="flex items-center gap-0.5 text-[10px] text-brand hover:underline">
                  View groups <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-4 -mx-4 px-4">
            <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden">
              {TABS.map((t) => {
                const Icon = TAB_ICONS[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" /> {t}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'Overview' && <OverviewTab user={user} detail={detail} />}
        {tab === 'Permissions' && <PermissionsTab userId={id} permModule={permModule} setPermModule={setPermModule} hasGroups={(detail?.groups.length ?? 0) > 0} />}
        {tab === 'HR & Bank' && <HrBankTab userId={id} canEdit={detail?.canEdit ?? false} />}
        {tab === 'Payroll' && <PayrollTab userId={id} detail={detail} />}
        {tab === 'Activities' && <ActivitiesTab userId={id} />}
        {tab === 'Notes' && <NotesTab userId={id} />}
        {tab === 'Documents' && <DocumentsTab userId={id} />}
        {tab === 'Agenda' && <AgendaTab userId={id} canEdit={detail?.canEdit ?? false} />}
        {tab === 'LDAP' && <LdapTab user={user} />}
        {tab === 'Notifications' && <NotificationsTab userId={id} />}
        {tab === 'Click to Dial' && <ClickToDialTab user={user} detail={detail} />}
      </div>
    </div>
  )
}
