import { Info, Eye, BarChart3, Percent, Coins, TrendingUp, Calendar, Briefcase, Settings, FileText, Tag } from 'lucide-react'
import { Card, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import type { ProjectRow } from '../projects.queries'

const usageChecks = ['Follow Opportunity', 'Follow Tasks Or Time Spent', 'Bill The Time Spent'] as const

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
// Project tab shows — confirmed live against the real page's contact.php
// and tasks.php (both repeat this exact recap above their own tab-specific
// content, e.g. contact.php?id=1) — so every project sub-tab calls this
// same component instead of only the Project tab having it.
export function ProjectInfoCards({ project }: { project: ProjectRow }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <SectionHeading icon={Info}>Project Information</SectionHeading>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div>
            <InfoRow icon={Eye} label="Visibility" value={project.visibility || '—'} />
            <InfoRow icon={BarChart3} label="Lead Status" value="—" />
            <InfoRow icon={Percent} label="Lead Probability" value="—" />
            <InfoRow icon={Coins} label="Lead Amount" value="—" />
          </div>
          <div>
            <InfoRow icon={TrendingUp} label="Opportunity Weighted Amount" value="—" />
            <InfoRow icon={Calendar} label="Start Date – End Date" value={project.startDate || project.endDate ? `${project.startDate || '—'} - ${project.endDate || '—'}` : '—'} />
            <InfoRow icon={Briefcase} label="Budget" value={project.budgetAmount || '—'} />
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
                {usageChecks.map((label) => (
                  <label key={label} className="flex items-center gap-2 text-text-muted cursor-not-allowed">
                    <input type="checkbox" disabled title="No real API available on this backend" className="rounded border-input-border" />
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
            <InfoRow icon={FileText} label="Description" value="—" />
            <InfoRow icon={Tag} label="Tags / Categories" value="—" />
          </div>
        </Card>
      </div>
    </div>
  )
}
