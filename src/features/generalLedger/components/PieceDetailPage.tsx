import { Link, useParams } from 'react-router-dom'
import { FileText, ChevronLeft, Info } from 'lucide-react'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { usePieceDetail } from '../generalLedger.queries'
import { ROUTES } from '../../../routes'

// Native replacement for accountancy/bookkeeping/card.php?piece_num=X —
// every journal entry's real "view source" link on this backend points at
// this exact same generic page regardless of journal type (confirmed live:
// sampled OD/BQ/ER entries, all resolved to the same URL shape), and that
// page has no JSON of its own. Every field it would show is already
// sitting in the same listbyaccount_ajax_api.php response Ledger/Journals
// fetch — see usePieceDetail's own comment — so this refetches that real
// endpoint and filters to the one piece, rather than linking out to the
// classic page.
export function PieceDetailPage() {
  const { pieceNum } = useParams<{ pieceNum: string }>()
  const { data: lines, isLoading, isError, error, refetch } = usePieceDetail(pieceNum)

  if (isLoading) return <LegacyLoadingCard label="Loading transaction…" />
  if (isError) return <LegacyErrorCard title="Couldn't load transaction" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const totalDebit = (lines ?? []).reduce((s, l) => s + l.debit, 0)
  const totalCredit = (lines ?? []).reduce((s, l) => s + l.credit, 0)

  return (
    <div className="space-y-4">
      <div>
        <Link to={ROUTES.ledgerList} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text mb-1.5">
          <ChevronLeft size={14} /> Journals
        </Link>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> Transaction — Piece #{pieceNum}
        </h2>
      </div>

      {!lines || lines.length === 0 ? (
        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">No lines found for piece #{pieceNum} in the real ledger data currently available.</p>
        </Card>
      ) : (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">Account</th>
                <th className="font-medium px-3 py-2">Journal</th>
                <th className="font-medium px-3 py-2">Date</th>
                <th className="font-medium px-3 py-2">Doc Ref</th>
                <th className="font-medium px-3 py-2">Label</th>
                <th className="font-medium px-3 py-2 text-right">Debit</th>
                <th className="font-medium px-3 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text!">
                    {l.accountCode} — {l.accountLabel}
                    {l.subledgerAccount && <span className="text-text-faint"> / {l.subledgerAccount}</span>}
                  </td>
                  <td className="px-3 py-2 text-text-muted">{l.journal}</td>
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{l.date}</td>
                  <td className="px-3 py-2 text-text-muted">{l.accountingDoc}</td>
                  <td className="px-3 py-2 text-text-muted">{l.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.debit ? fmtZMW(l.debit) : ''}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.credit ? fmtZMW(l.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-3 py-2 text-text!" colSpan={5}>
                  Total
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(totalDebit)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text!">{fmtZMW(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  )
}
