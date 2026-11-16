import { useMemo, useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Badge, Banner, DynamicForm, EmptyState, FormDialog, NoticeStrip } from '../../fixedAsset/components/AssetUi'
import { DANGER_GHOST_BTN, GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, THR, useNotice, type FormItem, type FormValues } from '../../fixedAsset/assetUiHelpers'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { useInstallmentSettings, useSaveSettings, useTemplateAction } from '../installments.data'
import type { SettingsData, SettingsTemplate, TemplateLine } from '../installmentModels'
import { apiFailure } from '../installmentHelpers'
import { InstallmentHeading, InstallmentSubNav, QueryStates } from './InstallmentUi'

const TABS: Array<[string, string]> = [
  ['general', 'General'],
  ['plans', 'Installment plans'],
  ['rules', 'Payment rules'],
  ['numbering', 'Numbering'],
  ['accounting', 'Accounting'],
  ['notifications', 'Notifications'],
  ['permissions', 'Permissions'],
]
const YES = [
  { id: '1', label: 'Yes' },
  { id: '0', label: 'No' },
]

// The fields of each settings group, as the classic installment/settings.js lists them (key = the setting's name on the backend).
function groupFields(tab: string, d: SettingsData): FormItem[] {
  const accountOpts = (kind: string) => d.accounts.filter((a) => a.kind === kind).map((a) => ({ id: a.id, label: a.label }))
  switch (tab) {
    case 'general':
      return [
        { key: 'INSTALLMENT_MAX_INSTALLMENTS', label: 'Maximum installments per plan', type: 'num' },
        { key: 'INSTALLMENT_GRACE_DAYS', label: 'Default grace period (days)', type: 'num' },
        { key: 'INSTALLMENT_DEFAULT_TEMPLATE', label: 'Default plan template', type: 'select', options: d.templates.map((t) => ({ id: t.id, label: t.label })), blank: '— none —' },
      ]
    case 'rules':
      return [
        { key: 'INSTALLMENT_ALLOW_PARTIAL', label: 'Allow partial payments', type: 'select', options: YES },
        { key: 'INSTALLMENT_MIN_PAYMENT', label: 'Minimum payment amount', type: 'num' },
        { key: 'INSTALLMENT_OVERDUE_AFTER_DAYS', label: 'Overdue after (days past due date)', type: 'num' },
        {
          key: 'INSTALLMENT_ALLOCATION',
          label: 'Default allocation',
          type: 'select',
          options: [
            { id: 'oldest_first', label: 'Oldest due first' },
            { id: 'manual', label: 'Choose installments' },
          ],
        },
      ]
    case 'numbering':
      return [
        { key: 'INSTALLMENT_PLAN_REF_PREFIX', label: 'Plan reference prefix', hint: 'IP → IP2026-00001' },
        { key: 'INSTALLMENT_RECEIPT_REF_PREFIX', label: 'Receipt number prefix', hint: 'IR → IR2026-00001 (unique, concurrency-safe)' },
      ]
    case 'accounting':
      return [
        { key: 'INSTALLMENT_DEFAULT_BANK_ACCOUNT', label: 'Default bank account', type: 'select', options: accountOpts('bank'), blank: '— none —' },
        { key: 'INSTALLMENT_DEFAULT_CASH_ACCOUNT', label: 'Default cash account', type: 'select', options: accountOpts('cash'), blank: '— none —' },
        { key: 'INSTALLMENT_DEFAULT_PAYMENT_MODE', label: 'Default payment method', type: 'select', options: d.modes, blank: '— none —' },
        { key: 'INSTALLMENT_INTEREST_PRODUCT', label: 'Interest service', type: 'select', options: d.services ?? [], blank: '— none (no interest) —', hint: 'Invoice line used for plan interest; its VAT and income account apply' },
        { section: 'Optional accounts (for advances, clearing, discounts, differences and write-offs)' },
        { key: 'INSTALLMENT_ACC_ADVANCE', label: 'Customer advance', type: 'account' },
        { key: 'INSTALLMENT_ACC_CLEARING', label: 'Payment clearing', type: 'account' },
        { key: 'INSTALLMENT_ACC_DISCOUNT', label: 'Discount', type: 'account' },
        { key: 'INSTALLMENT_ACC_DIFFERENCE', label: 'Payment difference', type: 'account' },
        { key: 'INSTALLMENT_ACC_WRITEOFF', label: 'Write-off', type: 'account' },
      ]
    default:
      return [
        { key: 'INSTALLMENT_NOTIFY_ON_PAYMENT', label: 'Offer to e-mail the receipt after a payment', type: 'select', options: YES },
        { key: 'INSTALLMENT_NOTIFY_DAYS_BEFORE', label: 'Remind customers N days before a due date', type: 'num' },
        { key: 'INSTALLMENT_NOTIFY_FROM', label: 'Sender address', hint: 'Empty = the company e-mail' },
      ]
  }
}

