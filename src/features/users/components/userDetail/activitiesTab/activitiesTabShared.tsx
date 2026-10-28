import type { ActivityMeta, ActivityProcessType } from '../../../userDetailTabs.queries'

export const PROCESS_LABEL: Record<ActivityProcessType, string> = { task: 'Task', meeting: 'Meeting', calls: 'Call' }

export function accountingNeedsLabel(value: string, meta: ActivityMeta | undefined): string {
  if (!value) return '—'
  return meta?.accountingNeeds.find((a) => a.value === value)?.label ?? value
}
