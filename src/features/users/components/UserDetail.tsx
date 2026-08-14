import { useEffect, useRef, useState } from 'react'
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
  Building2,
  Hash,
  Send,
  Pencil,
  Lock,
  XCircle,
  UsersRound,
  Paperclip,
  Users,
  User,
  FolderOpen,
  FileText,
  ShoppingCart,
  Receipt,
  CalendarDays,
  Layers,
  Tag,
  Star,
  Wrench,
  FileSignature,
  Archive,
  Truck,
  Plus,
  ListChecks,
  ChevronDown,
  Bell,
  Landmark,
  Banknote,
  StickyNote,
  CalendarClock,
  Link2,
  Upload,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { useUser, useLanguageOptions } from '../users.queries'
import { useRecentActivity } from '../../agenda/agenda.queries'
import { formatDateTimeAmPm } from '../../../utils/format'

const RELATED_OBJECT_COLUMNS = ['Type', 'Ref.', 'Date', 'Amount (Excl.)', 'Status']

// Reference card's "Permissions" tab left-hand module list — labels, icons
// and right-count badges reproduced from the reference screenshot as static
// scaffold (same "visual scaffold, no backing data" precedent as
// GroupsList.tsx's own GROUPS const): this app's users API has no per-user,
// per-module rights endpoint at all (the one rights endpoint that exists,
// api/user/index.php, only covers the currently-logged-in user, for 6
// modules, not an arbitrary user id across all of these), so there's no
// real data to show for any of this yet.
const PERMISSION_MODULES = [
  { key: 'users-groups', label: 'Users & Groups', count: 7, icon: UsersRound },
  { key: 'members', label: 'Members', count: 7, icon: Users },
  { key: 'third-parties', label: 'Third Parties', count: 9, icon: User },
  { key: 'dms-ecm', label: 'DMS / ECM', count: 3, icon: FolderOpen },
  { key: 'quotations', label: 'Quotations', count: 5, icon: FileText },
  { key: 'sales-orders', label: 'Sales Orders', count: 4, icon: ShoppingCart },
  { key: 'invoices', label: 'Invoices', count: 7, icon: Receipt },
  { key: 'vendors', label: 'Vendors', count: 12, icon: Building2 },
  { key: 'projects-leads', label: 'Projects or Leads', count: 8, icon: Briefcase },
  { key: 'events-agenda', label: 'Events/Agenda', count: 7, icon: CalendarDays },
  { key: 'resources', label: 'Resources', count: 4, icon: Layers },
  { key: 'tags-categories', label: 'Tags/Categories', count: 3, icon: Tag },
  { key: 'products', label: 'Products', count: 4, icon: Star },
  { key: 'services', label: 'Services', count: 4, icon: Wrench },
  { key: 'vendor-quotations', label: 'Vendor Quotations', count: 4, icon: FileSignature },
  { key: 'stocks', label: 'Stocks', count: 5, icon: Archive },
  { key: 'shipments', label: 'Shipments', count: 7, icon: Truck },
] as const

const USER_GROUP_RIGHTS = [
  'Read other users and groups',
  'Create/modify other users, groups and permissions',
  'Modify other users password',
  'Delete or disable other users',
  "Create/modify his own user information",
  'Modify his own password',
  'Export users',
]

const ACTIVITY_SUBTABS = ['Tasks', 'Meetings', 'Calls', 'Timeline'] as const
type ActivitySubtab = (typeof ACTIVITY_SUBTABS)[number]

// Reference card (user/card.php) header row of small action icons. None of
// them have a real backend action wired up yet (no mail-send, no edit form,
// no permissions editor) — disabled + "Not built yet", same convention as
// the non-"User" tabs below, rather than a button that looks live but does
// nothing when clicked.
const HEADER_ACTIONS = [
  { icon: Send, label: 'Send by email' },
  { icon: Pencil, label: 'Edit' },
  { icon: Lock, label: 'Set permissions' },
  { icon: XCircle, label: 'Disable' },
] as const

