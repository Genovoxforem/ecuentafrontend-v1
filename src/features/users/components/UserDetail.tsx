import { useState, type ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, UserRound, X, Crown, IdCard, Mail, Phone, Briefcase, MapPin, ShieldCheck, MessageCircle, Pencil, XCircle, CheckCircle2, UsersRound, Bell, Loader2, FolderOpen, PhoneCall, Database, WalletCards, CalendarClock, StickyNote, Paperclip } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, StatusPill } from '../../../shared/components/dashboard/DashboardKit'
import { useTheme } from '../../../context/ThemeContext'
import { Avatar } from '../../../shared/components/Avatar'
import { useUser, useUserDetail } from '../users.queries'
import { useToggleUserStatus } from '../userDetailTabs.queries'
import { BackendUnavailableCard, isBackendUnavailable } from '../../../shared/components/BackendUnavailable'
import { ActivitiesTab } from './userDetail/activitiesTab'
import { HrBankTab } from './userDetail/hrBankTab'
import { OverviewTab } from './userDetail/overviewTab'
import { PayrollTab } from './userDetail/payrollTab'
import { PermissionsTab } from './userDetail/permissionsTab'
import { AgendaTab, ClickToDialTab, DocumentsTab, LdapTab, NotesTab, NotificationsTab } from './userDetail/recordTabs'

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

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
  const isBlueMetal = theme === 'blue-metal'
  const { user, isLoading, isError, error } = useUser(id)
  const { detail } = useUserDetail(id)
  const toggleStatus = useToggleUserStatus(id)
  const [tab, setTab] = useState<Tab>('Overview')
  const [permModule, setPermModule] = useState<string | null>(null)

  // "<zip> <town>, <country> - <state>": whatever of the five the user has (userprofile/fapi/user.php names the country and the state).
  const locationLabel = detail
    ? [[[detail.zip, detail.town].filter(Boolean).join(' '), detail.countryLabel].filter(Boolean).join(', '), detail.stateLabel].filter(Boolean).join(' - ')
    : ''

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
          <div className="flex flex-wrap items-start justify-between gap-4 px-4">
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
                  {isBlueMetal ? (
                    <>
                      <StatusPill tone={enabled ? 'success' : 'neutral'} icon={enabled ? CheckCircle2 : XCircle}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </StatusPill>
                      {user.isAdmin && (
                        <StatusPill tone="warning" icon={Crown}>
                          Admin
                        </StatusPill>
                      )}
                      <StatusPill tone="brand">{user.employee ? 'Employee' : 'Non-Employee'}</StatusPill>
                    </>
                  ) : (
                    <>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${enabled ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                        {enabled ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {user.isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning-bg text-warning-fg">
                          <Crown size={11} /> Admin
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand">{user.employee ? 'Employee' : 'Non-Employee'}</span>
                    </>
                  )}
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
                href={detail?.actions.canEmail && user.email ? `mailto:${user.email}` : undefined}
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
