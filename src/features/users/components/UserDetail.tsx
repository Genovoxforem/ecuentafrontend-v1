import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
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
  ExternalLink,
  Loader2,
  FolderOpen,
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
  useUserNotes,
  useSaveUserNotes,
  useUserDocuments,
  useUploadUserDocument,
  useDeleteUserDocument,
  useUserAgenda,
  useCreateUserAgendaEvent,
  useUserNotifications,
  useAddUserNotification,
  useDeleteUserNotification,
  useToggleUserStatus,
} from '../userDetailTabs.queries'
import { formatDate, formatMoney } from '../../../utils/format'
import { BackendUnavailableCard, isBackendUnavailable } from '../../../shared/components/BackendUnavailable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const TABS = ['Overview', 'Permissions', 'HR & Bank', 'Activities', 'Notes', 'Documents', 'Agenda', 'Notifications'] as const
type Tab = (typeof TABS)[number]

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 disabled:bg-surface disabled:text-text-faint disabled:cursor-default'
const primaryBtn = 'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:bg-neutral-bg disabled:text-text-faint disabled:cursor-default'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint">{label}</span>
      <span className="text-sm text-text!">{value || '—'}</span>
    </div>
  )
}

function ReadOnlyNote({ children }: { children: string }) {
  return <p className="text-xs text-text-faint italic mt-1">{children}</p>
}