const TABS = ['User', 'Permissions', 'Tasks/Activities', 'Notifications Auto.', 'HR and Bank', 'Salary Details', 'Note'] as const
const MORE_TABS = [
  { label: 'Linked Files', icon: Link2 },
  { label: 'Events/Agenda', icon: CalendarClock },
] as const
type Tab = (typeof TABS)[number] | (typeof MORE_TABS)[number]['label']

// Every field below is real data from GET /api/users/ (see users.queries.ts)
// except where explicitly marked otherwise — the reference Dolibarr user
// card (user/card.php) shows several fields (API key, salary, employment
// dates, ...) this app's users API doesn't return at all, and those render
// as "—" rather than an invented value, same honesty convention as the New
// User wizard's own Country/State/Device fields.
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint">{label}</span>
      <span className="text-sm text-text!">{value || '—'}</span>
    </div>
  )
}

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, isLoading } = useUser(id)
  const [tab, setTab] = useState<Tab>('User')
  const { data: languageOptions, isLoading: languagesLoading } = useLanguageOptions()
  const [permModule, setPermModule] = useState<(typeof PERMISSION_MODULES)[number]['key']>('users-groups')
  const [activitySubtab, setActivitySubtab] = useState<ActivitySubtab>('Tasks')
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const ENABLED_TABS: readonly Tab[] = TABS
  const MORE_LABELS: readonly Tab[] = MORE_TABS.map((m) => m.label)

  // The one real data source across these scaffold tabs: this browser
  // session's own local activity log (see agenda.queries.ts), filtered down
  // to events this specific user authored — same "genuinely real, just
  // session-scoped" precedent as ThirdPartyList's creator-name link, not a
  // full historical Dolibarr agenda (no backend endpoint for that exists).
  const { data: allActivity } = useRecentActivity({ category: 'all', limit: 200 })
  const userEvents = allActivity?.filter((e) => e.authorName === (user?.name || user?.login)) ?? []

  useEffect(() => {
    if (!moreOpen) return
    function onOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [moreOpen])

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading…</p>
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

      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          <Card className="items-center text-center gap-3">
            <Avatar name={user.name || user.login} size={72} className="text-xl" />
            <div>
              <p className="font-semibold text-text! text-base">{user.name || user.login}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-text-faint">
                <Building2 size={12} /> Master entity
              </span>
            </div>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${user.status === 'Enabled' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
              {user.status}
            </span>

            <div className="grid grid-cols-2 gap-2 w-full mt-1">
              <div className="rounded-lg border border-border bg-surface px-2 py-2 text-center">
                <p className="text-sm font-bold text-text!">{user.id}</p>
                <p className="text-[10px] text-text-faint uppercase tracking-wide">User ID</p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-2 py-2 text-center">
                <p className="flex items-center justify-center gap-1 text-sm font-bold text-text!">
                  {user.isAdmin && <Crown size={12} className={user.isSuperAdmin ? 'text-warning' : 'text-danger'} />}
                  {user.isAdmin ? 'Yes' : 'No'}
                </p>
                <p className="text-[10px] text-text-faint uppercase tracking-wide">Administrator</p>
              </div>
            </div>

            <div className="w-full text-left mt-2 space-y-2">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wide">Details</p>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <IdCard size={13} className="text-text-faint shrink-0" /> {user.login}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-text-muted break-all">
                <Mail size={13} className="text-text-faint shrink-0" /> {user.email || '—'}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <Briefcase size={13} className="text-text-faint shrink-0" /> {user.designation || '—'}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <Phone size={13} className="text-text-faint shrink-0" /> {user.phone || '—'}
              </p>
              <p className="flex items-center justify-between text-sm pt-1">
                <span className="text-text-faint">Status:</span>
                <span className="text-text-muted">{user.status === 'Enabled' ? 'Active' : 'Disabled'}</span>
              </p>
              <p className="flex items-center justify-between text-sm">
                <span className="text-text-faint">Type:</span>
                <span className="text-text-muted">
                  {user.employee ? 'Internal' : 'External'}
                  {user.isAdmin ? '/Admin' : ''}
                </span>
              </p>
            </div>

            <div className="w-full text-left mt-2 pt-2 border-t border-border space-y-1">
              <p className="flex items-center justify-between text-xs">
                <span className="text-text-faint">Created on:</span>
                <span className="text-text-muted">—</span>
              </p>
              <p className="flex items-center justify-between text-xs">
                <span className="text-text-faint">Created by:</span>
                <span className="text-text-muted">—</span>
              </p>
            </div>

            <div className="w-full text-left mt-2 pt-2 border-t border-border space-y-1.5" title="No task/meeting/call tracking exists on this app's backend yet — honest zero, not fabricated.">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wide">Activities</p>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-text!">Tasks:</span> 0 (Today: 0)
              </p>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-text!">Meetings:</span> 0 (Today: 0)
              </p>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-text!">Calls:</span> 0 (Today: 0)
              </p>
            </div>

            <div className="w-full text-left mt-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wide">Salary info</p>
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-2">
              <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    disabled={!ENABLED_TABS.includes(t)}
                    title={ENABLED_TABS.includes(t) ? undefined : 'Not built yet'}
                    className={`shrink-0 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 -mb-px whitespace-nowrap ${
                      tab === t
                        ? 'border-brand text-brand'
                        : ENABLED_TABS.includes(t)
                          ? 'border-transparent text-text-muted hover:text-text'
                          : 'border-transparent text-text-faint cursor-default'
                    }`}
                  >
                    {t}
                  </button>
                ))}

                <div className="relative shrink-0" ref={moreRef}>
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    className={`flex items-center gap-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 -mb-px whitespace-nowrap ${
                      MORE_LABELS.includes(tab) ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                    }`}
                  >
                    More... ({MORE_TABS.length}) <ChevronDown size={12} />
                  </button>
                  {moreOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-white py-1 shadow-lg dark:bg-gray-900">
                      {MORE_TABS.map(({ label, icon: Icon }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setTab(label)
                            setMoreOpen(false)
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                            tab === label ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'
                          }`}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 pl-2">
                {HEADER_ACTIONS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    title={`${label} — Not built yet`}
                    className="p-1.5 rounded-md text-text-faint cursor-default"
                  >
                    <Icon size={15} />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {tab === 'User' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <Field label="Login" value={user.login} />
                  <Field label="Password" value="Hidden" />
                  <Field label="Key For API" value="" />
                  <Field label="Administrator" value={user.isAdmin ? (user.isSuperAdmin ? 'Yes (Super Admin)' : 'Yes') : 'No'} />
                  {/* Every user this app's API can return comes from GET /api/users/, which only ever
                      lists Dolibarr's internal (staff) users — there's no external/contact-user table
                      behind this endpoint — so "Internal" is a safe, always-true constant here, not a
                      fabricated guess (same reasoning as the "Master entity" badge above). */}
                  <Field label="Type" value="Internal" />
                  <Field label="Gender" value={user.gender} />
                  <Field label="Employee" value={user.employee ? 'Yes' : 'No'} />
                  <Field label="Supervisor" value="" />
                  <Field label="Force Expense Report Validator" value="" />
                  <Field label="Job Position" value={user.designation} />
                  <Field label="Email" value={user.email} />
                  <Field label="Phone" value={user.phone} />
                  <Field label="Last Login" value={user.lastLogin} />
                  <Field label="Average Hourly Rate" value="" />
                  <Field label="Average Daily Rate" value="" />
                  <Field label="Salary" value="" />
                  <Field label="Hours Worked (Per Week)" value="" />
                  <Field label="Employment Date" value="" />
                  <Field label="Date Range Of Login Validity" value="" />
                  <Field label="Date Of Birth" value="" />
                  <Field label="Employee NRC" value="" />
                </div>
              )}

              {tab === 'Permissions' && (
                <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-0 border border-border rounded-lg overflow-hidden -m-4">
                  <div className="border-b sm:border-b-0 sm:border-r border-border max-h-80 overflow-y-auto">
                    {PERMISSION_MODULES.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPermModule(m.key)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm border-b border-border last:border-0 ${
                          permModule === m.key ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'
                        }`}
                      >
                        <m.icon size={14} className="shrink-0" />
                        <span className="flex-1 truncate">{m.label}</span>
                        <span className={`text-xs rounded px-1.5 ${permModule === m.key ? 'bg-white/20' : 'bg-surface text-text-faint'}`}>{m.count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {permModule === 'users-groups' ? (
                      <>
                        <p className="flex items-center gap-2 font-semibold text-text! mb-3">
                          <UsersRound size={14} className="text-brand" /> Users & Groups
                        </p>
                        <label className="flex items-center gap-2 text-sm font-medium text-text! mb-2 pb-2 border-b border-border" title="Not built yet">
                          <input type="checkbox" checked readOnly disabled className="rounded border-input-border" /> Select All
                        </label>
                        <div className="space-y-1">
                          {USER_GROUP_RIGHTS.map((right) => (
                            <label key={right} className="flex items-center gap-2 py-1.5 text-sm text-text-muted" title="Not built yet">
                              <input type="checkbox" checked readOnly disabled className="rounded border-input-border" /> {right}
                            </label>
                          ))}
                        </div>
                        <button type="button" disabled title="Not built yet" className="mt-4 rounded-lg bg-neutral-bg px-4 py-2 text-sm font-medium text-text-faint cursor-default">
                          Save Rights
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-text-faint italic">Permission details for this module aren't built yet.</p>
                    )}
                  </div>
                </div>
              )}

              {tab === 'Tasks/Activities' && (
                <div className="-m-4">
                  <div className="flex items-center gap-1 border-b border-border px-4">
                    {ACTIVITY_SUBTABS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setActivitySubtab(s)}
                        className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                          activitySubtab === s ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {activitySubtab === 'Timeline' ? (
                      <div className="flex items-center gap-2 text-sm text-text-faint italic">
                        <ListChecks size={14} /> No activity yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(['Open', 'Close'] as const).map((state) => (
                          <div key={state}>
                            <p className="flex items-center gap-2 text-sm font-semibold text-text! mb-2">
                              <FolderOpen size={14} className="text-text-faint" /> {state} Activity
                            </p>
                            <div className="border border-border rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
                                <span className="text-sm font-medium text-text!">
                                  {activitySubtab} <span className="text-text-faint">0</span>
                                </span>
                                {state === 'Open' && (
                                  <button type="button" disabled title="Not built yet" className="p-1 rounded-md bg-brand/10 text-brand/50 cursor-default">
                                    <Plus size={14} />
                                  </button>
                                )}
                              </div>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide">
                                    <th className="font-medium px-3 py-2">Subject</th>
                                    <th className="font-medium px-3 py-2">Created By</th>
                                    {state === 'Open' && <th className="font-medium px-3 py-2">Due Date</th>}
                                    <th className="font-medium px-3 py-2">Priority</th>
                                  </tr>
                                </thead>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'Notifications Auto.' && (
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-2 text-text-muted">
                    <Bell size={15} className="text-text-faint shrink-0 mt-0.5" />
                    <p>
                      Email notifications can be sent automatically for some Ecuenta events. Recipients of notifications can be defined: per user, one user at a time; per third-party contacts
                      (customers or vendors), one contact at a time; or by setting global email addresses in this setup page.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-text! mb-2 pb-1.5 border-b border-border">Subscribe to a new automatic email notification (target/event)</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <UserRound size={14} className="text-text-faint" /> {user.name || user.login}
                      </span>
                      <select disabled title="Not built yet" className="text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default">
                        <option>Select event…</option>
                      </select>
                      <select disabled title="Not built yet" className="text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default">
                        <option>EMail</option>
                      </select>
                      <button type="button" disabled title="Not built yet" className="rounded-lg bg-neutral-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-default">
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-text! mb-2 pb-1.5 border-b border-border">List all active subscriptions (targets/events) for automatic email notification (0)</p>
                    <p className="text-text-faint italic">None</p>
                  </div>
                </div>
              )}

              {tab === 'HR and Bank' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <Field label="Personal Email" value="" />
                    <Field label="Personal Mobile Phone" value="" />
                    <Field label="Default Transportation Mode" value="" />
                    <Field label="Default Range Number" value="" />
                  </div>
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-text! mb-2">
                      <Landmark size={14} className="text-brand" /> Latest 3 Expense Reports
                    </p>
                    <p className="text-sm text-text-faint italic">None</p>
                  </div>
                  <div>
                    <p className="font-semibold text-text! mb-2">Bank accounts</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                          <th className="font-medium py-2 pr-3">BAN Label</th>
                          <th className="font-medium py-2 pr-3">Bank</th>
                          <th className="font-medium py-2 pr-3">Account Number</th>
                          <th className="font-medium py-2 pr-3">IBAN Number</th>
                          <th className="font-medium py-2">BIC/SWIFT Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-3 text-text-faint italic" colSpan={5}>
                            No BAN Record
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'Salary Details' && (
                <div className="space-y-5">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-text! mb-3">
                      <Banknote size={14} className="text-brand" /> Bank Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Bank Name', 'Account No', 'IFSC Code', 'NHIMA Number', 'NAPSA (SSN)', 'Tpin Number', 'MICR Code', 'Comments'].map((label) => (
                        <div key={label}>
                          <label className="text-xs text-text-faint">{label}</label>
                          <input
                            disabled
                            placeholder={`Enter ${label}`}
                            title="Not built yet"
                            className="mt-1 w-full text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-text! mb-3">Assign Salary Grade</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2" title="Not built yet">
                        <input type="checkbox" disabled className="rounded border-input-border" />
                        <select disabled className="flex-1 text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default">
                          <option>Select Monthly Grade</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2" title="Not built yet">
                        <input type="checkbox" disabled className="rounded border-input-border" />
                        <select disabled className="flex-1 text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default">
                          <option>Select Hourly Grade</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-text! mb-3">Assign Shift</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-text-faint">Primary Shift</label>
                        <select disabled title="Not built yet" className="mt-1 w-full text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default">
                          <option>Select shift</option>
                        </select>
                      </div>
                      <div />
                      <div>
                        <label className="text-xs text-text-faint">Start Date</label>
                        <input disabled type="date" title="Not built yet" className="mt-1 w-full text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default" />
                      </div>
                      <div>
                        <label className="text-xs text-text-faint">End Date</label>
                        <input disabled type="date" title="Not built yet" className="mt-1 w-full text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default" />
                      </div>
                      <div>
                        <label className="text-xs text-text-faint">Alternate Mode</label>
                        <input
                          disabled
                          value="No alternation"
                          readOnly
                          title="Not built yet"
                          className="mt-1 w-full text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'Note' && (
                <div className="space-y-3">
                  <p className="flex items-center gap-1.5 text-sm text-text-muted">
                    <StickyNote size={14} className="text-text-faint" /> Login {user.login}
                  </p>
                  <p className="text-sm text-text-faint italic">No note recorded.</p>
                  <button type="button" disabled title="Not built yet" className="rounded-lg bg-neutral-bg px-4 py-2 text-sm font-medium text-text-faint cursor-default">
                    Modify
                  </button>
                </div>
              )}

              {tab === 'Linked Files' && (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">Login {user.login}</p>
                  <div>
                    <p className="font-semibold text-text! mb-2">Attach a new file/document</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input disabled type="file" title="Not built yet" className="text-sm text-text-faint cursor-default" />
                      <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-lg bg-neutral-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-default">
                        <Upload size={13} /> Upload
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-text! mb-2">Link a new file/document</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input disabled placeholder="URL to link" title="Not built yet" className="text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default" />
                      <input disabled placeholder="Label" title="Not built yet" className="text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default" />
                      <button type="button" disabled title="Not built yet" className="rounded-lg bg-neutral-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-default">
                        Link
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-text! mb-2">Attached files and documents</p>
                    <p className="text-sm text-text-faint italic">No Documents Uploaded</p>
                  </div>
                  <div>
                    <p className="font-semibold text-text! mb-2">Linked files and documents</p>
                    <p className="text-sm text-text-faint italic">No Registered Links</p>
                  </div>
                </div>
              )}

              {tab === 'Events/Agenda' && (
                <div>
                  <p className="flex items-center gap-2 font-semibold text-text! mb-3">
                    <CalendarClock size={14} className="text-brand" /> Events For This User
                  </p>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                          <th className="font-medium px-3 py-2">Date</th>
                          <th className="font-medium px-3 py-2">Owner</th>
                          <th className="font-medium px-3 py-2">Label</th>
                          <th className="font-medium px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userEvents.length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-text-faint italic" colSpan={4}>
                              No events recorded for this user yet this session.
                            </td>
                          </tr>
                        ) : (
                          userEvents.map((e) => (
                            <tr key={e.id} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 whitespace-nowrap text-text-muted">{formatDateTimeAmPm(e.date)}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <Avatar name={e.authorName} size={20} className="text-[9px]" /> {e.authorName}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-text!">{e.label}</td>
                              <td className="px-3 py-2">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">Not Applicable</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-text-faint mt-2">
                    Real events logged during this browser session — not the full historical Dolibarr agenda (no backend endpoint for that exists yet).
                  </p>
                </div>
              )}
            </div>

            {tab === 'User' && <div className="bg-surface px-4 py-2 text-xs font-semibold text-text-faint uppercase tracking-wide border-t border-border">Employee Login Details</div>}
          </Card>
        </div>

        <Card className="mt-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="flex items-center gap-2 font-semibold text-text!">
              <UsersRound size={14} className="text-brand" /> List of groups for this user
            </p>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <select disabled title="Not built yet" className="flex-1 max-w-xs text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default">
              <option>No groups configured</option>
            </select>
            <button type="button" disabled title="Not built yet" className="rounded-lg bg-neutral-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-default">
              Add
            </button>
          </div>
          <p className="text-sm text-text-faint italic">None</p>
        </Card>

        <Card className="mt-4">
          <p className="flex items-center gap-2 font-semibold text-text! mb-3">
            <Paperclip size={14} className="text-brand" /> Linked files
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select disabled title="Not built yet" className="text-sm rounded-md border border-input-border bg-surface text-text-faint px-2 py-1.5 cursor-default">
              <option>No document templates available</option>
            </select>
            <select disabled={languagesLoading} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 disabled:text-text-faint">
              {languagesLoading ? (
                <option>Loading…</option>
              ) : (
                languageOptions?.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))
              )}
            </select>
            <button type="button" disabled title="Not built yet" className="rounded-lg bg-neutral-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-default">
              Generate
            </button>
          </div>
          <p className="text-sm text-text-faint italic">None</p>
        </Card>

        <Card className="mt-4 !p-0 overflow-hidden">
          <p className="flex items-center gap-2 font-semibold text-text! px-4 pt-4 pb-3">
            <Hash size={14} className="text-brand" /> Related Objects
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-y border-border bg-surface">
                  {RELATED_OBJECT_COLUMNS.map((col) => (
                    <th key={col} className="font-medium px-4 py-2 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 text-text-faint italic" colSpan={RELATED_OBJECT_COLUMNS.length}>
                    None
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
