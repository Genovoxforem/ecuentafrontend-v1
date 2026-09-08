import { useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Ticket as TicketIcon,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Info,
  RotateCcw,
  Wrench,
  Mail,
  MessageSquarePlus,
  Paperclip,
  Link2,
  Upload,
  Send,
  ListChecks,
  History,
  Users,
  Save,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useTicketDetail, type TicketRow } from '../tickets.queries'
import { useAgendaFilterOptions } from '../../agenda/calendarApi.queries'
import {
  useChangeTicketStatus,
  useReopenTicket,
  useCloseTicket,
  useDeleteTicket,
  useAssignTicketUser,
  useUpdateTicketSubject,
  useAddTicketUserContact,
  useUploadTicketDocument,
  useLinkTicketDocument,
  useAddTicketFollowup,
  useAddChatMessage,
  WORK_STATUS_OPTIONS,
  PROCESSING_STATUS_OPTIONS,
  type AddFollowupInput,
} from '../ticketDetail.queries'
import { ROUTES } from '../../../routes'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 disabled:bg-surface disabled:text-text-faint disabled:cursor-default'
const primaryBtn = 'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:bg-neutral-bg disabled:text-text-faint disabled:cursor-default'

const STATUS_COLOR: Record<number, string> = { 0: '#6c757d', 1: '#17a2b8', 2: '#fd7e14', 3: '#007bff', 5: '#ffc107', 7: '#e83e8c', 8: '#28a745', 9: '#dc3545' }
// From ticket-status-change-ajax.php's own real target statuses (see
// ActionsTicket::viewStatusActions — every status except the current one,
// 8, 9, and (unless a config flag) 7 is offered as a quick pill).
const STATUS_PILLS = [
  { code: 1, label: 'Read' },
  { code: 2, label: 'Assigned' },
  { code: 3, label: 'In progress' },
  { code: 5, label: 'Waiting for feedback' },
]

const TABS = ['Ticket', 'Contacts/Addresses', 'Linked Files', 'Follow-up', 'Timeline', 'Chat'] as const
type Tab = (typeof TABS)[number]

interface SessionContact {
  name: string
  createdAt: number
}
interface SessionFile {
  kind: 'upload' | 'link'
  name: string
  createdAt: number
}
interface SessionFollowup extends AddFollowupInput {
  assignedUserName: string
  createdAt: number
}
interface SessionChatMessage {
  message: string
  private: boolean
  createdAt: number
}

// Every tab past "Ticket" itself backs onto a real write action with NO
// matching JSON read API anywhere on this backend (confirmed directly from
// each PHP file's own source — see ticketDetail.queries.ts's header
// comment) — so this banner is shown wherever a tab can only display what
// was added in the current browser session, not the ticket's real full
// history. Matches this app's existing "real write, no read API"
// convention (see ActionFormShell.tsx's identical banner for Payroll).
function SessionOnlyBanner({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-info-bg/40 px-3 py-2 mb-3">
      <Info size={13} className="text-info-fg mt-0.5 shrink-0" />
      <p className="text-xs text-info-fg">
        {what} is saved for real, but this backend has no JSON API to read it back — this list only shows what's been added in this browser session. Open the classic ticket page to see the
        full history.
      </p>
    </div>
  )
}

function Unavailable({ label }: { label: string }) {
  return (
    <span title={`Not exposed by any real JSON API on this backend — only the classic page's own HTML renders ${label}.`} className="text-text-faint italic">
      Not available
    </span>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0 text-sm">
      <span className="text-text-faint">{label}</span>
      <span className="text-text! text-right">{children}</span>
    </div>
  )
}

