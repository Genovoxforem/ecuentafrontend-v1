import { useState } from 'react'
import { Link2, RefreshCw, Folder, FileText, Download } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { useEcmAutoFiles, useEcmAutoModules, useEcmFolderFiles, useEcmTree, type EcmFile, type EcmFolderNode } from '../ecm.queries'

// The DMS / ECM "Linked Files Area" on ecm/fapi (26 Oct 2026): the Automatic Tree is the backend's fixed module list with live
// on-disk counts and file lists; the Manual Tree is the folder tree (newecuenta has no manual folders, so it is empty there).
// Creating / deleting folders and uploading / deleting files are dry-run only on the backend and are not offered here.
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function FilesTable({ files, loading, error, emptyText }: { files: EcmFile[] | undefined; loading: boolean; error: unknown; emptyText: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
          <th className="font-medium px-4 py-2.5">Documents</th>
          <th className="font-medium px-4 py-2.5">Size</th>
          <th className="font-medium px-4 py-2.5">Date</th>
          <th className="font-medium px-4 py-2.5 w-10" />
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td className="px-4 py-4 text-text-faint italic" colSpan={4}>Loading…</td></tr>
        ) : error ? (
          <tr><td className="px-4 py-4 text-danger-fg" colSpan={4}>{error instanceof Error ? error.message : 'Could not load the files.'}</td></tr>
        ) : !files || files.length === 0 ? (
          <tr><td className="px-4 py-4 text-text-faint italic" colSpan={4}>{emptyText}</td></tr>
        ) : (
          files.map((f) => (
            <tr key={f.relative_path} className="border-b border-border last:border-0 hover:bg-surface-hover">
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2 text-text!"><FileText size={14} className="text-text-faint shrink-0" />{f.name}</span>
                {f.object_ref && f.object_ref !== f.name.replace(/\.[^.]+$/, '') && <span className="ml-6 text-xs text-text-faint">{f.object_ref}</span>}
              </td>
              <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{f.size}</td>
              <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{fmtDate(f.date)}</td>
              <td className="px-4 py-2.5">
                <a href={stripBackendPrefix(f.download_url)} target="_blank" rel="noreferrer" title="Download" className="text-brand hover:text-brand-hover"><Download size={14} /></a>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function FolderNodeRow({ node, selected, onSelect, depth }: { node: EcmFolderNode; selected: number | null; onSelect: (id: number) => void; depth: number }) {
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: 8 + depth * 16 }}
        className={`flex w-full items-center gap-2 py-1 pr-2 text-left text-sm hover:bg-surface-hover ${selected === node.id ? 'bg-brand/10 text-brand' : 'text-text'}`}
      >
        <Folder size={14} className="shrink-0 text-text-faint" />
        <span className="truncate">{node.label}</span>
        <span className="ml-auto text-xs text-text-faint">{node.nb_docs_cached >= 0 ? node.nb_docs_cached : '—'}</span>
      </button>
      {(node.children ?? []).map((c) => (
        <FolderNodeRow key={c.id} node={c} selected={selected} onSelect={onSelect} depth={depth + 1} />
      ))}
    </>
  )
}

export function LinkedFilesArea({ defaultTab = 'manual' }: { defaultTab?: 'manual' | 'automatic' }) {
  const [tab, setTab] = useState<'manual' | 'automatic'>(defaultTab)
  const [module, setModule] = useState<string | null>(null)
  const [dir, setDir] = useState<number | null>(null)
  const modules = useEcmAutoModules()
  const autoFiles = useEcmAutoFiles(tab === 'automatic' ? module : null)
  const tree = useEcmTree()
  const folderFiles = useEcmFolderFiles(tab === 'manual' ? dir : null)

  const refresh = () => {
    void (tab === 'automatic' ? Promise.all([modules.refetch(), module ? autoFiles.refetch() : null]) : Promise.all([tree.refetch(), dir !== null ? folderFiles.refetch() : null]))
  }
  const active = tab === 'automatic' ? modules : tree

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Link2 size={20} className="text-brand" /> Linked Files Area
      </h2>

      <div className="flex items-center gap-2">
        {(['manual', 'automatic'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${tab === t ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted border border-border hover:bg-surface-hover'}`}
          >
            {t === 'manual' ? 'Manual Tree' : 'Automatic Tree'}
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center gap-1.5 p-3 border-b border-border">
          <button type="button" title="Refresh" onClick={refresh} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover">
            <RefreshCw size={13} className={active.isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="border-b border-border">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-faint bg-surface-alt">Directories</p>
          {active.isLoading ? (
            <LegacyLoadingCard label="Loading directories…" />
          ) : active.isError ? (
            <LegacyErrorCard title="Couldn't load the directories" message={active.error instanceof Error ? active.error.message : 'Unknown error.'} onRetry={() => void active.refetch()} />
          ) : tab === 'automatic' ? (
            <div className="p-2">
              {(modules.data ?? []).map((m) => (
                <button
                  key={m.module}
                  type="button"
                  disabled={!m.enabled}
                  onClick={() => setModule(m.module)}
                  className={`flex w-full items-center gap-2 px-2 py-1 text-left text-sm hover:bg-surface-hover disabled:opacity-50 ${module === m.module ? 'bg-brand/10 text-brand' : 'text-text'}`}
                >
                  <Folder size={14} className="shrink-0 text-text-faint" />
                  {m.label}
                  <span className="ml-auto text-xs text-text-faint">{m.nb_docs}</span>
                </button>
              ))}
            </div>
          ) : (tree.data?.tree.length ?? 0) === 0 ? (
            <p className="px-3 py-3 text-xs text-text-faint">No manual directories yet.</p>
          ) : (
            <div className="py-1">
              {tree.data!.tree.map((n) => (
                <FolderNodeRow key={n.id} node={n} selected={dir} onSelect={setDir} depth={0} />
              ))}
            </div>
          )}
        </div>

        {tab === 'automatic' ? (
          module ? (
            <FilesTable files={autoFiles.data} loading={autoFiles.isLoading} error={autoFiles.error} emptyText="No documents in this directory." />
          ) : (
            <FilesTable files={[]} loading={false} error={null} emptyText="Select a directory in the tree…" />
          )
        ) : dir !== null ? (
          <FilesTable files={folderFiles.data} loading={folderFiles.isLoading} error={folderFiles.error} emptyText="No documents in this directory." />
        ) : (
          <FilesTable files={[]} loading={false} error={null} emptyText="Select a directory in the tree…" />
        )}
      </Card>
    </div>
  )
}