function SettingsGroup({ tab, d, onNotice }: { tab: string; d: SettingsData; onNotice: (text: string, tone?: 'ok' | 'bad') => void }) {
  const items = useMemo(() => groupFields(tab, d), [tab, d])
  const keys = items.flatMap((i) => ('key' in i ? [i.key] : []))
  const [values, setValues] = useState<FormValues>(() => Object.fromEntries(keys.map((k) => [k, d.values[k] ?? ''])))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [accounting, setAccounting] = useState(d.accounting)
  const save = useSaveSettings()
  const canSave = tab === 'accounting' ? d.rights.accounting : d.rights.setup

  async function submit() {
    setMessage('')
    setErrors({})
    try {
      const r = await save.mutateAsync({ group: tab, values })
      onNotice(r.message ?? 'Settings saved.')
      if (r.data?.accounting) setAccounting(r.data.accounting)
    } catch (e) {
      setMessage(apiFailure(e))
      const fields = (e as { errors?: Record<string, unknown> }).errors ?? {}
      const next: Record<string, string> = {}
      for (const k of keys) if (fields[k]) next[k] = Array.isArray(fields[k]) ? (fields[k] as string[]).join(' ') : String(fields[k])
      setErrors(next)
    }
  }

  return (
    <>
      <Card className="!h-auto">
        <DynamicForm items={items} values={values} onChange={(k, v) => setValues((cur) => ({ ...cur, [k]: v }))} errors={errors} />
        {message && (
          <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
            {message}
          </p>
        )}
        <div className="mt-4 text-right">
          {canSave ? (
            <button type="button" className={PRIMARY_BTN} disabled={save.isPending} onClick={submit}>
              Save
            </button>
          ) : (
            <span className="text-sm text-text-muted">Read-only — you need the {tab === 'accounting' ? 'accounting mappings' : 'settings'} right.</span>
          )}
        </div>
      </Card>
      {tab === 'accounting' && (
        <Card className="!h-auto !p-0">
          <div className="border-b border-border px-4 py-3 font-bold text-text!">Accounting readiness</div>
          <ul>
            {accounting.map((c) => (
              <li key={c.key} className="flex gap-3 border-b border-border px-4 py-2.5 last:border-0">
                <span aria-hidden>{c.ok ? '✅' : '⚠️'}</span>
                <span>
                  <b className="text-text!">{c.label}</b>
                  <span className="block text-xs text-text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

// ---- plan templates ---------------------------------------------------------------------------------------------------------
function TemplateDialog({ template, interestReady, onClose, onSaved }: { template: SettingsTemplate | null; interestReady: boolean; onClose: () => void; onSaved: (text: string) => void }) {
  const action = useTemplateAction()
  const [lines, setLines] = useState<TemplateLine[]>(
    template ? template.lines.map((l) => ({ ...l })) : [{ percent: 50, interval_value: 0, interval_unit: 'day', label: 'Advance' }, { percent: 50, interval_value: 30, interval_unit: 'day', label: 'Balance' }],
  )
  const sum = lines.reduce((s, l) => s + (Number(l.percent) || 0), 0)
  const items: FormItem[] = [
    { key: 'label', label: 'Name', required: true },
    { key: 'ref', label: 'Reference' },
    { key: 'frequency', label: 'Frequency label', type: 'select', options: ['custom', 'weekly', 'biweekly', 'monthly', 'quarterly'].map((v) => ({ id: v, label: v })) },
    { key: 'grace_days', label: 'Grace (days)', type: 'num' },
    { key: 'interest_rate', label: 'Interest % (flat)', type: 'num', hint: interestReady ? 'Calculated on the principal and added to new invoices' : 'Needs the interest service (Accounting tab)' },
    { key: 'is_default', label: 'Default template', type: 'select', options: [{ id: '0', label: 'No' }, { id: '1', label: 'Yes' }] },
    { key: 'description', label: 'Description', type: 'textarea', full: true },
  ]
  const initial: FormValues = template
    ? { label: template.label, ref: template.ref, frequency: template.frequency, grace_days: String(template.grace_days), interest_rate: String(template.interest_rate || 0), is_default: template.is_default ? '1' : '0', description: template.description }
    : { frequency: 'monthly', grace_days: '0', interest_rate: '0', is_default: '0' }

  const patch = (i: number, p: Partial<TemplateLine>) => setLines((cur) => cur.map((l, j) => (j === i ? { ...l, ...p } : l)))

  return (
    <FormDialog
      title={template ? `Edit ${template.label}` : 'New template'}
      items={items}
      initial={initial}
      okLabel="Save template"
      intro={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-text!">Installments</b>
            <Badge tone={Math.abs(sum - 100) < 0.001 || !lines.length ? 'ok' : 'bad'}>{Math.round(sum * 100) / 100}%</Badge>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>Label</th>
                <th className={THR}>%</th>
                <th className={THR}>After</th>
                <th className={TH}>Unit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="pr-2">
                    <input aria-label={`Label ${i + 1}`} className={inputClasses} value={l.label} onChange={(e) => patch(i, { label: e.target.value })} />
                  </td>
                  <td className="pr-2">
                    <input aria-label={`Percent ${i + 1}`} className={`${inputClasses} !w-20 text-right`} value={l.percent} onChange={(e) => patch(i, { percent: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="pr-2">
                    <input aria-label={`Interval ${i + 1}`} className={`${inputClasses} !w-16 text-right`} value={l.interval_value} onChange={(e) => patch(i, { interval_value: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="pr-2">
                    <select aria-label={`Unit ${i + 1}`} className={`${inputClasses} !w-24`} value={l.interval_unit} onChange={(e) => patch(i, { interval_unit: e.target.value })}>
                      {['day', 'week', 'month'].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button type="button" aria-label={`Remove ${i + 1}`} className={DANGER_GHOST_BTN} onClick={() => setLines((cur) => cur.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className={GHOST_BTN} onClick={() => setLines((cur) => [...cur, { percent: 0, interval_value: 30 * cur.length, interval_unit: 'day', label: `Installment ${cur.length + 1}` }])}>
            + Installment
          </button>
          <p className="text-xs text-text-muted">Leave empty for a fully custom template.</p>
        </div>
      }
      onSave={async (v) => {
        const r = await action.mutateAsync({ action: 'template_save', id: template?.id ?? 0, active: template ? template.active : 1, lines, tenure: lines.length, ...v, is_default: v.is_default === '1' })
        onSaved(r.message ?? 'Template saved.')
      }}
      onClose={onClose}
    />
  )
}

function PlansTab({ d, onNotice }: { d: SettingsData; onNotice: (text: string, tone?: 'ok' | 'bad') => void }) {
  const [editing, setEditing] = useState<SettingsTemplate | null | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<SettingsTemplate | null>(null)
  const action = useTemplateAction()
  const can = d.rights.template

  async function run(body: Record<string, unknown>) {
    try {
      await action.mutateAsync(body)
    } catch (e) {
      onNotice(apiFailure(e), 'bad')
    }
  }

  return (
    <>
      <Card className="!h-auto !p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <b className="text-text!">Plan templates</b>
          {can && (
            <button type="button" className={PRIMARY_BTN} onClick={() => setEditing(null)}>
              + New template
            </button>
          )}
        </div>
        <div className="p-3">
          <Banner>Changing a template never changes schedules already created from it.</Banner>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className={TH}>Template</th>
                <th className={THR}>Tenure</th>
                <th className={THR}>Interest</th>
                <th className={TH}>Installments</th>
                <th className={TH}>Frequency</th>
                <th className={THR}>Used by</th>
                <th className={TH}>Status</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {d.templates.map((x) => (
                <tr key={x.id} className="border-b border-border last:border-0">
                  <td className={TD}>
                    <b>{x.label}</b> {x.is_default && <Badge tone="info">default</Badge>}
                    <div className="text-xs text-text-muted normal-case">
                      {x.ref} · {x.description}
                    </div>
                  </td>
                  <td className={TDR}>{x.tenure || '—'}</td>
                  <td className={TDR}>{x.interest_rate ? `${Math.round(x.interest_rate * 100) / 100}%` : '—'}</td>
                  <td className={TD}>
                    {x.lines.length ? x.lines.map((l, i) => <div key={i}>{`${Math.round(l.percent * 100) / 100}% +${l.interval_value} ${l.interval_unit}`}</div>) : <span className="text-text-muted">custom</span>}
                  </td>
                  <td className={TD}>{x.frequency}</td>
                  <td className={TDR}>{x.used}</td>
                  <td className={TD}>
                    <Badge tone={x.active ? 'info' : 'bad'}>{x.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    {can && (
                      <>
                        <button type="button" className={GHOST_BTN} onClick={() => setEditing(x)}>
                          Edit
                        </button>{' '}
                        <button type="button" className={GHOST_BTN} onClick={() => run({ action: 'template_toggle', id: x.id })}>
                          {x.active ? 'Deactivate' : 'Activate'}
                        </button>
                        {!x.used && (
                          <>
                            {' '}
                            <button type="button" className={DANGER_GHOST_BTN} onClick={() => setConfirmDelete(x)}>
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {editing !== undefined && <TemplateDialog template={editing} interestReady={!!d.values.INSTALLMENT_INTEREST_PRODUCT} onClose={() => setEditing(undefined)} onSaved={(t) => onNotice(t)} />}
      {confirmDelete && (
        <FormDialog
          title="Delete template?"
          items={[]}
          initial={{}}
          okLabel="Delete"
          danger
          intro={`“${confirmDelete.label}” is removed. Schedules already created from it are not changed.`}
          onSave={async () => {
            await action.mutateAsync({ action: 'template_delete', id: confirmDelete.id })
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  )
}

const HAS: Record<string, keyof SettingsData['rights']> = {
  read: 'read',
  'plan create': 'create',
  'plan edit': 'edit',
  'plan delete': 'delete',
  'plan cancel': 'cancel',
  'payment write': 'pay',
  'receipt read': 'receipt_read',
  'receipt write': 'receipt_write',
  'report read': 'report',
  'report export': 'export',
  'ledger read': 'ledger',
  'setup write': 'setup',
  'template write': 'template',
  'accounting write': 'accounting',
}

function PermissionsTab({ d }: { d: SettingsData }) {
  return (
    <Card className="!h-auto !p-0">
      <div className="border-b border-border px-4 py-3 font-bold text-text!">Module permissions</div>
      <div className="p-3">
        <Banner>Permissions are granted with the standard user / group rights screens. Every page and every API action checks them on the server.</Banner>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className={TH}>Id</th>
            <th className={TH}>Permission</th>
            <th className={TH}>Key</th>
            <th className={TH}>You</th>
          </tr>
        </thead>
        <tbody>
          {d.permissions.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className={`${TD} font-mono`}>{p.id}</td>
              <td className={TD}>{p.label}</td>
              <td className={`${TD} font-mono text-text-muted`}>{p.perm}</td>
              <td className={TD}>{HAS[p.perm] && d.rights[HAS[p.perm]] ? '✅' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

// Installment settings (classic installment/settings.php): seven sections on installment/api/settings.php (action=get / save per group /
// template_save / template_toggle / template_delete). The section is kept in ?tab=.
export function InstallmentSettingsPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const [sp, setSp] = useSearchParams()
  const requested = sp.get('tab') ?? 'general'
  const tab = TABS.some(([k]) => k === requested) ? requested : 'general'
  const q = useInstallmentSettings()
  const { notice, show } = useNotice()
  const d = q.data

  return (
    <div className="space-y-4">
      <InstallmentHeading icon={icon} title="Installment settings">
        Plans, payment rules, numbering, accounting and notifications.
      </InstallmentHeading>
      <InstallmentSubNav active="settings" />
      <nav aria-label="Settings sections" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-alt p-1.5">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => setSp({ tab: key })} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === key ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}>
            {label}
          </button>
        ))}
      </nav>
      <NoticeStrip notice={notice} />
      <QueryStates loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} what="the installment settings" />
      {d && (tab === 'plans' ? <PlansTab d={d} onNotice={show} /> : tab === 'permissions' ? <PermissionsTab d={d} /> : <SettingsGroup key={tab} tab={tab} d={d} onNotice={show} />)}
      {d && d.templates.length === 0 && tab === 'plans' && <EmptyState title="No templates yet" />}
    </div>
  )
}