// Real via ticket_list_ajax.php (see useTicketDetail's own header comment
// for exactly which classic-page fields that leaves unavailable) plus a
// real, live-verified action set read straight from card.php/contact.php/
// document.php/followup.php/chat.php — see ticketDetail.queries.ts.
export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: ticket, isLoading, isError, error, refetch } = useTicketDetail(id)
  const [tab, setTab] = useState<Tab>('Ticket')

  const [sessionContacts, setSessionContacts] = useState<SessionContact[]>([])
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([])
  const [sessionFollowups, setSessionFollowups] = useState<SessionFollowup[]>([])
  const [sessionChats, setSessionChats] = useState<SessionChatMessage[]>([])

  if (isLoading) return <LegacyLoadingCard label="Loading ticket…" />
  if (isError || !ticket)
    return (
      <LegacyErrorCard
        title="Couldn't load ticket"
        message={!ticket ? 'Ticket not found in the real ticket list.' : error instanceof Error ? error.message : 'Unknown error.'}
        onRetry={() => refetch()}
      />
    )

  return (
    <div className="space-y-4">
      <TicketHeader ticket={ticket} />

      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              tab === t ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ticket' && <TicketMainTab ticket={ticket} onDeleted={() => navigate(ROUTES.ticketList)} />}
      {tab === 'Contacts/Addresses' && <TicketContactsTab ticket={ticket} sessionContacts={sessionContacts} onAdded={(c) => setSessionContacts((s) => [c, ...s])} />}
      {tab === 'Linked Files' && <TicketFilesTab ticket={ticket} sessionFiles={sessionFiles} onAdded={(f) => setSessionFiles((s) => [f, ...s])} />}
      {tab === 'Follow-up' && <TicketFollowupTab ticket={ticket} sessionFollowups={sessionFollowups} onAdded={(f) => setSessionFollowups((s) => [f, ...s])} />}
      {tab === 'Timeline' && <TicketTimelineTab followups={sessionFollowups} chats={sessionChats} />}
      {tab === 'Chat' && <TicketChatTab ticket={ticket} sessionChats={sessionChats} onAdded={(c) => setSessionChats((s) => [c, ...s])} />}
    </div>
  )
}

