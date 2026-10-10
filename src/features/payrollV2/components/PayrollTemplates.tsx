import { useMemo, useState } from 'react'
import { Calculator, Copy, Loader2, Plus, Settings2, Trash2 } from 'lucide-react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatMoney } from '../../../utils/format'
import { num } from '../payrollV2.api'
import { usePayRunAction, usePayrollTemplate, usePayrollTemplates, useTemplateGlAccounts, type TemplateComponentRow, type TemplateRow } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, TablePanel, Td, Th } from './PayrollV2Chrome'

const FIELD = 'rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const PRIMARY = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60'
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      {children}
    </label>
  )
}

const EMPTY_TEMPLATE = { template_name: '', template_type: 'monthly', grade_min: '0', grade_max: '0', gratuity_rate: '0' }
const EMPTY_COMPONENT = {
  component_code: '',
  component_name: '',
  component_type: 'earning',
  calc_method: 'fixed',
  amount: '0',
  rate_pct: '0',
  is_napsa_eligible: true,
  is_nhima_eligible: true,
  is_paye_taxable: true,
  is_employer_cost: false,
  gl_account_code: '',
}

// Earnings / deductions / employer cost of a template; percentage components
// count against the basic salary typed in (0 until the user enters one), as
// the classic "Calculate Total" button does.
function totals(components: TemplateComponentRow[], basic: number) {
  let earnings = 0
  let deductions = 0
  let employer = 0
  for (const c of components) {
    const value = c.calc_method === 'percent_basic' ? (basic * num(c.rate_pct)) / 100 : num(c.amount)
    if (c.component_type === 'earning') earnings += value
    else if (c.component_type === 'deduction') deductions += value
    if (c.is_employer_cost === '1') employer += value
  }
  return { earnings, deductions, net: earnings - deductions, employer }
}

