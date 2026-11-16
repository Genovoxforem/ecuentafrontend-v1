import { Info, Eye, BarChart3, Percent, Coins, TrendingUp, Calendar, Briefcase, Settings, FileText, Tag } from 'lucide-react'
import { Card, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import type { ProjectRow } from '../projects.queries'
import { useGeneralSettings } from '../../settings/settings.queries'

const usageChecks = [
  { label: 'Follow Opportunity', key: 'opportunity' },
  { label: 'Follow Tasks Or Time Spent', key: 'task' },
  { label: 'Bill The Time Spent', key: 'billTime' },
] as const

// The classic card prints amounts without trailing zeros ("5,000 ZMW", "1,000 ZMW"); a non-integer amount was not seen there.
const amountText = (n: number | null | undefined, currency: string) => (n == null ? '—' : `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`)

export function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0 text-sm">
      <Icon size={15} className="text-text-faint mt-0.5 shrink-0" />
      <span className="text-text-muted w-44 shrink-0">{label}</span>
      <span className="text-text! flex-1 min-w-0">{value}</span>
    </div>
  )
}

// The same Project Information / Usage / Description & Tags card group the
// Project tab shows — the classic contact.php and tasks.php both repeat this
// recap above their own tab-specific content — so every project sub-tab
// calls this same component instead of only the Project tab having it.
export function ProjectInfoCards({ project }: { project: ProjectRow }) {
  const { data: general } = useGeneralSettings()
  const currency = general?.currency ?? ''
  const opp = project.opportunity
  // The classic card shows the lead rows only for a project that follows an opportunity; the weighted amount is amount x probability.
  const weighted = opp && opp.amount != null && opp.percent != null ? (opp.amount * opp.percent) / 100 : null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <SectionHeading icon={Info}>Project Information</SectionHeading>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div>
            <InfoRow icon={Eye} label="Visibility" value={project.visibility || '—'} />
            <InfoRow icon={BarChart3} label="Lead Status" value={opp?.label || '—'} />
            <InfoRow icon={Percent} label="Lead Probability" value={opp?.percent != null ? `${opp.percent} %` : '—'} />
            <InfoRow icon={Coins} label="Lead Amount" value={amountText(opp?.amount, currency)} />
          </div>
          <div>
            <InfoRow icon={TrendingUp} label="Opportunity Weighted Amount" value={amountText(weighted, currency)} />
            <InfoRow icon={Calendar} label="Start Date – End Date" value={project.startDate || project.endDate ? `${project.startDate || '—'} - ${project.endDate || '—'}` : '—'} />
            <InfoRow icon={Briefcase} label="Budget" value={project.budgetAmount ? amountText(Number(project.budgetAmount.replace(/,/g, '')), currency) : '—'} />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="!h-auto shrink-0">
          <InfoRow
            icon={Settings}
            label="Usage"
            value={
              <div className="space-y-1.5">
                {usageChecks.map(({ label, key }) => (
                  <label key={label} className="flex items-center gap-2 text-text-muted cursor-not-allowed">
                    <input type="checkbox" disabled checked={!!project.usage?.[key]} readOnly title="Changing the usage needs the project edit, which has no API yet" className="rounded border-input-border" />
                    {label}
                  </label>
                ))}
              </div>
            }
          />
        </Card>

        <Card className="flex-1">
          <SectionHeading icon={FileText}>Description & Tags</SectionHeading>
          <div className="mt-2">
            <InfoRow icon={FileText} label="Description" value={project.description || '—'} />
            <InfoRow icon={Tag} label="Tags / Categories" value="—" />
          </div>
        </Card>
      </div>
    </div>
  )
}
