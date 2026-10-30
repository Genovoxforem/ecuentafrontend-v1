import { useState } from 'react'
import { Paperclip, Upload, Plus, Trash2, Download, Link2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useSalesInvoiceDocuments, useUploadSalesDocument, useDeleteSalesDocument, useAddSalesDocumentLink, useDeleteSalesDocumentLink, useLinkableObjects, useLinkSalesObject, useUnlinkSalesObject, LINKABLE_OBJECT_TYPES } from '../../salesInvoiceTabs.queries'
import { EmptyState, TabTitle, inputCls, parseMarginRows, selectCls } from './InvoiceDetailShared'
import { useSalesInvoice } from '../../salesInvoice.queries'

// compta/sales/api/documents.php-backed tab (see sales/js/documents.js,
// DocumentsTab.render()): this tab has NO Generate PDF form of its own.
// That form only lives on the main Customer Invoice tab's Linked Files
// mini-card (LinkedFilesMiniCard above, matching sales_invoice.js).
// documents.js does build unused model/lang option strings but never
// renders them — dead code on the classic page too.
export function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useSalesInvoiceDocuments(id)
  // The invoice's own margin rows (already loaded by the page), used when the documents answer carries none.
  const { data: invoice } = useSalesInvoice(id)
  const upload = useUploadSalesDocument(id)
  const deleteDoc = useDeleteSalesDocument(id)
  const addLink = useAddSalesDocumentLink(id)
  const deleteLink = useDeleteSalesDocumentLink(id)
  const [file, setFile] = useState<File | null>(null)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState(LINKABLE_OBJECT_TYPES[0].value)
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const linkableObjects = useLinkableObjects(id, linkType, true)
  const linkObject = useLinkSalesObject(id)
  const unlinkObject = useUnlinkSalesObject(id)

  if (isLoading) return <LegacyLoadingCard label="Loading linked files…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load linked files" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const ownRows = data.margin.enabled ? parseMarginRows(data.margin.margin_info) : []
  const invoiceRows = invoice?.margin.enabled ? (invoice.margin.rows ?? parseMarginRows(invoice.margin.margin_info)) : []
  const documentsMarginRows = ownRows.length > 0 ? ownRows : invoiceRows

  return (
    <div className="space-y-3">
      <TabTitle count={data.nb_files}>Linked Files</TabTitle>

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Attach a new file/document</p>
        {upload.isError && <p className="text-xs text-danger mb-2">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-text file:mr-3 file:rounded-md file:border file:border-input-border file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text"
          />
          <button
            type="button"
            disabled={!file || upload.isPending}
            onClick={() => file && upload.mutate(file, { onSuccess: () => setFile(null) })}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            <Upload size={14} /> {upload.isPending ? 'Uploading…' : 'Upload File'}
          </button>
        </div>
      </Card>

      {documentsMarginRows.length > 0 && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <p className="text-sm font-semibold text-text! px-4 pt-4 pb-2">Margin Details</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 px-4">Margins</th>
                <th className="font-medium py-2 px-3 text-right">Selling Price</th>
                <th className="font-medium py-2 px-3 text-right">Cost Price</th>
                <th className="font-medium py-2 px-4 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {documentsMarginRows.map((r) => (
                <tr key={r.label} className={r.label === 'TotalMargin' ? '' : 'border-b border-border'}>
                  <td className={`py-2 px-4 ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.label}</td>
                  <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.sellingPrice}</td>
                  <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.costPrice}</td>
                  <td className={`py-2 px-4 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.margin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Files</p>
        {deleteDoc.isError && <p className="text-xs text-danger mb-2">{deleteDoc.error instanceof Error ? deleteDoc.error.message : 'Could not delete this file.'}</p>}
        {data.files.length === 0 ? (
          <EmptyState icon={Paperclip} message="No files attached to this invoice." />
        ) : (
          <ul className="divide-y divide-border">
            {data.files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={f.download_url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {f.name}
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-muted text-xs">{f.size}</span>
                  <a href={f.download_url} target="_blank" rel="noreferrer" title="Download" className="rounded-md border border-input-border p-1.5 text-text-muted hover:bg-surface-hover">
                    <Download size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteDoc.mutate(f.name)}
                    disabled={deleteDoc.isPending}
                    title="Delete"
                    className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">External Links</p>
        {addLink.isError && <p className="text-xs text-danger mb-2">{addLink.error instanceof Error ? addLink.error.message : 'Could not add this link.'}</p>}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className={`${inputCls} text-left`} style={{ maxWidth: 180 }} />
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className={`${inputCls} text-left flex-1 min-w-[200px]`} />
          <button
            type="button"
            disabled={!linkLabel || !linkUrl || addLink.isPending}
            onClick={() => addLink.mutate({ label: linkLabel, url: linkUrl }, { onSuccess: () => { setLinkLabel(''); setLinkUrl('') } })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {data.links.length === 0 ? (
          <p className="text-sm text-text-faint italic">No external links yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.links.map((l) => (
              <li key={l.rowid} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={l.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {l.label}
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-muted text-xs">{l.date}</span>
                  <button type="button" onClick={() => deleteLink.mutate(l.rowid)} disabled={deleteLink.isPending} title="Delete" className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg disabled:opacity-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="!h-auto">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Related Objects</p>
        {linkObject.isError && <p className="text-xs text-danger mb-2">{linkObject.error instanceof Error ? linkObject.error.message : 'Could not link this object.'}</p>}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={linkType}
            onChange={(e) => {
              setLinkType(e.target.value)
              setSelectedTargetId('')
            }}
            className={selectCls}
            style={{ maxWidth: 170 }}
          >
            {LINKABLE_OBJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)} className={`${selectCls} flex-1 min-w-[160px]`}>
            <option value="">-- Select item --</option>
            {(linkableObjects.data ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.ref}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedTargetId || linkObject.isPending}
            onClick={() => linkObject.mutate({ targettype: linkType, targetid: selectedTargetId }, { onSuccess: () => setSelectedTargetId('') })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Link2 size={13} /> Link
          </button>
        </div>
        {data.related.length === 0 ? (
          <p className="text-sm text-text-faint italic">No related objects.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.related.map((r) => (
              <li key={r.ee_rowid} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <a href={r.url} className="font-medium text-brand hover:underline truncate block">
                    {r.type_label}: {r.ref}
                  </a>
                  <p className="text-xs text-text-faint">
                    {r.date} {r.amount_ht && `· ${r.amount_ht}`} {r.status && `· ${r.status}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => unlinkObject.mutate(r.ee_rowid)}
                  disabled={unlinkObject.isPending}
                  title="Unlink"
                  className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg disabled:opacity-50 shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
