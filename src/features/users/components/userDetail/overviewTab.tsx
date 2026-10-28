import { useState, type ComponentType, type ReactNode } from 'react'
import { ChevronUp, UserRound, IdCard, Mail, Phone, Briefcase, MapPin, ShieldCheck, CheckCircle2, UsersRound, PhoneCall, Database, WalletCards, FileText, CalendarClock, Clock } from 'lucide-react'
import { useUser, useUserDetail } from '../../users.queries'
import { formatDate, formatMoney } from '../../../../utils/format'
import { Field } from './UserDetailShared'

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

// Fields from userprofile/api/user.php (see users.queries.ts's
// useUserDetail), including the supervisor/expense validator/NRC fields.
export function OverviewTab({ user, detail }: { user: NonNullable<ReturnType<typeof useUser>['user']>; detail: ReturnType<typeof useUserDetail>['detail'] }) {
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
