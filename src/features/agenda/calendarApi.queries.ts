import { useMutation, useQuery } from '@tanstack/react-query'

export interface ActionType {
  id: number
  code: string
  label: string
}

interface RawFiltersResponse {
  success: boolean
  data: { types: { id: number; code: string; label: string }[] }
}

// Real via comm/action/ajax/calendar_api.php (api_action=getFilters) — a
// genuine, secured (hasRight('agenda','myactions','read')) JSON API behind
// the modern Agenda UI. Used here only for its real action-type dropdown
// (llx_c_actioncomm) — see useCreateEvent below for the create action.
export function useActionTypes() {
  return useQuery({
    queryKey: ['agenda', 'actionTypes'],
    queryFn: async (): Promise<ActionType[]> => {
      const body = new URLSearchParams({ api_action: 'getFilters' })
      const res = await fetch('/comm/action/ajax/calendar_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: RawFiltersResponse = await res.json()
      if (!json.success) throw new Error('Could not load event types.')
      return json.data.types
    },
  })
}

export interface CreateEventInput {
  actioncode: string
  label: string
  date: string
  time: string
  fullday: boolean
  elementtype: string
  fkElement: number
  socid?: number
}

interface RawCreateEventResponse {
  success: boolean
  error?: string
  id?: number
}

// Real via comm/action/ajax/calendar_api.php (api_action=createEvent) — a
// genuine, secured (hasRight('agenda','myactions'|'allactions','create'))
// mutation that inserts a real llx_actioncomm row linked back to the
// origin record via fk_element/elementtype. Not live-tested against this
// instance's database during this pass (mutation, requires per-instance
// approval per this session's standing rule) — wired from the real PHP
// source read directly, not guessed.
export function useCreateEvent() {
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const [year, month, day] = input.date.split('-')
      const [hour, minute] = input.fullday ? ['0', '0'] : input.time.split(':')
      const body = new URLSearchParams({
        api_action: 'createEvent',
        actioncode: input.actioncode,
        label: input.label,
        fullday: input.fullday ? '1' : '0',
        apyear: year,
        apmonth: month,
        apday: day,
        aphour: hour,
        apmin: minute,
        p2year: year,
        p2month: month,
        p2day: day,
        p2hour: hour,
        p2min: minute,
        fk_element: String(input.fkElement),
        elementtype: input.elementtype,
      })
      if (input.socid) body.set('socid', String(input.socid))
      const res = await fetch('/comm/action/ajax/calendar_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json: RawCreateEventResponse = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not create the event.')
      return json.id
    },
  })
}
