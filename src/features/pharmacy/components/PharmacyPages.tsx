import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Box, Cog, Download, Plus, RotateCcw, Search, ShieldCheck, Stethoscope, Undo2, Upload } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { kwacha } from '../pharmacyFormat'
import { PharmacyApiError } from '../pharmacy.api'
import { collectRx, declineRx, dispenseRx, isDurBlock, queryRx, receiveGrn, repeatRx, updateRxDirections, verifyRx } from '../pharmacy.actions'
import {
  usePharmacyBatches,
  usePharmacyDurCheck,
  usePharmacyDurConfig,
  usePharmacyGrns,
  usePharmacyInteractions,
  usePharmacyMedicineDetail,
  usePharmacyMedicines,
  usePharmacyPatients,
  usePharmacyPrescriptions,
  usePharmacyRacks,
  usePharmacyRecalls,
  usePharmacyRecentSales,
  usePharmacyRegister,
  usePharmacyReorder,
  usePharmacyRx,
  usePharmacyValuation,
  type PharmacyRxDetail,
  type PharmacyRxItem,
  type PharmacySale,
} from '../pharmacy.queries'
import { pharmacyToast } from '../pharmacyToast'
import { Chips, DataTable, DetailCard, GhostButton, Kv, Notice, Panel, Pill, RawTable, Status, Tile, downloadCsv } from './PharmacyUi'
import { CaptureRxSheet, GrnSheet, MedicineSheet, PrimaryButton } from './PharmacyForms'
import { ImportSheet, downloadMedicineTemplate } from './PharmacyImport'

const SMALL = 'h-8 rounded-md border border-input-border bg-input-bg px-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

// Full-width button in the detail card (the classic "btn--block").
function BlockButton({ children, onClick, disabled, primary, danger }: { children: ReactNode; onClick?: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  const look = primary
    ? 'bg-(--color-brand) text-white hover:bg-brand-hover border-transparent'
    : danger
      ? 'border-danger-fg text-danger-fg hover:bg-danger-bg'
      : 'border-border text-text hover:bg-surface-hover'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`h-9 w-full rounded-lg border px-3 text-sm font-semibold disabled:opacity-60 ${look}`}>
      {children}
    </button>
  )
}

const searchCls = 'h-10 w-full rounded-lg border border-input-border bg-input-bg pl-9 pr-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const money = kwacha

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative px-4 py-3">
      <Search size={14} className="absolute left-7 top-1/2 -translate-y-1/2 text-text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={searchCls} />
    </div>
  )
}

const rowCls = (on: boolean) => `cursor-pointer ${on ? 'ph-selected' : ''}`
const Th = ({ children, right }: { children: string; right?: boolean }) => <th className={`px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-faint ${right ? 'text-right' : 'text-left'}`}>{children}</th>

const RX_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'queried', label: 'Queried' },
  { key: 'verified', label: 'Verified' },
  { key: 'partial', label: 'Partial' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'dispensed', label: 'Dispensed' },
  { key: 'collected', label: 'Collected' },
  { key: 'declined', label: 'Declined' },
]

// The classic status pills: draft grey, verified blue, partial / queried / awaiting amber, dispensed / collected green, declined red.
const RX_PILL: Record<string, { tone: 'neutral' | 'info' | 'warn' | 'ok' | 'bad'; label: string }> = {
  draft: { tone: 'neutral', label: 'draft' },
  verified: { tone: 'info', label: 'verified' },
  partial: { tone: 'warn', label: 'partial' },
  queried: { tone: 'warn', label: 'queried' },
  declined: { tone: 'bad', label: 'declined' },
  awaiting: { tone: 'warn', label: 'awaiting collection' },
  dispensed: { tone: 'ok', label: 'dispensed' },
  collected: { tone: 'ok', label: 'collected' },
}
const RxStatus = ({ status }: { status: string }) => {
  const p = RX_PILL[status] ?? { tone: 'neutral' as const, label: status }
  return <Pill tone={p.tone}>{p.label}</Pill>
}
const RX_REVIEWABLE = ['draft', 'verified', 'partial', 'queried']
const RX_LABELLED = ['verified', 'partial', 'awaiting', 'dispensed', 'collected']

const SECTION = 'mb-1.5 mt-4 text-xs font-bold uppercase tracking-[0.14em]'

