import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { resolveDocLink } from '../ledgerHtmlParser'

// Shared "Accounting Doc." cell for Ledger/Journals/Subledger/PieceDetail —
// see resolveDocLink for which source documents have a React page to link to.
export function DocLink({ docType, fkDoc, docUrl, label }: { docType: string; fkDoc: string; docUrl: string | null; label: string }) {
  const to = resolveDocLink(docType, fkDoc, docUrl)
  if (!to) return <>{label || '-'}</>
  return (
    <Link to={to} className="flex items-center gap-1 text-brand hover:underline">
      <FileText size={12} /> {label}
    </Link>
  )
}
