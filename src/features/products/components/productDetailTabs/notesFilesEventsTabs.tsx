import { useState, useEffect, useRef } from 'react'
import { CalendarClock, Save, History, StickyNote, Pencil, Trash2, Link2, Layers, Boxes, Upload, Download, Clock } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../LegacyReportStates'
import { isBackendUnavailable, isBackendActionUnavailable, BackendUnavailableCard } from '../../../../shared/components/BackendUnavailable'
import { useProductDocuments, useUploadProductDocument, useDeleteProductDocument, useLinkProductDocument, useDeleteProductDocumentLink, useProductNotesOverview, useSaveProductNotes, useProductAgendaEvents } from '../../products.queries'
import { Th, Td, EmptyRow, TabTable, SectionHeader, StatusPill, MetricTile, modalInputCls, sameOriginPath } from '../ProductDetailShared'

// Notes tab (note_api.php) - real llx_product.note_public/note fields,
// replaces the old (unrouted on this backend) api/products/?action=update-note.
export function NoteCard({ title, icon, color, value, empty, onSave, saving, error }: { title: string; icon: typeof StickyNote; color: 'blue' | 'amber'; value: string; empty: string; onSave: (v: string) => void; saving: boolean; error: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const inputCls = 'w-full rounded-md border border-input-border bg-input-bg text-text text-sm p-3 outline-none focus:ring-2 focus:ring-brand/30'
  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader icon={icon} color={color}>
          {title}
        </SectionHeader>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} title={`Edit ${title.toLowerCase()}`} className="p-1.5 rounded-md border border-border text-text-muted hover:bg-surface-hover">
            <Pencil size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className={inputCls} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                onSave(draft)
                setEditing(false)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(value)
                setEditing(false)
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value.trim() ? (
        <p className="whitespace-pre-wrap text-sm text-text!">{value}</p>
      ) : (
        <p className="py-6 text-center text-sm text-text-faint">{empty}</p>
      )}
      {error && <p className="mt-2 text-xs text-danger">Could not save please try again.</p>}
    </Card>
  )
}

export function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductNotesOverview(id)
  const saveNotes = useSaveProductNotes()

  if (isLoading) return <LegacyLoadingCard label="Loading notes..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Notes" />
  if (isError) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // Each card saves only the note it shows: product/fapi/notes.php writes only what it is sent.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <NoteCard title="Public Note" icon={StickyNote} color="blue" value={data?.notePublic ?? ''} empty="No public note" saving={saveNotes.isPending} error={saveNotes.isError} onSave={(v) => id && saveNotes.mutate({ id, notePublic: v })} />
      <NoteCard title="Private Note" icon={StickyNote} color="amber" value={data?.notePrivate ?? ''} empty="No private note" saving={saveNotes.isPending} error={saveNotes.isError} onSave={(v) => id && saveNotes.mutate({ id, notePrivate: v })} />
    </div>
  )
}

// Documents tab (document_api.php) - real filesystem listing under
// documents/produit/<ref>/, replaces the old product/document.php scrape.
// Upload/delete both write through the real endpoint, no legacy link-out.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Kilobytes`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Megabytes`
}