// The classic "Print dispensing label": a small label written into a pop-up window and sent to the printer.
function printDispensingLabel(rx: PharmacyRxDetail['prescription'], items: PharmacyRxItem[]) {
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
  const rows = items
    .map((it) => {
      const directions = [it.dosage, it.frequency, it.duration].filter(Boolean).join(' · ')
      return `<div class="it"><div class="d">${esc(it.label)} &times; ${esc(it.prescribed_qty)}</div><div class="x">${esc(directions || 'Use as directed by your pharmacist')}</div></div>`
    })
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(rx.ref)}</title><style>
*{box-sizing:border-box}body{font:13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#17201d;margin:0;padding:14px}
.lbl{border:1.5px solid #17201d;border-radius:8px;padding:12px;max-width:360px}
.hd{font-weight:700;letter-spacing:.5px;text-transform:uppercase;font-size:11px;color:#0E7C66;border-bottom:1px solid #ccc;padding-bottom:6px;margin-bottom:8px}
.pt{font-weight:700;font-size:15px}.meta{font-size:11px;color:#555;margin:2px 0 8px}
.it{padding:6px 0;border-top:1px dashed #ccc}.d{font-weight:700}.x{font-size:12px;color:#333}
.ft{margin-top:10px;border-top:1px solid #ccc;padding-top:8px;font-size:10.5px;color:#555}
.warn{margin-top:6px;font-weight:700;font-size:11px}
</style></head><body><div class="lbl"><div class="hd">Dispensing Label</div><div class="pt">${esc(rx.patient || 'Walk-in patient')}</div>
<div class="meta">${esc(rx.ref)} · ${new Date().toLocaleDateString()}${rx.prescriber ? ' · ' + esc(rx.prescriber) : ''}</div>${rows}
<div class="warn">Keep all medicines out of the reach of children.</div>
<div class="ft">Dispensed by: _______________________  (pharmacist)<br/>Confirm label content against the dispensary's approved format before issue.</div></div></body></html>`
  const w = window.open('', '_blank', 'width=420,height=640')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
  return true
}

export function PharmacyPrescriptions() {
  const qc = useQueryClient()
  const [chip, setChip] = useState('all')
  const [sel, setSel] = useState<number | null>(null)
  const [capture, setCapture] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [repeatsAuth, setRepeatsAuth] = useState('0')
  const [note, setNote] = useState('')
  const [collectedBy, setCollectedBy] = useState('')
  const [counselled, setCounselled] = useState(false)
  const [editing, setEditing] = useState(false)
  const [dirs, setDirs] = useState<Record<number, { dosage: string; frequency: string; duration: string }>>({})
  const { data, isLoading, error } = usePharmacyPrescriptions()
  const rows = (data ?? []).filter((r) => chip === 'all' || r.status === chip)
  const id = sel ?? rows[0]?.id ?? null
  const detail = usePharmacyRx(id)
  const dur = usePharmacyDurCheck(id)
  const p = detail.data?.prescription
  const items = detail.data?.items ?? []
  const current = rows.find((r) => r.id === id)
  const status = p?.status ?? current?.status ?? ''
  const warnings = dur.data ?? []
  const repeats = p?.repeats_authorised ?? 0
  const repeatsLeft = repeats - (p?.repeats_used ?? 0)
  const reviewable = RX_REVIEWABLE.includes(status)

  // a different prescription (or fresh data) resets the action inputs, as the classic panel does
  useEffect(() => {
    setEditing(false)
    setNote('')
    setRepeatsAuth(String(detail.data?.prescription.repeats_authorised ?? 0))
    setDirs(Object.fromEntries((detail.data?.items ?? []).map((it) => [it.id, { dosage: it.dosage ?? '', frequency: it.frequency ?? '', duration: it.duration ?? '' }])))
  }, [detail.data])

  const refresh = () => qc.invalidateQueries({ queryKey: ['pharmacy'] })
  async function act<T>(fn: () => Promise<T>, ok: string | ((r: T) => string), failPrefix = ''): Promise<T | undefined> {
    setBusy(true)
    try {
      const r = await fn()
      pharmacyToast(typeof ok === 'function' ? ok(r) : ok)
      await refresh()
      return r
    } catch (e) {
      pharmacyToast(`${failPrefix}${e instanceof PharmacyApiError ? e.message : 'failed'}`, true)
    } finally {
      setBusy(false)
    }
  }

  async function dispense(rxId: number, override?: string): Promise<void> {
    setBusy(true)
    try {
      const r = await dispenseRx(rxId, override)
      pharmacyToast(`Billed · ${r.invoice_ref ?? ''} · ZRA ${r.zra?.code ?? '—'} · ${r.awaiting_collection ? 'awaiting collection' : (r.rx_status ?? '')}`)
      await refresh()
    } catch (e) {
      if (isDurBlock(e)) {
        const majors = warnings.filter((w) => w.severity === 'major')
        const reason = window.prompt(`Major clinical warning — dispensing is blocked:\n${majors.map((w) => '• ' + w.message).join('\n')}\n\nEnter a reason to override and dispense (this is logged):`)
        if (reason && reason.trim()) {
          setBusy(false)
          return dispense(rxId, reason.trim())
        }
        pharmacyToast('Dispense cancelled — major DUR warning not acknowledged', true)
      } else {
        pharmacyToast(`Dispense failed: ${e instanceof PharmacyApiError ? e.message : 'failed'}`, true)
      }
    } finally {
      setBusy(false)
    }
  }

  const need = (text: string, msg: string) => (text.trim() === '' ? (pharmacyToast(msg, true), false) : true)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Notice>Prescription-only medicines must be verified by a pharmacist before dispensing — the server refuses to dispense an unverified prescription.</Notice>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[1fr_16.5rem]">
        <Panel
          className="min-h-0"
          title="Prescriptions"
          sub="Capture · verify · dispense · partial fulfilment"
          toolbar={<Chips items={RX_CHIPS} value={chip} onChange={setChip} />}
          footer={`${rows.length} prescription${rows.length === 1 ? '' : 's'}`}
          right={
            <>
              <PrimaryButton onClick={() => setCapture(true)}><Plus size={14} /> Capture</PrimaryButton>
              <Pill tone="ok">live</Pill>
            </>
          }
        >
          <Status loading={isLoading} error={error} empty={data && rows.length === 0} emptyText="No prescriptions in this view." />
          {rows.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><Th>Rx #</Th><Th>Patient</Th><Th>Prescriber</Th><Th>Status</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setSel(r.id)} className={rowCls(r.id === id)}>
                    <td className="px-4 py-3 font-semibold text-text!">{r.ref}</td>
                    <td className="px-4 py-3">{r.patient}</td>
                    <td className="px-4 py-3">{r.prescriber}</td>
                    <td className="px-4 py-3"><RxStatus status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        {current && (
          <DetailCard title={current.ref} sub={`${current.patient || 'Walk-in'} · ${current.prescriber || '—'}`}>
            <Status loading={detail.isLoading} error={detail.error} />
            <dl>
              <Kv label="Status"><RxStatus status={status} /></Kv>
              {p?.licence ? <Kv label="Prescriber licence">{p.licence}</Kv> : null}
              {status === 'collected' && p?.collected_at ? <Kv label="Collected">{`${p.collected_at}${p.collected_by ? ` · ${p.collected_by}` : ''}${p.counselled ? ' · counselled' : ''}`}</Kv> : null}
              {repeats > 0 ? <Kv label="Repeats (s42)">{`${p?.repeats_used ?? 0} / ${repeats} used`}</Kv> : null}
            </dl>
            {p?.pharmacist_note ? <div className="mt-2 rounded-lg bg-info-bg px-3 py-2 text-xs text-info-fg">{status === 'declined' ? 'Declined' : 'Query'}: {p.pharmacist_note}</div> : null}
            {warnings.length > 0 && (
              <div className="my-3">
                <p className={`${SECTION} text-danger-fg`}>Clinical checks (DUR)</p>
                {warnings.map((w, i) => (
                  <div key={i} className="mb-1 flex items-baseline gap-2 rounded-lg bg-surface px-2 py-1.5 text-sm">
                    <Pill tone={w.severity === 'major' ? 'bad' : w.severity === 'moderate' ? 'warn' : 'info'}>{w.type}</Pill>
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center">
              <p className={`${SECTION} text-text-faint`}>Items &amp; directions</p>
              {p && reviewable && items.length > 0 && (
                <button type="button" onClick={() => setEditing((v) => !v)} className="ml-auto h-7 rounded-md border border-border px-2 text-xs font-medium text-text hover:bg-surface-hover">{editing ? 'Cancel' : 'Edit directions'}</button>
              )}
            </div>
            {detail.data && items.length === 0 && <p className="text-sm text-text-faint">No line items.</p>}
            {items.map((it) => {
              const pct = it.prescribed_qty > 0 ? Math.round((it.dispensed_qty / it.prescribed_qty) * 100) : 0
              const directions = [it.dosage, it.frequency, it.duration].filter(Boolean).join(' · ')
              const d = dirs[it.id] ?? { dosage: '', frequency: '', duration: '' }
              const set = (k: 'dosage' | 'frequency' | 'duration', v: string) => setDirs((m) => ({ ...m, [it.id]: { ...d, [k]: v } }))
              return (
                <div key={it.id} className="border-t border-border py-2">
                  <div className="flex justify-between text-sm"><b className="text-text!">{it.label}</b><span className="tabular-nums">{it.dispensed_qty}/{it.prescribed_qty}</span></div>
                  {editing ? (
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      <input className={SMALL} placeholder="Dose (1 tab)" value={d.dosage} onChange={(e) => set('dosage', e.target.value)} />
                      <input className={SMALL} placeholder="Freq (TDS)" value={d.frequency} onChange={(e) => set('frequency', e.target.value)} />
                      <input className={SMALL} placeholder="Duration (5d)" value={d.duration} onChange={(e) => set('duration', e.target.value)} />
                    </div>
                  ) : (
                    directions && <p className="text-xs text-text-faint">{directions}</p>
                  )}
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-(--color-brand)" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
            {editing && p && <div className="mt-2.5"><BlockButton primary disabled={busy} onClick={() => act(() => updateRxDirections(p.id, dirs), 'Directions updated').then((r) => r !== undefined && setEditing(false))}>Save directions</BlockButton></div>}

            {p && (status === 'draft' || status === 'queried') && (
              <label className="mt-3.5 flex items-center gap-2 text-sm">
                Repeats authorised by prescriber (s42)
                <input className={`${SMALL} w-16`} type="number" min={0} value={repeatsAuth} onChange={(e) => setRepeatsAuth(e.target.value)} />
              </label>
            )}
            {p && (
              <div className="mt-2.5 flex flex-col gap-2">
                {(status === 'draft' || status === 'queried') && <BlockButton primary disabled={busy} onClick={() => act(() => verifyRx(p.id, parseInt(repeatsAuth, 10) || 0), 'Prescription verified')}>Verify Rx</BlockButton>}
                {(status === 'verified' || status === 'partial') && <BlockButton primary disabled={busy} onClick={() => void dispense(p.id)}>Dispense &amp; bill</BlockButton>}
                {(status === 'dispensed' || status === 'collected') && repeatsLeft > 0 && (
                  <BlockButton disabled={busy} onClick={() => act(() => repeatRx(p.id), (r) => `Repeat opened (cycle ${r.repeats_used ?? ''} of ${r.repeats_authorised ?? ''})`, 'Repeat refused: ')}>{`Dispense repeat (${repeatsLeft} left)`}</BlockButton>
                )}
                {status === 'awaiting' && (
                  <div className="flex flex-col gap-2">
                    <div className="rounded-lg bg-info-bg px-3 py-2 text-xs text-info-fg">Billed &amp; fiscalised — awaiting physical handover. The batch recall is re-checked at collection.</div>
                    <input className={SMALL} placeholder="Collected by (name)" value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={counselled} onChange={(e) => setCounselled(e.target.checked)} /> Patient counselled on use</label>
                    <BlockButton primary disabled={busy} onClick={() => act(() => collectRx(p.id, collectedBy, counselled), 'Handed over to patient', 'Handover failed: ').then((r) => { if (r !== undefined) { setCollectedBy(''); setCounselled(false) } })}>Hand over to patient</BlockButton>
                  </div>
                )}
                {status === 'dispensed' && <span className="self-center"><Pill tone="ok">completed</Pill></span>}
                {status === 'collected' && <span className="self-center"><Pill tone="ok">collected</Pill></span>}
                {status === 'declined' && <span className="self-center"><Pill tone="bad">declined</Pill></span>}
              </div>
            )}
            {p && reviewable && (
              <div className="mt-3 border-t border-border pt-3">
                <p className={`${SECTION} text-text-faint`}>Pharmacist review</p>
                <input className={`${SMALL} w-full`} placeholder="Query / decline reason…" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-2 flex gap-2">
                  <BlockButton disabled={busy} onClick={() => need(note, 'Enter a query note first') && act(() => queryRx(p.id, note), 'Prescription queried').then(() => setNote(''))}>Query</BlockButton>
                  <BlockButton danger disabled={busy} onClick={() => need(note, 'A decline reason is required') && act(() => declineRx(p.id, note), 'Prescription declined').then(() => setNote(''))}>Decline</BlockButton>
                </div>
              </div>
            )}
            {p && RX_LABELLED.includes(status) && (
              <div className="mt-2.5"><BlockButton onClick={() => setBlocked(!printDispensingLabel(p, items))}>Print dispensing label</BlockButton></div>
            )}
            {blocked && <p className="mt-2 text-xs text-danger-fg">Allow pop-ups to print the label.</p>}
            {status === 'draft' && <p className="mt-2.5 text-xs text-text-faint">Dispensing is disabled until a pharmacist verifies this prescription.</p>}
          </DetailCard>
        )}
      </div>
      {capture && <CaptureRxSheet onClose={() => setCapture(false)} onSaved={() => void refresh()} />}
    </div>
  )
}

export function PharmacyPatients() {
  const [text, setText] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const { data, isLoading, error } = usePharmacyPatients()
  const q = text.trim().toLowerCase()
  const rows = (data ?? []).filter((r) => !q || r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q))
  const cur = rows.find((r) => r.id === sel) ?? rows[0]
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[1fr_16.5rem]">
      <Panel className="min-h-0" title="Patients" sub="Customer master + clinical record" right={<Pill tone="ok">live</Pill>} toolbar={<SearchBox value={text} onChange={setText} placeholder="Search patients by name or phone…" />} footer={`${rows.length} patient${rows.length === 1 ? '' : 's'}`}>
        <Status loading={isLoading} error={error} empty={data && rows.length === 0} emptyText="No patient matches." />
        {rows.length > 0 && (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><Th>Patient</Th><Th>Phone</Th><Th>Town</Th><Th>Allergies</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setSel(r.id)} className={rowCls(r.id === cur?.id)}>
                  <td className="px-4 py-3 font-semibold text-text!">{r.name}</td>
                  <td className="px-4 py-3">{r.phone || '–'}</td>
                  <td className="px-4 py-3">{r.town || '–'}</td>
                  <td className="px-4 py-3">{r.allergies ? <Pill tone="bad">{r.allergies}</Pill> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {cur && (
        <DetailCard title={cur.name} sub={[cur.town, cur.phone].filter(Boolean).join(' · ') || '–'}>
          <dl>
            <Kv label="Date of birth">{cur.dob}</Kv>
            <Kv label="Allergies">{cur.allergies ? <span className="font-bold text-danger-fg">{cur.allergies}</span> : null}</Kv>
          </dl>
          <p className="mt-3 text-xs text-text-faint">Prescription &amp; dispensing history link once the patient has sales (reuses invoice history).</p>
        </DetailCard>
      )}
    </div>
  )
}

export function PharmacyMedicines() {
  const qc = useQueryClient()
  const [sheet, setSheet] = useState<'new' | 'edit' | 'import' | null>(null)
  const [text, setText] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const { data, isLoading, error } = usePharmacyMedicines(text.trim())
  const cur = (data ?? []).find((m) => m.id === sel) ?? data?.[0]
  const detail = usePharmacyMedicineDetail(cur?.id ?? null)
  const d = detail.data
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[1fr_16.5rem]">
      <Panel className="min-h-0" title="Medicine master" sub="Search brand · generic · salt · barcode" right={<><GhostButton onClick={() => void downloadMedicineTemplate()}><Download size={13} /> Template</GhostButton><GhostButton onClick={() => setSheet('import')}><Upload size={13} /> Import</GhostButton><PrimaryButton onClick={() => setSheet('new')}><Plus size={14} /> New</PrimaryButton><Pill tone="ok">live</Pill></>} toolbar={<SearchBox value={text} onChange={setText} placeholder="Type to search medicines…" />} footer={data ? `${data.length} medicine${data.length === 1 ? '' : 's'}` : undefined}>
        <Status loading={isLoading} error={error} empty={data?.length === 0} emptyText="No medicine matches." />
        {data && data.length > 0 && (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><Th>Medicine</Th><Th>Generic / salt</Th><Th>Sched</Th><Th right>Price</Th></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} onClick={() => setSel(m.id)} className={rowCls(m.id === cur?.id)}>
                  <td className="px-4 py-3 font-semibold text-text!">{m.label}</td>
                  <td className="px-4 py-3">{[m.generic, m.salt].filter(Boolean).join(' / ') || '–'}</td>
                  <td className="px-4 py-3">{m.rx_only ? <Pill tone="bad">{m.schedule_class || 'Rx'}</Pill> : <Pill tone="ok">OTC</Pill>}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(m.price_ttc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {cur && (
        <DetailCard title={cur.label} sub="Medicine">
          <Status loading={detail.isLoading} error={detail.error} />
          {d && <div className="mb-2"><BlockButton onClick={() => setSheet('edit')}>Edit medicine</BlockButton></div>}
          {d && (
            <dl>
              <Kv label="Generic / salt">{[d.product.generic, d.product.salt].filter(Boolean).join(' / ')}</Kv>
              <Kv label="Strength">{d.product.strength}</Kv>
              <Kv label="Form">{d.product.dosage_form}</Kv>
              <Kv label="Classification">{d.product.rx_only ? d.product.schedule_class || 'Prescription-only' : 'OTC (open sale)'}</Kv>
              <Kv label="Barcode">{d.product.barcode}</Kv>
              <Kv label="Price (incl. VAT)">{money(d.product.price_ttc)}</Kv>
              <Kv label="In stock">{`${d.stock.total} units`}</Kv>
            </dl>
          )}
          <p className="mt-3 text-xs text-text-faint">Substitutes, rack/shelf &amp; per-warehouse breakdown land with the batch screen (Phase 2b).</p>
        </DetailCard>
      )}
      {sheet === 'import' && <ImportSheet onClose={() => setSheet(null)} onDone={() => void qc.invalidateQueries({ queryKey: ['pharmacy'] })} />}
      {sheet === 'new' && <MedicineSheet onClose={() => setSheet(null)} onSaved={() => void qc.invalidateQueries({ queryKey: ['pharmacy'] })} />}
      {sheet === 'edit' && d && <MedicineSheet product={d.product} onClose={() => setSheet(null)} onSaved={() => void qc.invalidateQueries({ queryKey: ['pharmacy'] })} />}
    </div>
  )
}

export function PharmacyBatches() {
  const [chip, setChip] = useState<'all' | 'near' | 'expired'>('all')
  const { data, isLoading, error } = usePharmacyBatches()
  // near_expiry / expired are the lot flags the classic screen filters on.
  const rows = (data ?? []).filter((l) => chip === 'all' || (chip === 'near' ? l.near_expiry : l.expired))
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Notice>FEFO picks the nearest-expiry batch first. Lots inside 90 days are flagged; expired lots are blocked at the counter.</Notice>
      <Panel title="Batches & expiry" sub="Lot stock, MRP and days to expiry" right={<Pill tone="ok">live</Pill>} className="min-h-0 flex-1" toolbar={<Chips items={[{ key: 'all', label: 'All' }, { key: 'near', label: 'Near-expiry' }, { key: 'expired', label: 'Expired' }] as { key: 'all' | 'near' | 'expired'; label: string }[]} value={chip} onChange={setChip} />} footer={data ? `${rows.length} lot${rows.length === 1 ? '' : 's'}` : undefined}>
        <Status loading={isLoading} error={error} />
        {data && <RawTable rows={rows} classicColumns={['Medicine', 'Batch', 'Expiry', 'Qty', 'MRP', 'Status']} emptyText="No lots in this view." />}
      </Panel>
    </div>
  )
}

const GRN_PILL: Record<string, { tone: 'neutral' | 'ok' | 'info'; label: string }> = { draft: { tone: 'neutral', label: 'draft' }, received: { tone: 'ok', label: 'received' }, posted: { tone: 'ok', label: 'posted' } }

export function PharmacyPurchases() {
  const qc = useQueryClient()
  const [sheet, setSheet] = useState(false)
  const [receiving, setReceiving] = useState(0)
  const { data, isLoading, error } = usePharmacyGrns()
  const refresh = () => qc.invalidateQueries({ queryKey: ['pharmacy'] })

  async function receive(id: number) {
    setReceiving(id)
    try {
      const r = await receiveGrn(id)
      pharmacyToast(`Received into stock · ${r.ref ?? ''} · ${r.lines_received ?? 0} line(s)`)
      await refresh()
    } catch (e) {
      pharmacyToast(`Receive failed: ${e instanceof PharmacyApiError ? e.message : 'failed'}`, true)
    } finally {
      setReceiving(0)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Notice>Goods receipts capture batch, expiry, cost and MRP. &ldquo;Receive into stock&rdquo; posts a draft into inventory (lots + MRP). The fiscalised supplier invoice (ZRA) is a separate step, still deferred.</Notice>
      <Panel className="min-h-0 flex-1" footer={data ? `${data.length} goods receipt${data.length === 1 ? '' : 's'}` : undefined} title="Purchases / GRN" sub="Goods receipt notes" right={<><PrimaryButton onClick={() => setSheet(true)}><Plus size={14} /> New receipt</PrimaryButton><Pill tone="ok">live</Pill></>}>
        <Status loading={isLoading} error={error} />
        {data && (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><Th>GRN #</Th><Th>Supplier</Th><Th>Supplier ref</Th><Th>Date</Th><Th>Status</Th><Th right>Value</Th><Th>{''}</Th></tr></thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-text-faint">No goods receipts yet.</td></tr>
              ) : (
                data.map((g) => {
                  const pill = GRN_PILL[g.status] ?? { tone: 'info' as const, label: g.status }
                  return (
                    <tr key={g.id}>
                      <td className="font-semibold text-text!">{g.ref}</td>
                      <td>{g.supplier ?? '—'}</td>
                      <td>{g.supplier_ref ?? '—'}</td>
                      <td>{g.date ?? '—'}</td>
                      <td><Pill tone={pill.tone}>{pill.label}</Pill></td>
                      <td className="text-right tabular-nums">{kwacha(Math.round(g.total_ttc))}</td>
                      <td className="text-right">{g.status === 'draft' && <GhostButton disabled={receiving === g.id} onClick={() => void receive(g.id)}>{receiving === g.id ? 'Receiving…' : 'Receive into stock'}</GhostButton>}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </Panel>
      {sheet && <GrnSheet onClose={() => setSheet(false)} onSaved={() => void refresh()} />}
    </div>
  )
}

export function PharmacyStock() {
  const [tab, setTab] = useState<'valuation' | 'reorder'>('valuation')
  const valuation = usePharmacyValuation()
  const reorder = usePharmacyReorder()
  const rows = valuation.data?.rows ?? []
  const below = reorder.data
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Tile label="Stock value (PMP)" value={valuation.data ? money(valuation.data.total) : '-'} note="at weighted avg cost" />
        <Tile label="Lines valued" value={valuation.data ? rows.length : '-'} note="with stock on hand" />
        <Tile label="Below reorder" value={below ? below.length : '-'} pill={reorder.isError ? 'unavailable' : 'reorder'} tone="bad" />
        <Tile label="Suggested units" value={below ? Math.round(below.reduce((s, r) => s + (r.suggest || 0), 0)).toLocaleString() : '-'} note="to restore levels" />
      </div>
      <Panel className="min-h-0 flex-1" title="Stock" sub="Valuation and reorder worklist" right={<Pill tone="ok">live</Pill>} toolbar={<Chips items={[{ key: 'valuation', label: 'Valuation' }, { key: 'reorder', label: 'Low stock / reorder' }] as { key: 'valuation' | 'reorder'; label: string }[]} value={tab} onChange={setTab} />} footer={tab === 'valuation' ? `${rows.length} line${rows.length === 1 ? '' : 's'} · total ${valuation.data ? money(valuation.data.total) : '-'}` : below ? `${below.length} below reorder level` : undefined}>
        {tab === 'valuation' ? (
          <>
            <Status loading={valuation.isLoading} error={valuation.error} empty={valuation.data && rows.length === 0} emptyText="No stock on hand." />
            {rows.length > 0 && (
              <DataTable
                rows={rows}
                rowKey={(r) => r.id}
                columns={[
                  { header: 'Medicine', cell: (r) => <span className="font-semibold text-text!">{r.label}</span> },
                  { header: 'Qty', align: 'right', cell: (r) => r.qty.toLocaleString() },
                  { header: 'PMP', align: 'right', cell: (r) => money(r.pmp) },
                  { header: 'Value', align: 'right', cell: (r) => kwacha(Math.round(r.value)) },
                ]}
              />
            )}
          </>
        ) : (
          <>
            <Status loading={reorder.isLoading} error={reorder.error} empty={below && below.length === 0} emptyText="Nothing below reorder level." />
            {below && below.length > 0 && (
              <DataTable
                rows={below}
                rowKey={(r) => r.id}
                columns={[
                  { header: 'Medicine', cell: (r) => <span className="font-semibold text-text!">{r.label}</span> },
                  { header: 'On hand', align: 'right', cell: (r) => r.qty.toLocaleString() },
                  { header: 'Reorder level', align: 'right', cell: (r) => r.reorder_level.toLocaleString() },
                  { header: 'Suggest order', align: 'right', cell: (r) => <b className="text-brand">{r.suggest.toLocaleString()}</b> },
                ]}
              />
            )}
          </>
        )}
      </Panel>
    </div>
  )
}

export function PharmacyLocations() {
  const [text, setText] = useState('')
  const { data, isLoading, error } = usePharmacyRacks()
  const q = text.trim().toLowerCase()
  const rows = q ? (data ?? []).filter((r) => [r.product.label, r.product.ref, r.rack.name, r.shelf.ref, r.lot].some((v) => v.toLowerCase().includes(q))) : []
  return (
    <Panel className="min-h-0 flex-1" footer={q ? `${rows.length} placement${rows.length === 1 ? '' : 's'}` : undefined} title="Rack / shelf locations" sub="Find where a product sits — type or scan a barcode" right={<Pill tone="neutral">location record only</Pill>}>
      <div className="sticky top-0 z-10 bg-surface-alt px-4 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Scan barcode or type medicine / generic / ref…" className="h-10 w-full rounded-lg border border-input-border bg-input-bg pl-9 pr-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
      </div>
      <Status loading={isLoading} error={error} />
      {!isLoading && !error && !q && (
        <div className="flex flex-col items-center gap-3 px-4 py-14 text-sm text-text-faint">
          <Box size={34} /> Scan or search a product to see its rack &amp; shelf placements.
        </div>
      )}
      {q && rows.length === 0 && !isLoading && <Status empty emptyText="No placement found for that product." />}
      {rows.length > 0 && (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { header: 'Medicine', cell: (r) => <><span className="font-medium text-text!">{r.product.label}</span> <span className="text-xs text-text-faint">{r.product.ref}</span></> },
            { header: 'Rack', cell: (r) => r.rack.name },
            { header: 'Shelf', cell: (r) => r.shelf.ref },
            { header: 'Warehouse', cell: (r) => r.warehouse.ref },
            { header: 'Qty', align: 'right', cell: (r) => r.qty },
            { header: 'Lot', cell: (r) => r.lot || '-' },
          ]}
        />
      )}
    </Panel>
  )
}

export function PharmacyReturns() {
  const [tab, setTab] = useState<'sales' | 'recall'>('sales')
  const [sel, setSel] = useState<PharmacySale | null>(null)
  const sales = usePharmacyRecentSales()
  const recalls = usePharmacyRecalls()
  const tabCls = (on: boolean) => `rounded-full px-3 py-1 text-xs font-semibold ${on ? 'bg-(--color-brand) text-white' : 'bg-surface-hover text-text-muted'}`
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Notice icon={Undo2}>Sales returns issue a ZRA credit note and return stock to its batch. Recalls quarantine a batch and flag the units still on hand.</Notice>
      <Panel className="min-h-0 flex-1" title="Returns & Recall" sub="Credit notes · batch recall" right={<Pill tone="ok">live</Pill>} footer={tab === 'sales' && sales.data ? `${sales.data.length} recent sale${sales.data.length === 1 ? '' : 's'}` : undefined} toolbar={<div className="flex gap-2 px-4 py-3">
          <button type="button" className={tabCls(tab === 'sales')} onClick={() => setTab('sales')}>Sales returns</button>
          <button type="button" className={tabCls(tab === 'recall')} onClick={() => setTab('recall')}>Recall &amp; quarantine</button>
        </div>}>
        {tab === 'sales' ? (
          <div className="grid gap-4 px-4 pb-4 xl:grid-cols-[1fr_15rem]">
            <div>
              <Status loading={sales.isLoading} error={sales.error} empty={sales.data?.length === 0} emptyText="No sales yet." />
              {sales.data && sales.data.length > 0 && (
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                        <th className="py-2 pr-4 font-medium">Invoice</th>
                        <th className="py-2 pr-4 font-medium">Customer</th>
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.data.map((s) => (
                        <tr key={s.id} onClick={() => setSel(s)} className={`cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover ${sel?.id === s.id ? 'bg-brand/10' : ''}`}>
                          <td className="py-2.5 pr-4 font-semibold text-text!">{s.ref}</td>
                          <td className="py-2.5 pr-4">{s.customer}</td>
                          <td className="py-2.5 pr-4">{s.date}</td>
                          <td className="py-2.5 text-right font-semibold tabular-nums">{kwacha(s.total_ttc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="sticky top-0 self-start rounded-xl border border-border bg-surface p-4 text-sm">
              {sel ? (
                <div className="space-y-1.5">
                  <p className="font-semibold text-text!">{sel.ref}</p>
                  <p className="text-text-muted">{sel.customer} · {sel.date}</p>
                  <p className="tabular-nums">{kwacha(sel.total_ttc)} · {sel.paid ? 'paid' : 'unpaid'}</p>
                  <Link to={ROUTES.invoiceDetail.replace(':id', String(sel.id))} className="text-brand hover:underline">Open invoice</Link>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-text-faint">
                  <RotateCcw size={26} /> Select a sale to return.
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <Status loading={recalls.isLoading} error={recalls.error} />
            {recalls.data && <RawTable rows={recalls.data} classicColumns={['Medicine', 'Batch', 'Reason', 'Date', 'Units affected', 'Status']} emptyText="No recalls." />}
          </>
        )}
      </Panel>
    </div>
  )
}

export function PharmacyRegister() {
  const { data, isLoading, error } = usePharmacyRegister()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Notice icon={ShieldCheck}>Statutory controlled-drug register — one append-only row per scheduled dispense, written automatically at the point of sale. Read-only.</Notice>
      <Panel
        className="min-h-0 flex-1"
        footer={data ? `${data.length} entr${data.length === 1 ? 'y' : 'ies'}` : undefined}
        title="Schedule register"
        sub="Controlled-drug dispensing log"
        right={
          <>
            <GhostButton disabled={!data?.length} onClick={() => data && downloadCsv('schedule-register.csv', Object.keys(data[0]), data.map((r) => Object.values(r)))}>
              Export CSV
            </GhostButton>
            <Pill tone="ok">live</Pill>
          </>
        }
      >
        <Status loading={isLoading} error={error} />
        {data && <RawTable rows={data} classicColumns={['When', 'Drug', 'Sched', 'Batch', 'Qty', 'Balance', 'Prescriber', 'Invoice']} emptyText="No controlled dispenses recorded." />}
      </Panel>
    </div>
  )
}

export function PharmacyDur() {
  const config = usePharmacyDurConfig()
  const rules = usePharmacyInteractions()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Notice icon={Stethoscope}>
        Clinical screening runs at verify/dispense: allergy + duplicate-therapy work on patient &amp; medicine data; drug-drug interactions fire from the ruleset below. A comprehensive interaction set needs a
        licensed drug database or a ZAMRA/EML import.
      </Notice>
      <Panel title="DUR settings" sub="Clinical decision support">
        <Status loading={config.isLoading} error={config.error} />
        {config.data && (
          <div className="space-y-2 px-4 py-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!config.data.enabled} readOnly disabled /> <b className="text-text!">Enable DUR screening</b>
              <span className="text-text-muted">— show allergy / duplicate / interaction warnings at verify &amp; dispense</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!config.data.block_major} readOnly disabled /> <b className="text-text!">Block on MAJOR warning</b>
              <span className="text-text-muted">— dispensing a major-flagged script requires a pharmacist override reason (logged)</span>
            </label>
          </div>
        )}
      </Panel>
      <Panel className="min-h-0 flex-1" title="Drug-interaction ruleset" sub="Ingredient pairs checked at dispense" right={<Pill tone="ok">live</Pill>}>
        <Status loading={rules.isLoading} error={rules.error} />
        {rules.data && <RawTable rows={rules.data} classicColumns={['Ingredient A', 'Ingredient B', 'Severity', 'Note', 'Source']} emptyText="No interaction rules yet — allergy & duplicate checks still run." />}
      </Panel>
    </div>
  )
}

export function PharmacySettings() {
  const tiles = ['Tax codes & drug schedules', 'Devices, printing & labels', 'Role rights', 'Rack/shelf map']
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Notice>This area ships in a later build phase. Planned scope below.</Notice>
      <Panel title="Settings" sub="Tax · schedules · devices · printing">
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <div key={t} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-semibold text-text!">
              <Cog size={15} className="text-brand" /> {t}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
