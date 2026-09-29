import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Link2, StickyNote, History, BookOpen, Trash2, Loader2, Save } from 'lucide-react'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useExpenseReportDocuments,
  useExpenseReportNotes,
  useExpenseReportEvents,
  useExpenseReportLedger,
  useUploadExpenseReportDocument,
  useDeleteExpenseReportDocument,
  useSaveExpenseReportNote,
} from '../expenseReportTabs.queries'
import { ImageCropModal } from './ImageCropModal'
import { ROUTES } from '../../../routes'
import { useConfirm } from '../../../shared/components/ConfirmDialog'

// Non-default Expense Report tabs — lazy-loaded from their own chunk (see
// App.tsx's own comment for OrderDetailTabs/QuotationDetailTabs, the same
// pattern this follows), only fetched once the person actually clicks that
// tab. Every field here is real, scraped from the corresponding legacy page
// (see expenseReportTabsParser.ts). User-profile links route in-app
// (userDetailPath below); the Notes edit form and Documents upload/delete
// are real writes to the real backend (see expenseReportTabs.queries.ts).
// The one form still disabled is document.php's own "Link a URL" (not
// reproduced this round — a genuine, distinct real form-POST).
function userDetailPath(href: string | null): string | null {
  const m = href?.match(/\/(?:userprofile\/index|user\/card)\.php\?id=(\d+)/)
  return m ? ROUTES.userDetail.replace(':id', m[1]) : null
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

function SimpleTable({ columns, rows, emptyLabel }: { columns: string[]; rows: { cells: string[] }[]; emptyLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
            {/* Real backend th's include several unlabeled trailing cells
                (action-icon columns with no header text) — keyed by index,
                not by the (often duplicate, often empty) column text. */}
            {columns.map((col, i) => (
              <th key={i} className="font-medium px-3 py-2 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="px-3 py-4 text-text-faint italic">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {r.cells.map((c, j) => (
                  <td key={j} className="px-3 py-2 text-text-muted whitespace-nowrap">
                    {c || '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useExpenseReportDocuments(id)
  const upload = useUploadExpenseReportDocument(id)
  const del = useDeleteExpenseReportDocument(id)
  const confirm = useConfirm()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [useMask, setUseMask] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading linked files…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load linked files" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const onFilePicked = (file: File) => {
    setUploadError(null)
    if (file.type.startsWith('image/')) {
      // Real crop step before the real upload — see ImageCropModal.tsx's
      // own header comment. Only offered for images; other file types go
      // straight to the staged-file state below.
      setCropFile(file)
    } else {
      setPendingFile(file)
    }
  }

  const doUpload = async (file: File) => {
    setUploadError(null)
    try {
      await upload.mutateAsync({ token: data.token, file, savingDocMask: data.saveAsMaskValue, useMask })
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="max-w-md space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-faint">Number Of Attached Files/Documents</span>
          <span className="font-medium text-text!">{data.attachedCount || '0'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-faint">Total Size Of Attached Files/Documents</span>
          <span className="font-medium text-text!">{data.attachedTotalSize || '0 B.'}</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-text! mb-2">Attach a new file/document</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFilePicked(file)
            }}
            className="flex-1 min-w-52 text-xs text-text px-2 py-1.5 rounded-md border border-input-border bg-input-bg"
          />
          <button
            type="button"
            disabled={!pendingFile || upload.isPending}
            onClick={() => pendingFile && doUpload(pendingFile)}
            className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {upload.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            Upload
          </button>
        </div>
        {pendingFile && (
          <p className="mt-1.5 text-xs text-text-faint">
            Ready to upload: <span className="font-medium text-text!">{pendingFile.name}</span> ({(pendingFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
        {uploadError && <p className="mt-1.5 text-xs text-danger">{uploadError}</p>}
        {data.saveAsLabel && (
          <label className="flex items-start gap-1.5 mt-2 text-xs text-text-faint">
            <input type="checkbox" checked={useMask} onChange={(e) => setUseMask(e.target.checked)} className="mt-0.5" />
            <span>{data.saveAsLabel}</span>
          </label>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-text! mb-2 flex items-center gap-1.5">
          <FolderOpen size={14} className="text-brand" /> Attached files and documents
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-3 py-2">Documents</th>
                <th className="font-medium px-3 py-2">Size</th>
                <th className="font-medium px-3 py-2">Date</th>
                <th className="font-medium px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-text-faint italic">
                    No Documents Uploaded
                  </td>
                </tr>
              ) : (
                data.documents.map((doc, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {doc.downloadUrl ? (
                        <a href={doc.downloadUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {doc.name}
                        </a>
                      ) : (
                        doc.name
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{doc.size}</td>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{doc.date}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        disabled={!doc.deleteUrl || del.isPending}
                        onClick={async () => {
                          if (!doc.deleteUrl) return
                          const ok = await confirm({
                            title: 'Delete File?',
                            message: (
                              <>
                                Are you sure you want to delete <strong className="text-text!">{doc.name}</strong>?
                              </>
                            ),
                          })
                          if (ok) del.mutate(doc.deleteUrl)
                        }}
                        title="Delete"
                        className="text-danger hover:text-danger-fg disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(cropped) => {
            setCropFile(null)
            setPendingFile(cropped)
          }}
        />
      )}

      <div>
        <h3 className="text-sm font-bold text-text! mb-2 flex items-center gap-1.5">
          <Link2 size={14} className="text-brand" /> Linked files and documents
        </h3>
        <SimpleTable columns={data.linkColumns} rows={data.links} emptyLabel="No Registered Links" />
      </div>
    </div>
  )
}

function NoteCard({ note, token, id }: { note: { label: string; html: string; field: 'public' | 'private' | null }; token: string; id: string | undefined }) {
  const [editing, setEditing] = useState(false)
  // The real note content is rendered HTML (rich note editor on the real
  // page) — a plain textContent read is what the real edit form's own
  // plain <textarea> works on too, so editing here trades formatting for
  // being able to genuinely save.
  const [value, setValue] = useState(() => {
    const tmp = document.createElement('div')
    tmp.innerHTML = note.html
    return tmp.textContent ?? ''
  })
  const save = useSaveExpenseReportNote(id)

  const handleSave = async () => {
    if (!note.field) return
    await save.mutateAsync({ token, field: note.field, html: value })
    setEditing(false)
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-text! flex items-center gap-1.5">
          <StickyNote size={14} className="text-brand" /> {note.label}
        </p>
        {!editing && note.field && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand hover:underline">
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5" />
          {save.isError && <p className="text-xs text-danger">{save.error instanceof Error ? save.error.message : 'Save failed.'}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={save.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {save.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <p className="text-sm text-text-muted whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-sm text-text-faint italic">No note.</p>
      )}
    </div>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useExpenseReportNotes(id)
  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.notes.map((note, i) => (
        <NoteCard key={note.field ?? i} note={note} token={data.token} id={id} />
      ))}
    </div>
  )
}

function EventsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useExpenseReportEvents(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const rows: { label: string; value: string; url?: string | null }[] = [
    { label: 'Creation Date', value: data.creationDate },
    ...(data.modifiedBy ? [{ label: 'Modified By', value: data.modifiedBy, url: data.modifiedByUrl }] : []),
    { label: 'Latest Modification Date', value: data.latestModificationDate },
    ...(data.approvedBy ? [{ label: 'Approved By', value: data.approvedBy, url: data.approvedByUrl }] : []),
  ].filter((r) => r.value)

  if (rows.length === 0) return <p className="text-sm text-text-faint italic">No event history yet.</p>

  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-center gap-1.5 text-sm">
          <History size={13} className="text-brand shrink-0" />
          <span className="font-semibold text-text!">{r.label}:</span>
          {r.url !== undefined ? (
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold grid place-items-center">{initials(r.value)}</span>
              {userDetailPath(r.url) ? (
                <Link to={userDetailPath(r.url) as string} className="text-brand hover:underline font-medium">
                  {r.value}
                </Link>
              ) : (
                <span className="text-text-muted font-medium">{r.value}</span>
              )}
            </span>
          ) : (
            <span className="text-text-muted">{r.value}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function LedgerEntryTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useExpenseReportLedger(id)
  if (isLoading) return <LegacyLoadingCard label="Loading ledger entries…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load ledger entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-text! flex items-center gap-1.5">
        <BookOpen size={14} className="text-brand" /> LedgerEntry
      </h3>
      <SimpleTable columns={data.columns} rows={data.rows} emptyLabel="No record found" />
      {data.balance && (
        <div className="flex items-center justify-end gap-8 text-sm font-semibold text-text! border-t border-border pt-2">
          <span>Balance</span>
          <span>{data.balance.debit}</span>
          <span>{data.balance.credit}</span>
          <span className="text-brand">{data.balance.amount}</span>
        </div>
      )}
    </div>
  )
}

export type ExpenseReportTabKey = 'documents' | 'note' | 'info' | 'ledgerentry'

export function LazyTabRenderer({ tab, id }: { tab: ExpenseReportTabKey; id: string | undefined }) {
  switch (tab) {
    case 'documents':
      return <DocumentsTab id={id} />
    case 'note':
      return <NotesTab id={id} />
    case 'info':
      return <EventsTab id={id} />
    case 'ledgerentry':
      return <LedgerEntryTab id={id} />
    default:
      return null
  }
}
