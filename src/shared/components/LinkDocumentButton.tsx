import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link2, LoaderCircle, Search, X } from 'lucide-react'
import { addDocumentLink, fetchLinksInfo, LINK_ELEMENT_LABELS, searchLinkCandidates, type LinkElement } from '../../api/links'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

// "Link to…" for a sales document: pick a document type, search the same customer's
// documents of that type, and link one (core/fapi/links.php). `onLinked` should refresh
// the page's Related Objects.
export function LinkDocumentButton({ element, id, onLinked }: { element: LinkElement; id: number; onLinked: () => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<LinkElement | ''>('')
  const [q, setQ] = useState('')

  const info = useQuery({ queryKey: ['links', 'info', element, id], queryFn: () => fetchLinksInfo(element, id), enabled: open, staleTime: 60_000 })
  const types = (info.data?.linkable ?? []).filter((t) => t !== element)
  const activeType = type || types[0] || ''
  const candidates = useQuery({
    queryKey: ['links', 'search', element, id, activeType, q],
    queryFn: () => searchLinkCandidates(element, id, activeType as LinkElement, q),
    enabled: open && !!activeType,
  })
  const link = useMutation({
    mutationFn: (targetId: number) => addDocumentLink({ element, id, type: activeType as LinkElement, target_id: targetId }),
    onSuccess: () => {
      onLinked()
      setOpen(false)
      setQ('')
    },
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover"
      >
        <Link2 size={12} /> Link to...
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text!">Link to another document</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-md text-text-faint hover:bg-surface-hover" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              {info.isLoading ? (
                <p className="text-sm text-text-muted">Loading…</p>
              ) : info.isError ? (
                <p role="alert" className="text-sm text-danger">{info.error instanceof Error ? info.error.message : 'Could not load the document links.'}</p>
              ) : !info.data?.canEdit ? (
                <p className="text-sm text-text-muted">You do not have permission to link documents here.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={activeType} onChange={(e) => setType(e.target.value as LinkElement)} className={inputCls}>
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {LINK_ELEMENT_LABELS[t] ?? t}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by reference" className={`${inputCls} pl-8`} />
                    </div>
                  </div>
                  {link.isError && <p role="alert" className="text-xs text-danger">{link.error instanceof Error ? link.error.message : 'Could not link the documents.'}</p>}
                  <div className="rounded-md border border-border">
                    {candidates.isLoading ? (
                      <p className="px-3 py-4 text-sm text-text-muted">Searching…</p>
                    ) : (candidates.data?.items.length ?? 0) === 0 ? (
                      <p className="px-3 py-4 text-sm text-text-faint italic">No documents of this type for the same customer.</p>
                    ) : (
                      candidates.data?.items.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border last:border-0 text-sm">
                          <span className={c.alreadyLinked ? 'text-text-faint' : 'text-text!'}>
                            {c.ref} <span className="text-xs text-text-faint">{[c.date, c.status].filter(Boolean).join(' · ')}</span>
                          </span>
                          <button
                            type="button"
                            disabled={c.alreadyLinked || link.isPending}
                            onClick={() => link.mutate(c.id)}
                            className="px-3 py-1 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                          >
                            {link.isPending && link.variables === c.id ? <LoaderCircle size={12} className="animate-spin" /> : c.alreadyLinked ? 'Linked' : 'Link'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  {candidates.data?.truncated && <p className="text-xs text-text-faint">Showing the first results; refine the search to narrow them.</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
