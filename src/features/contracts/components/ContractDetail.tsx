import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  FileEdit,
  Users2,
  StickyNote,
  Clock,
  Paperclip,
  CalendarClock,
  Mail,
  Check,
  Pencil,
  Copy,
  Trash2,
  Search,
  Link2,
  Upload,
  LoaderCircle,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, InfoChip, StatusPill } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useTheme } from '../../../context/ThemeContext'

import { useContractsList } from '../contracts.queries'
import { useContractApiDetail, useContractLines, useContractOperation, useDeleteContract, useUpdateContract, contractLineStatusLabel } from '../contractDetail.queries'

const TABS = [
  { key: 'card', label: 'Contract Card', icon: FileEdit },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'followup', label: 'Follow Up', icon: Clock },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
] as const
type TabKey = (typeof TABS)[number]['key']

function TabTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-brand">
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
      {count !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-surface-hover text-text-muted text-xs font-semibold">{count}</span>
      )}
    </h3>
  )
}

const disabledBtn = 'flex items-center gap-1.5 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-not-allowed'
const operationBtn = 'flex items-center gap-1.5 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover disabled:text-text-faint disabled:cursor-not-allowed disabled:opacity-60'

export function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('card')
  const { theme } = useTheme()
  const isBlueMetal = theme === 'blue-metal'
  const { data: contracts, isLoading, isError, error, refetch } = useContractsList()

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading contract…" />
      </div>
    )
  }
  if (isError || !contracts) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load contract" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  const contract = contracts.find((c) => c.id === Number(id))
  if (!contract) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Contract not found" message={`No contract with id ${id} in the current list.`} onRetry={() => refetch()} />
      </div>
    )
  }

  const totalServices = contract.notRunning + contract.inProgress + contract.expired + contract.closed

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="flex items-start gap-4 min-w-[240px] flex-1">
                <span className={`flex items-center justify-center w-16 h-16 bg-brand text-white shrink-0 ${isBlueMetal ? 'rounded-full' : 'rounded-lg'}`}>
                  <FileEdit size={28} />
                </span>
                <div className="space-y-1.5 pt-0.5">
                  <Link to={ROUTES.contractList} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text">
                    <ChevronLeft size={14} /> Contracts
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-text!">{contract.ref}</h2>
                    {isBlueMetal ? (
                      <StatusPill tone="brand">
                        {totalServices} Service{totalServices === 1 ? '' : 's'}
                      </StatusPill>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand">
                        {totalServices} Service{totalServices === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {isBlueMetal ? (
                    <div className="flex flex-wrap items-center gap-4">
                      {contract.thirdParty && (
                        <InfoChip
                          icon={Users2}
                          label="Third-party"
                          value={
                            contract.thirdPartyId ? (
                              <Link to={ROUTES.customerDetail.replace(':id', contract.thirdPartyId)} className="hover:underline">
                                {contract.thirdParty}
                              </Link>
                            ) : (
                              contract.thirdParty
                            )
                          }
                          color="blue"
                        />
                      )}
                      {(contract.refCustomer || contract.refVendor) && (
                        <InfoChip icon={FileEdit} label="Ref. customer / vendor" value={`${contract.refCustomer || '—'} / ${contract.refVendor || '—'}`} color="violet" />
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted space-y-0.5">
                      <p>
                        <span className="text-text-faint">Ref. customer:</span> {contract.refCustomer || <span className="italic">—</span>}
                        {'  '}
                        <span className="text-text-faint">Ref. vendor:</span> {contract.refVendor || <span className="italic">—</span>}
                      </p>
                      <p className="flex items-center gap-1">
                        <span className="text-text-faint">Third-party:</span>{' '}
                        {contract.thirdPartyId ? (
                          <Link to={ROUTES.customerDetail.replace(':id', contract.thirdPartyId)} className="text-brand hover:underline font-medium">
                            {contract.thirdParty}
                          </Link>
                        ) : (
                          <span className="font-medium text-text!">{contract.thirdParty}</span>
                        )}
                        {contract.thirdPartySubtitle && <span className="text-text-faint">({contract.thirdPartySubtitle})</span>}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-text-muted">
                <p className="text-xs">
                  {contract.notRunning} not running · {contract.inProgress} in progress · {contract.expired} expired · {contract.closed} closed
                </p>
              </div>
            </div>
            <div className="border-t border-border">
              <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6" style={{ scrollBehavior: 'smooth' }}>
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'card' && <ContractCardTab id={id} />}
        {tab === 'contacts' && <ContactsAddressesTab />}
        {tab === 'notes' && <NotesTab />}
        {tab === 'followup' && <FollowUpTab />}
        {tab === 'documents' && <LinkedFilesTab />}
        {tab === 'agenda' && <EventsAgendaTab />}
      </div>
    </div>
  )
}

function ContractCardTab({ id }: { id: string | undefined }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useContractLines(id)
  const contractApi = useContractApiDetail(id)
  const operation = useContractOperation(id)
  const removeContract = useDeleteContract(id)
  const updateContract = useUpdateContract(id)
  const [operationError, setOperationError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({ refCustomer: '', date: '', notePublic: '', notePrivate: '' })

  function openEdit() {
    const contract = contractApi.data
    if (!contract?.actions.can_edit) return
    setEditValues({
      refCustomer: contract.ref_customer ?? '',
      date: contract.date_contrat?.slice(0, 10) ?? '',
      notePublic: contract.note_public ?? '',
      notePrivate: contract.note_private ?? '',
    })
    setOperationError('')
    setEditing(true)
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOperationError('')
    try {
      await updateContract.mutateAsync({
        ref_customer: editValues.refCustomer,
        date_contrat: editValues.date || undefined,
        note_public: editValues.notePublic,
        note_private: editValues.notePrivate,
      })
      setEditing(false)
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Could not update the contract.')
    }
  }

  async function runForLines(action: 'activate_line' | 'close_line') {
    if (!data) return
    const eligible = data.lines.filter((line) => action === 'activate_line' ? line.statut === 0 : line.statut === 4)
    let completed = 0
    setOperationError('')
    try {
      for (const line of eligible) {
        await operation.mutateAsync({ action, lineId: line.rowid })
        completed += 1
      }
    } catch (err) {
      setOperationError(
        `${err instanceof Error ? err.message : 'The contract operation failed.'}${completed ? ` ${completed} line(s) were updated before the failure; refresh to review the result.` : ''}`,
      )
    }
  }

  async function handleDelete() {
    if (!contractApi.data?.actions.can_delete || !window.confirm('Delete this contract? This cannot be undone.')) return
    setOperationError('')
    try {
      await removeContract.mutateAsync()
      navigate(ROUTES.contractList)
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Could not delete the contract.')
    }
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
            <Mail size={14} /> Send Email
          </button>
          <button
            type="button"
            disabled={!contractApi.data?.actions.can_edit || updateContract.isPending}
            title={contractApi.data?.actions.can_edit ? 'Modify contract details' : 'Modification is not permitted or contract details are unavailable'}
            onClick={openEdit}
            className={operationBtn}
          >
            <Pencil size={14} /> Modify
          </button>
          <button
            type="button"
            disabled={!contractApi.data?.actions.can_validate || operation.isPending}
            title={contractApi.data?.actions.can_validate ? 'Validate this contract' : 'Validation is not permitted or contract details are unavailable'}
            onClick={() => {
              setOperationError('')
              operation.mutate({ action: 'validate' }, { onError: (err) => setOperationError(err instanceof Error ? err.message : 'Could not validate the contract.') })
            }}
            className={operationBtn}
          >
            {operation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Validate
          </button>
          <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
            Create Order
          </button>
          <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
            Create Invoice
          </button>
          <button
            type="button"
            disabled={!contractApi.data?.actions.can_activate || !data?.lines.some((line) => line.statut === 0) || operation.isPending}
            title={contractApi.data?.actions.can_activate ? 'Activate every not-running contract line' : 'Activation is not permitted or contract details are unavailable'}
            onClick={() => void runForLines('activate_line')}
            className={operationBtn}
          >
            {operation.isPending && <LoaderCircle size={14} className="animate-spin" />}
            Activate All Contract Lines
          </button>
          <button
            type="button"
            disabled={!contractApi.data?.actions.can_close_line || !data?.lines.some((line) => line.statut === 4) || operation.isPending}
            title={contractApi.data?.actions.can_close_line ? 'Close every open contract line' : 'Closing lines is not permitted or contract details are unavailable'}
            onClick={() => void runForLines('close_line')}
            className={operationBtn}
          >
            {operation.isPending && <LoaderCircle size={14} className="animate-spin" />}
            Close All Contract Lines
          </button>
          <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
            <Copy size={14} /> Clone
          </button>
          <button
            type="button"
            disabled={!contractApi.data?.actions.can_delete || removeContract.isPending}
            title={contractApi.data?.actions.can_delete ? 'Delete this contract' : 'Deletion is not permitted or contract details are unavailable'}
            onClick={() => void handleDelete()}
            className={operationBtn}
          >
            {removeContract.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
          </button>
        </div>
        {operationError && <p role="alert" className="mt-3 text-sm text-danger">{operationError}</p>}
        {contractApi.isError && <p role="alert" className="mt-3 text-sm text-danger">{contractApi.error instanceof Error ? contractApi.error.message : 'Could not load contract permissions.'}</p>}
        {editing && (
          <form onSubmit={(event) => void handleUpdate(event)} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-4">
            <label className="flex flex-col gap-1 text-sm text-text">
              Customer reference
              <input value={editValues.refCustomer} onChange={(event) => setEditValues((values) => ({ ...values, refCustomer: event.target.value }))} className="rounded-md border border-input-border bg-input-bg px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text">
              Contract date
              <input type="date" value={editValues.date} onChange={(event) => setEditValues((values) => ({ ...values, date: event.target.value }))} className="rounded-md border border-input-border bg-input-bg px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text">
              Public note
              <textarea rows={3} value={editValues.notePublic} onChange={(event) => setEditValues((values) => ({ ...values, notePublic: event.target.value }))} className="rounded-md border border-input-border bg-input-bg px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text">
              Private note
              <textarea rows={3} value={editValues.notePrivate} onChange={(event) => setEditValues((values) => ({ ...values, notePrivate: event.target.value }))} className="rounded-md border border-input-border bg-input-bg px-3 py-2" />
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" disabled={updateContract.isPending} onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-text">Cancel</button>
              <button type="submit" disabled={updateContract.isPending} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
                {updateContract.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <TabTitle count={data?.total_lines}>Item Table</TabTitle>
        </div>
        {isLoading ? (
          <div className="p-4">
            <LegacyLoadingCard label="Loading contract lines…" />
          </div>
        ) : isError || !data ? (
          <div className="p-4">
            <LegacyErrorCard title="Couldn't load contract lines" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2.5">Product/Service</th>
                  <th className="font-medium px-4 py-2.5">Description</th>
                  <th className="font-medium px-4 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-4 py-2.5">VAT %</th>
                  <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
                  <th className="font-medium px-4 py-2.5 text-right">Unit Price (Inc. Tax)</th>
                  <th className="font-medium px-4 py-2.5 text-right">Disc.</th>
                  <th className="font-medium px-4 py-2.5">Start</th>
                  <th className="font-medium px-4 py-2.5">End</th>
                  <th className="font-medium px-4 py-2.5">Status</th>
                  <th className="font-medium px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-text-faint italic">
                      No lines on this contract.
                    </td>
                  </tr>
                ) : (
                  data.lines.map((l) => (
                    <tr key={l.rowid} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-text!">{l.product_label || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted max-w-xs truncate">{l.description}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.qty}</td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {l.tva_tx}
                        {l.vat_src_code ? ` (${l.vat_src_code})` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.price_ht.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.price_ttc.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{l.remise_percent}%</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{l.date_start || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{l.date_end || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted">{contractLineStatusLabel(l.statut)}</td>
                      <td className="px-4 py-2.5">
                        {l.statut === 0 && contractApi.data?.actions.can_activate ? (
                          <button
                            type="button"
                            disabled={operation.isPending}
                            onClick={() => operation.mutate({ action: 'activate_line', lineId: l.rowid }, { onError: (err) => setOperationError(err instanceof Error ? err.message : 'Could not activate this line.') })}
                            className="text-xs font-medium text-brand hover:underline disabled:opacity-60"
                          >
                            Activate
                          </button>
                        ) : l.statut === 4 && contractApi.data?.actions.can_close_line ? (
                          <button
                            type="button"
                            disabled={operation.isPending}
                            onClick={() => operation.mutate({ action: 'close_line', lineId: l.rowid }, { onError: (err) => setOperationError(err instanceof Error ? err.message : 'Could not close this line.') })}
                            className="text-xs font-medium text-brand hover:underline disabled:opacity-60"
                          >
                            Close
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// --- Design-only tabs below --------------------------------------------
// contrat/contact.php, note.php, follow_up.php, document.php and agenda.php
// are all full-page legacy HTML with no JSON API behind them (confirmed by
// reading each file directly — no json_encode/Content-Type: application/json
// anywhere in them). Per the standing rule against integrating scraped HTML
// pages, these tabs reproduce the real page's layout only — every control is
// inert (disabled, with a tooltip explaining why) and every list shows an
// honest empty state rather than invented data.

function ContactsAddressesTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Contacts/Addresses</TabTitle>
      
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <p className="text-xs text-text-faint mb-1">Nature Of Contact</p>
            <p className="text-sm font-medium text-text! flex items-center gap-1.5">
              <Users2 size={14} /> Users
            </p>
          </div>
          <div>
            <p className="text-xs text-text-faint mb-1">Third-Party</p>
            <select disabled className="w-full text-sm rounded-md border border-input-border bg-surface-hover text-text-faint px-2 py-1.5 cursor-not-allowed">
              <option>—</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-text-faint mb-1">Users/Contacts/Addresses</p>
            <select disabled className="w-full text-sm rounded-md border border-input-border bg-surface-hover text-text-faint px-2 py-1.5 cursor-not-allowed">
              <option>—</option>
            </select>
          </div>
          <button type="button" disabled title="No real API available on this backend"           className={operationBtn}>
            Add
          </button>
        </div>
      </Card>
      <Card className="!h-auto !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-4 py-2.5">Nature Of Contact</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5">Users/Contacts/Addresses</th>
              <th className="font-medium px-4 py-2.5">Contact Type</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-text-faint italic">
                No data source available.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function NotesTab() {
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Notes</TabTitle>
        <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
          Save
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text!">Note (public)</p>
          <textarea value={notePublic} onChange={(e) => setNotePublic(e.target.value)} rows={3} className="w-full mt-2 text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </Card>
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text!">Note (private)</p>
          <textarea value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} rows={3} className="w-full mt-2 text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </Card>
      </div>
    </div>
  )
}

function FollowUpTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Follow Up</TabTitle>
        <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
          Ecuenta Application
        </button>
      </div>
      
      <Card className="!h-auto !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Customer/Technical Support Representative</th>
              <th className="font-medium px-4 py-2.5">Status</th>
              <th className="font-medium px-4 py-2.5">Options</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-text-faint italic">
                No data source available.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function LinkedFilesTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Linked Files</TabTitle>
      
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Attach a new file/document</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            disabled
            className="text-sm text-text-faint file:mr-3 file:rounded-md file:border file:border-input-border file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-faint cursor-not-allowed"
          />
          <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
            <Upload size={14} /> Upload
          </button>
        </div>
      </Card>
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Link a new file/document</p>
        <div className="flex flex-wrap items-center gap-3">
          <input disabled placeholder="URL to link" className="flex-1 min-w-[180px] text-sm rounded-md border border-input-border bg-surface-hover text-text-faint px-3 py-1.5 cursor-not-allowed" />
          <input disabled placeholder="Label" className="flex-1 min-w-[140px] text-sm rounded-md border border-input-border bg-surface-hover text-text-faint px-3 py-1.5 cursor-not-allowed" />
          <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
            <Link2 size={14} /> Link
          </button>
        </div>
      </Card>
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Attached files and documents</p>
        <p className="text-sm text-text-faint italic text-center py-4">No Documents Uploaded</p>
      </Card>
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Linked files and documents</p>
        <p className="text-sm text-text-faint italic text-center py-4">No Registered Links</p>
      </Card>
    </div>
  )
}

function EventsAgendaTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Events/Agenda</TabTitle>
      
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-text-faint text-xs">Created By</p>
            <p className="font-medium text-text!">—</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Creation Date</p>
            <p className="font-medium text-text!">—</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Latest Modification Date</p>
            <p className="font-medium text-text!">—</p>
          </div>
        </div>
      </Card>
      <Card className="!h-auto">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input disabled placeholder="Search" className="w-full text-sm rounded-md border border-input-border bg-surface-hover text-text-faint pl-8 pr-3 py-1.5 cursor-not-allowed" />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 pr-3">Ref.</th>
              <th className="font-medium py-2 pr-3">Date</th>
              <th className="font-medium py-2 pr-3">By</th>
              <th className="font-medium py-2 pr-3">Type</th>
              <th className="font-medium py-2">Title</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="py-6 text-center text-text-faint italic">
                No data source available.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
