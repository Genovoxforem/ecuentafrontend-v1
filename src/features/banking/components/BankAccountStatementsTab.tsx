import { RefreshCcw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { useBankStatements } from '../banking.queries'
import { formatMoney } from '../../../utils/format'

// The statement numbers of the account with their opening and closing balance (compta/bank/fapi/statements.php, newest first).
export function BankAccountStatementsTab({ accountId, currencyCode, onReconcile }: { accountId: number; currencyCode: string; onReconcile: () => void }) {
  const statements = useBankStatements(accountId)

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
            {statements.isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-text-faint italic text-center">
                  Loading...
                </td>
              </tr>
            ) : statements.isError ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-danger text-center">
                  {statements.error instanceof Error ? statements.error.message : "Couldn't load the statements."}
                </td>
              </tr>
            ) : statements.data?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-text-faint italic text-center">
                  None
                </td>
              </tr>
            ) : (
              statements.data?.map((s) => (
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
    </Card>
  )
}