function TicketHeader({ ticket }: { ticket: TicketRow }) {
  return (
    <Card className="!h-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-lg font-bold text-text!">
            <TicketIcon size={18} className="text-brand" /> {ticket.ref}
          </p>
          <p className="text-sm text-text-muted">{ticket.subject}</p>
        </div>
        <span
          style={{ backgroundColor: `${STATUS_COLOR[ticket.statusCode] ?? '#6c757d'}22`, color: STATUS_COLOR[ticket.statusCode] ?? '#6c757d' }}
          className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold"
        >
          {ticket.status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-6 mt-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-text-faint">Third-party:</span>
          {ticket.thirdParty ? (
            ticket.thirdPartySocid ? (
              <Link to={ROUTES.customerDetail.replace(':id', ticket.thirdPartySocid)} className="flex items-center gap-1.5 text-brand hover:underline">
                <Avatar name={ticket.thirdParty} size={20} color="bg-brand" /> {ticket.thirdParty}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 text-text-muted">
                <Avatar name={ticket.thirdParty} size={20} color="bg-brand" /> {ticket.thirdParty}
              </span>
            )
          ) : (
            <span className="text-text-faint">—</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-faint">Created by:</span>
          {ticket.author ? (
            ticket.authorUserId ? (
              <Link to={ROUTES.userDetail.replace(':id', ticket.authorUserId)} className="flex items-center gap-1.5 text-brand hover:underline">
                <Avatar name={ticket.author} size={20} color="bg-teal-500" /> {ticket.author}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 text-text-muted">
                <Avatar name={ticket.author} size={20} color="bg-teal-500" /> {ticket.author}
              </span>
            )
          ) : (
            <span className="text-text-faint">—</span>
          )}
        </div>
      </div>
    </Card>
  )
}

function TicketMainTab({ ticket, onDeleted }: { ticket: TicketRow; onDeleted: () => void }) {
  const { data: filters } = useAgendaFilterOptions()
  const changeStatus = useChangeTicketStatus(String(ticket.id), ticket.trackId)
  const reopen = useReopenTicket(String(ticket.id), ticket.trackId)
  const close = useCloseTicket(String(ticket.id), ticket.trackId)
  const del = useDeleteTicket(String(ticket.id), ticket.trackId)
  const assign = useAssignTicketUser(String(ticket.id), ticket.trackId)
  const updateSubject = useUpdateTicketSubject(String(ticket.id), ticket.trackId)

  const [editingSubject, setEditingSubject] = useState(false)
  const [subjectDraft, setSubjectDraft] = useState(ticket.subject)
  const isClosed = ticket.statusCode === 8 || ticket.statusCode === 9

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="Tracking ID">{ticket.trackId}</InfoRow>
            <InfoRow label="Creation Date">{ticket.dateCreate}</InfoRow>
            <InfoRow label="Read On">
              <Unavailable label="the read timestamp" />
            </InfoRow>
            <InfoRow label="Closing Date">{ticket.dateClose || '—'}</InfoRow>
            <InfoRow label="Assigned To">
              <select
                value={ticket.assignedToUserId ?? ''}
                onChange={(e) => assign.mutate(e.target.value)}
                disabled={assign.isPending || isClosed}
                className={`${inputCls} !w-auto`}
              >
                <option value="">Unassigned</option>
                {(filters?.users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </InfoRow>
            <InfoRow label="Progress">
              <Unavailable label="progress %" />
            </InfoRow>
          </div>
          <div>
            <InfoRow label="Type">{ticket.type || '—'}</InfoRow>
            <InfoRow label="Ticket Group">
              <Unavailable label="the ticket group" />
            </InfoRow>
            <InfoRow label="Severity">
              <Unavailable label="severity" />
            </InfoRow>
            <InfoRow label="Tags/Categories">
              <Unavailable label="tags" />
            </InfoRow>
            <InfoRow label="Initial Message">
              <Unavailable label="the message body" />
            </InfoRow>
            <InfoRow label="Jobcards">{ticket.jobcards || '—'}</InfoRow>
          </div>
        </div>
      </Card>

      <Card className="!h-auto space-y-3">
        <div>
          <p className="text-xs text-text-faint uppercase tracking-wide mb-1.5">Subject</p>
          {editingSubject ? (
            <div className="flex items-center gap-2">
              <input value={subjectDraft} onChange={(e) => setSubjectDraft(e.target.value)} className={inputCls} />
              <button
                type="button"
                disabled={updateSubject.isPending || !subjectDraft.trim()}
                onClick={() => updateSubject.mutate(subjectDraft.trim(), { onSuccess: () => setEditingSubject(false) })}
                className={primaryBtn}
              >
                {updateSubject.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubjectDraft(ticket.subject)
                  setEditingSubject(false)
                }}
                className="p-1.5 rounded-md border border-border text-text-muted hover:bg-surface-hover"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-text!">{ticket.subject}</p>
              <button type="button" onClick={() => setEditingSubject(true)} title="Modify" className="p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                <Pencil size={13} />
              </button>
            </div>
          )}
          {updateSubject.isError && <p className="text-xs text-danger mt-1">{updateSubject.error instanceof Error ? updateSubject.error.message : 'Failed to update.'}</p>}
        </div>

        {!isClosed && (
          <div>
            <p className="text-xs text-text-faint uppercase tracking-wide mb-1.5">Change status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_PILLS.filter((p) => p.code !== ticket.statusCode).map((p) => (
                <button
                  key={p.code}
                  type="button"
                  disabled={changeStatus.isPending}
                  onClick={() => changeStatus.mutate(p.code)}
                  style={{ borderColor: STATUS_COLOR[p.code], color: STATUS_COLOR[p.code] }}
                  className="rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            {changeStatus.isError && <p className="text-xs text-danger mt-1">{changeStatus.error instanceof Error ? changeStatus.error.message : 'Failed to change status.'}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <span title="Requires Dolibarr's full mail-compose flow — not wired in this pass." className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-faint/60 cursor-not-allowed">
            <Mail size={13} /> Send Email
          </span>
          <span
            title="This app has no Job Card / Intervention feature yet (confirmed: only an inert list placeholder exists) — this button would otherwise link straight to a raw PHP page, which this app never does."
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-faint/60 cursor-not-allowed"
          >
            <Wrench size={13} /> Create Job Card
          </span>
          {isClosed ? (
            <button type="button" disabled={reopen.isPending} onClick={() => reopen.mutate()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50">
              {reopen.isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Re-Open
            </button>
          ) : (
            <button
              type="button"
              disabled={close.isPending}
              onClick={() => {
                if (window.confirm('Close this ticket?')) close.mutate()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success text-white hover:bg-success-hover px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {close.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Close|Solve
            </button>
          )}
          <button
            type="button"
            disabled={del.isPending}
            onClick={() => {
              if (window.confirm('Delete this ticket? This cannot be undone.')) del.mutate(undefined, { onSuccess: onDeleted })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 text-danger px-3 py-1.5 text-sm font-medium hover:bg-danger-bg disabled:opacity-50 ml-auto"
          >
            {del.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
          </button>
        </div>
        {(reopen.isError || close.isError || del.isError) && (
          <p className="text-xs text-danger">{((reopen.error ?? close.error ?? del.error) as Error | null)?.message ?? 'Action failed.'}</p>
        )}
      </Card>
    </div>
  )
}

function TicketContactsTab({
  ticket,
  sessionContacts,
  onAdded,
}: {
  ticket: TicketRow
  sessionContacts: SessionContact[]
  onAdded: (c: SessionContact) => void
}) {
  const { data: filters } = useAgendaFilterOptions()
  const addUserContact = useAddTicketUserContact(String(ticket.id), ticket.trackId)
  const [userId, setUserId] = useState('')

  return (
    <Card className="!h-auto space-y-4">
      <SessionOnlyBanner what="The ticket's contact list" />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">Nature Of Contact</span>
          <span className={`${inputCls} flex items-center gap-1.5`}>
            <Users size={13} /> Users (Support Technician)
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">User</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
            <option value="">Select a user</option>
            {(filters?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!userId || addUserContact.isPending}
          onClick={() => {
            const name = filters?.users.find((u) => String(u.id) === userId)?.name ?? `User #${userId}`
            addUserContact.mutate(userId, { onSuccess: () => onAdded({ name, createdAt: Date.now() }) })
          }}
          className={primaryBtn}
        >
          {addUserContact.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Add
        </button>
      </div>
      <div title="Third-Party Contacts need a real per-customer contact-type dictionary this backend doesn't expose a JSON source for — only the internal-user 'SUPPORTTEC' type is a confirmed real code (read directly from ticket/card.php's own auto-assign logic)." className="flex items-center gap-2 text-xs text-text-faint">
        <Info size={12} /> Third-Party Contacts row not available — no confirmed contact-type code for external contacts on this backend.
      </div>
      {addUserContact.isError && <p className="text-xs text-danger">{addUserContact.error instanceof Error ? addUserContact.error.message : 'Failed to add contact.'}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase border-b border-border">
            <th className="py-1.5">Nature Of Contact</th>
            <th className="py-1.5">Name</th>
          </tr>
        </thead>
        <tbody>
          {sessionContacts.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-3 text-text-faint italic">
                None added this session.
              </td>
            </tr>
          ) : (
            sessionContacts.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="py-1.5 text-text-muted">Support Technician</td>
                <td className="py-1.5 text-text!">{c.name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  )
}

function TicketFilesTab({ ticket, sessionFiles, onAdded }: { ticket: TicketRow; sessionFiles: SessionFile[]; onAdded: (f: SessionFile) => void }) {
  const upload = useUploadTicketDocument(String(ticket.id))
  const link = useLinkTicketDocument(String(ticket.id))
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  return (
    <Card className="!h-auto space-y-4">
      <SessionOnlyBanner what="The ticket's attached/linked files list" />
      <div>
        <p className="text-xs text-text-faint uppercase tracking-wide mb-1.5">Attach a new file/document</p>
        <div className="flex items-center gap-2">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${inputCls} py-1`} />
          <button
            type="button"
            disabled={!file || upload.isPending}
            onClick={() => {
              if (!file) return
              upload.mutate(file, { onSuccess: () => { onAdded({ kind: 'upload', name: file.name, createdAt: Date.now() }); setFile(null) } })
            }}
            className={primaryBtn}
          >
            {upload.isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload
          </button>
        </div>
        {upload.isError && <p className="text-xs text-danger mt-1">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}
      </div>
      <div>
        <p className="text-xs text-text-faint uppercase tracking-wide mb-1.5">Link a new file/document</p>
        <div className="flex flex-wrap items-center gap-2">
          <input placeholder="URL to link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={`${inputCls} flex-1 min-w-[180px]`} />
          <input placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className={`${inputCls} flex-1 min-w-[140px]`} />
          <button
            type="button"
            disabled={!linkUrl.trim() || link.isPending}
            onClick={() =>
              link.mutate(
                { link: linkUrl.trim(), label: linkLabel.trim() },
                { onSuccess: () => { onAdded({ kind: 'link', name: linkLabel.trim() || linkUrl.trim(), createdAt: Date.now() }); setLinkUrl(''); setLinkLabel('') } },
              )
            }
            className={primaryBtn}
          >
            {link.isPending ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Link
          </button>
        </div>
        {link.isError && <p className="text-xs text-danger mt-1">{link.error instanceof Error ? link.error.message : 'Link failed.'}</p>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase border-b border-border">
            <th className="py-1.5">File / Link</th>
          </tr>
        </thead>
        <tbody>
          {sessionFiles.length === 0 ? (
            <tr>
              <td className="py-3 text-text-faint italic">None added this session.</td>
            </tr>
          ) : (
            sessionFiles.map((f, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="py-1.5 text-text! flex items-center gap-1.5">
                  {f.kind === 'upload' ? <Paperclip size={13} className="text-text-faint" /> : <Link2 size={13} className="text-text-faint" />} {f.name}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  )
}

function TicketFollowupTab({ ticket, sessionFollowups, onAdded }: { ticket: TicketRow; sessionFollowups: SessionFollowup[]; onAdded: (f: SessionFollowup) => void }) {
  const { data: filters } = useAgendaFilterOptions()
  const add = useAddTicketFollowup(String(ticket.id), ticket.trackId)
  const [taskTitle, setTaskTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [ticketTag, setTicketTag] = useState('')
  const [workStatus, setWorkStatus] = useState<string>(WORK_STATUS_OPTIONS[0].value)
  const [processingStatus, setProcessingStatus] = useState<string>(PROCESSING_STATUS_OPTIONS[0].value)

  const submit = () => {
    const input: AddFollowupInput = { taskTitle, description, assignedUserId, taskDeadline, ticketTag, workStatus, processingStatus }
    add.mutate(input, {
      onSuccess: () => {
        const assignedUserName = filters?.users.find((u) => String(u.id) === assignedUserId)?.name ?? ''
        onAdded({ ...input, assignedUserName, createdAt: Date.now() })
        setTaskTitle('')
        setDescription('')
        setTicketTag('')
      },
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="!h-auto space-y-3">
        <p className="text-sm font-semibold text-text!">Add Follow-up</p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">Task title</span>
          <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">Follow-up description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-y`} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-faint">Assigned support user</span>
            <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {(filters?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-faint">Task deadline</span>
            <input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} className={inputCls} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">Ticket tag</span>
          <input placeholder="Bug, Urgent, Escalated…" value={ticketTag} onChange={(e) => setTicketTag(e.target.value)} className={inputCls} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-faint">Work status</span>
            <select value={workStatus} onChange={(e) => setWorkStatus(e.target.value)} className={inputCls}>
              {WORK_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-faint">Processing stage</span>
            <select value={processingStatus} onChange={(e) => setProcessingStatus(e.target.value)} className={inputCls}>
              {PROCESSING_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span title="No confirmed upload endpoint for follow-up images investigated in this pass." className={`${inputCls} flex items-center gap-1.5 text-text-faint cursor-not-allowed`}>
          <Paperclip size={13} /> Upload image (not available)
        </span>
        <button type="button" disabled={!taskTitle.trim() || add.isPending} onClick={submit} className={primaryBtn}>
          {add.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Follow-up
        </button>
        {add.isError && <p className="text-xs text-danger">{add.error instanceof Error ? add.error.message : 'Failed to save.'}</p>}
      </Card>

      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Follow-up History</p>
        <SessionOnlyBanner what="Follow-up history" />
        <div className="space-y-2">
          {sessionFollowups.length === 0 ? (
            <p className="text-text-faint italic text-sm">None added this session.</p>
          ) : (
            sessionFollowups.map((f, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <p className="font-medium text-text!">{f.taskTitle}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs">Work: {WORK_STATUS_OPTIONS.find((o) => o.value === f.workStatus)?.label}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs">Stage: {PROCESSING_STATUS_OPTIONS.find((o) => o.value === f.processingStatus)?.label}</span>
                </div>
                {f.assignedUserName && <p className="text-xs text-text-faint mt-1">Assigned to: {f.assignedUserName}</p>}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

function TicketTimelineTab({ followups, chats }: { followups: SessionFollowup[]; chats: SessionChatMessage[] }) {
  type Entry = { kind: 'followup'; data: SessionFollowup } | { kind: 'chat'; data: SessionChatMessage }
  const entries: Entry[] = [
    ...followups.map((data): Entry => ({ kind: 'followup', data })),
    ...chats.map((data): Entry => ({ kind: 'chat', data })),
  ].sort((a, b) => b.data.createdAt - a.data.createdAt)

  return (
    <Card className="!h-auto">
      <SessionOnlyBanner what="The timeline" />
      {entries.length === 0 ? (
        <p className="text-text-faint italic text-sm py-4 text-center">No activity added this session yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-3">
              {e.kind === 'followup' ? <ListChecks size={14} className="text-brand mt-0.5" /> : <Send size={14} className="text-brand mt-0.5" />}
              <div>
                <p className="text-sm text-text!">{e.kind === 'followup' ? e.data.taskTitle : e.data.message}</p>
                <p className="text-xs text-text-faint">{new Date(e.data.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function TicketChatTab({ ticket, sessionChats, onAdded }: { ticket: TicketRow; sessionChats: SessionChatMessage[]; onAdded: (c: SessionChatMessage) => void }) {
  const add = useAddChatMessage(String(ticket.id), ticket.trackId)
  const [message, setMessage] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="!h-auto space-y-3">
        <p className="text-sm font-semibold text-text! flex items-center gap-1.5">
          <MessageSquarePlus size={15} /> Add New Message
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">Message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={`${inputCls} resize-y`} placeholder="Type your message here…" />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private message (internal only)
        </label>
        <button
          type="button"
          disabled={!message.trim() || add.isPending}
          onClick={() =>
            add.mutate(
              { message: message.trim(), private: isPrivate },
              { onSuccess: () => { onAdded({ message: message.trim(), private: isPrivate, createdAt: Date.now() }); setMessage('') } },
            )
          }
          className={`${primaryBtn} w-full justify-center`}
        >
          {add.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send Message
        </button>
        {add.isError && <p className="text-xs text-danger">{add.error instanceof Error ? add.error.message : 'Failed to send.'}</p>}
      </Card>

      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2 flex items-center gap-1.5">
          <History size={15} /> Chat History
        </p>
        <SessionOnlyBanner what="Chat history" />
        <div className="space-y-2">
          {sessionChats.length === 0 ? (
            <p className="text-text-faint italic text-sm">None sent this session.</p>
          ) : (
            sessionChats.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${c.private ? 'bg-warning-bg text-warning-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                    {c.private ? 'Private' : 'Public'}
                  </span>
                  <span className="text-xs text-text-faint">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-text! mt-1">{c.message}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
