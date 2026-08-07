import { FileText, TrendingUp, Scale, FileBarChart } from 'lucide-react'
import { Card } from '../../shared/components/dashboard/DashboardKit'

const REPORT_TYPES = [
  { label: 'Income & Expense', caption: 'Cash flow by category', icon: FileBarChart },
  { label: 'Profit & Loss', caption: 'Revenue vs. cost over a period', icon: TrendingUp },
  { label: 'Trial Balance', caption: 'Account balances at a point in time', icon: Scale },
]

// Was leftover template scaffolding (fetched /posts from an unrelated demo
// API, styled in the old pre-rebrand dark-slate theme) reachable from Home's
// "Last 7 Sales" View All link and the Reports nav item. None of these
// report types have a real page or backend endpoint yet, so this is an
// honest "not built yet" landing rather than the previous broken demo.
export function ReportsModule() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileText size={20} className="text-brand" /> Reports
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORT_TYPES.map(({ label, caption, icon: Icon }) => (
          <Card key={label} className="flex items-start gap-3 opacity-80">
            <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
              <Icon size={18} />
            </span>
            <div>
              <p className="font-semibold text-text!">{label}</p>
              <p className="text-xs text-text-faint mt-0.5">{caption}</p>
              <p className="text-xs text-text-faint mt-2 italic">Not built yet</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