// Real per-module/per-right permission state from userprofile/api/
// permissions.php (see userPermissions.queries.ts's header comment for how
// this was found). Unchanged by this rebuild — already fully real.
function PermissionsTab({ userId, permModule, setPermModule }: { userId: string | undefined; permModule: string | null; setPermModule: (key: string) => void }) {
  const { data, isLoading, isError, error, refetch } = useUserPermissions(userId)
  const toggle = useToggleUserPermission(userId)

  if (isLoading) return <LegacyLoadingCard label="Loading permissions…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load permissions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const activeModuleKey = permModule && data.modules.some((m) => m.id === permModule) ? permModule : (data.modules[0]?.id ?? null)
  const activeModule = data.modules.find((m) => m.id === activeModuleKey)

  return (
    <div>
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

        <div className="p-4">
          {activeModule ? (
            <>
              <p className="flex items-center gap-2 font-semibold text-text! mb-3">
                <UsersRound size={14} className="text-brand" /> {activeModule.label}
              </p>
              <div className="space-y-1">
                {activeModule.perms.map((right) => (
                  <label key={right.id} className={`flex items-center gap-2 py-1.5 text-sm ${right.granted ? 'text-text!' : 'text-text-muted'}`}>
                    <input
                      type="checkbox"
                      checked={right.granted}
                      disabled={!data.canEdit || toggle.isPending}
                      onChange={(e) => toggle.mutate({ rightId: right.id, grant: e.target.checked })}
                      className="rounded border-input-border"
                    />
                    {right.label}
                    {right.inherited && !right.direct && <span className="text-xs text-text-faint italic">(via group)</span>}
                  </label>
                ))}
              </div>
              {toggle.isError && <p className="text-sm text-danger mt-2">{toggle.error instanceof Error ? toggle.error.message : 'Failed to update permission.'}</p>}
            </>
          ) : (
            <p className="text-sm text-text-faint italic">No permission modules found.</p>
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
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        <Field label="Login" value={user.login} />
        <Field label="Administrator" value={user.isAdmin ? 'Yes' : 'No'} />
        <Field label="Employee" value={user.employee ? 'Yes' : 'No'} />
        <Field label="Gender" value={user.gender} />
        <Field label="Job Position" value={user.designation} />
        <Field label="Email" value={user.email} />
        <Field label="Phone" value={user.phone} />
        <Field label="Last Login" value={user.lastLogin} />
        <Field label="Supervisor" value={detail?.supervisor?.name ?? ''} />
        <Field label="Force Expense Report Validator" value={detail?.expenseValidator?.name ?? ''} />
        <Field label="Holiday Validator" value={detail?.holidayValidator?.name ?? ''} />
        <Field label="Employee NRC" value={detail?.employeeNrc ?? ''} />
        <Field label="Average Hourly Rate" value={detail?.hourlyCost != null ? `${formatMoney(detail.hourlyCost)} ZMW` : ''} />
        <Field label="Average Daily Rate" value={detail?.dailyCost != null ? `${formatMoney(detail.dailyCost)} ZMW` : ''} />
        <Field label="Hours Worked (Per Week)" value={detail?.weeklyHours != null ? String(detail.weeklyHours) : ''} />
        <Field label="Employment Date" value={detail?.dateEmployment ? formatDate(detail.dateEmployment) : ''} />
        <Field label="Date Of Birth" value={detail?.birth ? formatDate(detail.birth) : ''} />
        <Field label="Timesheet Device" value={detail?.timesheetDevice ? `${detail.timesheetDevice.name}${detail.timesheetDevice.brand ? ` (${detail.timesheetDevice.brand})` : ''}` : ''} />
        <Field label="Address" value={[detail?.address, detail?.zip, detail?.town].filter(Boolean).join(', ')} />
      </div>

      <div>
        <p className="flex items-center gap-2 font-semibold text-text! mb-2">
          <UsersRound size={14} className="text-brand" /> Groups ({detail?.groups.length ?? 0})
        </p>
        {detail && detail.groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {detail.groups.map((g) => (
              <span key={g} className="rounded-full bg-brand/10 px-2.5 py-1 text-xs text-brand">
                {g}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-faint italic">Not a member of any group.</p>
        )}
      </div>

      {detail && detail.socialLinks.length > 0 && (
        <div>
          <p className="font-semibold text-text! mb-2">Social Links</p>
          <div className="flex flex-wrap gap-2">
            {detail.socialLinks.map((s) => (
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
// actions — see userDetailTabs.queries.ts). set_leavetypes exists on that
// same backend file too, but isn't wired here yet, so assigned leave types
// render read-only rather than as a half-built editor.
function HrBankTab({ userId, canEdit }: { userId: string | undefined; canEdit: boolean }) {
  const { data, isLoading, isError, error, refetch } = useUserBankProfile(userId)
  const saveContact = useSaveUserPersonalContact(userId)
  const addAccount = useAddUserBankAccount(userId)
  const [personalEmail, setPersonalEmail] = useState('')
  const [personalMobile, setPersonalMobile] = useState('')
  const [accountForm, setAccountForm] = useState({ label: '', bank: '', number: '', iban: '', bic: '' })

  useEffect(() => {
    if (data) {
      setPersonalEmail(data.personalEmail)
      setPersonalMobile(data.personalMobile)
    }
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading HR & bank details…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load HR & bank details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const editable = canEdit && data.canEdit

  return (
    <div className="space-y-6">
      <div>
        <p className="font-semibold text-text! mb-2">Personal Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-faint">Personal Email</label>
            <input value={personalEmail} disabled={!editable} onChange={(e) => setPersonalEmail(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs text-text-faint">Personal Mobile Phone</label>
            <input value={personalMobile} disabled={!editable} onChange={(e) => setPersonalMobile(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
        </div>
        {editable && (
          <button
            type="button"
            disabled={saveContact.isPending}
            onClick={() => saveContact.mutate({ personal_email: personalEmail, personal_mobile: personalMobile })}
            className={`${primaryBtn} mt-2`}
          >
            {saveContact.isPending && <Loader2 size={13} className="animate-spin" />} Save
          </button>
        )}
        {saveContact.isError && <p className="text-sm text-danger mt-1">{saveContact.error instanceof Error ? saveContact.error.message : 'Failed to save.'}</p>}
      </div>

      <div>
        <p className="font-semibold text-text! mb-2">Bank Accounts</p>
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
              {data.accounts.length === 0 ? (
                <tr>
                  <td className="py-3 px-3 text-text-faint italic" colSpan={5}>
                    No bank account on record.
                  </td>
                </tr>
              ) : (
                data.accounts.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="py-2 px-3 text-text!">{a.label}</td>
                    <td className="py-2 px-3 text-text-muted">{a.bank}</td>
                    <td className="py-2 px-3 text-text-muted">{a.number}</td>
                    <td className="py-2 px-3 text-text-muted">{a.iban}</td>
                    <td className="py-2 px-3 text-text-muted">{a.bic}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {editable && (
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
                  onSuccess: () => setAccountForm({ label: '', bank: '', number: '', iban: '', bic: '' }),
                })
              }
              className={`${primaryBtn} sm:col-span-5 justify-center`}
            >
              {addAccount.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Account
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="font-semibold text-text! mb-2">Leave Types</p>
        {data.leaveTypes.length === 0 ? (
          <p className="text-sm text-text-faint italic">No leave types configured.</p>
        ) : (
          <div className="space-y-1">
            {data.leaveTypes.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-text-muted">
                <input type="checkbox" checked={data.assignedLeaves.includes(t.id)} disabled readOnly className="rounded border-input-border" />
                {t.name} <span className="text-text-faint">({t.daysEntitled} days)</span>
              </label>
            ))}
            <ReadOnlyNote>Leave-type assignment editing isn't wired up yet — shown read-only.</ReadOnlyNote>
          </div>
        )}
      </div>
    </div>
  )
}

// Both this tab and the Agenda tab read the same real llx_actioncomm rows
// from userprofile/api/agenda.php (see that file's header comment) — this
// one summarizes them into an Open/Closed count, the Agenda tab below shows
// the full list plus a create form. Dolibarr's percent field is the real
// completion signal (100 = done); there's no "type" column in this
// endpoint's response, so a Tasks/Meetings/Calls split would be a fabricated
// grouping — left out rather than invented.
function ActivitiesTab({ userId }: { userId: string | undefined }) {
  const { data: events, isLoading, isError, error, refetch } = useUserAgenda(userId)

  if (isLoading) return <LegacyLoadingCard label="Loading activities…" />
  if (isError || !events) return <LegacyErrorCard title="Couldn't load activities" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const open = events.filter((e) => e.percent < 100)
  const closed = events.filter((e) => e.percent >= 100)

  return (
    <div className="space-y-4">
      {([
        { label: 'Open', rows: open },
        { label: 'Closed', rows: closed },
      ] as const).map(({ label, rows }) => (
        <div key={label}>
          <p className="flex items-center gap-2 text-sm font-semibold text-text! mb-2">
            <FolderOpen size={14} className="text-text-faint" /> {label} Activity <span className="text-text-faint">{rows.length}</span>
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
                  <th className="font-medium px-3 py-2">Label</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-text-faint italic" colSpan={3}>
                      None
                    </td>
                  </tr>
                ) : (
                  rows.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{e.label}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{e.date}</td>
                      <td className="px-3 py-2 text-text-muted">{e.percent}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <Link to={ROUTES.usersDashboard} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Back to list">
            <ChevronLeft size={18} />
          </Link>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <UserRound size={20} className="text-brand" /> User Details
          </h2>
        </div>
        <Link to={ROUTES.usersDashboard} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-4 space-y-4">
        {/* Horizontal header: identity + badges + info strip + action icons */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={user.name || user.login} size={64} className="text-lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text! text-lg">{user.name || user.login}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${enabled ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                    {enabled ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {user.isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-warning-bg text-warning-fg">
                      <Crown size={11} /> Admin
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-brand/10 text-brand">{user.employee ? 'Employee' : 'Non-Employee'}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <IdCard size={12} className="text-text-faint" /> ID {user.id}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={12} className="text-text-faint" /> {securityLevel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-text-faint" /> {user.phone || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-text-faint" /> {locationLabel || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} className="text-text-faint" /> {user.designation || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href={detail?.actions.canEmail ? detail.urls.email : undefined}
                title={detail?.actions.canEmail ? 'Send by email' : 'No email on file'}
                aria-disabled={!detail?.actions.canEmail}
                className={`p-1.5 rounded-md ${detail?.actions.canEmail ? 'text-text-faint hover:bg-surface-hover hover:text-brand' : 'text-text-faint/50 pointer-events-none'}`}
              >
                <Mail size={16} />
              </a>
              <a
                href={detail?.actions.canWhatsapp ? detail.urls.whatsapp : undefined}
                target="_blank"
                rel="noreferrer"
                title={detail?.actions.canWhatsapp ? 'Message on WhatsApp' : 'No WhatsApp number on file'}
                className={`p-1.5 rounded-md ${detail?.actions.canWhatsapp ? 'text-text-faint hover:bg-surface-hover hover:text-brand' : 'text-text-faint/50 pointer-events-none'}`}
              >
                <MessageCircle size={16} />
              </a>
              <a
                href={detail?.urls.classicCard}
                target="_blank"
                rel="noreferrer"
                title="Edit in legacy system"
                className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand"
              >
                <Pencil size={16} />
              </a>
              {detail?.actions.canDisable && (
                <button
                  type="button"
                  title="Disable this user"
                  disabled={toggleStatus.isPending}
                  onClick={() => toggleStatus.mutate('disable')}
                  className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger"
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
                  className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-success-fg"
                >
                  {toggleStatus.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                </button>
              )}
            </div>
          </div>
          {toggleStatus.isError && <p className="text-sm text-danger mt-2">{toggleStatus.error instanceof Error ? toggleStatus.error.message : 'Failed to update status.'}</p>}

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
              <p className="text-base font-bold text-text!">{detail?.nbRights ?? '—'}</p>
              <p className="text-[10px] text-text-faint uppercase tracking-wide">Rights</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
              <p className="text-base font-bold text-text!">{detail?.groups.length ?? '—'}</p>
              <p className="text-[10px] text-text-faint uppercase tracking-wide">Groups</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
              <p className="text-base font-bold text-text!">{enabled ? 'Active' : 'Inactive'}</p>
              <p className="text-[10px] text-text-faint uppercase tracking-wide">Status</p>
            </div>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`shrink-0 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 -mb-px whitespace-nowrap ${
                  tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === 'Overview' && <OverviewTab user={user} detail={detail} />}
            {tab === 'Permissions' && <PermissionsTab userId={id} permModule={permModule} setPermModule={setPermModule} />}
            {tab === 'HR & Bank' && <HrBankTab userId={id} canEdit={detail?.canEdit ?? false} />}
            {tab === 'Activities' && <ActivitiesTab userId={id} />}
            {tab === 'Notes' && <NotesTab userId={id} />}
            {tab === 'Documents' && <DocumentsTab userId={id} />}
            {tab === 'Agenda' && <AgendaTab userId={id} canEdit={detail?.canEdit ?? false} />}
            {tab === 'Notifications' && <NotificationsTab userId={id} />}
          </div>
        </Card>

        <p className="flex items-center gap-1.5 text-xs text-text-faint">
          <ExternalLink size={12} />
          <a href={detail?.urls.classicCard} target="_blank" rel="noreferrer" className="hover:underline">
            Open this user in the legacy system
          </a>
        </p>
      </div>
    </div>
  )
}
