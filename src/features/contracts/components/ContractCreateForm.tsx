import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { FileEdit, Check, X, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { api } from '../../../api/axios'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useAuth } from '../../auth/AuthContext'
import { useCreateContract } from '../contracts.queries'
import { todayIso } from '../../../shared/localCollection'
import { formatMoney } from '../../../utils/format'

interface ProjectOption {
  id: string
  ref: string
  title: string
}

// GET /api/projects.php — same real, working endpoint used by Purchase
// Order/Sales Order/Quotation Create forms elsewhere in this app (queries
// llx_projet WHERE fk_statut = 1, not order-type-specific).
function useProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'open'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: ProjectOption[] }>('/projects.php')
      return data.results ?? []
    },
    staleTime: 1000 * 60,
  })
}

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

// Visual-only line items — useCreateContract's local-collection model (see
// contracts.queries.ts) has no line/total fields at all, so these never
// leave this component. Shown because the reference's Item Table has them.
interface ContractLine {
  key: number
  productId: string
  description: string
  qty: number
  vatRate: number
  unitPrice: number
  discountPct: number
}

let lineKeySeq = 0
function newLine(): ContractLine {
  return { key: lineKeySeq++, productId: '', description: '', qty: 1, vatRate: 0, unitPrice: 0, discountPct: 0 }
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-text">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

// The reference pre-assigns the logged-in user as a removable chip on each
// rep field — real here (the logged-in user's own real id is what actually
// gets submitted as commercial_signature_id/commercial_suivi_id), just not
// pickable from a roster of other users yet.
function RepChip({ name }: { name: string }) {
  return (
    <div className={`${inputClasses} flex items-center`}>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2 py-1 text-xs text-white">
        <X size={11} /> {name}
      </span>
    </div>
  )
}

export function ContractCreateForm() {
  const today = todayIso()
  const { user } = useAuth()
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: products } = useProductOptions()
  const { data: projects, isLoading: projectsLoading } = useProjectOptions()
  const createContract = useCreateContract()
  const navigate = useNavigate()
  const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'

  const [thirdPartyId, setThirdPartyId] = useState('')
  const [refCustomer, setRefCustomer] = useState('')
  const [refVendor, setRefVendor] = useState('')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(today)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [lines, setLines] = useState<ContractLine[]>([newLine()])
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  function updateLine(key: number, patch: Partial<ContractLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickProduct(key: number, productId: string) {
    const product = products?.find((p) => String(p.id) === productId)
    updateLine(key, { productId, description: product?.label ?? '', unitPrice: product ? product.priceExclTax : 0 })
  }

  const totalExclTax = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0)
  const totalTax = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPct / 100) * (l.vatRate / 100), 0)

  async function handleSubmit(validate: boolean) {
    setFormError('')
    if (!thirdPartyId) {
      setFormError('Third-party is required.')
      return
    }
    if (!user) {
      setFormError('Not signed in.')
      return
    }
    if (validate && lines.every((l) => !l.description.trim())) {
      setFormError('Please add at least one service line.')
      return
    }
    setPending(true)
    try {
      const created = await createContract(
        {
          socid: thirdPartyId,
          refCustomer,
          refVendor,
          contractDate: date,
          projectId: projectId || undefined,
          notePublic,
          notePrivate,
          signatureRepId: user.id,
          followUpRepId: user.id,
          supportRepId: user.id,
          lines: lines
            .filter((l) => l.description.trim())
            .map((l) => ({ productId: l.productId || undefined, description: l.description, qty: l.qty, unitPriceHt: l.unitPrice, vatRate: l.vatRate, discountPct: l.discountPct })),
          validate,
        },
        authorName,
      )
      void created
      navigate(ROUTES.contractList)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create contract.')
    } finally {
      setPending(false)
    }
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileEdit size={20} className="text-brand" /> New Contract
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.contractList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            Save As Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create Contract
          </button>
        </>
      }
    >
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref.">
            <input disabled defaultValue="Draft" className={`${inputClasses} text-text-faint`} />
          </Field>
          <Field label="Ref. customer">
            <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Ref. vendor">
            <input type="text" value={refVendor} onChange={(e) => setRefVendor(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Third-party" required>
            <select value={thirdPartyId} onChange={(e) => setThirdPartyId(e.target.value)} className={inputClasses}>
              <option value="">{customersLoading ? 'Loading…' : 'Select a third party'}</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sales representative following-up contract" required>
            <RepChip name={authorName} />
          </Field>
          <Field label="Sales representative signing contract" required>
            <RepChip name={authorName} />
          </Field>

          <Field label="Sales representative following-up contract (Support)">
            <RepChip name={authorName} />
          </Field>
          <Field label="Date" required>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
              <button type="button" onClick={() => setDate(today)} className="shrink-0 rounded-md border border-input-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover">
                Now
              </button>
            </div>
          </Field>

          <Field label="Project">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
              <option value="">{projectsLoading ? 'Loading…' : 'Select a project'}</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.ref})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note (public)">
            <input type="text" value={notePublic} onChange={(e) => setNotePublic(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Note (private)">
            <input type="text" value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} className={inputClasses} />
          </Field>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">Item Table</h3>
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
                <th className="font-medium px-4 py-2.5">Product/Service</th>
                <th className="font-medium px-4 py-2.5 w-20">Qty</th>
                <th className="font-medium px-4 py-2.5 w-20">VAT %</th>
                <th className="font-medium px-4 py-2.5 w-28">Unit Price (Excl.)</th>
                <th className="font-medium px-4 py-2.5 w-20">Disc.</th>
                <th className="font-medium px-4 py-2.5 w-28 text-right">Total TTC</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineTtc = line.qty * line.unitPrice * (1 - line.discountPct / 100) * (1 + line.vatRate / 100)
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
                      <input type="number" min={0} value={line.qty} onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} max={100} value={line.vatRate} onChange={(e) => updateLine(line.key, { vatRate: Number(e.target.value) })} className={inputClasses} />
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
                    <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(lineTtc)}</td>
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
          <h3 className="font-semibold text-text! mb-2">Totals</h3>
          <div className="grid grid-cols-3 gap-3 text-sm max-w-md">
            <div>
              <p className="text-text-muted">Total (Excl. Tax):</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(totalExclTax)}</p>
            </div>
            <div>
              <p className="text-text-muted">Total Tax:</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(totalTax)}</p>
            </div>
            <div>
              <p className="text-text-muted">Total (Inc. Tax):</p>
              <p className="font-semibold text-text! tabular-nums">{formatMoney(totalExclTax + totalTax)}</p>
            </div>
          </div>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
