import { useState } from 'react'
import {
  Briefcase,
  UserRound,
  List,
  UsersRound,
  Users,
  ClipboardList,
  CalendarPlus,
  CalendarDays,
  Receipt,
  FileText,
  CalendarClock,
  Calendar,
  ChartColumn,
  Tags,
  CircleDollarSign,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { ActionGroupCard, Card } from '../../../shared/components/dashboard/DashboardKit'

const REPORTS = ['List of expense reports', 'Expenses by Category', 'Expenses by Employee', 'Refund History', "Event's History"]

export function HrmArea() {
  const [tab, setTab] = useState<'area' | 'reports'>('area')
  const [selectedReport, setSelectedReport] = useState('')

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Briefcase size={20} className="text-brand" /> HRM Area
      </h2>

      <div className="flex items-center gap-2 border-b border-border">
        {(['area', 'reports'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t === 'area' ? 'HRM Area' : 'Reports'}
          </button>
        ))}
      </div>

      {tab === 'area' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActionGroupCard
            icon={Users}
            title="Users/Groups"
            columns={3}
            actions={[
              { icon: UserRound, label: 'New User', path: ROUTES.userCreate },
              { icon: List, label: 'User List', path: ROUTES.usersDashboard },
              { icon: UsersRound, label: 'New Group', path: ROUTES.userGroupCreate },
              { icon: Users, label: 'Group List', path: ROUTES.userGroupList },
              { icon: ClipboardList, label: 'Activities List' },
            ]}
          />
          <ActionGroupCard
            icon={Receipt}
            title="HRM"
            columns={3}
            actions={[
              { icon: CalendarPlus, label: 'Leave request' },
              { icon: CalendarDays, label: 'List Leave' },
              { icon: Receipt, label: 'New Expense reports' },
              { icon: Receipt, label: 'List Expense reports' },
              { icon: FileText, label: 'Monthly statement' },
            ]}
          />
          <ActionGroupCard
            icon={Calendar}
            title="Agenda"
            columns={3}
            actions={[
              { icon: CalendarClock, label: 'Events' },
              { icon: CalendarDays, label: 'Events List' },
              { icon: Calendar, label: 'Calendar' },
              { icon: ChartColumn, label: 'Reporting' },
            ]}
          />
          <ActionGroupCard
            icon={Tags}
            title="Settings"
            columns={3}
            actions={[
              { icon: Tags, label: 'Users tags/categories', path: ROUTES.userTags },
              { icon: CircleDollarSign, label: 'Expense Accounting' },
            ]}
          />
        </div>
      ) : (
        <Card>
          <h3 className="text-sm font-semibold text-text! mb-3">Reports</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {REPORTS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                <input type="radio" name="hrm-report" checked={selectedReport === r} onChange={() => setSelectedReport(r)} className="text-brand focus:ring-brand/30" />
                {r}
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
