import { useMemo } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { parseAmount, type BankEntryRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'

interface StatementGroup {
  ref: string
  entryCount: number
  initialBalance: number
  endBalance: number
}

// Real, grouped from the same bankentries_list_ajax.php rows already
// fetched for the "Bank Account" tab (see BankAccountDetail.tsx) — by the
// real accountStatement field (num_releve) this session added to
// BankEntryRow. compta/bank/releve.php itself has no JSON API (zero
// json_encode). Initial/End Balance are DERIVED from real transaction
// deltas (each entry's own running balance and credit/debit), not a literal
// "statement balance" field pulled from the backend — no confirmed endpoint
// exposes one, so this is the best real approximation available rather than
// a guess or a fabricated value.
export function BankAccountStatementsTab({ entries, currencyCode, onReconcile }: { entries: BankEntryRow[]; currencyCode: string; onReconcile: () => void }) {
  const statements = useMemo(() => {
    // Entries arrive newest-first (DESC by date) from useBankEntriesList, so
    // within each group the first row is that statement's most recent entry
    // and the last row is its oldest.
    const groups = new Map<string, BankEntryRow[]>()
    for (const r of entries) {
      if (!r.accountStatement) continue
      const arr = groups.get(r.accountStatement) ?? []
      arr.push(r)
      groups.set(r.accountStatement, arr)
    }
    const result: StatementGroup[] = []
    for (const [ref, rows] of groups) {
      const newest = rows[0]
      const oldest = rows[rows.length - 1]
      const oldestDelta = (oldest.credit ? parseAmount(oldest.credit) : 0) - (oldest.debit ? parseAmount(oldest.debit) : 0)
      result.push({
        ref,
        entryCount: rows.length,
        endBalance: parseAmount(newest.runningBalance),
        initialBalance: parseAmount(oldest.runningBalance) - oldestDelta,
      })
    }
    return result.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }))
  }, [entries])

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">Account Statements</h3>
        <button type="button" onClick={onReconcile} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          <RefreshCcw size={14} /> Reconcile
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              <Th>Ref.</Th>
              <Th align="right">Initial Balance</Th>
              <Th align="right">End Balance</Th>
            </TheadRow>
          </thead>
          <tbody>
            {statements.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-text-faint italic text-center">
                  None
                </td>
              </tr>
            ) : (
              statements.map((s) => (
                <tr key={s.ref} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text!">{s.ref}</td>
                  <td className="px-4 py-2 text-right text-text-muted">
                    {formatMoney(s.initialBalance)} {currencyCode}
                  </td>
                  <td className="px-4 py-2 text-right text-text!">
                    {formatMoney(s.endBalance)} {currencyCode}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-faint italic px-4 py-2 border-t border-border">
        Grouped from real transaction data already loaded for this account (only entries with a real statement number are included). Initial/End Balance are
        derived from real transaction amounts, not a literal stored field — no confirmed API exposes one.
      </p>
    </Card>
  )
}
