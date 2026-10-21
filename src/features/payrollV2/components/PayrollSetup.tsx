import { useState } from 'react'
import { Download, Globe, ListChecks, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { SETUP_GROUPS, constantsPayload, useSetupAction, useSetupConstants, useSetupDevices, useSetupLeaveTypes, useSetupTaxBands, type SetupConstants, type SetupGroupKey } from '../payrollSetup.queries'
import { useDeviceLogs } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, PayrollModal, TablePanel, Td, Th } from './PayrollV2Chrome'

const FIELD = 'w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const PRIMARY = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60'
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')

type Result = { ok: boolean; text: string } | null

function ResultLine({ result }: { result: Result }) {
  if (!result) return null
  return <p className={`text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      {children}
    </label>
  )
}

const TABS = [
  { key: 'general', label: 'General Settings' },
  { key: 'statutory', label: 'Statutory Rates' },
  { key: 'sharing', label: 'Payslip Sharing' },
  { key: 'leave_types', label: 'Leave Types' },
  { key: 'paye', label: 'PAYE Calculator' },
  { key: 'devices', label: 'Device Settings' },
] as const
type TabKey = (typeof TABS)[number]['key']

// ---- General / Statutory / Sharing

function ConstantsForm({ group, initial }: { group: SetupGroupKey; initial: SetupConstants }) {
  const action = useSetupAction()
  const [values, setValues] = useState<SetupConstants>(initial)
  const [result, setResult] = useState<Result>(null)
  const fields = values[group]

  const setValue = (key: string, value: string) => setValues({ ...values, [group]: fields.map((f) => (f.key === key ? { ...f, value } : f)) })

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(null)
    action.mutate(
      { tab: group, fields: constantsPayload(values) },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Setup saved.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <PanelCard title={SETUP_GROUPS[group].title}>
      {group === 'sharing' && (
        <p className="mb-4 rounded-md bg-info-bg px-3 py-2 text-xs text-info-fg">
          WhatsApp/SMS bot webhook (set it as the Twilio “A MESSAGE COMES IN” URL): <code>{fields.find((f) => f.key === 'PAYROLL_V2_SITE_URL')?.value || '<site URL>'}/payroll_v2/bot.php</code>
        </p>
      )}
      <form onSubmit={save}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((f) =>
            f.type === 'checkbox' ? (
              <label key={f.key} className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={f.value === '1'} onChange={(e) => setValue(f.key, e.target.checked ? '1' : '0')} />
                {f.label}
              </label>
            ) : (
              <Field key={f.key} label={f.label}>
                {f.type === 'select' ? (
                  <select value={f.value} onChange={(e) => setValue(f.key, e.target.value)} className={FIELD}>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type={f.type === 'password' ? 'password' : 'text'} autoComplete={f.type === 'password' ? 'new-password' : undefined} value={f.value} onChange={(e) => setValue(f.key, e.target.value)} className={FIELD} />
                )}
              </Field>
            ),
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={action.isPending} className={PRIMARY}>
            {action.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <ResultLine result={result} />
        </div>
      </form>
    </PanelCard>
  )
}

function ConstantsTab({ group }: { group: SetupGroupKey }) {
  const constants = useSetupConstants()
  if (constants.isError) return <ErrorCard error={constants.error} onRetry={() => constants.refetch()} />
  if (!constants.data) return <p className="text-sm text-text-faint">Loading…</p>
  // Keyed by the loaded data so a refetch after saving starts the form from the saved values.
  return <ConstantsForm key={`${group}-${constants.dataUpdatedAt}`} group={group} initial={constants.data} />
}

// ---- Leave types

const EMPTY_LEAVE = { code: '', label: '', affect: '', delay: '0', newbymonth: '0', country_id: '' }

function LeaveTypesTab() {
  const list = useSetupLeaveTypes()
  const action = useSetupAction()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY_LEAVE)
  const [result, setResult] = useState<Result>(null)

  const add = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(null)
    action.mutate(
      { tab: 'leave_types', fields: { action: 'add_leave_type', ...form } },
      {
        onSuccess: (msg) => {
          setForm(EMPTY_LEAVE)
          setResult({ ok: true, text: msg || 'Leave type created.' })
        },
        onError: (err) => setResult({ ok: false, text: errorText(err) }),
      },
    )
  }

  const remove = async (id: string, label: string) => {
    if (!(await confirm({ title: 'Delete Leave Type?', message: `Delete "${label}"? A leave type already used by a request cannot be deleted.` }))) return
    setResult(null)
    action.mutate(
      { tab: 'leave_types', fields: { action: 'delete_leave_type', id } },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Leave type deleted.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-info-bg px-3 py-2 text-xs text-info-fg">Leave types come from the holiday types dictionary. They control leave calculations, accrual rates and eligibility.</p>
      <PanelCard title="Add New Leave Type">
        <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field label="Code">
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Label">
            <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Affected By">
            <input value={form.affect} onChange={(e) => setForm({ ...form, affect: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Delay (Days)">
            <input type="number" value={form.delay} onChange={(e) => setForm({ ...form, delay: e.target.value })} className={FIELD} />
          </Field>
          <Field label="New Per Month">
            <input type="number" value={form.newbymonth} onChange={(e) => setForm({ ...form, newbymonth: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Country">
            <select value={form.country_id} onChange={(e) => setForm({ ...form, country_id: e.target.value })} className={FIELD}>
              <option value="">-- Select Country --</option>
              {(list.data?.countries ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3 xl:col-span-6">
            <button type="submit" disabled={action.isPending} className={PRIMARY}>
              {action.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Leave Type
            </button>
            <ResultLine result={result} />
          </div>
        </form>
      </PanelCard>
      <TablePanel title="Leave Types">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>ID</Th>
              <Th>Code</Th>
              <Th>Label</Th>
              <Th>Affected By</Th>
              <Th className="text-right">Delay (Days)</Th>
              <Th className="text-right">New Per Month</Th>
              <Th>Country</Th>
              <Th>Active</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <LoadingRows cols={9} />}
            {list.isError && <EmptyRow colSpan={9} label={errorText(list.error)} />}
            {list.data && list.data.rows.length === 0 && <EmptyRow colSpan={9} label="No leave types configured." />}
            {(list.data?.rows ?? []).map((t) => (
              <tr key={t.id} className="border-t border-border">
                <Td>{t.id}</Td>
                <Td className="font-medium">{t.code}</Td>
                <Td>{t.label}</Td>
                <Td>{t.affect || '—'}</Td>
                <Td className="text-right tabular-nums">{t.delay}</Td>
                <Td className="text-right tabular-nums">{t.newByMonth}</Td>
                <Td>{t.country || '—'}</Td>
                <Td>{t.active ? 'Yes' : 'No'}</Td>
                <Td className="text-right">
                  <button type="button" title="Delete leave type" disabled={action.isPending} onClick={() => remove(t.id, t.label)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  )
}

// ---- PAYE tax bands

function PayeTab() {
  const [year, setYear] = useState(new Date().getFullYear())
  const bands = useSetupTaxBands(year)
  const action = useSetupAction()
  const confirm = useConfirm()
  const [form, setForm] = useState({ from_amount: '', to_amount: '', rate: '' })
  const [result, setResult] = useState<Result>(null)
  const years = bands.data?.years.length ? bands.data.years : [String(year)]

  const add = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(null)
    action.mutate(
      { tab: 'paye', fields: { action: 'add_tax_band', tax_year: String(year), ...form } },
      {
        onSuccess: (msg) => {
          setForm({ from_amount: '', to_amount: '', rate: '' })
          setResult({ ok: true, text: msg || 'Tax band added.' })
        },
        onError: (err) => setResult({ ok: false, text: errorText(err) }),
      },
    )
  }

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Delete Tax Band?', message: 'Delete this tax band?' }))) return
    setResult(null)
    action.mutate(
      { tab: 'paye', fields: { action: 'delete_tax_band', id } },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Tax band deleted.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-info-bg px-3 py-2 text-xs text-info-fg">PAYE tax bands per fiscal year, used to calculate PAYE on employee salaries.</p>
      <PanelCard
        title={`Add New Tax Band for ${year}`}
        action={
          <label className="flex items-center gap-2 text-xs text-text-muted">
            Tax year
            <select value={String(year)} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-input-border bg-input-bg px-2 py-1 text-sm text-text">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <Field label="From Amount (K)">
            <input required type="number" step="0.01" value={form.from_amount} onChange={(e) => setForm({ ...form, from_amount: e.target.value })} className={`!w-40 ${FIELD}`} />
          </Field>
          <Field label="To Amount (K)">
            <input type="number" step="0.01" placeholder="Empty = unlimited" value={form.to_amount} onChange={(e) => setForm({ ...form, to_amount: e.target.value })} className={`!w-40 ${FIELD}`} />
          </Field>
          <Field label="Rate (%)">
            <input required type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={`!w-28 ${FIELD}`} />
          </Field>
          <button type="submit" disabled={action.isPending} className={PRIMARY}>
            {action.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Tax Band
          </button>
          <ResultLine result={result} />
        </form>
      </PanelCard>
      <TablePanel title={`PAYE Tax Bands — ${year}`}>
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>ID</Th>
              <Th className="text-right">From Amount (K)</Th>
              <Th className="text-right">To Amount (K)</Th>
              <Th className="text-right">Rate (%)</Th>
              <Th>Status</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {bands.isLoading && <LoadingRows cols={6} rows={3} />}
            {bands.isError && <EmptyRow colSpan={6} label={errorText(bands.error)} />}
            {bands.data && bands.data.rows.length === 0 && <EmptyRow colSpan={6} label={`No tax bands configured for ${year}.`} />}
            {(bands.data?.rows ?? []).map((b) => (
              <tr key={b.id} className="border-t border-border">
                <Td>{b.id}</Td>
                <Td className="text-right tabular-nums">{b.from}</Td>
                <Td className="text-right tabular-nums">{b.to}</Td>
                <Td className="text-right tabular-nums">{b.rate}%</Td>
                <Td>{b.active ? 'Active' : 'Inactive'}</Td>
                <Td className="text-right">
                  <button type="button" title="Delete tax band" disabled={action.isPending} onClick={() => remove(b.id)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
      <div className="rounded-md border border-border bg-surface-alt px-4 py-3 text-xs text-text-muted">
        <p className="font-semibold text-text">Standard Zambia PAYE Bands (2026)</p>
        <p>0 – 5,100 K: 0% · 5,100 – 7,200 K: 20% · 7,200 – 9,200 K: 30% · Above 9,200 K: 37%</p>
        <p className="mt-1">These are standard rates. Adjust according to current ZRA regulations.</p>
      </div>
    </div>
  )
}

// ---- Attendance devices

// The classic "View Logs" button links to payroll/devices/logs.php, which this
// backend doesn't have; zktecho.php's own show_device_logs gives the same list.
function DeviceLogsDialog({ serial, onClose }: { serial: string; onClose: () => void }) {
  const logs = useDeviceLogs(serial)
  return (
    <PayrollModal title={`Device Logs — ${serial}`} onClose={onClose} width="max-w-3xl">
      {logs.isLoading && <p className="text-sm text-text-faint">Loading…</p>}
      {logs.isError && <p className="text-sm text-danger">{errorText(logs.error)}</p>}
      {logs.data && logs.data.length === 0 && <p className="text-sm text-text-faint">No logs received from this device.</p>}
      {(logs.data ?? []).length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted">
              <th className="py-1">Received</th>
              <th>Table</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {(logs.data ?? []).map((l) => (
              <tr key={l.rowid} className="border-t border-border align-top text-text">
                <td className="whitespace-nowrap py-1 pr-3">{l.created_at}</td>
                <td className="pr-3">{l.table_name}</td>
                <td>
                  <pre className="whitespace-pre-wrap font-mono text-[11px]">{(l.data ?? '').trim()}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-text-faint">Latest 50 entries.</p>
    </PayrollModal>
  )
}

const EMPTY_DEVICE = { device_sn: '', ip_address: '', port_num: '4370', brand: '1' }

function DevicesTab() {
  const devices = useSetupDevices()
  const action = useSetupAction()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY_DEVICE)
  const [result, setResult] = useState<Result>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [logsFor, setLogsFor] = useState<string | null>(null)

  const run = (fields: Record<string, string>, fallback: string, onDone?: () => void) => {
    setResult(null)
    setBusyId(fields.device_id ?? null)
    action.mutate(
      { tab: 'devices', fields },
      {
        onSuccess: (msg) => {
          onDone?.()
          setResult({ ok: true, text: msg || fallback })
        },
        onError: (err) => setResult({ ok: false, text: errorText(err) }),
        onSettled: () => setBusyId(null),
      },
    )
  }

  const add = (event: React.FormEvent) => {
    event.preventDefault()
    run({ action: 'add_device', ...form }, 'Device added.', () => setForm(EMPTY_DEVICE))
  }

  const remove = async (id: string, serial: string) => {
    if (!(await confirm({ title: 'Delete Device?', message: `Delete device ${serial}? This cannot be undone.` }))) return
    run({ action: 'delete_device', device_id: id }, 'Device deleted.')
  }

  const liveTone = (status: string) => (/online/i.test(status) ? 'text-success' : /offline/i.test(status) ? 'text-danger' : 'text-text-faint')

  return (
    <div className="space-y-4">
      <PanelCard title="Add Device">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <Field label="Serial Number">
            <input required placeholder="e.g. OIN7010056122101930" value={form.device_sn} onChange={(e) => setForm({ ...form, device_sn: e.target.value })} className={`!w-56 ${FIELD}`} />
          </Field>
          <Field label="IP Address">
            <input required placeholder="e.g. 192.168.1.245" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} className={`!w-44 ${FIELD}`} />
          </Field>
          <Field label="Port">
            <input value={form.port_num} onChange={(e) => setForm({ ...form, port_num: e.target.value })} className={`!w-24 ${FIELD}`} />
          </Field>
          <Field label="Brand">
            <input placeholder="e.g. ZKteco" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={`!w-32 ${FIELD}`} />
          </Field>
          <button type="submit" disabled={action.isPending} className={PRIMARY}>
            {action.isPending && !busyId ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Device
          </button>
        </form>
        <div className="mt-2">
          <ResultLine result={result} />
        </div>
      </PanelCard>
      <TablePanel title="Devices">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>ID</Th>
              <Th>Serial No</Th>
              <Th>IP Address</Th>
              <Th>Port</Th>
              <Th>Connection</Th>
              <Th>Brand</Th>
              <Th>Entity</Th>
              <Th>Live Status</Th>
              <Th>Last Seen</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {devices.isLoading && <LoadingRows cols={10} rows={2} />}
            {devices.isError && <EmptyRow colSpan={10} label={errorText(devices.error)} />}
            {devices.data && devices.data.length === 0 && <EmptyRow colSpan={10} label="No devices configured." />}
            {(devices.data ?? []).map((d) => (
              <tr key={d.id} className="border-t border-border">
                <Td>{d.id}</Td>
                <Td className="font-medium">{d.serial}</Td>
                <Td>{d.ip}</Td>
                <Td>{d.port}</Td>
                <Td>{d.connection}</Td>
                <Td>{d.brand}</Td>
                <Td>{d.entity}</Td>
                <Td className={liveTone(d.liveStatus)}>{d.liveStatus}</Td>
                <Td className="whitespace-nowrap text-xs">{d.lastSeen}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    {busyId === d.id ? (
                      <Loader2 size={14} className="m-1 animate-spin text-brand" />
                    ) : (
                      <>
                        <button type="button" title="Sync Time" disabled={action.isPending} onClick={() => run({ action: 'sync_time', device_id: d.id }, 'Time sync queued.')} className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-brand disabled:opacity-50">
                          <Globe size={14} />
                        </button>
                        <button type="button" title="Pull Attendance" disabled={action.isPending} onClick={() => run({ action: 'pull_attendance', device_id: d.id }, 'Attendance pulled.')} className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-brand disabled:opacity-50">
                          <Download size={14} />
                        </button>
                        <button type="button" title="View Logs" onClick={() => setLogsFor(d.serial)} className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-brand">
                          <ListChecks size={14} />
                        </button>
                        <button type="button" title="Delete" disabled={action.isPending} onClick={() => remove(d.id, d.serial)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
      {logsFor && <DeviceLogsDialog serial={logsFor} onClose={() => setLogsFor(null)} />}
    </div>
  )
}

// custom/payroll_v2/admin/setup.php — the module's six setup tabs. The tab is
// kept in the URL (?tab=) like the classic page.
export function PayrollSetup() {
  const [params, setParams] = useSearchParams()
  const tab: TabKey = TABS.some((t) => t.key === params.get('tab')) ? (params.get('tab') as TabKey) : 'general'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams(t.key === 'general' ? {} : { tab: t.key }, { replace: true })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover hover:text-text'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {(tab === 'general' || tab === 'statutory' || tab === 'sharing') && <ConstantsTab group={tab} />}
      {tab === 'leave_types' && <LeaveTypesTab />}
      {tab === 'paye' && <PayeTab />}
      {tab === 'devices' && <DevicesTab />}
    </div>
  )
}
