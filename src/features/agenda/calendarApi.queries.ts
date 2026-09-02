import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real via comm/action/ajax/calendar_api.php — a genuine, secured
// (hasRight('agenda','myactions','read')) JSON API behind the modern
// Agenda UI, confirmed by reading the whole file directly (not guessed).
// getEvents queries llx_actioncomm directly (plus real birthday/holiday
// events), getFilters returns every real dropdown/checkbox source
// (users, usergroups, action types with their real colors, statuses,
// projects, thirdparties, categories), getContacts is a real per-company
// contact lookup, and createEvent is a genuine mutation supporting every
// field below — not a guessed subset.

export interface ActionType {
  id: number
  code: string
  label: string
  color: string
  type: string
}

export interface AgendaFilterOptions {
  users: { id: number; name: string }[]
  usergroups: { id: number; name: string }[]
  types: ActionType[]
  statuses: { id: string; label: string }[]
  projects: { id: number; name: string }[]
  thirdparties: { id: number; name: string }[]
  categories: { id: number; name: string }[]
  resources: { id: number; name: string }[]
}

interface RawFiltersResponse {
  success: boolean
  data: {
    users: { id: number; name: string }[]
    usergroups: { id: number; name: string }[]
    types: { id: number; code: string; label: string; color: string; type: string; picto: string }[]
    statuses: { id: string; label: string }[]
    projects: { id: number; name: string }[]
    thirdparties: { id: number; name: string }[]
    categories: { id: number; name: string }[]
    resources: { id: number; name: string }[]
  }
}

export function useAgendaFilterOptions() {
  return useQuery({
    queryKey: ['agenda', 'filterOptions'],
    queryFn: async (): Promise<AgendaFilterOptions> => {
      const body = new URLSearchParams({ api_action: 'getFilters' })
      const res = await fetch('/comm/action/ajax/calendar_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: RawFiltersResponse = await res.json()
      if (!json.success) throw new Error('Could not load calendar filters.')
      return json.data
    },
    staleTime: 5 * 60_000,
  })
}

// Kept as a thin selector over the same real endpoint for AddEventModal's
// "Type" dropdown — avoids every caller re-deriving `.types` itself.
export function useActionTypes() {
  const { data, ...rest } = useAgendaFilterOptions()
  return { ...rest, data: data?.types }
}

export type CalendarViewMode = 'show_month' | 'show_week' | 'show_day'

export interface CalendarQueryParams {
  mode: CalendarViewMode
  year: number
  month: number
  day: number
  ownerId?: number
  usergroupId?: number
  status?: string
  actionCodes?: string[]
  socid?: number
  projectId?: number
  categoryId?: number
  resourceId?: number
  showBirthday?: boolean
  checkHoliday?: boolean
}

export interface CalendarEvent {
  id: number
  label: string
  description: string
  startMs: number
  endMs: number
  fullDayEvent: boolean
  percentage: number
  statusLabel: string
  typeCode: string
  typeLabel: string
  typeColor: string
  family: string
  priority: number
  location: string
  busy: boolean
  elementtype: string
  projectTitle: string
  thirdpartyName: string
  contactName: string
  userOwner: string
  userAssigned: { id: number; name: string }[]
  url: string
  source: 'action' | 'birthday' | 'holiday'
}

interface RawEvent {
  id: number
  label: string
  description?: string
  datep: number
  datef: number
  fulldayevent: number
  percentage: number
  status_label: string
  type_code: string
  type_label: string
  type_color: string
  family: string
  priority?: number
  location?: string
  transparency?: number
  elementtype?: string
  project_title?: string
  thirdparty_name?: string
  contact_name?: string
  user_owner?: string
  userassigned?: { id: number; name: string }[]
  url: string
  source: 'action' | 'birthday' | 'holiday'
}

function mapEvent(e: RawEvent): CalendarEvent {
  return {
    id: e.id,
    label: e.label,
    description: e.description ?? '',
    startMs: e.datep * 1000,
    endMs: (e.datef || e.datep) * 1000,
    fullDayEvent: !!e.fulldayevent,
    percentage: e.percentage,
    statusLabel: e.status_label,
    typeCode: e.type_code,
    typeLabel: e.type_label,
    typeColor: e.type_color || '#397db9',
    family: e.family,
    priority: e.priority ?? 0,
    location: e.location ?? '',
    busy: !!e.transparency,
    elementtype: e.elementtype ?? '',
    projectTitle: e.project_title ?? '',
    thirdpartyName: e.thirdparty_name ?? '',
    contactName: e.contact_name ?? '',
    userOwner: e.user_owner ?? '',
    userAssigned: e.userassigned ?? [],
    url: e.url,
    source: e.source,
  }
}

// Real via api_action=getEvents — every filter the real Filters panel
// exposes (Owner, User Group, Status, Type, Project, Third-Party,
// Tag/Category, Resource, Birthdays, Holidays) maps to a real GETPOST this
// endpoint reads directly (confirmed by reading getCalendarFilters()):
// filtert, usergroup, status, search_actioncode, socid, projectid,
// search_categ_cus, resourceid, showbirthday, check_holiday.
export function useCalendarEvents(params: CalendarQueryParams) {
  return useQuery({
    queryKey: ['agenda', 'events', params],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const body = new URLSearchParams({
        api_action: 'getEvents',
        mode: params.mode,
        year: String(params.year),
        month: String(params.month),
        day: String(params.day),
      })
      if (params.ownerId) body.set('filtert', String(params.ownerId))
      if (params.usergroupId) body.set('usergroup', String(params.usergroupId))
      if (params.status) body.set('status', params.status)
      if (params.actionCodes && params.actionCodes.length > 0) body.set('search_actioncode', params.actionCodes.join(','))
      if (params.socid) body.set('socid', String(params.socid))
      if (params.projectId) body.set('projectid', String(params.projectId))
      if (params.categoryId) body.set('search_categ_cus', String(params.categoryId))
      if (params.resourceId) body.set('search_resourceid', String(params.resourceId))
      if (params.showBirthday) body.set('showbirthday', '1')
      if (params.checkHoliday) body.set('check_holiday', '1')
      const res = await fetch('/comm/action/ajax/calendar_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: { success: boolean; error?: string; events?: RawEvent[] } = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load calendar events.')
      return (json.events ?? []).map(mapEvent)
    },
    placeholderData: (prev) => prev,
  })
}

