import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileBadge, LoaderCircle, Pencil, Plus, Trash2, X, Users, StickyNote, Paperclip, CalendarClock, Check } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatMoney, formatNumber } from '../../../utils/format'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { RecordNotesTab, ContractDocumentsTab, ContractAgendaTab } from '../../contracts/components/ContractTabs'
import { ContactsTab } from '../../purchaseOrders/components/PurchaseOrderDetail'
import { useAddOrderLikeContact, useOrderLikeContacts } from '../../purchases/orderLikeContacts.queries'
import { SP_BASE, useProposalAction, useProposalLines, useSupplierProposalDetail, type ProposalActionKey, type ProposalDetail, type ProposalLine } from '../supplierProposalDetail.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

const TABS = [
  { key: 'proposal', label: 'Vendor proposal', icon: FileBadge },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'files', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
] as const
type TabKey = (typeof TABS)[number]['key']

// The lifecycle buttons, in the classic card's order.
const ACTION_LABELS: Record<string, string> = {
  validate: 'Validate',
  set_draft: 'Modify (back to draft)',
  close_signed: 'Mark as signed',
  close_refused: 'Mark as refused',
  close: 'Close',
  reopen: 'Re-open',
  clone: 'Clone',
  delete: 'Delete',
}

const useContactsHook = (id: string | undefined, newcompany?: string) => useOrderLikeContacts(SP_BASE, id, newcompany)
const useAddContactHook = (id: string | undefined) => useAddOrderLikeContact(SP_BASE, id)

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-4 text-sm text-text-muted whitespace-nowrap align-top">{label}</td>
      <td className="py-2 text-sm text-text! align-top">{value || '—'}</td>
    </tr>
  )
}

function LineRow({ line, editable, onSave, onDelete, busy }: { line: ProposalLine; editable: boolean; onSave: (line: ProposalLine) => void; onDelete: () => void; busy: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(line)
  if (!editing) {
    return (
      <tr className="border-b border-border last:border-0">
        <td className="px-4 py-2.5 text-text!">
          {line.productRef && <span className="text-text-muted">{line.productRef} — </span>}
          {line.description || line.productLabel}
        </td>
        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{line.vatRate}%</td>
        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(line.unitPriceHt)}</td>
        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{formatNumber(line.qty)}</td>
        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{line.discountPercent}%</td>
        <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(line.totalTtc)}</td>
        <td className="px-2 py-2 text-center whitespace-nowrap">
          {editable && (
            <>
              <button type="button" title="Edit line" onClick={() => { setDraft(line); setEditing(true) }} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand">
                <Pencil size={14} />
              </button>
              <button type="button" title="Delete line" disabled={busy} onClick={onDelete} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </td>
      </tr>
    )
  }
  const num = (k: 'qty' | 'unitPriceHt' | 'vatRate' | 'discountPercent') => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) || 0 }))
  return (
    <tr className="border-b border-border bg-surface-alt/50">
      <td className="px-4 py-2">
        <input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className={inputCls} />
      </td>
      <td className="px-2 py-2"><input type="number" value={draft.vatRate} onChange={num('vatRate')} className={inputCls} /></td>
      <td className="px-2 py-2"><input type="number" step="0.01" value={draft.unitPriceHt} onChange={num('unitPriceHt')} className={inputCls} /></td>
      <td className="px-2 py-2"><input type="number" value={draft.qty} onChange={num('qty')} className={inputCls} /></td>
      <td className="px-2 py-2"><input type="number" value={draft.discountPercent} onChange={num('discountPercent')} className={inputCls} /></td>
      <td />
      <td className="px-2 py-2 text-center whitespace-nowrap">
        <button type="button" disabled={busy} onClick={() => { onSave(draft); setEditing(false) }} className="p-1.5 rounded-md text-success hover:bg-surface-hover" title="Save line">
          <Check size={14} />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover" title="Cancel">
          <X size={14} />
        </button>
      </td>
    </tr>
  )
}

