import { useLocalCollection, nextLocalRef } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'

export type TicketStatus = 'pending' | 'active' | 'completed'

export interface KitchenTicket {
  ref: string
  tableOrRef: string
  items: string
  status: TicketStatus
  createdAt: string
}

export interface KitchenSummary {
  totalOrders: number
  activeOrders: number
  completedOrders: number
  pendingOrders: number
  tickets: KitchenTicket[]
}

const SEED: KitchenSummary = {
  totalOrders: 0,
  activeOrders: 0,
  completedOrders: 0,
  pendingOrders: 0,
  tickets: [],
}

const KEY = ['local', 'kitchen'] as const

function recount(tickets: KitchenTicket[]) {
  return {
    totalOrders: tickets.length,
    pendingOrders: tickets.filter((t) => t.status === 'pending').length,
    activeOrders: tickets.filter((t) => t.status === 'active').length,
    completedOrders: tickets.filter((t) => t.status === 'completed').length,
  }
}

// No backend endpoint exists for the kitchen module on this app's server.
// Held in react-query's cache only — see shared/localCollection.ts — so
// adding/advancing an order's status here feels real in the browser but
// never persists anywhere.
export function useKitchenSummary() {
  const [data] = useLocalCollection(KEY, SEED)
  return { data, isError: false, isLoading: false }
}

export function useCreateKitchenOrder() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return (input: { tableOrRef: string; items: string }) => {
    const ticket: KitchenTicket = {
      ref: nextLocalRef('KOT'),
      tableOrRef: input.tableOrRef,
      items: input.items,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    update((current) => {
      const tickets = [ticket, ...current.tickets]
      return { ...current, ...recount(tickets), tickets }
    })
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: `New kitchen order ${ticket.ref} — ${ticket.tableOrRef}`, category: 'tasks', authorName })
  }
}

export function useSetKitchenOrderStatus() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (ref: string, status: TicketStatus) => {
    update((current) => {
      const tickets = current.tickets.map((t) => (t.ref === ref ? { ...t, status } : t))
      return { ...current, ...recount(tickets), tickets }
    })
  }
}
