import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Check, X, Plus, Trash2, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'
import { api } from '../../../api/axios'
import { formatMoney } from '../../../utils/format'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useLogActivity } from '../../agenda/agenda.queries'
import { useAuth } from '../../auth/AuthContext'

interface ProjectOption {
  id: number
  ref: string
  title: string
}

// GET /api/salesorder/?action=get_projects&socid=X — confirmed real
// endpoint (read directly from api/salesorder/index.php's
// handleGetProjects()), scoped to the selected customer's projects.
function useCustomerProjects(socid: string) {
  return useQuery({
    queryKey: ['salesorder', 'projects', socid],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ProjectOption[] }>('/salesorder/?action=get_projects', { params: { socid } })
      return data.data ?? []
    },
    enabled: socid !== '',
    staleTime: 1000 * 60,
  })
}

interface OrderLine {
  key: number
  productId: string
  description: string
  qty: number
  unitPrice: number
  // Visual-only — the confirmed POST /api/salesorder/?action=create contract
  // (see the mutationFn below) only accepts { product_id, desc, subprice,
  // qty } per line, nothing for VAT/discount/cost price, so these three
  // never leave the browser. Shown because the reference lines table has
  // them; computed for display only.
  vatRate: number
  discountPct: number
  costPrice: number
}

let lineKeySeq = 0
function newLine(): OrderLine {
  return { key: lineKeySeq++, productId: '', description: '', qty: 1, unitPrice: 0, vatRate: 0, discountPct: 0, costPrice: 0 }
}

interface CreateOrderResponse {
  success: boolean
  error?: string
  message?: string
  details?: Record<string, string>
}

