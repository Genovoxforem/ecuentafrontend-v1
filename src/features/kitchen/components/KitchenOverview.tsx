import { useState } from 'react'
import { LineChart, Plus, Receipt, Clock, CheckCheck, Monitor, Inbox, X, ArrowRight } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { useCreateKitchenOrder, useSetKitchenOrderStatus, type KitchenSummary, type KitchenTicket, type TicketStatus } from '../kitchen.queries'

type Tab = 'all' | 'pending' | 'completed'

const STATUS_STYLES: Record<TicketStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-warning-bg text-warning-fg' },
  active: { label: 'In Progress', cls: 'bg-info-bg text-info-fg' },
  completed: { label: 'Completed', cls: 'bg-success-bg text-success-fg' },
}

const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  pending: 'active',
  active: 'completed',
  completed: null,
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function NewOrderForm({ onClose }: { onClose: () => void }) {
  const createOrder = useCreateKitchenOrder()
  const [tableOrRef, setTableOrRef] = useState('')
  const [items, setItems] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!tableOrRef.trim() || !items.trim()) {
      setError('Table/ref and items are both required.')
      return
    }
    createOrder({ tableOrRef, items })
    onClose()
  }

  return (
    <Card className="border-brand/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">New Order</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Table / Ref</span>
          <input
            type="text"
            value={tableOrRef}
            onChange={(e) => setTableOrRef(e.target.value)}
            placeholder="e.g. Table 4"
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Items</span>
          <input
            type="text"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="e.g. 2x Burger, 1x Fries"
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
      </div>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="flex justify-end mt-3">
        <button type="button" onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Send to kitchen
        </button>
      </div>
    </Card>
  )
}

function TicketCard({ ticket }: { ticket: KitchenTicket }) {
  const setStatus = useSetKitchenOrderStatus()
  const next = NEXT_STATUS[ticket.status]
  const status = STATUS_STYLES[ticket.status]
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text!">{ticket.tableOrRef}</span>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.label}</span>
      </div>
      <p className="text-sm text-text-muted">{ticket.items}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-text-faint">{ticket.ref} · {timeLabel(ticket.createdAt)}</span>
        {next && (
          <button
            type="button"
            onClick={() => setStatus(ticket.ref, next)}
            className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Mark {STATUS_STYLES[next].label} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </Card>
  )
}

export function KitchenOverview({ summary }: { summary: KitchenSummary }) {
  const [tab, setTab] = useState<Tab>('all')
  const [showNewOrder, setShowNewOrder] = useState(false)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: summary.totalOrders },
    { key: 'pending', label: 'Pending Orders', count: summary.pendingOrders },
    { key: 'completed', label: 'Completed Orders', count: summary.completedOrders },
  ]

  const visibleTickets = summary.tickets.filter((t) => {
    if (tab === 'pending') return t.status === 'pending' || t.status === 'active'
    if (tab === 'completed') return t.status === 'completed'
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <LineChart size={20} className="text-brand" /> Kitchen Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewOrder((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> New Order
          </button>
        </div>
      </div>

      {showNewOrder && <NewOrderForm onClose={() => setShowNewOrder(false)} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Orders</p>
            <p className="text-3xl font-bold text-text! mt-1">{summary.totalOrders}</p>
            <p className="text-xs text-text-faint mt-1">Today&apos;s orders</p>
          </div>
          <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.violet}`}>
            <Receipt size={20} />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Active Orders</p>
            <p className="text-3xl font-bold text-text! mt-1">{summary.activeOrders}</p>
            <p className="text-xs text-text-faint mt-1">Orders in progress</p>
          </div>
          <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.rose}`}>
            <Clock size={20} />
          </span>
        </Card>
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Completed Orders</p>
            <p className="text-3xl font-bold text-text! mt-1">{summary.completedOrders}</p>
            <p className="text-xs text-text-faint mt-1">Finished orders</p>
          </div>
          <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
            <CheckCheck size={20} />
          </span>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-text-muted">
          <Monitor size={16} /> Token Status Overview
        </h3>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-border pb-3 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === t.key ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'}`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        {visibleTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-faint">
            <Inbox size={32} />
            <p className="text-sm">No orders found for this status</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleTickets.map((t) => (
              <TicketCard key={t.ref} ticket={t} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
