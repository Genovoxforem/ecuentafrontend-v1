import { useState } from 'react'
import { Upload, Link2, LoaderCircle, Check } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useUploadProjectDocument, useLinkProjectDocument } from '../projectDocuments.queries'
import type { ProjectRow } from '../projects.queries'
import { ProjectInfoCards } from './ProjectInfoRecap'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'

// Real "Documents" widget from projet/document.php — genuinely different
// (and richer) than card.php's own embedded doc-generator widget (see
// LinkedFilesCard, shown on the Project tab itself): this one supports
// plain file upload and URL linking via core/actions_linkedfiles.inc.php,
// the same generic handler every module's document.php shares (confirmed
// by reading the source directly — see projectDocuments.queries.ts).
// Upload/Link genuinely POST there. There's no JSON endpoint to list what's
// already attached/linked though, so both tables below stay an honest
// empty state — "No Registered Links" even matches the real page's own
// wording for that case.
export function ProjectDocumentsTab({ project }: { project: ProjectRow }) {
  return (
    <div className="space-y-3">
      <ProjectInfoCards project={project} />

      <UploadForm project={project} />
      <LinkForm project={project} />

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">Attached files and documents</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Documents</th>
                <th className="font-medium px-4 py-2.5">Size</th>
                <th className="font-medium px-4 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-4 text-text-faint italic">
                  No data source available — this backend has no endpoint to list attached files.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">Linked files and documents</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Links</th>
                <th className="font-medium px-4 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="px-4 py-4 text-text-faint italic text-center">
                  No Registered Links
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function UploadForm({ project }: { project: ProjectRow }) {
  const upload = useUploadProjectDocument(project.id)
  const [file, setFile] = useState<File | null>(null)

  return (
    <Card className="!h-auto">
      <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50 mb-3">Attach a new file/document</h3>
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
          {upload.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />} Upload
        </button>
      </div>
      {upload.isError && <p className="text-xs text-danger mt-2">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}
      {upload.isSuccess && (
        <p className="flex items-center gap-1.5 text-xs text-success mt-2">
          <Check size={12} /> File uploaded — this page has no listing endpoint to show it below, but the file was genuinely sent.
        </p>
      )}
    </Card>
  )
}

function LinkForm({ project }: { project: ProjectRow }) {
  const link = useLinkProjectDocument(project.id)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  return (
    <Card className="!h-auto">
      <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50 mb-3">Link a new file/document</h3>
      <div className="flex flex-wrap items-center gap-3">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL to link" className={inputCls + ' flex-1 min-w-[200px]'} />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className={inputCls + ' flex-1 min-w-[160px]'} />
        <button
          type="button"
          disabled={!url || link.isPending}
          onClick={() => link.mutate({ url, label }, { onSuccess: () => { setUrl(''); setLabel('') } })}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {link.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Link2 size={14} />} Link
        </button>
      </div>
      {link.isError && <p className="text-xs text-danger mt-2">{link.error instanceof Error ? link.error.message : 'Could not add this link.'}</p>}
      {link.isSuccess && (
        <p className="flex items-center gap-1.5 text-xs text-success mt-2">
          <Check size={12} /> Link added — this page has no listing endpoint to show it below, but it was genuinely saved.
        </p>
      )}
    </Card>
  )
}