export function OrderCreateForm() {
  const today = new Date().toISOString().slice(0, 10)
  const [customerId, setCustomerId] = useState('')
  const [refCustomer, setRefCustomer] = useState('')
  const [date, setDate] = useState(today)
  const [lines, setLines] = useState<OrderLine[]>([newLine()])
  const [projectId, setProjectId] = useState('')
  const [formError, setFormError] = useState('')
  // Visual-only, like the per-line VAT/discount/cost-price fields above —
  // not part of the confirmed create-order request shape.
  const [warehouse, setWarehouse] = useState('MAIN_BRANCH')
  const [reserveStock, setReserveStock] = useState(true)

  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: products } = useProductOptions()
  const { data: projects, isLoading: projectsLoading } = useCustomerProjects(customerId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logActivity = useLogActivity()
  const { user } = useAuth()

  function updateLine(key: number, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProduct(key: number, productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    updateLine(key, {
      productId,
      description: product?.label ?? '',
      unitPrice: product ? product.priceExclTax : 0,
    })
  }

  const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0)
  const totalTax = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPct / 100) * (l.vatRate / 100), 0)
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0)

  // POST /api/salesorder/?action=create — confirmed contract (verified
  // against the live backend with a deliberately-invalid customer id, so
  // nothing was actually created): { socid, lines: [{ product_id, desc,
  // subprice, qty }] }. NOTE: the live backend currently 500s while
  // inserting order lines ("Unknown column 'stock_reserve' in 'field
  // list'") — a server-side schema bug, not something this form can work
  // around. Submission is wired correctly; it just can't succeed until
  // that column is fixed on the backend.
  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        action: 'create',
        socid: Number(customerId),
        date,
        ref_client: refCustomer || undefined,
        fk_project: projectId ? Number(projectId) : undefined,
        lines: lines
          .filter((l) => l.description.trim() && l.qty > 0)
          .map((l) => ({
            product_id: l.productId ? Number(l.productId) : undefined,
            desc: l.description,
            subprice: l.unitPrice,
            qty: l.qty,
          })),
      }
      const { data } = await api.post<CreateOrderResponse>('/salesorder/?action=create', body)
      if (!data.success) {
        const detail = data.details ? Object.values(data.details).join(' ') : undefined
        throw new Error(detail ?? data.error ?? data.message ?? 'Failed to create order')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      const customerName = customers?.find((c) => c.id === customerId)?.name ?? 'a customer'
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New sales order for ${customerName}`, category: 'orders', authorName })
      navigate(ROUTES.orderList)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to create order'),
  })

  function handleSubmit() {
    setFormError('')
    if (!customerId) {
      setFormError('Customer is required.')
      return
    }
    if (!lines.some((l) => l.description.trim() && l.qty > 0)) {
      setFormError('At least one line is required.')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ShoppingCart size={20} className="text-brand" /> New Sales Order
      </h2>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref.">
            <input disabled defaultValue="Draft" className={`${inputClasses} text-text-faint`} />
          </Field>
          <Field label="Ref. customer">
            <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Customer" required>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value)
                setProjectId('')
              }}
              className={inputClasses}
            >
              <option value="">{customersLoading ? 'Loading…' : 'Select a customer'}</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" required>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
              <button type="button" onClick={() => setDate(today)} className="shrink-0 rounded-md border border-input-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover">
                Now
              </button>
            </div>
          </Field>

          <Field label="Planned date of delivery">
            <input type="date" className={inputClasses} />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-text">Warehouse</span>
            <div className="flex items-center gap-4">
              <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={`${inputClasses} flex-1`}>
                <option value="MAIN_BRANCH">MAIN_BRANCH</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm text-text-muted whitespace-nowrap">
                <input type="checkbox" checked={reserveStock} onChange={(e) => setReserveStock(e.target.checked)} className="rounded border-input-border text-brand focus:ring-brand/30" />
                Reserve Stock
              </label>
            </div>
          </div>

          <Field label="Bank account">
            <Select options={[]} />
          </Field>
          <Field label="Availability delay">
            <Select options={[]} />
          </Field>

          <Field label="Shipping method">
            <Select options={[]} />
          </Field>
          <Field label="Payment Terms">
            <Select options={[]} />
          </Field>

          <Field label="Payment Type" required>
            <Select options={[]} />
          </Field>
          <Field label="Project">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
              <option value="">{!customerId ? 'Select a customer first' : projectsLoading ? 'Loading…' : 'No project'}</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ref} — {p.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Default doc template">
            <Select defaultValue="einstein" options={['einstein']} />
          </Field>
          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>

          <Field label="Incoterms">
            <Select options={[]} />
          </Field>
          <Field label="Note (public)">
            <input type="text" className={inputClasses} />
          </Field>

          <Field label="Note (private)">
            <input type="text" className={inputClasses} />
          </Field>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">Lines</h3>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, newLine()])}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
          >
            <Plus size={13} /> Add line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Product / Service</th>
                <th className="font-medium px-4 py-2.5 w-20">VAT</th>
                <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                <th className="font-medium px-4 py-2.5 w-28">Unit Price (Incl.)</th>
                <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                <th className="font-medium px-4 py-2.5 w-20">Disc.</th>
                <th className="font-medium px-4 py-2.5 w-28">Cost Price</th>
                <th className="font-medium px-4 py-2.5 w-32 text-right">Total (Incl.)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineExclDiscount = line.qty * line.unitPrice * (1 - line.discountPct / 100)
                const lineIncl = lineExclDiscount * (1 + line.vatRate / 100)
                const unitPriceIncl = line.unitPrice * (1 + line.vatRate / 100)
                return (
                  <tr key={line.key} className="border-b border-border align-top">
                    <td className="px-4 py-2 space-y-1">
                      <select value={line.productId} onChange={(e) => pickProduct(line.key, e.target.value)} className={inputClasses}>
                        <option value="">Custom line</option>
                        {products?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        placeholder="Description"
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={line.vatRate}
                        onChange={(e) => updateLine(line.key, { vatRate: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-text-muted tabular-nums">{formatMoney(unitPriceIncl)}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={line.discountPct}
                        onChange={(e) => updateLine(line.key, { discountPct: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.costPrice}
                        onChange={(e) => updateLine(line.key, { costPrice: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(lineIncl)}</td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        title="Remove line"
                        disabled={lines.length === 1}
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border">
          <h3 className="font-semibold text-text! mb-2">Payment Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-text-muted">Total (Excl. Tax):</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(total)} ZMW</p>
            </div>
            <div>
              <p className="text-text-muted">Total Tax:</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(totalTax)} ZMW</p>
            </div>
            <div>
              <p className="text-text-muted">Total Amount:</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(total + totalTax)} ZMW</p>
            </div>
            <div>
              <p className="text-text-muted">Total Quantity:</p>
              <p className="font-semibold text-text! tabular-nums">{totalQty}</p>
            </div>
          </div>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex items-center gap-3">
        <Link to={ROUTES.orderList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
        <button type="button" disabled title="Same request as Create Order below — this backend has no separate draft-save action" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted cursor-default opacity-60">
          Save Draft
        </button>
        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
          {createMutation.isPending ? 'Creating…' : 'Create Order'}
        </button>
      </div>
    </div>
  )
}
