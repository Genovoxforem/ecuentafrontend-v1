import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { resolveDocLink } from '../ledgerHtmlParser'

// Shared "Accounting Doc." cell for Ledger/Journals/Subledger/PieceDetail —
// see resolveDocLink's own comment for the real doc_type/fk_doc/doc_url
// logic this renders.
export function DocLink({ docType, fkDoc, docUrl, label }: { docType: string; fkDoc: string; docUrl: string | null; label: string }) {
  const link = resolveDocLink(docType, fkDoc, docUrl)
  if (!link) return <>{label || '-'}</>
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" title="View this source document on the real accounting backend" className="flex items-center gap-1 text-brand hover:underline">
        <FileText size={12} /> {label}
      </a>
    )
  }
  return (
    <Link to={link.href} className="flex items-center gap-1 text-brand hover:underline">
      <FileText size={12} /> {label}
    </Link>
  )
}
