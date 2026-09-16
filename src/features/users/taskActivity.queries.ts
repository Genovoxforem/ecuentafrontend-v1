import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import {
  parseTaskActivityRows,
  parseTaskActivityKanbanForm,
  parseTaskActivityStats,
  parseTaskActivityKanbanCards,
  type TaskActivityRow,
  type TaskActivityKanbanFormContext,
  type TaskActivityStats,
  type TaskActivityKanbanCard,
} from './taskActivityParser'

function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !!doc.querySelector('input[name="password"]')
}

export type TaskActivityType = 'task' | 'meeting' | 'calls'

export interface TaskActivityReportInput {
  token: string
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
  type: TaskActivityType
  thirdPartyId: string // '-1' = all third parties
}

// yyyy-mm-dd -> MM/DD/YYYY, the real page's own daterangepicker format for
// its single combined `newdatepicker` field (confirmed live:
// "09/01/2026-09/30/2026").
function toLegacyDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

async function fetchTaskActivityRows(input: TaskActivityReportInput): Promise<TaskActivityRow[]> {
  const body = new URLSearchParams({
    token: input.token,
    modecompta: 'BOOKKEEPING',
    newdatepicker: `${toLegacyDate(input.from)}-${toLegacyDate(input.to)}`,
    type: input.type,
    customerdet: input.thirdPartyId || '-1',
    Search: 'View Report',
  })
  const res = await fetch('/compta/resultat/task_activity.php', { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return parseTaskActivityRows(doc)
}

export interface CombinedActivityRow extends TaskActivityRow {
  activityType: TaskActivityType
}

export interface CombinedActivitiesInput {
  token: string
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
  thirdPartyId: string // '-1' = all third parties
}

const ALL_ACTIVITY_TYPES: TaskActivityType[] = ['task', 'meeting', 'calls']

// Real: task_activity.php's own `type` radio only ever accepts one value at
// a time — there is no "all types" option on the real page, and no
// Customer Type/Created By filters either (those two only exist on the
// Kanban report's own form, see below). A single merged "Activities List"
// table with a Type column — the shape this app's unified activities screen
// needs — is genuinely three real searches run in parallel and combined
// client-side, not a single backend call.
export function useRunCombinedActivitiesReport() {
  return useMutation({
    mutationFn: async (input: CombinedActivitiesInput): Promise<CombinedActivityRow[]> => {
      const results = await Promise.all(
        ALL_ACTIVITY_TYPES.map(async (type) => {
          const rows = await fetchTaskActivityRows({ token: input.token, from: input.from, to: input.to, type, thirdPartyId: input.thirdPartyId })
          return rows.map((row): CombinedActivityRow => ({ ...row, activityType: type }))
        }),
      )
      return results.flat().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    },
  })
}

// ── Kanban view (task_activity-kanban.php) — see taskActivityParser.ts's own
// comment on this report's different shape (per-customer cards + a real,
// live-computed Statistics sidebar) and why it's a separate set of hooks
// rather than a variant of the plain list report above.

export function useTaskActivityKanbanForm() {
  return useQuery({
    queryKey: ['users', 'taskActivity', 'kanbanForm'],
    queryFn: async (): Promise<TaskActivityKanbanFormContext> => {
      const doc = await fetchLegacyDocument('/compta/resultat/task_activity-kanban.php')
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseTaskActivityKanbanForm(doc)
    },
  })
}

export interface TaskActivityKanbanReportInput {
  token: string
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
  customerType: string // '2'=Prospect, '3'=ProspectCustomer, '1'=Customer, '0'=NorProspectNorCustomer
  thirdPartyId: string // '-1' = all third parties
  createdByUserId: string // '-1' = all users
}

export interface TaskActivityKanbanReportResult {
  stats: TaskActivityStats
  cards: TaskActivityKanbanCard[]
}

export function useRunTaskActivityKanbanReport() {
  return useMutation({
    mutationFn: async (input: TaskActivityKanbanReportInput): Promise<TaskActivityKanbanReportResult> => {
      const body = new URLSearchParams({
        token: input.token,
        modecompta: 'BOOKKEEPING',
        newdatepicker: `${toLegacyDate(input.from)}-${toLegacyDate(input.to)}`,
        client: input.customerType,
        customerdet: input.thirdPartyId || '-1',
        fk_user: input.createdByUserId || '-1',
        Search: 'View Report',
      })
      const res = await fetch('/compta/resultat/task_activity-kanban.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return { stats: parseTaskActivityStats(doc), cards: parseTaskActivityKanbanCards(doc) }
    },
  })
}