export function LinkedFilesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductDocuments(id)
  const uploadDocument = useUploadProductDocument()
  const deleteDocument = useDeleteProductDocument()
  const confirm = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState('')
  const linkDocument = useLinkProductDocument()
  const deleteLink = useDeleteProductDocumentLink()
  const [showLink, setShowLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading documents..." />
  if (isError) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !id) return
    setUploadError('')
    uploadDocument.mutate({ id, file }, { onError: (err) => setUploadError(err instanceof Error ? err.message : 'Upload failed.') })
  }

  async function handleDelete(filename: string) {
    if (!id) return
    const ok = await confirm({
      title: 'Delete File?',
      message: (
        <>
          Are you sure you want to delete <strong className="text-text!">{filename}</strong>?
        </>
      ),
    })
    if (!ok) return
    deleteDocument.mutate({ id, filename })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricTile icon={Boxes} color="blue" label="Number Of Attached Files/Documents" value={data?.count ?? 0} />
        <MetricTile icon={Layers} color="green" label="Total Size Of Attached Files" value={formatBytes((data?.documents ?? []).reduce((sum, d) => sum + (d.sizeBytes ?? (Number(d.size) || 0)), 0))} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-faint">{data?.count ?? 0} file(s)</p>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadDocument.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10 disabled:opacity-60"
          >
            <Upload size={14} /> {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={() => setShowLink((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90"
          >
            <Link2 size={14} /> Link a new file/document
          </button>
        </div>
      </div>
      {showLink && (
        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <p className="mb-1 text-xs font-medium text-text-faint">Link (URL)</p>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" className={modalInputCls} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-text-faint">Label</p>
              <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className={modalInputCls} />
            </div>
            <button
              type="button"
              disabled={!linkUrl.trim() || linkDocument.isPending}
              onClick={() =>
                id &&
                linkDocument.mutate(
                  { id, link: linkUrl.trim(), label: linkLabel.trim() },
                  {
                    onSuccess: () => {
                      setLinkUrl('')
                      setLinkLabel('')
                      setShowLink(false)
                    },
                  },
                )
              }
              className="h-9 px-4 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-50"
            >
              {linkDocument.isPending ? 'Adding...' : 'Add link'}
            </button>
          </div>
          {linkDocument.isError && <p className="mt-2 text-sm text-danger">{linkDocument.error instanceof Error ? linkDocument.error.message : 'Could not add the link.'}</p>}
        </Card>
      )}
      {uploadError && <p className="text-sm font-medium text-danger">{uploadError}</p>}
      <TabTable>
        <thead>
          <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <Th>File</Th>
            <Th right>Size</Th>
            <Th>Date</Th>
            <Th right>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {!data || data.documents.length === 0 ? (
            <EmptyRow span={4} label="No documents found" />
          ) : (
            data.documents.map((d, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <Td>
                  {d.fileUrl ? (
                    <a href={sameOriginPath(d.fileUrl)} download={d.fileName} className="flex items-center gap-1.5 text-brand hover:underline">
                      <Download size={14} /> {d.fileName}
                    </a>
                  ) : (
                    d.fileName
                  )}
                </Td>
                <Td right muted>
                  {d.size}
                </Td>
                <Td muted>{d.date}</Td>
                <Td right>
                  <button type="button" onClick={() => handleDelete(d.fileName)} className="p-1.5 rounded-md text-danger hover:bg-danger-bg" title="Delete file">
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TabTable>
      {data && data.links.length > 0 && (
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Link</Th>
              <Th>Date</Th>
              <Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.links.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <Td>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand hover:underline">
                    <Link2 size={14} /> {l.label || l.url}
                  </a>
                </Td>
                <Td muted>{l.date}</Td>
                <Td right>
                  <button
                    type="button"
                    onClick={() => id && deleteLink.mutate({ id, linkId: l.id })}
                    disabled={deleteLink.isPending}
                    className="p-1.5 rounded-md text-danger hover:bg-danger-bg disabled:opacity-60"
                    title="Remove link"
                  >
                    <Trash2 size={14} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TabTable>
      )}
    </div>
  )
}

// Events tab (agenda_api.php's `events` field) - real llx_actioncomm rows
// for this product (fk_element/elementtype = 'product'), rendered as a
// timeline. Distinct from the Product Card tab's own Activity Timeline
// (useProductDashboard, invoice-based) - this is the product's own agenda.
export function EventsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductAgendaEvents(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Events/Agenda" />
  if (isError) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // product/fapi/agenda.php answers one list; an event of type AC_PRODUCT_MODIFY is a recorded modification of the product, every other type is an
  // event. That split into the classic tab's two cards comes from the type code and has not been compared with the classic tab on a product that has
  // modifications (report row).
  const all = data?.events ?? []
  const modifications = all.filter((e) => e.typeCode === 'AC_PRODUCT_MODIFY')
  const events = all.filter((e) => e.typeCode !== 'AC_PRODUCT_MODIFY')
  const statusTone: Record<string, 'success' | 'info'> = { success: 'success', info: 'info', warning: 'info', secondary: 'info' }

  const list = (rows: typeof all, empty: string) =>
    rows.length === 0 ? (
      <p className="text-sm text-text-faint text-center py-6">{empty}</p>
    ) : (
      <ul>
        {rows.map((e, i) => (
          <li key={e.id} className={`flex items-start gap-3 py-3 ${i !== rows.length - 1 ? 'border-b border-border' : ''}`}>
            <span className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${ICON_STYLES.indigo}`}>
              <Clock size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-text! truncate">{e.label}</p>
                <StatusPill active activeLabel={e.typeLabel} inactiveLabel={e.typeLabel} tone={statusTone[e.status] ?? 'info'} />
              </div>
              <p className="text-xs text-text-faint mt-0.5">
                {e.date}
                {e.dateEnd && e.dateEnd !== e.date ? ` - ${e.dateEnd}` : ''}
                {e.userName && ` · ${e.userName}`}
                {e.percent > 0 && ` · ${e.percent}%`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={CalendarClock} color="blue" label="Events" value={events.length} />
        <MetricTile icon={History} color="green" label="Modifications" value={modifications.length} />
        <MetricTile icon={Clock} color="amber" label="Latest Event" value={events[0]?.date || '-'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <SectionHeader icon={CalendarClock} color="indigo">
            Events Timeline
          </SectionHeader>
          {list(events, 'No events found')}
        </Card>
        <Card className="!h-auto">
          <SectionHeader icon={History} color="green">
            Modification History
          </SectionHeader>
          {list(modifications, 'No modifications found')}
        </Card>
      </div>
    </div>
  )
}