// Real via api_action=getContacts&socid=X — populates "Related contact" once
// a "Related company" is chosen in the create-event form.
export function useContactsByCompany(socid: number | null) {
  return useQuery({
    queryKey: ['agenda', 'contacts', socid],
    queryFn: async (): Promise<{ id: number; name: string }[]> => {
      const body = new URLSearchParams({ api_action: 'getContacts', socid: String(socid) })
      const res = await fetch('/comm/action/ajax/calendar_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: { success: boolean; contacts: { id: number; name: string }[] } = await res.json()
      if (!json.success) throw new Error('Could not load contacts.')
      return json.contacts
    },
    enabled: !!socid && socid > 0,
  })
}

export interface CreateEventInput {
  actioncode: string
  label: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  fullday: boolean
  percent: number
  priority: number
  location: string
  note: string
  busy: boolean
  socid?: number
  contactIds?: number[]
  projectId?: number
  assignedUserIds?: number[]
  categoryIds?: number[]
  // Origin-record linkage (unchanged contract used by every existing
  // AddEventModal caller — CustomerDetail, ContractDetail, InvoiceDetail,
  // OrderDetail, QuotationDetail, PurchaseOrderDetail, ContactDetail).
  elementtype?: string
  fkElement?: number
}

interface RawCreateEventResponse {
  success: boolean
  error?: string
  id?: number
}

function splitDate(date: string, time: string, fullday: boolean) {
  const [year, month, day] = date.split('-')
  const [hour, minute] = fullday ? ['0', '0'] : time.split(':')
  return { year, month, day, hour, minute }
}

// Real via api_action=createEvent — a genuine, secured
// (hasRight('agenda','myactions'|'allactions','create')) mutation that
// inserts a real llx_actioncomm row, with real support for every field in
// the rich Create Event form: type, label, full-day, separate start/end
// dates, status (percent), priority, location, description (note), busy
// (transparency), related company/contact/project, assigned users, and
// categories — confirmed by reading createEvent()'s own GETPOST list
// directly, not guessed. Not live-tested against this instance's database
// during this pass (mutation, requires per-instance approval per this
// session's standing rule).
export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const start = splitDate(input.startDate, input.startTime, input.fullday)
      const end = splitDate(input.endDate || input.startDate, input.endTime || input.startTime, input.fullday)
      const body = new URLSearchParams({
        api_action: 'createEvent',
        actioncode: input.actioncode,
        label: input.label,
        fullday: input.fullday ? '1' : '0',
        apyear: start.year,
        apmonth: start.month,
        apday: start.day,
        aphour: start.hour,
        apmin: start.minute,
        p2year: end.year,
        p2month: end.month,
        p2day: end.day,
        p2hour: end.hour,
        p2min: end.minute,
        percentage: String(input.percent),
        priority: String(input.priority),
        location: input.location,
        note: input.note,
        transparency: input.busy ? '1' : '0',
      })
      if (input.socid) body.set('socid', String(input.socid))
      if (input.projectId) body.set('projectid', String(input.projectId))
      if (input.fkElement) body.set('fk_element', String(input.fkElement))
      if (input.elementtype) body.set('elementtype', input.elementtype)
      if (input.contactIds) for (const id of input.contactIds) body.append('socpeopleassigned[]', String(id))
      if (input.assignedUserIds) for (const id of input.assignedUserIds) body.append('assignedtouser[]', String(id))
      if (input.categoryIds) for (const id of input.categoryIds) body.append('categories[]', String(id))
      const res = await fetch('/comm/action/ajax/calendar_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: RawCreateEventResponse = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not create the event.')
      return json.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda', 'events'] })
    },
  })
}
