import { useMemo, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  ListChecks,
  ChevronRight,
  List,
  LayoutGrid,
  BarChart3,
  ClipboardCheck,
  Users,
  UserCheck,
  ArrowRightLeft,
  Presentation,
  ListTodo,
  CalendarClock,
  Phone,
  FileText,
  Trophy,
  ArrowDownCircle,
  XCircle,
  CreditCard,
  Leaf,
} from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ROUTES } from '../../../routes'
import { useCustomersSummary } from '../../customers/customers.queries'
import { useUsersSummary } from '../users.queries'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-text-muted">{label}</label>
      {children}
    </div>
  )
}

interface StatRow {
  label: string
  value: number
  icon: ComponentType<{ size?: number }>
  color: IconColor
}

function StatListRow({ row }: { row: StatRow }) {
  const Icon = row.icon
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center ${ICON_STYLES[row.color]}`}>
        <Icon size={15} />
      </span>
      <span className="flex-1 min-w-0 text-sm text-text-muted truncate">{row.label}</span>
      <span className="font-semibold text-text! tabular-nums">{row.value}</span>
    </div>
  )
}

function StatGridTile({ row }: { row: StatRow }) {
  const Icon = row.icon
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
      <span className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center ${ICON_STYLES[row.color]}`}>
        <Icon size={15} />
      </span>
      <p className="text-xl font-bold text-text! leading-none">{row.value}</p>
      <p className="text-xs text-text-faint truncate">{row.label}</p>
    </div>
  )
}

function MiniStatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: ComponentType<{ size?: number }>; color: IconColor }) {
  return (
    <Card className="!h-auto !p-3 flex flex-col items-center text-center gap-1.5">
      <span className={`w-9 h-9 rounded-lg grid place-items-center ${ICON_STYLES[color]}`}>
        <Icon size={16} />
      </span>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl font-bold text-text!">{value}</p>
    </Card>
  )
}

