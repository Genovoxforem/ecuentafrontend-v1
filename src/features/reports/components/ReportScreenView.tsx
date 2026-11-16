import { useState } from 'react'
import { Info, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { isoDate } from '../reportFormat'
import type { ReportScreen } from '../reportScreens'
import { inputCls, primaryBtn } from './ReportWidgets'

// A Reports Center entry whose API is not available yet: the screen of the classic page (its filters and the columns of its table), empty.
// Nothing is read or invented; when the API exists the rows go into this same table.
export function ReportScreenView({ title, phpPath, screen, note }: { title: string; phpPath: string; screen: ReportScreen; note?: string }) {
  const today = isoDate(new Date())
  const [asked, setAsked] = useState(false)
  return (
    <div className="space-y-4">
      {screen.filters.length > 0 && (
        <Card className="!h-auto">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              setAsked(true)
            }}
          >
            {screen.filters.map((f) => (
              <label key={f.label} className="text-sm font-medium text-text">
                <span className="mb-1 block">{f.label}</span>
                {f.kind === 'range' ? (
                  <span className="flex items-center gap-2">
                    <input type="date" defaultValue={today} className={inputCls} aria-label={`${f.label} from`} />
                    <span className="text-text-muted">to</span>
                    <input type="date" defaultValue={today} className={inputCls} aria-label={`${f.label} to`} />
                  </span>
                ) : f.kind === 'year' ? (
                  <input type="number" defaultValue={new Date().getFullYear()} className={`${inputCls} w-28`} aria-label={f.label} />
                ) : f.kind === 'select' ? (
                  <select className={`${inputCls} min-w-44`} aria-label={f.label}>
                    <option value="">{f.placeholder ?? 'All'}</option>
                  </select>
                ) : (
                  <input className={`${inputCls} min-w-40`} aria-label={f.label} />
                )}
              </label>
            ))}
            <button type="submit" className={primaryBtn}>
              <Search size={14} /> {screen.button ?? 'View Report'}
            </button>
          </form>
        </Card>
      )}
      <p className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-muted" role="status">
        <Info size={16} className="mt-0.5 shrink-0 text-info-fg" />
        <span>
          {asked ? 'The data of this report is not connected yet' : 'This screen is ready; its data is not connected yet'}: there is no JSON API for it (classic page <code className="rounded bg-surface-hover px-1">{phpPath}</code>).
          {note ? ` ${note}` : ''}
        </span>
      </p>
      <LegacyReportTable title={title} table={{ headers: screen.columns.length ? screen.columns : [title], rows: [] }} />
    </div>
  )
}
