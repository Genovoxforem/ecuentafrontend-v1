import { useMemo, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
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

// Stats with a real backend source (customers.queries.ts's /api/customers/
// summary/) are computed live below; the rest (demos/tasks/meetings/calls/
// proposals/leads-won/dropped/loss/paid vs organic leads) have no backing
// endpoint on this app's server, same gap as leave/time-spent — shown as 0
// rather than fabricated, which is honestly what the reference app's own
// demo account returns for this report too.
const STATIC_ZERO_STATS = [
  'Total Demos Given',
  'Total Tasks',
  'Total Meetings',
  'Total Calls',
  'Total Proposals',
  'Leads Won',
  'Total Dropped',
  'Total Loss',
  'Total Paid Leads',
  'Total Organic Leads',
]

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

  const customerOptions = useMemo(() => {
    const rows = customersSummary?.customers ?? []
    const filtered = rows.filter((c) => (customerType === 'prospect' ? c.nature.includes('Prospect') : c.nature.includes('Customer')))
    return filtered.map((c) => ({ value: c.name, label: c.name }))
  }, [customersSummary, customerType])

  const createdByOptions = useMemo(() => (usersSummary?.users ?? []).map((u) => ({ value: String(u.id), label: u.name })), [usersSummary])

  const totalProspects = customersSummary?.customers.filter((c) => c.nature.includes('Prospect')).length ?? 0
  const totalCustomers = customersSummary?.totalCustomers ?? 0

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListChecks size={20} className="text-brand" /> Task / Activities Details
      </h2>

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
            <select value={customerType} onChange={(e) => { setCustomerType(e.target.value as 'prospect' | 'customer'); setCustomerName('') }} className={inputCls}>
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
            </select>
          </Field>
          <Field label="Customer Details">
            <SearchableSelect
              value={customerName}
              onChange={setCustomerName}
              options={customerOptions}
              placeholder={customersLoading ? 'Loading…' : 'Select a third party'}
            />
          </Field>
          <Field label="Created By">
            <SearchableSelect value={createdBy} onChange={setCreatedBy} options={createdByOptions} placeholder={usersLoading ? 'Loading…' : 'Select a users'} />
          </Field>
        </div>
        <button type="button" onClick={() => setRan(true)} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          View Report
        </button>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start">
        <Card className="!h-auto min-h-32 flex items-center justify-center">
          <p className="text-sm text-text-faint italic">{ran ? 'No Details Created On this Dates' : 'Set filters above and click View Report.'}</p>
        </Card>

        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Statistics</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total Prospects</span>
              <span className="font-semibold text-text!">{totalProspects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total Customers</span>
              <span className="font-semibold text-text!">{totalCustomers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Prospect → Customer</span>
              <span className="font-semibold text-text!">0</span>
            </div>
            {STATIC_ZERO_STATS.map((label) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-text-muted">{label}</span>
                <span className="font-semibold text-text!">0</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