// Stats with a real backend source (customers.queries.ts's /api/customers/
// summary/) are computed live below; the rest (demos/tasks/meetings/calls/
// proposals/leads-won/dropped/loss/paid vs organic leads) have no backing
// endpoint on this app's server, same gap as leave/time-spent — shown as 0
// rather than fabricated, which is honestly what the reference app's own
// demo account returns for this report too.
export function ActivitiesDetailPage() {
  const { data: customersSummary, isLoading: customersLoading } = useCustomersSummary()
  const { data: usersSummary, isLoading: usersLoading } = useUsersSummary()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`

  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(monthEnd)
  const [customerType, setCustomerType] = useState<'prospect' | 'customer'>('prospect')
  const [customerName, setCustomerName] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [ran, setRan] = useState(false)
  const [statsView, setStatsView] = useState<'list' | 'grid'>('list')

  const customerOptions = useMemo(() => {
    const rows = customersSummary?.customers ?? []
    const filtered = rows.filter((c) => (customerType === 'prospect' ? c.nature.includes('Prospect') : c.nature.includes('Customer')))
    return filtered.map((c) => ({ value: c.name, label: c.name }))
  }, [customersSummary, customerType])

  const createdByOptions = useMemo(() => (usersSummary?.users ?? []).map((u) => ({ value: String(u.id), label: u.name })), [usersSummary])

  const totalProspects = customersSummary?.customers.filter((c) => c.nature.includes('Prospect')).length ?? 0
  const totalCustomers = customersSummary?.totalCustomers ?? 0

  const statRows: StatRow[] = [
    { label: 'Total Prospects', value: totalProspects, icon: Users, color: 'blue' },
    { label: 'Total Customers', value: totalCustomers, icon: UserCheck, color: 'green' },
    { label: 'Prospect → Customer', value: 0, icon: ArrowRightLeft, color: 'violet' },
    { label: 'Total Demos Given', value: 0, icon: Presentation, color: 'amber' },
    { label: 'Total Tasks', value: 0, icon: ListTodo, color: 'indigo' },
    { label: 'Total Meetings', value: 0, icon: CalendarClock, color: 'cyan' },
    { label: 'Total Calls', value: 0, icon: Phone, color: 'green' },
    { label: 'Total Proposals', value: 0, icon: FileText, color: 'rose' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListChecks size={20} className="text-brand" /> Task / Activities Details
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-text-faint mt-1">
          <Link to={ROUTES.usersDashboard} className="hover:text-brand hover:underline">
            Users
          </Link>
          <ChevronRight size={12} />
          <Link to={ROUTES.activitiesDetail} className="hover:text-brand hover:underline">
            Activities List
          </Link>
          <ChevronRight size={12} />
          <span className="text-text-muted">Task / Activities Details</span>
        </div>
      </div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Customer Created On">
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <span className="text-text-faint">–</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
          </Field>
          <Field label="Customer Type">
            <select
              value={customerType}
              onChange={(e) => {
                setCustomerType(e.target.value as 'prospect' | 'customer')
                setCustomerName('')
              }}
              className={inputCls}
            >
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
            </select>
          </Field>
          <Field label="Customer Details">
            <SearchableSelect value={customerName} onChange={setCustomerName} options={customerOptions} placeholder={customersLoading ? 'Loading…' : 'Select a third party'} />
          </Field>
          <Field label="Created By">
            <SearchableSelect value={createdBy} onChange={setCreatedBy} options={createdByOptions} placeholder={usersLoading ? 'Loading…' : 'Select a users'} />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => setRan(true)}
          className="mt-4 self-start inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <BarChart3 size={14} /> View Report
        </button>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
        <Card className="!h-auto min-h-[22rem] flex flex-col items-center justify-center gap-3 text-center py-10">
          <span className="w-16 h-16 rounded-2xl grid place-items-center bg-brand/10 text-brand">
            <ClipboardCheck size={30} />
          </span>
          <p className="font-semibold text-text!">{ran ? 'No Details Created On this Dates' : 'Set your filters and run the report'}</p>
          <p className="text-sm text-text-faint max-w-xs">
            {ran ? 'There is no task / activities details for the selected filters. Try changing the filters or date range.' : 'Choose a date range and filters above, then click "View Report".'}
          </p>
        </Card>

        <div className="space-y-4">
          <Card className="!h-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-text!">Statistics</h3>
              <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setStatsView('list')}
                  title="List view"
                  className={`p-1 rounded ${statsView === 'list' ? 'bg-brand text-white' : 'text-text-faint hover:bg-surface-hover'}`}
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setStatsView('grid')}
                  title="Grid view"
                  className={`p-1 rounded ${statsView === 'grid' ? 'bg-brand text-white' : 'text-text-faint hover:bg-surface-hover'}`}
                >
                  <LayoutGrid size={13} />
                </button>
              </div>
            </div>
            {statsView === 'list' ? (
              <div className="divide-y divide-border/60">
                {statRows.map((row) => (
                  <StatListRow key={row.label} row={row} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {statRows.map((row) => (
                  <StatGridTile key={row.label} row={row} />
                ))}
              </div>
            )}
          </Card>

          <Card className="!h-auto">
            <h3 className="font-semibold text-text! mb-3">Leads Summary</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <MiniStatCard label="Leads Won" value={0} icon={Trophy} color="green" />
              <MiniStatCard label="Total Dropped" value={0} icon={ArrowDownCircle} color="amber" />
              <MiniStatCard label="Total Loss" value={0} icon={XCircle} color="rose" />
            </div>
          </Card>

          <Card className="!h-auto">
            <h3 className="font-semibold text-text! mb-3">Paid Leads</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <MiniStatCard label="Total Paid Leads" value={0} icon={CreditCard} color="green" />
              <MiniStatCard label="Total Organic Leads" value={0} icon={Leaf} color="cyan" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
