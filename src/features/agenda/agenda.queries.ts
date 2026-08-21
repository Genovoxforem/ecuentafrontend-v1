import { useQueryClient } from '@tanstack/react-query'
import { useLocalCollection } from '../../shared/localCollection'

export interface ActivityEvent {
  id: string
  label: string
  category: string
  authorName: string
  date: string
}

interface RecentActivityParams {
  category: string
  limit: number
}

const KEY = ['local', 'activity'] as const
const SEED: ActivityEvent[] = []

// No backend endpoint exists for agenda/activity (llx_actioncomm) on this
// app's server. Rather than invent fake notification data, this reads a
// local activity log that other features' create actions append to (see
// useLogActivity below) — so it's honest in both directions: empty until
// something real happens in this session, and genuine when it does.
export function useRecentActivity({ category, limit }: RecentActivityParams) {
  const [events] = useLocalCollection(KEY, SEED)
  const filtered = category === 'all' ? events : events.filter((e) => e.category === category)
  return { data: filtered.slice(0, limit), isLoading: false }
}

let idSeq = 1

// `date` is optional and defaults to now — every existing caller (create
// actions across the app logging themselves as they happen) omits it and
// keeps working unchanged. Passing it explicitly is only for the Agenda
// calendar's own "+ New Event" form, where the user picks a date that isn't
// necessarily today.
export function useLogActivity() {
  const queryClient = useQueryClient()
  return (event: Omit<ActivityEvent, 'id' | 'date'> & { date?: string }) => {
    queryClient.setQueryData<ActivityEvent[]>(KEY, (current) => [
      { ...event, id: `local-${idSeq++}`, date: event.date ?? new Date().toISOString() },
      ...(current ?? SEED),
    ])
  }
}
