import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { downloadSemicolonCsv } from '../../../utils/csvDownload'
import { fmtDate, int, money, type AssetCard } from '../assetModels'
import { Badge, EmptyState, LineChart } from './AssetUi'
import { DANGER_GHOST_BTN, GHOST_BTN, PRIMARY_BTN, TD, TDR, TH, THR, ledgerPiecePath } from '../assetUiHelpers'

type Policy = AssetCard['policies'][number]
type Claim = AssetCard['claims'][number]

export interface CardTabProps {
  tab: 'schedule' | 'insurance' | 'movements' | 'ledger' | 'history'
  card: AssetCard
  onReverse: (piece: number) => void
  onUnits: (period: string) => void
  onPolicy: (p: Policy | null) => void
  onPolicyDelete: (id: number) => void
  onClaim: (c: Claim | null) => void
}

const PieceLink = ({ n }: { n: number }) => (
  <Link to={ledgerPiecePath(n)} className="text-brand hover:underline">
    #{n}
  </Link>
)

function Table({ head, children }: { head: Array<[string, boolean?]>; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {head.map(([h, right], i) => (
              <th key={`${h}${i}`} className={right ? THR : TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  )
}

function ScheduleTab({ card: a, onReverse, onUnits }: CardTabProps) {
  const rows = a.schedule.rows
  if (!rows.length) {
    return (
      <Card className="!h-auto">
        <EmptyState title="No schedule yet">{a.schedule.warnings.join(' ') || 'Put the asset in service to start depreciation.'}</EmptyState>
      </Card>
    )
  }
  const units = a.method === 'units'
  const lastPosted = [...rows].reverse().find((r) => r.status === 1)
  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <LineChart
          labels={rows.map((r) => r.period)}
          series={[
            { name: 'Cost', color: 'var(--color-text-faint)', values: rows.map(() => a.cost), dash: true },
            { name: 'Accumulated depreciation', color: 'var(--color-warning-fg)', values: rows.map((r) => r.accumulated) },
            { name: 'Net book value', color: 'var(--color-brand)', values: rows.map((r) => r.nbv) },
          ]}
        />
      </Card>
      <Card className="!h-auto !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <b className="text-text!">Schedule</b>
            <span className="text-text-muted">
              {int(rows.filter((r) => r.status === 1).length)} posted · {int(rows.filter((r) => r.status === 0).length)} planned · posted {money(a.schedule.totals.posted)} · planned {money(a.schedule.totals.planned)}
            </span>
          </div>
          <button
            type="button"
            className={GHOST_BTN}
            onClick={() =>
              downloadSemicolonCsv(
                `${a.ref}-schedule.csv`,
                [['period', 'Month'], ['units', 'Units'], ['amount', 'Depreciation'], ['accumulated', 'Accumulated'], ['nbv', 'NBV'], ['status', 'Posted'], ['piece_num', 'Piece']],
                rows as unknown as Array<Record<string, unknown>>,
              )
            }
          >
            <Download size={14} /> CSV
          </button>
        </div>
        <Table head={[['Month'], ...(units ? ([[`Usage (${a.unit_label ?? ''})`, true]] as Array<[string, boolean?]>) : []), ['Depreciation', true], ['Accumulated', true], ['NBV', true], ['Status'], ['']]}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-b border-border last:border-0">
                <td className={TD}>{r.period}</td>
                {units && <td className={TDR}>{r.units == null ? '—' : int(r.units)}</td>}
                <td className={TDR}>{money(r.amount)}</td>
                <td className={TDR}>{money(r.accumulated)}</td>
                <td className={`${TDR} font-bold`}>{money(r.nbv)}</td>
                <td className={TD}>
                  {r.status === 1 && r.piece_num ? (
                    <Link to={ledgerPiecePath(r.piece_num)}>
                      <Badge tone="ok">Posted #{r.piece_num}</Badge>
                    </Link>
                  ) : r.needs_units ? (
                    <Badge tone="warn">Usage needed</Badge>
                  ) : (
                    <Badge>Planned</Badge>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  {r.status === 1 && lastPosted === r && a.rights.reverse && r.piece_num && (
                    <button type="button" className={DANGER_GHOST_BTN} onClick={() => onReverse(r.piece_num as number)}>
                      Reverse
                    </button>
                  )}
                  {r.status === 0 && units && a.rights.post && a.lifecycle === 'in_service' && (
                    <button type="button" className={GHOST_BTN} onClick={() => onUnits(r.period)}>
                      {r.units == null ? 'Enter usage' : 'Edit usage'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

function InsuranceTab({ card: a, onPolicy, onPolicyDelete, onClaim }: CardTabProps) {
  const can = a.rights.insurance
  const CLAIM_TONE = { open: 'warn', settled: 'ok', rejected: 'bad' } as const
  return (
    <div className="space-y-4">
      <Card className="!h-auto !p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <b className="text-text!">Policies</b>
          {can && (
            <button type="button" className={PRIMARY_BTN} onClick={() => onPolicy(null)}>
              + Policy
            </button>
          )}
        </div>
        {a.policies.length ? (
          <Table head={[['Insurer'], ['Policy no.'], ['Cover', true], ['Premium', true], ['Period'], ['']]}>
            <tbody>
              {a.policies.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className={TD}>{p.insurer || '—'}</td>
                  <td className={`${TD} font-mono text-xs`}>{p.policy_no}</td>
                  <td className={TDR}>{money(p.cover)}</td>
                  <td className={TDR}>{money(p.premium)}</td>
                  <td className={TD}>
                    {fmtDate(p.start)} – {fmtDate(p.end)} {p.expired && <Badge tone="bad">Expired</Badge>}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    {can && (
                      <span className="inline-flex gap-1.5">
                        <button type="button" className={GHOST_BTN} onClick={() => onPolicy(p)}>
                          Edit
                        </button>
                        <button type="button" className={DANGER_GHOST_BTN} onClick={() => onPolicyDelete(p.id)}>
                          Remove
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="Not insured">Add the policy that covers this asset.</EmptyState>
        )}
      </Card>

      <Card className="!h-auto !p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <b className="text-text!">Claims</b>
          {can && (
            <button type="button" className={GHOST_BTN} onClick={() => onClaim(null)}>
              + Claim
            </button>
          )}
        </div>
        {a.claims.length ? (
          <Table head={[['Date'], ['Reference'], ['Description'], ['Claimed', true], ['Settled', true], ['Status'], ['']]}>
            <tbody>
              {a.claims.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className={`${TD} whitespace-nowrap`}>{fmtDate(c.date)}</td>
                  <td className={TD}>{c.reference}</td>
                  <td className={TD}>{c.description}</td>
                  <td className={TDR}>{money(c.claimed)}</td>
                  <td className={TDR}>{c.settled == null ? '—' : money(c.settled)}</td>
                  <td className={TD}>
                    <Badge tone={CLAIM_TONE[c.status] ?? 'neutral'}>{c.status}</Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    {can && (
                      <button type="button" className={GHOST_BTN} onClick={() => onClaim(c)}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No claims" />
        )}
      </Card>
    </div>
  )
}

function MovementsTab({ card: a }: CardTabProps) {
  return (
    <Card className="!h-auto !p-0">
      {a.movements.length ? (
        <Table head={[['Date'], ['From'], ['To'], ['Note']]}>
          <tbody>
            {a.movements.map((m, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className={`${TD} whitespace-nowrap`}>{fmtDate(m.date)}</td>
                <td className={TD}>{[m.from_group, m.from_location].filter(Boolean).join(' · ') || '—'}</td>
                <td className={TD}>{[m.to_group, m.to_location].filter(Boolean).join(' · ') || '—'}</td>
                <td className={TD}>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title="No transfers">
          Use <b>Transfer</b> to move the asset to another group, location or custodian.
        </EmptyState>
      )}
    </Card>
  )
}

function LedgerTab({ card: a, onReverse }: CardTabProps) {
  if (!a.ledger.length) {
    return (
      <Card className="!h-auto">
        <EmptyState title="No ledger postings yet" />
      </Card>
    )
  }
  const debit = a.ledger.reduce((s, l) => s + l.debit, 0)
  const credit = a.ledger.reduce((s, l) => s + l.credit, 0)
  // One Reverse button per piece (a piece has several lines).
  const seen = new Set<number>()
  return (
    <Card className="!h-auto !p-0">
      <Table head={[['Date'], ['Piece'], ['Journal'], ['Type'], ['Account'], ['Label'], ['Debit', true], ['Credit', true], ['']]}>
        <tbody>
          {a.ledger.map((l) => {
            const canReverse = a.rights.reverse && !['asset_reversal', 'supplier_invoice', 'asset_depreciation'].includes(l.doc_type)
            const first = !seen.has(l.piece_num)
            seen.add(l.piece_num)
            return (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className={`${TD} whitespace-nowrap`}>{fmtDate(l.date)}</td>
                <td className={TD}>
                  <PieceLink n={l.piece_num} />
                  {l.locked ? ' 🔒' : ''}
                </td>
                <td className={TD}>{l.journal}</td>
                <td className={TD}>{l.doc_type.replace(/^asset_/, '').replace(/_/g, ' ')}</td>
                <td className={TD}>
                  <span className="font-mono text-xs">{l.account}</span> <span className="text-text-muted">{l.account_label}</span>
                </td>
                <td className={TD}>{l.label}</td>
                <td className={TDR}>{l.debit ? money(l.debit) : ''}</td>
                <td className={TDR}>{l.credit ? money(l.credit) : ''}</td>
                <td className={TD}>
                  {canReverse && first && (
                    <button type="button" className={DANGER_GHOST_BTN} onClick={() => onReverse(l.piece_num)}>
                      Reverse
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-bold">
            <td colSpan={6} className={`${TD} text-right`}>
              Total
            </td>
            <td className={TDR}>{money(debit)}</td>
            <td className={TDR}>{money(credit)}</td>
            <td />
          </tr>
        </tfoot>
      </Table>
    </Card>
  )
}

function HistoryTab({ card: a }: CardTabProps) {
  return (
    <Card className="!h-auto !p-0">
      {a.events.length ? (
        <Table head={[['Date'], ['Event'], ['Detail'], ['Amount', true], ['Piece'], ['By']]}>
          <tbody>
            {a.events.map((e, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className={`${TD} whitespace-nowrap`}>{fmtDate(e.date)}</td>
                <td className={TD}>
                  <Badge tone="info">{e.type.replace(/_/g, ' ')}</Badge>
                </td>
                <td className={TD}>{e.label}</td>
                <td className={TDR}>{e.amount == null ? '' : money(e.amount)}</td>
                <td className={TD}>{e.piece_num ? <PieceLink n={e.piece_num} /> : ''}</td>
                <td className={TD}>{e.user}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title="No history" />
      )}
    </Card>
  )
}

export default function AssetCardTab(props: CardTabProps) {
  switch (props.tab) {
    case 'schedule':
      return <ScheduleTab {...props} />
    case 'insurance':
      return <InsuranceTab {...props} />
    case 'movements':
      return <MovementsTab {...props} />
    case 'ledger':
      return <LedgerTab {...props} />
    case 'history':
      return <HistoryTab {...props} />
  }
}
