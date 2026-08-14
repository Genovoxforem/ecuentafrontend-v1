import type { ComponentType } from 'react'
import { Card } from './DashboardKit'

// Generic "honest not-built-yet landing" for nav items that link somewhere
// real (so they don't silently bounce to /dashboard) but have no backend
// endpoint or page built yet — same convention as ReportsModule.tsx.
export function NotBuiltPage({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {title}
      </h2>
      <Card className="flex items-start gap-3 opacity-80">
        <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
          <Icon size={18} />
        </span>
        <div>
          <p className="font-semibold text-text!">{title}</p>
          <p className="text-xs text-text-faint mt-0.5">{description}</p>
          <p className="text-xs text-text-faint mt-2 italic">Not built yet</p>
        </div>
      </Card>
    </div>
  )
}