function ComponentsPanel({ template }: { template: TemplateRow }) {
  const detail = usePayrollTemplate(template.id)
  const accounts = useTemplateGlAccounts(true)
  const action = usePayRunAction()
  const [form, setForm] = useState(EMPTY_COMPONENT)
  const [basic, setBasic] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const components = useMemo(() => detail.data?.components ?? [], [detail.data])
  const sum = useMemo(() => totals(components, Number(basic) || 0), [components, basic])

  const add = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    action.mutate(
      {
        endpoint: 'template.php',
        action: 'add_component',
        params: {
          template_id: template.id,
          ...form,
          is_napsa_eligible: form.is_napsa_eligible ? 1 : 0,
          is_nhima_eligible: form.is_nhima_eligible ? 1 : 0,
          is_paye_taxable: form.is_paye_taxable ? 1 : 0,
          is_employer_cost: form.is_employer_cost ? 1 : 0,
        },
      },
      { onSuccess: () => setForm(EMPTY_COMPONENT), onError: (err) => setError(errorText(err)) },
    )
  }

  const remove = (id: string) =>
    action.mutate({ endpoint: 'template.php', action: 'delete_component', params: { id } }, { onError: (err) => setError(errorText(err)) })

  const tick = (on: string) => (on === '1' ? '✓' : '—')

  return (
    <PanelCard title={`Components — ${template.template_name}`}>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md bg-surface-alt p-3">
        <Field label="Basic Salary (for % calc)">
          <input type="number" step="0.01" value={basic} onChange={(e) => setBasic(e.target.value)} className={`w-40 ${FIELD}`} />
        </Field>
        <span className="flex items-center gap-1 pb-2 text-xs text-text-faint">
          <Calculator size={12} /> Totals update as you type
        </span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Earnings', value: sum.earnings, tone: 'bg-success-bg text-success-fg' },
          { label: 'Total Deductions', value: sum.deductions, tone: 'bg-danger-bg text-danger-fg' },
          { label: 'Net Payable', value: sum.net, tone: 'bg-info-bg text-info-fg' },
          { label: 'Employer Cost', value: sum.employer, tone: 'bg-warning-bg text-warning-fg' },
        ].map((t) => (
          <div key={t.label} className={`rounded-md p-3 ${t.tone}`}>
            <p className="text-xs">{t.label}</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(t.value)}</p>
          </div>
        ))}
      </div>

      <div className="-mx-4 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Method</Th>
              <Th className="text-right">Value</Th>
              <Th>NAPSA</Th>
              <Th>NHIMA</Th>
              <Th>PAYE</Th>
              <Th>GL Account</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {detail.isLoading && <LoadingRows cols={10} rows={3} />}
            {!detail.isLoading && components.length === 0 && <EmptyRow colSpan={10} label="No components yet." />}
            {components.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <Td className="font-medium">{c.component_code}</Td>
                <Td>{c.component_name}</Td>
                <Td className="capitalize">{c.component_type}</Td>
                <Td>{c.calc_method === 'percent_basic' ? '% of Basic' : 'Fixed'}</Td>
                <Td className="text-right tabular-nums">{c.calc_method === 'percent_basic' ? `${num(c.rate_pct)}%` : formatMoney(num(c.amount))}</Td>
                <Td>{tick(c.is_napsa_eligible)}</Td>
                <Td>{tick(c.is_nhima_eligible)}</Td>
                <Td>{tick(c.is_paye_taxable)}</Td>
                <Td>{c.gl_account_code || '—'}</Td>
                <Td className="text-right">
                  <button type="button" title="Remove component" disabled={action.isPending} onClick={() => remove(c.id)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <Field label="Code">
          <input required value={form.component_code} onChange={(e) => setForm({ ...form, component_code: e.target.value })} className={`w-28 ${FIELD}`} />
        </Field>
        <Field label="Name">
          <input required value={form.component_name} onChange={(e) => setForm({ ...form, component_name: e.target.value })} className={`w-40 ${FIELD}`} />
        </Field>
        <Field label="Type">
          <select value={form.component_type} onChange={(e) => setForm({ ...form, component_type: e.target.value })} className={FIELD}>
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
          </select>
        </Field>
        <Field label="Calc Method">
          <select value={form.calc_method} onChange={(e) => setForm({ ...form, calc_method: e.target.value })} className={FIELD}>
            <option value="fixed">Fixed Amount</option>
            <option value="percent_basic">% of Basic</option>
          </select>
        </Field>
        {form.calc_method === 'fixed' ? (
          <Field label="Fixed Amount">
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`w-32 ${FIELD}`} />
          </Field>
        ) : (
          <Field label="Rate %">
            <input type="number" step="0.01" value={form.rate_pct} onChange={(e) => setForm({ ...form, rate_pct: e.target.value })} className={`w-24 ${FIELD}`} />
          </Field>
        )}
        {(
          [
            ['is_napsa_eligible', 'NAPSA'],
            ['is_nhima_eligible', 'NHIMA'],
            ['is_paye_taxable', 'PAYE'],
            ['is_employer_cost', 'Employer Cost'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 pb-2 text-sm text-text-muted">
            <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
            {label}
          </label>
        ))}
        <Field label="GL Account">
          <select value={form.gl_account_code} onChange={(e) => setForm({ ...form, gl_account_code: e.target.value })} className={`w-56 ${FIELD}`}>
            <option value="">-- Select --</option>
            {(accounts.data ?? []).map((a) => (
              <option key={a.account_number} value={a.account_number}>
                {a.account_number} - {a.label}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={action.isPending} className={PRIMARY}>
          {action.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Component
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </PanelCard>
  )
}

// payroll_v2 #templates: salary templates (create / clone / deactivate) and
// each template's earning & deduction components — all through template.php.
export function PayrollTemplates() {
  const list = usePayrollTemplates()
  const action = usePayRunAction()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY_TEMPLATE)
  const [selected, setSelected] = useState<string | null>(null)
  const [cloning, setCloning] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const templates = list.data ?? []
  const selectedTemplate = templates.find((t) => t.id === selected)

  const create = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    action.mutate({ endpoint: 'template.php', action: 'create', params: form }, { onSuccess: () => setForm(EMPTY_TEMPLATE), onError: (err) => setError(errorText(err)) })
  }

  const clone = (event: React.FormEvent) => {
    event.preventDefault()
    if (!cloning?.name.trim()) return
    setError(null)
    action.mutate(
      { endpoint: 'template.php', action: 'clone', params: { source_template_id: cloning.id, new_name: cloning.name.trim(), new_grade_min: '', new_grade_max: '', new_gratuity_rate: '' } },
      { onSuccess: () => setCloning(null), onError: (err) => setError(errorText(err)) },
    )
  }

  const deactivate = async (row: TemplateRow) => {
    if (!(await confirm({ title: 'Deactivate Template?', message: `Deactivate "${row.template_name}"?` }))) return
    setError(null)
    action.mutate(
      { endpoint: 'template.php', action: 'delete', params: { id: row.id } },
      {
        onSuccess: () => selected === row.id && setSelected(null),
        onError: (err) => setError(errorText(err)),
      },
    )
  }

  return (
    <div className="space-y-4">
      {list.isError && <ErrorCard error={list.error} onRetry={() => list.refetch()} />}

      <PanelCard title="New Template">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <Field label="Template Name">
            <input required value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} className={`w-48 ${FIELD}`} />
          </Field>
          <Field label="Type">
            <select value={form.template_type} onChange={(e) => setForm({ ...form, template_type: e.target.value })} className={FIELD}>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
              <option value="contract">Contract</option>
            </select>
          </Field>
          <Field label="Grade Min Salary">
            <input type="number" step="0.01" value={form.grade_min} onChange={(e) => setForm({ ...form, grade_min: e.target.value })} className={`w-36 ${FIELD}`} />
          </Field>
          <Field label="Grade Max Salary">
            <input type="number" step="0.01" value={form.grade_max} onChange={(e) => setForm({ ...form, grade_max: e.target.value })} className={`w-36 ${FIELD}`} />
          </Field>
          <Field label="Gratuity Rate %">
            <input type="number" step="0.01" value={form.gratuity_rate} onChange={(e) => setForm({ ...form, gratuity_rate: e.target.value })} className={`w-28 ${FIELD}`} />
          </Field>
          <button type="submit" disabled={action.isPending} className={PRIMARY}>
            {action.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Template
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </PanelCard>

      <TablePanel title="Templates">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Grade Range (Min–Max)</Th>
              <Th className="text-right">Gratuity %</Th>
              <Th className="text-right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <LoadingRows cols={5} />}
            {!list.isLoading && templates.length === 0 && <EmptyRow colSpan={5} label="No templates yet." />}
            {templates.map((t) => (
              <tr key={t.id} className={`border-t border-border ${selected === t.id ? 'bg-brand/5' : ''}`}>
                <Td className="font-medium">{t.template_name}</Td>
                <Td className="capitalize">{t.template_type}</Td>
                <Td className="tabular-nums">
                  {formatMoney(num(t.grade_min))} — {formatMoney(num(t.grade_max))}
                </Td>
                <Td className="text-right tabular-nums">{num(t.gratuity_rate)}%</Td>
                <Td className="text-right">
                  {cloning?.id === t.id ? (
                    <form onSubmit={clone} className="flex justify-end gap-2">
                      <input autoFocus value={cloning.name} onChange={(e) => setCloning({ ...cloning, name: e.target.value })} aria-label="Name for the copy" className={`w-48 !py-1 ${FIELD}`} />
                      <button type="submit" disabled={action.isPending} className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                        Clone
                      </button>
                      <button type="button" onClick={() => setCloning(null)} className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-surface-hover">
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setSelected(selected === t.id ? null : t.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-hover">
                        <Settings2 size={12} /> Components
                      </button>
                      <button type="button" onClick={() => setCloning({ id: t.id, name: `${t.template_name} (Copy)` })} className="inline-flex items-center gap-1 rounded-md bg-info-bg px-2.5 py-1 text-xs font-medium text-info-fg hover:opacity-90">
                        <Copy size={12} /> Clone
                      </button>
                      <button type="button" title="Deactivate" disabled={action.isPending} onClick={() => deactivate(t)} className="rounded-md bg-danger-bg px-2 py-1 text-danger-fg hover:opacity-90 disabled:opacity-60">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {selectedTemplate && <ComponentsPanel key={selectedTemplate.id} template={selectedTemplate} />}
    </div>
  )
}