function ProposalMain({ data, id }: { data: ProposalDetail; id: string }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const action = useProposalAction(id)
  const lines = useProposalLines(id)
  const [error, setError] = useState('')
  const [model, setModel] = useState('')
  const [adding, setAdding] = useState({ description: '', qty: '1', unitPriceHt: '', vatRate: '0' })
  const draft = data.status === 0
  const editable = draft && data.canWrite
  const busy = action.isPending || lines.add.isPending || lines.update.isPending || lines.remove.isPending
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'The action failed.')

  async function run(key: ProposalActionKey) {
    setError('')
    if (key === 'delete' && !(await confirm({ title: 'Delete this vendor proposal?', message: 'The draft and its lines are deleted.', confirmLabel: 'Delete' }))) return
    if (key === 'close_refused' && !(await confirm({ title: 'Mark as refused?', message: 'The vendor proposal is closed as refused.', confirmLabel: 'Refuse' }))) return
    action.mutate(
      { action: key, extra: key === 'delete' ? { confirm: true } : undefined },
      {
        onSuccess: (res) => {
          if (key === 'delete') navigate(ROUTES.supplierProposalList)
          else if (key === 'clone' && res?.id) navigate(ROUTES.supplierProposalDetail.replace(':id', String(res.id)))
        },
        onError: fail,
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!h-auto shrink-0">
          <table className="w-full">
            <tbody>
              <InfoRow label="Vendor" value={data.vendorName} />
              <InfoRow label="Created" value={data.dateCreation} />
              <InfoRow label="Validated on" value={data.dateValid} />
              <InfoRow label="Closed on" value={data.dateClosed} />
              <InfoRow label="Planned date of delivery" value={data.dateDelivery} />
              <InfoRow label="Public note" value={data.notePublic} />
            </tbody>
          </table>
        </Card>
        <Card className="!h-auto shrink-0">
          <table className="w-full">
            <tbody>
              <InfoRow label="Amount (Excl. Tax)" value={`${formatMoney(data.totalHt)} ${data.currency}`} />
              <InfoRow label="VAT" value={`${formatMoney(data.totalTva)} ${data.currency}`} />
              <InfoRow label="Amount (Inc. Tax)" value={`${formatMoney(data.totalTtc)} ${data.currency}`} />
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-text!">Item Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Product / Service</th>
                <th className="font-medium px-4 py-2.5 text-center">VAT</th>
                <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
                <th className="font-medium px-4 py-2.5 text-center">Qty</th>
                <th className="font-medium px-4 py-2.5 text-center">Disc.</th>
                <th className="font-medium px-4 py-2.5 text-right">Total (Incl.)</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {data.lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                    No lines on this vendor proposal.
                  </td>
                </tr>
              ) : (
                data.lines.map((l) => (
                  <LineRow
                    key={l.lineId}
                    line={l}
                    editable={editable}
                    busy={busy}
                    onSave={(line) => lines.update.mutate({ lineId: line.lineId, description: line.description, qty: line.qty, unitPriceHt: line.unitPriceHt, vatRate: line.vatRate, discountPercent: line.discountPercent }, { onError: fail })}
                    onDelete={() => lines.remove.mutate(l.lineId, { onError: fail })}
                  />
                ))
              )}
              {editable && (
                <tr className="bg-surface-alt/50">
                  <td className="px-4 py-2"><input placeholder="Description" value={adding.description} onChange={(e) => setAdding((a) => ({ ...a, description: e.target.value }))} className={inputCls} /></td>
                  <td className="px-2 py-2"><input type="number" value={adding.vatRate} onChange={(e) => setAdding((a) => ({ ...a, vatRate: e.target.value }))} className={inputCls} /></td>
                  <td className="px-2 py-2"><input type="number" step="0.01" value={adding.unitPriceHt} onChange={(e) => setAdding((a) => ({ ...a, unitPriceHt: e.target.value }))} className={inputCls} /></td>
                  <td className="px-2 py-2"><input type="number" value={adding.qty} onChange={(e) => setAdding((a) => ({ ...a, qty: e.target.value }))} className={inputCls} /></td>
                  <td />
                  <td />
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      disabled={busy || !adding.description.trim() || !(Number(adding.qty) > 0)}
                      onClick={() =>
                        lines.add.mutate(
                          { description: adding.description.trim(), qty: Number(adding.qty), unitPriceHt: Number(adding.unitPriceHt) || 0, vatRate: Number(adding.vatRate) || 0 },
                          { onSuccess: () => setAdding({ description: '', qty: '1', unitPriceHt: '', vatRate: '0' }), onError: fail },
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-surface-hover disabled:opacity-50"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto shrink-0">
        {error && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {data.actions
            .filter((a) => ACTION_LABELS[a.key])
            .map((a) => (
              <button
                key={a.key}
                type="button"
                disabled={!a.enabled || busy}
                title={a.enabled ? undefined : a.reason}
                onClick={() => void run(a.key as ProposalActionKey)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${a.key === 'delete' ? 'border-danger/40 text-danger hover:bg-danger/10' : 'border-border text-text hover:bg-surface-hover'}`}
              >
                {action.isPending && action.variables?.action === a.key && <LoaderCircle size={14} className="animate-spin" />} {ACTION_LABELS[a.key]}
              </button>
            ))}
        </div>
      </Card>

      <Card className="!h-auto shrink-0">
        <h3 className="font-semibold text-text! mb-3">Documents</h3>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {data.docModels.length > 0 && (
            <select value={model || data.defaultModel} onChange={(e) => setModel(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
              {data.docModels.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => action.mutate({ action: 'build_doc', extra: { model: model || data.defaultModel || undefined } }, { onError: fail })}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            Generate
          </button>
        </div>
        {data.documents.length === 0 ? (
          <p className="text-sm text-text-faint">No document generated yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.documents.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 text-sm">
                <a href={f.url} target="_blank" rel="noreferrer" className="text-brand hover:underline truncate">
                  {f.name}
                </a>
                <span className="text-xs text-text-faint">{f.size}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// Vendor proposal card on supplier_proposal/fapi: get (with available_actions), actions, lines and the four tabs
// (the tabs share the purchase-order contract, so their components are the order ones).
export function SupplierProposalDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('proposal')
  const { data, isLoading, isError, error, refetch } = useSupplierProposalDetail(id)

  if (isLoading) return <LegacyLoadingCard label="Loading vendor proposal…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load this vendor proposal" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <Card className="!h-auto shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
              <FileBadge size={20} className="text-brand" /> {data.ref}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Vendor:{' '}
              {data.socid ? (
                <Link to={`${ROUTES.customerDetail.replace(':id', String(data.socid))}?tab=vendor`} className="text-brand hover:underline">
                  {data.vendorName}
                </Link>
              ) : (
                data.vendorName
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {data.statusLabel && <span className="rounded-full bg-surface-alt border border-border px-3 py-1 text-xs font-medium text-text">{data.statusLabel}</span>}
            <Link to={ROUTES.supplierProposalList} className="p-2 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
              <X size={16} />
            </Link>
          </div>
        </div>
        <div className="mt-3 -mx-4 -mb-4 border-t border-border">
          <div className="flex items-center overflow-x-auto px-4">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'}`}
              >
                <Icon size={14} className="shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {tab === 'proposal' && <ProposalMain data={data} id={id!} />}
      {tab === 'contacts' && <ContactsTab id={id!} useContacts={useContactsHook} useAdd={useAddContactHook} subject="vendor proposal" />}
      {tab === 'notes' && <RecordNotesTab id={id} base={SP_BASE} />}
      {tab === 'files' && <ContractDocumentsTab id={id} base={SP_BASE} />}
      {tab === 'agenda' && <ContractAgendaTab id={id} socid={data.socid ?? undefined} base={SP_BASE} eventElement="supplier_proposal" subject="vendor proposal" />}
    </div>
  )
}
